import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken, removeToken } from '../utils/cookies';
import { playNotificationSound } from '../utils/audioSounds';

export const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [newNotification, setNewNotification] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const { user, updateBalance, updateCommission } = useAuth();
  const updateBalanceRef = useRef(updateBalance);
  updateBalanceRef.current = updateBalance;
  const updateCommissionRef = useRef(updateCommission);
  updateCommissionRef.current = updateCommission;

  const clearNotification = useCallback(() => setNewNotification(null), []);

  useEffect(() => {
    const token = getToken() || localStorage.getItem('token');

    const socketUrl = import.meta.env.VITE_APP_ENVIRONMENT === 'production'
      ? import.meta.env.VITE_APP_PRODUCTION_API_URL
      : import.meta.env.VITE_APP_LOCAL_API_URL;
    const newSocket = io(socketUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // If socket connection is rejected because token was invalidated (logged in elsewhere)
    newSocket.on('connect_error', (err) => {
      if (err?.message === 'SESSION_EXPIRED_OTHER_DEVICE') {
        newSocket.disconnect(); // stop auto-reconnect
        removeToken();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.setItem('logoutReason', 'You have been logged out because your account was logged in from another device.');
        window.location.href = '/login';
      }
    });

    // Real-time notification
    newSocket.on('notification:new', (data) => {
      setNewNotification(data);
      setUnreadNotifCount((c) => c + 1);
      playNotificationSound();
    });

    // Broadcast notification from admin
    newSocket.on('notification:broadcast', (data) => {
      setNewNotification(data);
      setUnreadNotifCount((c) => c + 1);
      playNotificationSound();
    });

    // Real-time active user count
    newSocket.on('app:active-users', (data) => {
      setActiveUserCount(data.count);
    });

    // Real-time wallet balance update (admin approved/adjusted balance)
    newSocket.on('wallet:balance-updated', (data) => {
      if (data?.walletBalance != null) {
        updateBalanceRef.current(data);
      }
    });

    // Real-time referral commission update
    newSocket.on('referral:commission-updated', (data) => {
      if (data?.totalEarned != null) {
        updateCommissionRef.current(data.totalEarned);
      }
    });

    // Force logout when admin blocks user OR user logged in from another device
    newSocket.on('force-logout', (data) => {
      removeToken();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const reason = data?.reason || '';
      if (reason.includes('another device')) {
        localStorage.setItem('logoutReason', 'You have been logged out because your account was logged in from another device.');
      }
      window.location.href = '/login';
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, connected, newNotification, clearNotification, unreadNotifCount, setUnreadNotifCount, activeUserCount }}>
      {children}
    </SocketContext.Provider>
  );
};
