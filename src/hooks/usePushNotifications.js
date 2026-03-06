import { useEffect, useRef } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '../config/firebase';
import { notificationAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function usePushNotifications(user) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    initialized.current = true;

    (async () => {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          await notificationAPI.saveFcmToken(token);
        }
      } catch (err) {
        console.error('[Push] Setup error:', err.message);
      }
    })();

    // Show foreground notifications as toast
    const unsubscribe = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        toast(body || title, { icon: '🔔', duration: 5000 });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);
}
