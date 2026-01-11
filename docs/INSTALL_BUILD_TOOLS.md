# Install Android SDK Build-Tools

## Error: Missing Build-Tools 33.0.1

The build requires Android SDK Build-Tools 33.0.1 which is not installed.

## Solution 1: Install via Android Studio (Recommended)

1. Open **Android Studio**
2. Go to **Tools → SDK Manager** (or **File → Settings → Appearance & Behavior → System Settings → Android SDK**)
3. Click on the **SDK Tools** tab
4. Check **Android SDK Build-Tools 33.0.1**
5. Click **Apply** and wait for installation
6. Try building again: `npx expo run:android`

## Solution 2: Install via Command Line

If you have Android SDK command-line tools installed:

```powershell
# Navigate to SDK location
cd $env:LOCALAPPDATA\Android\Sdk

# Install build-tools (if sdkmanager is available)
.\cmdline-tools\latest\bin\sdkmanager.bat "build-tools;33.0.1"

# Or if using older tools location:
.\tools\bin\sdkmanager.bat "build-tools;33.0.1"
```

## Solution 3: Accept Licenses and Install

Sometimes you need to accept licenses first:

```powershell
cd $env:LOCALAPPDATA\Android\Sdk
.\cmdline-tools\latest\bin\sdkmanager.bat --licenses
# Accept all licenses by typing 'y'
.\cmdline-tools\latest\bin\sdkmanager.bat "build-tools;33.0.1"
```

## Verify Installation

After installation, verify the build-tools are installed:

```powershell
dir "$env:LOCALAPPDATA\Android\Sdk\build-tools"
```

You should see a folder named `33.0.1` or similar.

## Alternative: Use Different Build-Tools Version

If you can't install 33.0.1, you can modify the build configuration to use a different version. However, this is not recommended as it may cause compatibility issues.

## Quick Fix

The easiest way is to use Android Studio:
1. Open Android Studio
2. SDK Manager → SDK Tools tab
3. Check "Android SDK Build-Tools 33.0.1"
4. Apply
5. Rebuild

