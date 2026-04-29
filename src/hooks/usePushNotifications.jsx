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

    // Show foreground notifications as rich toast (when user has the page open)
    const unsubscribe = onForegroundMessage((payload) => {
      const notif = payload.notification || {};
      const data = payload.data || {};
      const title = notif.title || data.title || 'RushkroLudo';
      const body = notif.body || data.body || '';
      const url = data.websiteUrl || data.link;
      const imageUrl = data.imageUrl || notif.image;
      if (!title && !body) return;

      toast.custom((t) => (
        <div
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-sm cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
            toast.dismiss(t.id);
          }}
        >
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
          )}
          <div className="flex items-start gap-2">
            <span className="text-xl">🔔</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
              {body && <p className="text-sm text-gray-600 mt-0.5">{body}</p>}
              {url && <p className="text-xs text-blue-500 mt-1">Tap to open →</p>}
            </div>
          </div>
        </div>
      ), { duration: 8000, position: 'top-center' });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);
}
