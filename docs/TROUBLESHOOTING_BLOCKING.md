# Troubleshooting Android Blocking

If the blocking feature is not working, follow these steps:

## Step 1: Verify Native Code is Built

The blocking feature requires native Android code. You **must** build a development build, not use Expo Go.

### Build the app:
```bash
cd apps/mobile
npx expo prebuild --clean
npx expo run:android
```

**Important**: You cannot test this in Expo Go. You need a development build.

## Step 2: Check if Native Module is Registered

After building, check if `MainApplication` includes the package:

1. Open: `apps/mobile/android/app/src/main/java/com/rebooted/app/MainApplication.kt` (or `.java`)
2. Look for `RebootedBlockingPackage` in the imports
3. Look for `RebootedBlockingPackage()` in the `getPackages()` method

If missing, manually add:

**For Kotlin:**
```kotlin
import com.rebooted.app.RebootedBlockingPackage

// In getPackages():
override fun getPackages(): List<ReactPackage> {
    return listOf(
        // ... other packages
        RebootedBlockingPackage()  // Add this
    )
}
```

**For Java:**
```java
import com.rebooted.app.RebootedBlockingPackage;

// In getPackages():
@Override
protected List<ReactPackage> getPackages() {
    return Arrays.asList(
        // ... other packages
        new RebootedBlockingPackage()  // Add this
    );
}
```

## Step 3: Enable Accessibility Service

**This is the most common issue!** The Accessibility Service must be manually enabled:

1. Open Android Settings
2. Go to **Accessibility** (or **Settings → Accessibility**)
3. Find **Rebooted** in the list of services
4. Tap on it
5. Toggle **ON**
6. Grant any requested permissions

**Without this step, blocking will NOT work!**

## Step 4: Enable Blocking in App Settings

1. Open the Rebooted app
2. Go to **Settings** tab
3. Find **Android Blocking** section
4. Toggle the switch to **ON**

## Step 5: Verify Blocking Status

Check if blocking should be active:

1. **After sleep time?** - If current time is after your sleep time, blocking should be active
2. **Incomplete tasks?** - If you have incomplete daily tasks, blocking should be active

You can check the blocking status by:
- Opening the app and checking logs
- Looking at SharedPreferences (requires root or ADB)

## Step 6: Test with Logcat

Monitor logs to see what's happening:

```bash
adb logcat | grep -i "rebooted\|blocking\|accessibility"
```

Look for:
- `BlockAccessibilityService: Service connected` - Service is running
- Any errors related to `RebootedBlockingModule`
- Errors launching `BlockActivity`

## Step 7: Check Permissions

The app needs these permissions:
- `QUERY_ALL_PACKAGES` - To detect running apps
- `BIND_ACCESSIBILITY_SERVICE` - For the accessibility service

These should be in `AndroidManifest.xml`. If missing, add them.

## Step 8: Verify Blocked Apps List

Make sure the app you're testing is in the blocked list:
- YouTube: `com.google.android.youtube`
- Netflix: `com.netflix.mediaclient`
- Instagram: `com.instagram.android`
- etc.

## Step 9: Check SharedPreferences

Verify blocking status is being written:

```bash
adb shell
run-as com.rebooted.app
cd shared_prefs
cat RebootedBlocking.xml
```

Look for:
- `blocking_enabled` should be `true`
- `has_incomplete_tasks` should reflect task status
- `blocked_packages` should contain the package list

## Step 10: Common Issues

### Issue: "Native module not found"
**Solution**: Rebuild the app with `npx expo run:android`

### Issue: "Accessibility service not working"
**Solution**: 
1. Disable and re-enable the service in Settings
2. Restart the phone
3. Check if service is actually enabled in Settings

### Issue: "BlockActivity not showing"
**Solution**:
1. Check AndroidManifest.xml has BlockActivity registered
2. Verify activity theme is correct
3. Check logs for errors launching activity

### Issue: "Blocking not activating"
**Solution**:
1. Verify blocking is enabled in app Settings
2. Check if you're after sleep time OR have incomplete tasks
3. Verify SharedPreferences has correct values
4. Restart the app

### Issue: "App crashes when enabling blocking"
**Solution**:
1. Check logs for compilation errors
2. Verify all Kotlin files compile
3. Check if MainApplication properly registers the package

## Step 11: Manual Testing Steps

1. **Enable blocking in Settings**
2. **Enable Accessibility Service in Android Settings**
3. **Ensure you have incomplete tasks OR it's after sleep time**
4. **Open a blocked app (e.g., YouTube)**
5. **BlockActivity should immediately appear**

## Still Not Working?

If none of the above works:

1. **Check build logs** for compilation errors
2. **Verify all files exist** in `android/app/src/main/java/com/rebooted/app/`
3. **Try a clean build**: 
   ```bash
   cd apps/mobile/android
   ./gradlew clean
   cd ../..
   npx expo run:android
   ```
4. **Check Expo SDK version** - Make sure you're using a compatible version
5. **Verify app.json plugins** are correctly configured

## Debug Mode

Add logging to verify each step:

1. Check if `updateBlockingStatus` is being called
2. Check if native module is receiving the data
3. Check if Accessibility Service is detecting app launches
4. Check if BlockActivity is being launched

Add logs in:
- `RebootedBlockingModule.kt` - Log when status is updated
- `BlockAccessibilityService.kt` - Log when apps are detected
- `AppBlockService.kt` - Log blocking decisions

