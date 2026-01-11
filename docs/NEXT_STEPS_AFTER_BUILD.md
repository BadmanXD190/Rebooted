# Next Steps After Building the App

## 1. Wait for Build to Complete

The build is currently running. You should see:
- ✅ Build successful message
- App installing on your device/emulator
- App launching automatically

If you see errors, check the terminal output and refer to troubleshooting guides.

## 2. Test the App

Once the app is installed and running:

### Basic Functionality
1. **Login/Register** - Create an account or login
2. **Onboarding** - Set your preferences (tasks per day, wake/sleep time, active days)
3. **Create a Project** - Add a project with tasks
4. **Complete Tasks** - Mark tasks as complete to test the flow

### Test Blocking Feature

#### Step 1: Enable Blocking
1. Open the Rebooted app
2. Go to **Settings** tab
3. Find **Android Blocking** section
4. Toggle the switch to **ON**

#### Step 2: Enable Accessibility Service (CRITICAL!)
**This is the most important step!**

1. Open **Android Settings** on your device
2. Go to **Accessibility** (or search for "Accessibility" in Settings)
3. Scroll down and find **Rebooted** in the list
4. Tap on **Rebooted**
5. Toggle the switch to **ON**
6. Grant any requested permissions

**Without this step, blocking will NOT work!**

#### Step 3: Ensure Blocking Should Be Active

Blocking is active when:
- Current time is **after your sleep time**, OR
- You have **incomplete daily tasks**

To test:
- Make sure you have at least one incomplete task assigned for today, OR
- Set your sleep time to a time that has already passed (e.g., if it's 3 PM, set sleep time to 2 PM)

#### Step 4: Test Blocking
1. Ensure blocking is enabled and active (see Step 3)
2. Open a blocked app (e.g., YouTube, Instagram, Netflix)
3. **BlockActivity should immediately appear** showing:
   - "Blocked" text
   - "[App Name] is blocked" message
   - "Close" button
4. Click "Close" - it should redirect to Rebooted home

## 3. Verify Everything Works

### Check Logs (Optional)
If you want to see what's happening:

```powershell
adb logcat | Select-String -Pattern "rebooted|blocking|accessibility" -CaseSensitive:$false
```

Look for:
- `BlockAccessibilityService: Service connected`
- `AppBlockService: Blocking enabled: true`
- `BlockAccessibilityService: Launching BlockActivity`

### Common Issues

**Blocking not working?**
1. ✅ Is Accessibility Service enabled? (Most common issue!)
2. ✅ Is blocking enabled in app Settings?
3. ✅ Is blocking actually active? (After sleep time OR incomplete tasks?)
4. ✅ Is the app you're testing in the blocked list?

**App crashes?**
- Check logs with `adb logcat`
- Look for error messages
- Verify all native files are present

**BlockActivity not showing?**
- Check if Accessibility Service is actually running
- Verify blocking status in logs
- Check AndroidManifest.xml has BlockActivity registered

## 4. Development Workflow

### Making Changes
1. Edit your code
2. Save files
3. The app should hot-reload automatically (if using Expo dev client)
4. For native changes, rebuild: `npx expo run:android`

### Rebuilding After Native Changes
If you modify native Android code:
```powershell
cd apps/mobile
npx expo run:android
```

### Clean Build
If you encounter weird issues:
```powershell
cd apps/mobile
npx expo prebuild --clean
npx expo run:android
```

## 5. Production Build

When ready for production:
```powershell
cd apps/mobile
npx expo build:android
```

Or use EAS Build:
```powershell
npx eas build --platform android
```

## 6. Troubleshooting

See these guides:
- `docs/TROUBLESHOOTING_BLOCKING.md` - Detailed blocking troubleshooting
- `docs/ANDROID_BLOCKING_SETUP.md` - Setup documentation
- `apps/mobile/QUICK_FIX.md` - Quick fixes

## Summary Checklist

- [ ] Build completed successfully
- [ ] App installed on device/emulator
- [ ] Can login/register
- [ ] Can create projects and tasks
- [ ] Blocking enabled in Settings
- [ ] Accessibility Service enabled in Android Settings
- [ ] Blocking is active (after sleep time OR incomplete tasks)
- [ ] Blocking works (BlockActivity appears when opening blocked apps)

