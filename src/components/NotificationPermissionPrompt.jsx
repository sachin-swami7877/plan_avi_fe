import { useEffect, useState } from 'react';
import { requestNotificationPermission } from '../config/firebase';
import { notificationAPI } from '../services/api';
import toast from 'react-hot-toast';

const DISMISS_KEY = 'notif_prompt_dismissed_until';
const SHOW_DELAY_MS = 4000; // wait 4s after user lands so we don't interrupt initial UX

export default function NotificationPermissionPrompt({ user }) {
  const [show, setShow] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    // Only show prompt when permission is in 'default' state — never asked yet
    if (Notification.permission !== 'default') return;
    // Respect "remind me later" — skip if dismissed within last 3 days
    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < dismissedUntil) return;

    const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [user]);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        await notificationAPI.saveFcmToken(token);
        toast.success('Notifications enabled! 🔔');
      } else {
        toast('Permission denied. You can enable it later in browser settings.', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Could not enable notifications');
    } finally {
      setEnabling(false);
      setShow(false);
    }
  };

  const handleLater = () => {
    // Skip prompt for 3 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none">
      <div className="mx-auto max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 pointer-events-auto animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">
            🔔
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm">Get instant updates</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Free spins, referral bonuses, big wins & important alerts — directly on your phone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleLater}
            disabled={enabling}
            className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold disabled:opacity-50"
          >
            Later
          </button>
          <button
            onClick={handleEnable}
            disabled={enabling}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {enabling ? 'Enabling...' : 'Enable'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
