# Android Blocking Setup Guide

This guide explains how to set up and use the Android blocking feature in Rebooted.

## Overview

The Android blocking feature prevents users from accessing entertainment apps when:
1. The current time is after their sleep time, OR
2. They have incomplete daily tasks

## Architecture

### Components

1. **RebootedBlockingModule** (Native Module)
   - Bridge between JavaScript and Android native code
   - Updates SharedPreferences with blocking status

2. **BlockAccessibilityService** (Accessibility Service)
   - Monitors which app is currently in the foreground
   - Launches BlockActivity when a blocked app is detected

3. **BlockActivity** (Native Activity)
   - Full-screen activity that covers blocked apps
   - Shows blocking message and "Close" button
   - Redirects to Rebooted home when closed

4. **AppBlockService** (Helper Service)
   - Reads blocking status from SharedPreferences
   - Determines if blocking should be active
   - Manages blocked package list

## Setup Instructions

### 1. Apply Database Migration

Run the migration to add the `android_blocking_enabled` field:

```sql
-- This is in supabase/migrations/002_add_android_blocking.sql
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS android_blocking_enabled boolean NOT NULL DEFAULT false;
```

### 2. Build Native Android Code

The native Android code is located in:
- `apps/mobile/android/app/src/main/java/com/rebooted/app/`

Key files:
- `RebootedBlockingModule.kt` - Native module bridge
- `RebootedBlockingPackage.kt` - Package registration
- `BlockAccessibilityService.kt` - Accessibility service
- `BlockActivity.kt` - Block screen activity
- `AppBlockService.kt` - Blocking logic helper

### 3. Register Native Module

You need to register the `RebootedBlockingPackage` in your `MainApplication` file. If using Expo, this is typically handled automatically, but you may need to manually register it:

```kotlin
// In MainApplication.kt
override fun getPackages(): List<ReactPackage> {
    return listOf(
        // ... other packages
        RebootedBlockingPackage()
    )
}
```

### 4. Enable Accessibility Service

Users must manually enable the Accessibility Service:

1. Go to Android Settings → Accessibility
2. Find "Rebooted" in the list
3. Enable the service
4. Grant necessary permissions

The app should prompt users to enable this when they first enable blocking in Settings.

### 5. Blocked Apps List

The following apps are blocked by default:
- YouTube (`com.google.android.youtube`)
- Netflix (`com.netflix.mediaclient`)
- Spotify (`com.spotify.music`)
- Instagram (`com.instagram.android`)
- Facebook (`com.facebook.katana`)
- Twitter/X (`com.twitter.android`)
- Snapchat (`com.snapchat.android`)
- TikTok (`com.tiktok.android`)
- Reddit (`com.reddit.frontpage`)
- Disney+ (`com.disney.disneyplus`)
- Prime Video (`com.amazon.avod.thirdpartyclient`)
- Hulu (`com.hulu.plus`)

## Usage

### Enabling Blocking

1. Open the Rebooted app
2. Go to Settings
3. Toggle "Android Blocking" to ON
4. Enable the Accessibility Service when prompted

### How It Works

1. The app continuously checks if blocking should be active:
   - After sleep time? → Block
   - Has incomplete tasks? → Block

2. When blocking is active and user opens a blocked app:
   - Accessibility Service detects the app launch
   - BlockActivity immediately covers the app
   - User sees "Blocked" message with app name
   - Clicking "Close" redirects to Rebooted home

3. Blocking status updates automatically when:
   - Tasks are completed
   - Preferences are changed
   - Home screen is opened

## Technical Details

### SharedPreferences Keys

- `blocking_enabled` - Is blocking enabled?
- `sleep_time` - User's sleep time (HH:mm format)
- `has_incomplete_tasks` - Are there incomplete tasks?
- `blocked_packages` - Comma-separated list of blocked package names

### Debouncing

The Accessibility Service uses a 2-second debounce to prevent repeatedly blocking the same app in quick succession.

### Permissions Required

- `QUERY_ALL_PACKAGES` - To detect which apps are running
- `BIND_ACCESSIBILITY_SERVICE` - For the accessibility service

## Troubleshooting

### Blocking Not Working

1. Check if Accessibility Service is enabled in Android Settings
2. Verify blocking is enabled in Rebooted Settings
3. Check if the app is in the blocked packages list
4. Ensure native module is properly registered

### BlockActivity Not Showing

1. Check AndroidManifest.xml has BlockActivity registered
2. Verify the activity theme is set correctly
3. Check logs for any errors launching the activity

### Native Module Not Found

1. Rebuild the Android app (`npx expo run:android`)
2. Clear build cache and rebuild
3. Verify RebootedBlockingPackage is registered in MainApplication

## Development Notes

- The blocking feature only works on Android
- iOS does not support this type of app blocking
- The Accessibility Service must be manually enabled by the user
- Blocking status is synced from JavaScript to native code via SharedPreferences

