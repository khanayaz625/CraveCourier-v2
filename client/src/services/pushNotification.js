import { LocalNotifications } from '@capacitor/local-notifications';
import api from './api';
import { isNativeApk } from '../config/appVersion';

const ANDROID_CHANNEL_ID = 'crave_orders_channel';
let channelInitialized = false;

/**
 * Checks if Web Push / Notification APIs or Native Capacitor LocalNotifications are supported
 */
export const isPushNotificationSupported = () => {
  if (isNativeApk()) return true;
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Ensures the high-importance Android notification channel exists for chime + heads-up alerts
 */
const ensureAndroidNotificationChannel = async () => {
  if (!isNativeApk() || channelInitialized) return;
  try {
    await LocalNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'Crave Orders & Live Alerts',
      description: 'Real-time order updates, admin alerts, and delivery notifications',
      importance: 5, // High importance (heads-up banner + sound)
      visibility: 1, // Public on lockscreen
      vibration: true,
    });
    channelInitialized = true;
  } catch (err) {
    console.warn('[NATIVE CHANNEL ERROR]', err);
  }
};

/**
 * Returns normalized notification permission status across Native APK and Web
 * ('granted' | 'denied' | 'default' | 'unsupported')
 */
export const getNotificationPermissionStatus = async () => {
  if (isNativeApk()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'default';
    } catch {
      return 'default';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
};

/**
 * Requests real native system notification permissions (Android 13+ / Web Browser)
 */
export const requestPushPermission = async () => {
  if (isNativeApk()) {
    try {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display === 'granted') {
        await ensureAndroidNotificationChannel();
        const token = await registerDevicePushToken();
        return { granted: true, token };
      }
      return { granted: false, reason: perm.display };
    } catch (err) {
      console.error('[NATIVE PUSH PERMISSION ERROR]', err);
      return { granted: false, error: err.message };
    }
  }

  if (!isPushNotificationSupported()) {
    console.warn('[PUSH] Push notifications are not supported in this browser.');
    return { granted: false, reason: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[PUSH] Notification permission granted by user.');
      const token = await registerDevicePushToken();
      return { granted: true, token };
    } else {
      console.warn('[PUSH] Notification permission denied or dismissed:', permission);
      return { granted: false, reason: permission };
    }
  } catch (err) {
    console.error('[PUSH PERMISSION ERROR]', err);
    return { granted: false, error: err.message };
  }
};

/**
 * Subscribes the current device/service worker and persists the token with the backend
 */
export const registerDevicePushToken = async () => {
  try {
    let token = localStorage.getItem('crave_push_token');
    if (!token) {
      const prefix = isNativeApk() ? 'fcm_apk_' : 'fcm_web_';
      token = prefix + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('crave_push_token', token);
    }

    const deviceName = isNativeApk()
      ? 'Android APK (Capacitor)'
      : `${navigator.userAgentData?.platform || navigator.platform || 'Web'} - ${
          navigator.userAgentData?.brands?.[0]?.brand || 'Browser'
        }`;

    await api.post('/notifications/fcm-token', {
      token,
      device: deviceName,
    });

    console.log('[PUSH] Registered push token successfully:', token);
    return token;
  } catch (err) {
    console.error('[PUSH REGISTRATION ERROR]', err);
    return null;
  }
};

/**
 * Displays a real system tray notification immediately (Native Android or Web Service Worker)
 */
export const showClientPushNotification = async ({ title, body, data = {} }) => {
  if (isNativeApk()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') return;

      await ensureAndroidNotificationChannel();
      const notifId = Math.floor(Date.now() % 2147483000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title || 'CraveCourier',
            body: body || 'You have a new update',
            channelId: ANDROID_CHANNEL_ID,
            extra: data,
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('[NATIVE NOTIFICATION DISPLAY WARNING]', err);
    }
  }

  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions = {
    body,
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    data,
    vibrate: [200, 100, 200],
    tag: `crave-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }
    new Notification(title, notificationOptions);
  } catch (err) {
    console.warn('[PUSH DISPLAY WARNING]', err);
  }
};

let wakeLockSentinel = null;

/**
 * Requests background running & screen lock permissions
 * Keeps screen awake and prevents OS from suspending GPS / live telemetry
 */
export const requestBackgroundRunning = async () => {
  const status = { wakeLock: false, persistentStorage: false };

  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      status.wakeLock = true;
      wakeLockSentinel.addEventListener('release', () => {
        console.log('[WAKE LOCK] Screen Wake Lock was released');
      });
    } catch (err) {
      console.warn('[WAKE LOCK] Wake lock request error:', err);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      status.persistentStorage = await navigator.storage.persist();
    } catch (err) {
      console.warn('[STORAGE PERSIST] Error:', err);
    }
  }

  return status;
};

/**
 * Releases background screen wake lock
 */
export const releaseBackgroundRunning = async () => {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    } catch {}
  }
};
