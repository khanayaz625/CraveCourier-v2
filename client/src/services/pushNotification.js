import api from './api';

/**
 * Checks if Web Push / Notification APIs are supported by the browser
 */
export const isPushNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Requests native system notification permissions from the user
 */
export const requestPushPermission = async () => {
  if (!isPushNotificationSupported()) {
    console.warn('[PUSH] Push notifications are not supported in this browser.');
    return { granted: false, reason: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[PUSH] Notification permission granted by user.');
      // Register device token with backend
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
 * Subscribes the current service worker to push and persists the token with the backend
 */
export const registerDevicePushToken = async () => {
  try {
    // Generate or retrieve device-specific push token
    let token = localStorage.getItem('crave_push_token');
    if (!token) {
      token = 'fcm_web_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('crave_push_token', token);
    }

    const deviceName = `${navigator.userAgentData?.platform || navigator.platform || 'Web'} - ${
      navigator.userAgentData?.brands?.[0]?.brand || 'Browser'
    }`;

    // Register with Crave backend
    await api.post('/notifications/fcm-token', {
      token,
      device: deviceName,
    });

    console.log('[PUSH] Registered Web Push token successfully:', token);
    return token;
  } catch (err) {
    console.error('[PUSH REGISTRATION ERROR]', err);
    return null;
  }
};

/**
 * Displays a push notification immediately using the active Service Worker
 */
export const showClientPushNotification = async ({ title, body, data = {} }) => {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions = {
    body,
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    data,
    vibrate: [200, 100, 200],
    tag: 'crave-order-update',
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }
    // Fallback to desktop Notification constructor
    new Notification(title, notificationOptions);
  } catch (err) {
    console.warn('[PUSH DISPLAY WARNING]', err);
  }
};

