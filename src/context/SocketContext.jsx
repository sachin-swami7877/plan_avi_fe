import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { gameAPI } from '../services/api';
import { getToken } from '../utils/cookies';

const SocketContext = createContext();

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

    // Real-time wallet balance update (admin approved/adjusted balance)
    newSocket.on('wallet:balance-updated', (data) => {
      if (data?.walletBalance != null) {
        updateBalanceRef.current(data.walletBalance);
      }
    });

    setSocket(newSocket);

    return () => {
      if (goTimeoutRef.current) clearTimeout(goTimeoutRef.current);
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected, gameState, newNotification, clearNotification, unreadNotifCount, setUnreadNotifCount }}>
      {children}
    </SocketContext.Provider>
  );
};
