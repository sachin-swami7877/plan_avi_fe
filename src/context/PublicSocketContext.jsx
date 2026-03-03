import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { SocketContext } from './SocketContext';
import { gameAPI } from '../services/api';

export const PublicSocketProvider = ({ children }) => {
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
  const [activeUserCount, setActiveUserCount] = useState(0);
  const goTimeoutRef = useRef(null);

  // Fetch initial game state via public API
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
              roundId: res.data.round?.roundId ?? null,
            }),
            betsEnabled: res.data.betsEnabled !== false,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    };
    fetchInitialState();
  }, []);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_APP_ENVIRONMENT === 'production'
      ? import.meta.env.VITE_APP_PRODUCTION_API_URL
      : import.meta.env.VITE_APP_LOCAL_API_URL;

    // Connect WITHOUT auth token
    const newSocket = io(socketUrl, { auth: {} });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('game:subscribe');
    });
    newSocket.on('disconnect', () => setConnected(false));

    // Game events (same as SocketContext)
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
      setGameState((prev) => ({ ...prev, multiplier: data.multiplier }));
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

    newSocket.on('app:active-users', (data) => {
      setActiveUserCount(data.count);
    });

    setSocket(newSocket);

    return () => {
      if (goTimeoutRef.current) clearTimeout(goTimeoutRef.current);
      newSocket.disconnect();
    };
  }, []);

  // Provide through the same SocketContext so useSocket() works in child components
  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        gameState,
        activeUserCount,
        newNotification: null,
        clearNotification: () => {},
        unreadNotifCount: 0,
        setUnreadNotifCount: () => {},
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
