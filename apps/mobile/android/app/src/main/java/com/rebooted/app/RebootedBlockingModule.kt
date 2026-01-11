package com.rebooted.app

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class RebootedBlockingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val prefs: SharedPreferences =
        reactContext.getSharedPreferences("RebootedBlocking", Context.MODE_PRIVATE)
    
    companion object {
        private const val TAG = "RebootedBlockingModule"
    }

    override fun getName(): String {
        return "RebootedBlockingModule"
    }

    @ReactMethod
    fun updateBlockingStatus(status: ReadableMap, promise: Promise) {
        try {
            val enabled = status.getBoolean("enabled")
            val sleepTime = status.getString("sleepTime") ?: "23:00"
            val hasIncompleteTasks = status.getBoolean("hasIncompleteTasks")
            val blockedPackages = status.getArray("blockedPackages")
            
            Log.d(TAG, "Updating blocking status: enabled=$enabled, sleepTime=$sleepTime, hasIncompleteTasks=$hasIncompleteTasks")
            
            val editor = prefs.edit()
            editor.putBoolean("blocking_enabled", enabled)
            editor.putString("sleep_time", sleepTime)
            editor.putBoolean("has_incomplete_tasks", hasIncompleteTasks)
            
            // Store blocked packages as comma-separated string
            val packagesList = mutableListOf<String>()
            if (blockedPackages != null) {
                for (i in 0 until blockedPackages.size()) {
                    packagesList.add(blockedPackages.getString(i) ?: "")
                }
            }
            editor.putString("blocked_packages", packagesList.joinToString(","))
            
            val success = editor.commit()
            Log.d(TAG, "Blocking status saved: $success")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating blocking status", e)
            promise.reject("UPDATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getBlockingStatus(promise: Promise) {
        try {
            val map = Arguments.createMap()
            map.putBoolean("enabled", prefs.getBoolean("blocking_enabled", false))
            map.putString("sleepTime", prefs.getString("sleep_time", "23:00"))
            
            val packagesStr = prefs.getString("blocked_packages", "")
            val packagesList = Arguments.createArray()
            if (packagesStr != null && packagesStr.isNotEmpty()) {
                packagesStr.split(",").forEach { packagesList.pushString(it) }
            }
            map.putArray("blockedPackages", packagesList)
            
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting blocking status", e)
            promise.reject("GET_ERROR", e.message, e)
        }
    }
}
