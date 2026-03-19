import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('admin:wallet-request', (data) => {
      setNotifications(prev => [{
        type: 'deposit',
        userName: data.userName,
        userPhone: data.userPhone,
        amount: data.request.amount,
        createdAt: new Date()
      }, ...prev]);
    });

    socket.on('admin:withdrawal-request', (data) => {
      setNotifications(prev => [{
        type: 'withdrawal',
        userName: data.userName,
        userPhone: data.userPhone,
        amount: data.request.amount,
        createdAt: new Date()
      }, ...prev]);
    });

    socket.on('admin:ludo-result-request', (data) => {
      setNotifications(prev => [{
        type: 'ludo_result',
        userName: data.userName || 'Player',
        matchId: data.matchId,
        createdAt: new Date()
      }, ...prev]);
    });

    socket.on('admin:kyc-request', (data) => {
      setNotifications(prev => [{
        type: 'kyc',
        userName: data.userName || 'User',
        userPhone: data.userPhone,
        userId: data.userId,
        createdAt: new Date()
      }, ...prev]);
    });

    return () => {
      socket.off('admin:wallet-request');
      socket.off('admin:withdrawal-request');
      socket.off('admin:ludo-result-request');
      socket.off('admin:kyc-request');
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const res = await adminAPI.getNotifications();
      // Transform pending requests into notifications format
      const transformed = res.data.map(req => {
        if (req.type === 'ludo_result') {
          return {
            _id: req._id,
            type: 'ludo_result',
            userName: req.userName || req.claims?.[0]?.userName || 'Player',
            matchId: req.matchId,
            claims: req.claims,
            createdAt: req.createdAt,
          };
        }
        return {
          _id: req._id,
          type: req.type,
          userName: req.userId?.name,
          userPhone: req.userId?.phone,
          amount: req.amount,
          createdAt: req.createdAt,
        };
      });
      setNotifications(transformed);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type) => {
    switch (type) {
      case 'deposit':
        return { icon: '💰', color: 'bg-green-100', text: 'Deposit Request' };
      case 'withdrawal':
        return { icon: '💸', color: 'bg-red-100', text: 'Withdrawal Request' };
      case 'ludo_result':
        return { icon: '🎲', color: 'bg-purple-100', text: 'Ludo Result Request' };
      case 'kyc':
        return { icon: '🪪', color: 'bg-blue-100', text: 'KYC Request' };
      default:
        return { icon: '🔔', color: 'bg-gray-100', text: 'Notification' };
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          No pending notifications
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const typeInfo = getTypeInfo(notification.type);
            return (
              <div
                key={notification._id || index}
                className={`bg-white rounded-xl p-4 shadow-sm ${notification.type === 'kyc' || notification.type === 'ludo_result' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => {
                  if (notification.type === 'kyc') navigate('/admin/kyc');
                  else if (notification.type === 'ludo_result') navigate('/admin/ludo');
                }}
              >
                <div className="flex gap-4">
                  <div className={`w-12 h-12 ${typeInfo.color} rounded-full flex items-center justify-center text-xl flex-shrink-0`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-800">{typeInfo.text}</h3>
                        {notification.type === 'ludo_result' ? (
                          <p className="text-sm text-gray-600">
                            {notification.userName} submitted result
                            {notification.claims?.length > 1 && ` (${notification.claims.length} claims)`}
                          </p>
                        ) : notification.type === 'kyc' ? (
                          <p className="text-sm text-gray-600">
                            {notification.userName} {notification.userPhone && `(${notification.userPhone})`} — tap to review
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {notification.userName} ({notification.userPhone})
                          </p>
                        )}
                      </div>
                      {notification.type !== 'ludo_result' && notification.type !== 'kyc' && (
                        <p className={`font-bold ${notification.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{notification.amount}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
