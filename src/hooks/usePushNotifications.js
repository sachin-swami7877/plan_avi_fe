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
        // Only attempt token registration if browser hasn't already denied
        if (Notification.permission === 'denied') {
          console.log('[Push] Permission denied previously — skipping');
          return;
        }
        const token = await requestNotificationPermission();
        if (token) {
          await notificationAPI.saveFcmToken(token);
          console.log('[Push] Token registered');
        }
      } catch (err) {
        console.error('[Push] Setup error:', err.message);
      }
    })();

    // Show foreground notifications as toast (when user has the page open)
    const unsubscribe = onForegroundMessage((payload) => {
      const notif = payload.notification || {};
      const data = payload.data || {};
      const title = notif.title || data.title;
      const body = notif.body || data.body;
      const url = data.websiteUrl || data.link;
      if (title || body) {
        toast(body || title, {
          icon: '🔔',
          duration: 6000,
          ...(url && {
            // Click-to-open behavior is handled by the toast UI in App-level listener (broadcasts).
            // For other foreground messages, simple toast is enough.
          }),
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);
}
