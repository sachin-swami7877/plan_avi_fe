import { useNavigate } from 'react-router-dom';
import { PublicSocketProvider } from '../context/PublicSocketContext';
import { useSocket } from '../context/SocketContext';
import GameGraph from '../components/GameGraph';
import RecentRounds from '../components/RecentRounds';
import LiveBets from '../components/LiveBets';

const AviatorPublicContent = () => {
  const navigate = useNavigate();
  const { gameState, activeUserCount, connected } = useSocket();
  const betsEnabled = gameState.betsEnabled !== false;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-8 overflow-x-hidden">
      {/* Simplified header with login CTA */}
      <header className="bg-[#0d0d12] border-b border-white/10 px-3 py-2.5 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-white leading-none">
              Rushkro<span className="text-red-500">Ludo</span>
            </span>
            <div className="flex items-center gap-1 ml-2">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {activeUserCount > 0 && (
                <span className="text-emerald-400/70 text-[10px] font-medium">{activeUserCount} online</span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Login to Play
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3 py-3 space-y-3 w-full min-w-0">
        <RecentRounds />
        <GameGraph betsEnabled={betsEnabled} />

        {/* Login CTA instead of BetPanel */}
        <div className="bg-[#1a1a2e]/90 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-white/70 text-sm mb-3">Want to place bets and win?</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Login to Play
          </button>
        </div>

        <LiveBets />
      </div>
    </div>
  );
};

const AviatorPublic = () => (
  <PublicSocketProvider>
    <AviatorPublicContent />
  </PublicSocketProvider>
);

export default AviatorPublic;
