package com.rebooted.app

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.util.Log

class BlockAccessibilityService : AccessibilityService() {
    private var appBlockService: AppBlockService? = null
    private var lastBlockedPackage: String? = null
    private var lastBlockTime: Long = 0
    private val DEBOUNCE_MS = 2000L // 2 seconds debounce

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("BlockAccessibilityService", "Service connected")
        // Initialize AppBlockService after service is connected
        appBlockService = AppBlockService(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            // Ensure service is initialized
            val service = appBlockService ?: run {
                Log.w("BlockAccessibilityService", "Service not yet initialized")
                return
            }

            if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                return
            }

            val packageName = event.packageName?.toString()
            if (packageName.isNullOrEmpty()) {
                return
            }

            // Don't block our own app
            if (packageName == "com.rebooted.app") {
                return
            }

            // Debounce: don't block the same app repeatedly
            val now = System.currentTimeMillis()
            if (packageName == lastBlockedPackage && (now - lastBlockTime) < DEBOUNCE_MS) {
                return
            }

            // Check if this package should be blocked
            val isBlocked = service.isPackageBlocked(packageName)
            Log.d("BlockAccessibilityService", "Package: $packageName, Blocked: $isBlocked")
            
            if (isBlocked) {
                lastBlockedPackage = packageName
                lastBlockTime = now
                
                Log.d("BlockAccessibilityService", "Launching BlockActivity for $packageName")
                // Launch BlockActivity
                val intent = Intent(this, BlockActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
                    putExtra("blocked_package", packageName)
                }
                try {
                    startActivity(intent)
                    Log.d("BlockAccessibilityService", "BlockActivity launched successfully")
                } catch (e: Exception) {
                    Log.e("BlockAccessibilityService", "Error launching BlockActivity", e)
                }
            }
        } catch (e: Exception) {
            Log.e("BlockAccessibilityService", "Error in onAccessibilityEvent", e)
        }
    }

    override fun onInterrupt() {
        Log.d("BlockAccessibilityService", "Service interrupted")
    }
}
