import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let messaging = null;

export function initFirebaseMessaging() {
  if (messaging) return messaging;
  if (!firebaseConfig.apiKey) {
    console.warn('[FCM] Firebase config not set — push notifications disabled');
    return null;
  }
  try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.error('[FCM] Init failed:', err.message);
    return null;
  }
}

export async function requestNotificationPermission() {
  const m = initFirebaseMessaging();
  if (!m) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('[FCM] Permission denied');
    return null;
  }

  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(m, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
    });
    return token;
  } catch (err) {
    console.error('[FCM] Token error:', err.message);
    return null;
  }
}

export function onForegroundMessage(callback) {
  const m = initFirebaseMessaging();
  if (!m) return () => {};
  return onMessage(m, callback);
}
