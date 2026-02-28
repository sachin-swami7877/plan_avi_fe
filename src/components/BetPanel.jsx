import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { gameAPI } from '../services/api';

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

const BetPanel = () => {
  const [betAmount, setBetAmount] = useState(10);
  const [hasBet, setHasBet] = useState(false);
  const [currentBet, setCurrentBet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [placeBetDisabledUntil, setPlaceBetDisabledUntil] = useState(null);

  const prevRoundRef = useRef(null);
  const restoredForRound = useRef(null);
  const runningStartTimeRef = useRef(null);

  const { gameState } = useSocket();
  const { user, updateBalance } = useAuth();

  // Track when game starts running and disable Place Bet for 3 seconds
  useEffect(() => {
    if (gameState.status === 'running' && runningStartTimeRef.current === null) {
      runningStartTimeRef.current = Date.now();
      setPlaceBetDisabledUntil(Date.now() + 3000); // Disable for 3 seconds
    } else if (gameState.status !== 'running') {
      runningStartTimeRef.current = null;
      setPlaceBetDisabledUntil(null);
    }
  }, [gameState.status]);

  // Check if Place Bet should still be disabled
  useEffect(() => {
    if (placeBetDisabledUntil && Date.now() >= placeBetDisabledUntil) {
      setPlaceBetDisabledUntil(null);
    }
  }, [placeBetDisabledUntil, gameState.status]);

  // Reset bet state on new round
  useEffect(() => {
    if (gameState.status === 'waiting' && prevRoundRef.current !== gameState.roundId) {
      setHasBet(false);
      setCurrentBet(null);
      setMessage('');
      prevRoundRef.current = gameState.roundId;
    }
  }, [gameState.status, gameState.roundId]);

  // Restore bet state on mount / refresh — check if user has active bet in current round
  useEffect(() => {
    if (!user || hasBet) return;
    const status = gameState.status;
    if (status !== 'running' && status !== 'waiting') return;
    if (restoredForRound.current === gameState.roundId) return;
    restoredForRound.current = gameState.roundId;

    const checkActiveBet = async () => {
      try {
        const res = await gameAPI.getCurrentBets();
        const bets = res.data || [];
        const myBet = bets.find((b) => b.userName === user.name && b.status === 'active');
        if (myBet) {
          setHasBet(true);
          setCurrentBet({ amount: myBet.amount });
          prevRoundRef.current = gameState.roundId;
        }
      } catch {
        // silent
      }
    };
    checkActiveBet();
  }, [gameState.status, gameState.roundId, user]);

  const handlePlaceBet = async () => {
    if (betAmount < 10) {
      setMessage('Minimum bet is ₹10');
      return;
    }
    if (betAmount > (user?.walletBalance ?? 0)) {
      setMessage('Insufficient balance');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await gameAPI.placeBet(betAmount);
      setHasBet(true);
      setCurrentBet(res.data.bet);
      updateBalance(res.data.newBalance);
      setMessage('Bet placed!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  const handleCashOut = async () => {
    setLoading(true);
    try {
      const res = await gameAPI.cashOut();
      setHasBet(false);
      setCurrentBet(null);
      updateBalance(res.data.newBalance);
      setMessage(`Won ₹${res.data.profit.toFixed(2)} @ ${res.data.cashOutMultiplier}x`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to cash out');
    } finally {
      setLoading(false);
    }
  };

  const betsEnabled = gameState.betsEnabled !== false;
  // Price buttons can be clicked even when running (but Place Bet button will be disabled)
  const canChangeAmount = !hasBet && betsEnabled;
  // Place Bet can only be clicked when waiting OR after 3 seconds of running
  const canPlaceBet = gameState.status === 'waiting' && !hasBet && betsEnabled && !placeBetDisabledUntil;
  const canCashOut = gameState.status === 'running' && hasBet;

  return (
    <div className="bg-[#1a1a2e]/90 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
      {/* Amount input + Bet button row */}
      <div className="flex gap-2 items-stretch mb-2">
        {/* Left: amount input with +/- */}
        <div className="flex items-center bg-black/40 rounded-xl overflow-hidden h-14 w-2/5">
          <button
            type="button"
            onClick={() => setBetAmount((prev) => Math.max(10, prev - 10))}
            disabled={!canChangeAmount || betAmount <= 10}
            className="w-11 h-full flex items-center justify-center text-white text-xl font-bold hover:bg-white/10 transition disabled:opacity-30"
          >
            −
          </button>
          <input
            type="number"
            min="10"
            value={betAmount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 0) setBetAmount(v);
            }}
            disabled={!canChangeAmount}
            className="flex-1 bg-transparent text-white text-center font-bold text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setBetAmount((prev) => prev + 10)}
            disabled={!canChangeAmount}
            className="w-11 h-full flex items-center justify-center text-white text-xl font-bold hover:bg-white/10 transition disabled:opacity-30"
          >
            +
          </button>
        </div>

        {/* Right: big Bet / Cash Out button */}
        <div className="flex-1">
          {!hasBet ? (
            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={loading || !canPlaceBet || placeBetDisabledUntil}
              className="w-full h-full rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 active:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-600/20 flex flex-col items-center justify-center min-h-[56px]"
            >
              <span className="text-base">
                {loading ? 'Placing...' : placeBetDisabledUntil ? 'Wait...' : 'Bet'}
              </span>
              <span className="text-lg font-bold">₹{betAmount.toLocaleString()}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCashOut}
              disabled={loading || !canCashOut}
              className={`w-full h-full rounded-xl font-bold text-lg transition-all shadow-lg flex flex-col items-center justify-center min-h-[56px] ${
                canCashOut
                  ? 'bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white animate-pulse shadow-orange-500/30'
                  : 'bg-white/20 text-white/70 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span>Cashing out...</span>
              ) : canCashOut ? (
                <>
                  <span className="text-base">Cash Out</span>
                  <span className="text-lg font-bold">₹{(currentBet?.amount * gameState.multiplier).toFixed(2)}</span>
                </>
              ) : (
                <span className="text-sm">Waiting…</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-5 gap-1.5 mb-1">
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => setBetAmount(amt)}
            disabled={!canChangeAmount}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              betAmount === amt
                ? 'bg-green-600/30 text-green-400 ring-1 ring-green-500/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            } disabled:opacity-30`}
          >
            {amt >= 1000 ? `${amt / 1000}K` : amt}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <p
          className={`mt-1 text-center text-xs font-medium ${
            message.includes('Won') || message.includes('placed')
              ? 'text-emerald-400'
              : message.includes('Failed') || message.includes('Insufficient') || message.includes('Minimum')
                ? 'text-red-400'
                : 'text-white/70'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default BetPanel;
