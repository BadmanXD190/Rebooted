# Android SDK Setup Guide

## Error: SDK location not found

If you see this error:
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file.
```

## Solution 1: Create local.properties (Recommended)

1. Find your Android SDK location:
   - **Windows (default)**: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
   - Or check Android Studio: **File → Settings → Appearance & Behavior → System Settings → Android SDK**

2. Create `apps/mobile/android/local.properties` file with:
   ```properties
   sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
   ```
   **Important**: Use double backslashes (`\\`) or forward slashes (`/`) in the path.

## Solution 2: Set ANDROID_HOME Environment Variable

### Windows (PowerShell - Current Session):
```powershell
$env:ANDROID_HOME = "C:\Users\YourUsername\AppData\Local\Android\Sdk"
```

### Windows (Permanent):
1. Open **System Properties** → **Environment Variables**
2. Under **User variables**, click **New**
3. Variable name: `ANDROID_HOME`
4. Variable value: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
5. Click **OK** and restart your terminal

## Quick Fix Script

Run this in PowerShell (from `apps/mobile` directory):

```powershell
# Find Android SDK
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $sdkPath) {
    $content = "sdk.dir=$($sdkPath.Replace('\', '\\'))"
    $content | Out-File -FilePath "android\local.properties" -Encoding ASCII
    Write-Host "Created local.properties with: $sdkPath"
} else {
    Write-Host "Android SDK not found. Please install Android Studio or set ANDROID_HOME manually."
}
```

## Verify Setup

After setting up, verify:
```bash
cd apps/mobile
npx expo run:android
```

## If Android SDK is Not Installed

1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio
3. Go to **Tools → SDK Manager**
4. Install:
   - Android SDK Platform
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
5. Note the SDK location (usually shown at top of SDK Manager)
6. Use that path in `local.properties` or `ANDROID_HOME`

