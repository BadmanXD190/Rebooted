# Install JDK 17 - Required for Android Build

## Problem
Your system is using JDK 21, but Android Gradle Plugin requires JDK 17 (LTS).

## Solution: Install JDK 17

### Option 1: Download from Adoptium (Recommended - Free)

1. Go to: https://adoptium.net/temurin/releases/?version=17
2. Select:
   - **Version**: 17 (LTS)
   - **Operating System**: Windows
   - **Architecture**: x64
   - **Package Type**: JDK
3. Click **Latest Release** to download
4. Run the installer
5. Install to default location: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`

### Option 2: Download from Oracle

1. Go to: https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html
2. Download **Windows x64 Installer**
3. Run installer
4. Install to default location

### After Installation

1. **Update gradle.properties**:
   ```properties
   org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.x.x-hotspot
   ```
   (Replace `x.x.x` with actual version number)

2. **Or set JAVA_HOME environment variable**:
   - Open **System Properties** → **Environment Variables**
   - Under **User variables**, create or edit `JAVA_HOME`
   - Set value to: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`
   - Restart terminal

3. **Stop Gradle daemons**:
   ```powershell
   cd apps/mobile/android
   .\gradlew.bat --stop
   ```

4. **Verify JDK 17**:
   ```powershell
   cd apps/mobile/android
   .\gradlew.bat --version
   ```
   Should show: `JVM: 17.x.x`

5. **Rebuild**:
   ```powershell
   cd apps/mobile
   npx expo run:android
   ```

## Quick Install Script

After downloading JDK 17, find the installation path and update `apps/mobile/android/gradle.properties`:

```properties
org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13+11
```

(Adjust path to your actual JDK 17 installation location)

## Verify Installation

```powershell
# Check if JDK 17 is installed
Get-ChildItem "C:\Program Files\Eclipse Adoptium" -ErrorAction SilentlyContinue
Get-ChildItem "C:\Program Files\Java" -ErrorAction SilentlyContinue

# Test JDK 17
& "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot\bin\java.exe" -version
```

Should show: `openjdk version "17.x.x"`

