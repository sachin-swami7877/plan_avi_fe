import { useState, useEffect } from 'react';

/**
 * @param {Date|string|null} expiryDate - expiry timestamp
 * @returns {{ minutes: number, seconds: number, display: string, expired: boolean }}
 */
export function useCountdown(expiryDate) {
  const getRemaining = () => {
    if (!expiryDate) return { minutes: 0, seconds: 0, display: '0:00', expired: true };
    const end = new Date(expiryDate);
    const now = new Date();
    let ms = end - now;
    if (ms <= 0) return { minutes: 0, seconds: 0, display: '0:00', expired: true };
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const display = `${minutes}:${String(seconds).padStart(2, '0')}`;
    return { minutes, seconds, display, expired: false };
  };

  const [state, setState] = useState(getRemaining);

  useEffect(() => {
    setState(getRemaining());
    const t = setInterval(() => setState(getRemaining()), 1000);
    return () => clearInterval(t);
  }, [expiryDate]);

  return state;
}

/**
 * Count-up timer from a start time (H:MM:SS)
 * @param {Date|string|null} startDate - when the timer started
 * @returns {{ hours: number, minutes: number, seconds: number, display: string, started: boolean }}
 */
export function useElapsedTimer(startDate) {
  const getElapsed = () => {
    if (!startDate) return { hours: 0, minutes: 0, seconds: 0, display: '0:00:00', started: false };
    const start = new Date(startDate);
    const now = new Date();
    let ms = now - start;
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const display = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return { hours, minutes, seconds, display, started: true };
  };

  const [state, setState] = useState(getElapsed);

  useEffect(() => {
    setState(getElapsed());
    const t = setInterval(() => setState(getElapsed()), 1000);
    return () => clearInterval(t);
  }, [startDate]);

  return state;
}
