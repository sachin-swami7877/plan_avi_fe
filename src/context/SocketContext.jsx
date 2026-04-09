import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { gameAPI } from '../services/api';
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
  const [gameState, setGameState] = useState({
    status: 'idle',
    multiplier: 1.0,
    roundId: null,
    countdown: null,
    showGo: false,
    betsEnabled: true,
  });
  const [newNotification, setNewNotification] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const { user, updateBalance } = useAuth();
  const goTimeoutRef = useRef(null);
  const updateBalanceRef = useRef(updateBalance);
  updateBalanceRef.current = updateBalance;

  const clearNotification = useCallback(() => setNewNotification(null), []);

  // Fetch initial game state via API (includes betsEnabled)
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const res = await gameAPI.getState();
        if (res.data) {
          setGameState((prev) => ({
            ...prev,
            ...(res.data.status && {
              status: res.data.status,
              multiplier: res.data.multiplier ?? 1.0,
              roundId: res.data.round?.roundId ?? null
            }),
            betsEnabled: res.data.betsEnabled !== false
          }));
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    };
    fetchInitialState();
  }, []);

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
      newSocket.emit('game:subscribe');
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

    // Game events — always spread prev to preserve betsEnabled and other fields
    newSocket.on('game:waiting', (data) => {
      if (goTimeoutRef.current) clearTimeout(goTimeoutRef.current);
      setGameState((prev) => ({
        ...prev,
        status: 'waiting',
        multiplier: 1.0,
        roundId: data.roundId,
        countdown: null,
        showGo: true,
      }));
      goTimeoutRef.current = setTimeout(() => {
        setGameState((prev) => ({ ...prev, showGo: false }));
      }, 800);
    });

    newSocket.on('game:start', (data) => {
      setGameState((prev) => ({
        ...prev,
        status: 'running',
        roundId: data.roundId,
        multiplier: 1.0,
      }));
    });

    newSocket.on('game:tick', (data) => {
      setGameState((prev) => ({
        ...prev,
        multiplier: data.multiplier,
      }));
    });

    newSocket.on('game:crash', (data) => {
      setGameState((prev) => ({
        ...prev,
        status: 'crashed',
        multiplier: data.crashMultiplier,
        roundId: data.roundId,
        crashMultiplier: data.crashMultiplier,
        countdown: null,
      }));
    });

    newSocket.on('game:countdown', (data) => {
      setGameState((prev) => ({ ...prev, countdown: data.secondsLeft }));
    });

    // Real-time notification
    newSocket.on('notification:new', (data) => {
      setNewNotification(data);
      setUnreadNotifCount((c) => c + 1);
      playNotificationSound();
    });

    newSocket.on('settings:bets-enabled', (data) => {
      setGameState((prev) => {
        const next = { ...prev, betsEnabled: data.enabled };
        if (data.enabled === false && prev.status === 'running') {
          next.status = 'crashed';
          next.crashMultiplier = prev.multiplier ?? 0;
        }
        if (data.enabled === false && prev.status === 'waiting') {
          next.status = 'idle';
          next.roundId = null;
        }
        return next;
      });
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
      if (goTimeoutRef.current) clearTimeout(goTimeoutRef.current);
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, connected, gameState, newNotification, clearNotification, unreadNotifCount, setUnreadNotifCount, activeUserCount }}>
      {children}
    </SocketContext.Provider>
  );
};
