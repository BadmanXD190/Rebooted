# Quick Fix Guide for Android Blocking

## Most Common Issue: Accessibility Service Not Enabled

**90% of blocking issues are because the Accessibility Service is not enabled!**

### How to Enable:

1. Open **Android Settings**
2. Go to **Accessibility** (or search for "Accessibility")
3. Scroll down and find **Rebooted**
4. Tap on **Rebooted**
5. Toggle the switch to **ON**
6. Grant any permissions if asked

**That's it!** Now try opening YouTube or another blocked app.

---

## If That Doesn't Work:

### 1. Rebuild the App (Required for Native Code)

```bash
cd apps/mobile
npx expo prebuild --clean
npx expo run:android
```

**Important**: You cannot use Expo Go. You must build a development build.

### 2. Check if Blocking is Enabled in App

1. Open Rebooted app
2. Go to **Settings**
3. Find **Android Blocking**
4. Make sure the toggle is **ON**

### 3. Verify Blocking Should Be Active

Blocking is active when:
- Current time is **after your sleep time**, OR
- You have **incomplete daily tasks**

### 4. Check Logs

```bash
adb logcat | grep -i rebooted
```

Look for errors or warnings.

---

## Still Not Working?

See `docs/TROUBLESHOOTING_BLOCKING.md` for detailed troubleshooting.

