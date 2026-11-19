# Aegis School OS — Android Build & Google Play Store Release Guide

> **Application ID:** `com.caldun.aegis`  
> **App Name:** `Aegis School OS`  
> **Target Platform:** Android 8.0+ (API Level 26+)  
> **Production WebView:** `https://school-management-saas-gamma.vercel.app`

---

## 1. Quick Testing: Build & Run Debug APK on Device

### Prerequisites:
1. Ensure [Android Studio](https://developer.android.com/studio) and the Android SDK (Platform 34+) are installed.
2. Enable **Developer Options** and **USB Debugging** on your Android phone.

### Build the Debug APK:
From the root of the repository, execute:
```bash
# Sync web configuration and native plugins to Android
npm run cap:sync

# Build the Debug APK using Gradle
npm run android:apk
```

The compiled APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Install directly to your connected device:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
*Or open the project in Android Studio with `npm run cap:open` and tap the green **Play (Run)** button.*

---

## 2. Production Signed Release (Android App Bundle / .aab)

Google Play Store requires the modern **Android App Bundle (`.aab`)** format for all new app releases.

### Step 2.1: Generate a Release Keystore (One-Time)
If you don't already have a production keystore, create one using `keytool`:
```bash
keytool -genkey -v -keystore aegis-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias aegis-key
```
> *Keep `aegis-release-key.jks` and your keystore password safe in your password manager. Never commit it to git.*

### Step 2.2: Configure Signing in `android/app/build.gradle`
In `android/app/build.gradle`, add the signing configuration to `android`:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("path/to/aegis-release-key.jks")
            storePassword System.getenv("AEGIS_KEYSTORE_PASSWORD") ?: "your-keystore-password"
            keyAlias "aegis-key"
            keyPassword System.getenv("AEGIS_KEY_PASSWORD") ?: "your-key-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 2.3: Build the Production Bundle (`.aab`)
```bash
cd android
./gradlew bundleRelease
```
The upload bundle will be located at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 3. Google Play Console: Data Safety Declarations

Google Play strictly requires declaring why the application requests `CAMERA` and `LOCATION` permissions:

### 1. Camera Permission (`android.permission.CAMERA`):
- **Why is it used?**  
  - **Attendance Gate Check-In:** Teachers scan the printed `AEGIS_ATTENDANCE` station QR code.  
  - **Child Safe Pick-Up:** Gate security verifies the parent/delegate 6-digit dynamic pick-up QR voucher.
- **Is camera data collected or shared?**  
  - **No.** Camera stream is processed ephemerally on-device strictly for decoding QR payloads. No photos, videos, or raw frames are saved or transmitted to any server.

### 2. Location Permission (`android.permission.ACCESS_FINE_LOCATION`, `android.permission.ACCESS_COARSE_LOCATION`):
- **Why is it used?**  
  - **School Geofencing Verification:** Confirms that a teacher is physically within the configured school boundary (default 150m radius) when scanning the gate attendance QR.
- **Is location data tracked in the background?**  
  - **No.** Location is requested strictly foreground in real-time when the teacher taps *"Clock In via Gate QR"*.
- **Is location data shared with third parties?**  
  - **No.** Geolocation coordinates are used solely by the school administrator to audit clock-in punctuality.

---

## 4. App Store Assets & Metadata

- **Launcher Icons:** High-contrast adaptive icons (`assets/icon-foreground.png` with `#FFFFFF` background) generated for all density buckets (`mipmap-mdpi` through `mipmap-xxxhdpi`).
- **Splash Screen:** Seamless branded `#FFFFFF` launch splash screen with centered shield logo matching the web application theme.
- **Internal Deep Linking:** Configured in `capacitor.config.ts` (`allowNavigation: ['school-management-saas-gamma.vercel.app', '*.vercel.app', '*.supabase.co']`) so student pick-up passes (`/pickup-pass/[token]`), registration, and results remain inside the native WebView without kicking users out to mobile browsers.
