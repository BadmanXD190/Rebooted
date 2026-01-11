# Fix JDK Version Compatibility Issue

## Error
```
Error while executing process ...\jdk-21.0.5.11-hotspot\bin\jlink.exe
```

## Problem
JDK 21 has compatibility issues with Android Gradle Plugin. You need JDK 17 (LTS).

## Solution 1: Install JDK 17 (Recommended)

1. Download JDK 17 from:
   - [Oracle JDK 17](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html)
   - [OpenJDK 17](https://adoptium.net/temurin/releases/?version=17)

2. Install JDK 17

3. Set JAVA_HOME to JDK 17:
   ```powershell
   # Check current JAVA_HOME
   $env:JAVA_HOME
   
   # Set JAVA_HOME to JDK 17 (adjust path to your installation)
   $env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
   ```

4. Verify:
   ```powershell
   java -version
   # Should show: openjdk version "17.x.x"
   ```

5. Rebuild:
   ```powershell
   cd apps/mobile
   npx expo run:android
   ```

## Solution 2: Configure Gradle to Use JDK 17

If you have JDK 17 installed but Gradle is using JDK 21:

1. Find JDK 17 path (usually `C:\Program Files\Java\jdk-17`)

2. Set JAVA_HOME environment variable:
   - Open **System Properties** → **Environment Variables**
   - Under **User variables**, find or create `JAVA_HOME`
   - Set value to JDK 17 path (e.g., `C:\Program Files\Java\jdk-17`)
   - Restart terminal/IDE

3. Or set in `gradle.properties`:
   ```properties
   org.gradle.java.home=C:\\Program Files\\Java\\jdk-17
   ```

## Solution 3: Use Android Studio's JDK

Android Studio comes with a bundled JDK that works well:

1. Find Android Studio's JDK:
   - Usually at: `C:\Program Files\Android\Android Studio\jbr`

2. Set JAVA_HOME to that path

## Quick Check

```powershell
# Check current Java version
java -version

# Check JAVA_HOME
$env:JAVA_HOME

# Check what Gradle will use
cd apps/mobile/android
.\gradlew.bat --version
```

## After Fixing

1. Clean Gradle cache:
   ```powershell
   cd apps/mobile/android
   .\gradlew.bat clean
   ```

2. Rebuild:
   ```powershell
   cd apps/mobile
   npx expo run:android
   ```

