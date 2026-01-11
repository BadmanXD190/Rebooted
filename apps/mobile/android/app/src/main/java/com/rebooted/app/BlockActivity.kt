package com.rebooted.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.core.content.ContextCompat

class BlockActivity : Activity() {
    private var blockedPackageName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        blockedPackageName = intent.getStringExtra("blocked_package") ?: ""
        val appName = intent.getStringExtra("app_name") ?: getAppDisplayName(blockedPackageName)

        // Create UI programmatically to match the design
        val rootLayout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(ContextCompat.getColor(this@BlockActivity, android.R.color.black))
            setPadding(0, 0, 0, 0)
        }

        val contentLayout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT
            ).apply {
                gravity = android.view.Gravity.CENTER
            }
            setPadding(80, 0, 80, 0)
        }

        val blockedText = TextView(this).apply {
            text = "Blocked"
            textSize = 32f
            setTextColor(ContextCompat.getColor(this@BlockActivity, android.R.color.white))
            setTypeface(null, android.graphics.Typeface.BOLD)
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 8
            }
        }

        val appNameText = TextView(this).apply {
            text = "$appName is blocked"
            textSize = 18f
            setTextColor(ContextCompat.getColor(this@BlockActivity, android.R.color.white))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 40
            }
        }

        val closeButton = Button(this).apply {
            text = "Close"
            setBackgroundColor(ContextCompat.getColor(this@BlockActivity, android.R.color.darker_gray))
            setTextColor(ContextCompat.getColor(this@BlockActivity, android.R.color.white))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 0
            }
            setOnClickListener {
                openRebootedApp()
            }
        }

        contentLayout.addView(blockedText)
        contentLayout.addView(appNameText)
        contentLayout.addView(closeButton)
        rootLayout.addView(contentLayout)
        
        setContentView(rootLayout)
    }

    private fun getAppDisplayName(packageName: String): String {
        return when (packageName) {
            "com.google.android.youtube" -> "YouTube"
            "com.netflix.mediaclient" -> "Netflix"
            "com.spotify.music" -> "Spotify"
            "com.instagram.android" -> "Instagram"
            "com.facebook.katana" -> "Facebook"
            "com.twitter.android" -> "Twitter"
            "com.snapchat.android" -> "Snapchat"
            "com.tiktok.android" -> "TikTok"
            "com.reddit.frontpage" -> "Reddit"
            "com.disney.disneyplus" -> "Disney+"
            "com.amazon.avod.thirdpartyclient" -> "Prime Video"
            "com.hulu.plus" -> "Hulu"
            else -> "This app"
        }
    }

    private fun openRebootedApp() {
        try {
            val intent = packageManager.getLaunchIntentForPackage("com.rebooted.app")
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                startActivity(intent)
            }
        } catch (e: Exception) {
            // If can't open app, just finish this activity
        }
        finish()
    }

    override fun onBackPressed() {
        // Prevent going back to blocked app
        openRebootedApp()
    }
}
