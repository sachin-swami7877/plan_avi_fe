import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { newNotification, clearNotification } = useSocket();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Auto-prepend new real-time notifications
  useEffect(() => {
    if (newNotification) {
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === newNotification._id);
        if (exists) return prev;
        return [newNotification, ...prev];
      });
      clearNotification();
    }
  }, [newNotification, clearNotification]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'wallet':
        return '💰';
      case 'game':
        return '🎮';
      case 'admin':
        return '👑';
      default:
        return '🔔';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'wallet':
        return 'bg-green-100';
      case 'game':
        return 'bg-primary-100';
      case 'admin':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
      <Header />
      
      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="text-sm text-primary-700 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No notifications yet</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => !notification.read && markAsRead(notification._id)}
                className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-opacity ${
                  notification.read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(notification.type)}`}>
                    <span className="text-lg">{getTypeIcon(notification.type)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800">{notification.title}</h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Navbar />
    </div>
  );
};

export default Notifications;
