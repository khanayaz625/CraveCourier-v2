# Crave - Option B: Capacitor Native Bridge Guide

If you prefer building a hybrid native application with Capacitor instead of a pure Trusted Web Activity (TWA), follow these exact instructions.

---

## 1. Install Capacitor Packages

Run the following inside your `client` directory:

```bash
cd client
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/geolocation @capacitor/push-notifications @capacitor/splash-screen @capacitor/status-bar
```

---

## 2. Initialize Capacitor & Link Web Assets

Copy `android/capacitor.config.json` into `client/capacitor.config.json` (or generate it):

```bash
npx cap init "Crave Food & Grocery" "com.crave.app" --web-dir dist
```

Build the React web bundle and add the Android native platform:

```bash
npm run build
npx cap add android
npx cap sync
```

This creates an `android/` subproject in `client/android/` containing the full Android Studio project.

---

## 3. Configure Android Permissions

Open `client/android/app/src/main/AndroidManifest.xml` and ensure the following permissions are present inside the `<manifest>` tag:

```xml
<!-- Precise & Foreground GPS for Food & Mart Delivery -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" />

<!-- Background location for active Delivery Partner order fulfillment -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Internet and Network state for Socket.io and Stripe -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Push Notifications (Android 13+ / API 33+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

---

## 4. Native Plugin Usage in React

### A. High-Accuracy Geolocation (`@capacitor/geolocation`)
Create `client/src/services/nativeLocation.js`:

```javascript
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export async function getCurrentCoordinates() {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted') {
      throw new Error('Location permission denied by user');
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  // Fallback to HTML5 Geolocation API on web/PWA
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
```

### B. Push Notifications (`@capacitor/push-notifications`)
Create `client/src/services/nativePush.js`:

```javascript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from './api';

export async function initNativePush() {
  if (!Capacitor.isNativePlatform()) return;

  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.warn('Native push notifications not granted');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    console.log('Native FCM Token:', token.value);
    try {
      await api.post('/notifications/fcm-token', { fcmToken: token.value, platform: 'android-capacitor' });
    } catch (e) {
      console.error('Failed to sync native push token:', e);
    }
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received in foreground:', notification);
  });
}
```

---

## 5. Build Release AAB in Android Studio or CLI

```bash
cd client/android
./gradlew bundleRelease
```

The resulting signed bundle will be generated at:
`client/android/app/build/outputs/bundle/release/app-release.aab`

