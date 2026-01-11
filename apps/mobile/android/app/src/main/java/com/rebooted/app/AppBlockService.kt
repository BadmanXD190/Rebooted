package com.rebooted.app

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import java.text.SimpleDateFormat
import java.util.*

class AppBlockService(private val context: Context) {
    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences("RebootedBlocking", Context.MODE_PRIVATE)
    }

    fun isBlockingActive(): Boolean {
        val enabled = prefs.getBoolean("blocking_enabled", false)
        Log.d("AppBlockService", "Blocking enabled: $enabled")
        if (!enabled) {
            Log.d("AppBlockService", "Blocking is disabled in preferences")
            return false
        }

        // Check if after sleep time
        val sleepTime = prefs.getString("sleep_time", "23:00") ?: "23:00"
        val currentTime = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
        Log.d("AppBlockService", "Current time: $currentTime, Sleep time: $sleepTime")
        
        if (currentTime >= sleepTime) {
            Log.d("AppBlockService", "After sleep time, blocking active")
            return true
        }

        // Check if there are incomplete tasks
        val hasIncompleteTasks = prefs.getBoolean("has_incomplete_tasks", false)
        Log.d("AppBlockService", "Has incomplete tasks: $hasIncompleteTasks")
        return hasIncompleteTasks
    }

    fun getBlockedPackages(): List<String> {
        val packagesStr = prefs.getString("blocked_packages", "") ?: ""
        return if (packagesStr.isNotEmpty()) {
            packagesStr.split(",").filter { it.isNotEmpty() }
        } else {
            emptyList()
        }
    }

    fun isPackageBlocked(packageName: String): Boolean {
        if (!isBlockingActive()) return false
        return getBlockedPackages().contains(packageName)
    }
}
