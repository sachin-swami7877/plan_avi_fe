import { useState, useEffect, useRef } from 'react';
import { gameAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

const BET_PHASE_SECONDS = 5;

const RecentRounds = () => {
  const [rounds, setRounds] = useState([]);
  const [betPhaseProgress, setBetPhaseProgress] = useState(0);
  const betPhaseRef = useRef(null);
  const { gameState } = useSocket();
  const betsEnabled = gameState.betsEnabled !== false;

  useEffect(() => {
    if (!betsEnabled) return;
    const fetchRounds = async () => {
      try {
        const res = await gameAPI.getRounds();
        setRounds(res.data.slice(0, 15));
      } catch (error) {
        console.error('Failed to fetch rounds:', error);
      }
    };
    fetchRounds();
    const interval = setInterval(fetchRounds, 5000);
    return () => clearInterval(interval);
  }, [betsEnabled]);

  // Purple progress bar: 5-second countdown when status is "waiting"
  useEffect(() => {
    if (gameState.status !== 'waiting') {
      setBetPhaseProgress(0);
      if (betPhaseRef.current) {
        clearInterval(betPhaseRef.current);
        betPhaseRef.current = null;
      }
      return;
    }

    setBetPhaseProgress(100);
    let elapsed = 0;
    betPhaseRef.current = setInterval(() => {
      elapsed += 100;
      const p = Math.max(0, 100 - (elapsed / (BET_PHASE_SECONDS * 1000)) * 100);
      setBetPhaseProgress(p);
      if (p <= 0 && betPhaseRef.current) {
        clearInterval(betPhaseRef.current);
        betPhaseRef.current = null;
      }
    }, 100);

    return () => {
      if (betPhaseRef.current) clearInterval(betPhaseRef.current);
    };
  }, [gameState.status, gameState.roundId]);

  const getColor = (multiplier) => {
    if (multiplier < 1.2) return 'bg-red-500/90';
    if (multiplier >= 6) return 'bg-fuchsia-500/90';
    if (multiplier >= 3) return 'bg-violet-500/90';
    return 'bg-sky-500/90';
  };

  return (
    <div className="space-y-2">
      {!betsEnabled && (
        <p className="text-amber-400/90 text-sm font-medium">Bets paused</p>
      )}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {rounds.map((round, index) => (
          <div
            key={round._id || index}
            className={`${getColor(round.crashMultiplier)} text-white px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0`}
          >
            {round.crashMultiplier?.toFixed(2)}x
          </div>
        ))}
        {rounds.length === 0 && (
          <span className="text-white/50 text-sm py-1">No rounds yet</span>
        )}
      </div>

      {/* Purple progress bar – time until round starts (place bets phase) */}
      {gameState.status === 'waiting' && (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-100 ease-linear"
            style={{ width: `${betPhaseProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default RecentRounds;
