import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import GameGraph from '../components/GameGraph';
import BetPanel from '../components/BetPanel';
import RecentRounds from '../components/RecentRounds';
import LiveBets from '../components/LiveBets';
import { useSocket } from '../context/SocketContext';
import { settingsAPI } from '../services/api';

const Aviator = () => {
  const { gameState } = useSocket();
  const betsEnabled = gameState.betsEnabled !== false;
  const [comingSoon, setComingSoon] = useState(false);

  useEffect(() => {
    settingsAPI.getAviatorStatus().then(res => {
      if (res.data?.aviatorComingSoon) setComingSoon(true);
    }).catch(() => {});
  }, []);

  if (comingSoon) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pb-24 overflow-x-hidden">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 w-full flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center text-5xl mb-6">
            ✈️
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Coming Soon</h2>
          <p className="text-white/50 text-base leading-relaxed max-w-xs">
            Aviator game is coming soon! Stay tuned for exciting crash game action.
          </p>
          <div className="mt-8 px-6 py-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/40 text-sm">We're working on something amazing for you</p>
          </div>
        </div>
        <Navbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24 overflow-x-hidden">
      <Header />
      <div className="max-w-md mx-auto px-3 py-3 space-y-3 w-full min-w-0">
        {/* Previous multipliers strip */}
        <RecentRounds />

        {/* Game graph + multiplier */}
        <GameGraph betsEnabled={betsEnabled} />

        {/* Bet panel: amount + BET INR button */}
        <BetPanel />

        {/* All Bets / My Bets / Top + table with 10 fake users */}
        <LiveBets />
      </div>

      <Navbar />
    </div>
  );
};

export default Aviator;
