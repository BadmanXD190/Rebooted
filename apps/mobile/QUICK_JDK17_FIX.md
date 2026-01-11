# Quick Fix: Install JDK 17

## The Problem
Android build requires JDK 17, but you have JDK 21 installed.

## Quick Solution

1. **Download JDK 17**:
   - Go to: https://adoptium.net/temurin/releases/?version=17
   - Download **Windows x64 JDK** (latest 17.x.x)
   - Install it

2. **Find Installation Path**:
   - Usually: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`
   - Or check: `C:\Program Files\Java\jdk-17`

3. **Update `apps/mobile/android/gradle.properties`**:
   ```properties
   org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13+11
   ```
   (Use your actual path)

4. **Stop Gradle and Rebuild**:
   ```powershell
   cd apps/mobile/android
   .\gradlew.bat --stop
   cd ..
   npx expo run:android
   ```

That's it! The build should work now.

