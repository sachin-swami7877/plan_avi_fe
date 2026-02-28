import Header from '../components/Header';
import Navbar from '../components/Navbar';
import GameGraph from '../components/GameGraph';
import BetPanel from '../components/BetPanel';
import RecentRounds from '../components/RecentRounds';
import LiveBets from '../components/LiveBets';
import { useSocket } from '../context/SocketContext';

const Aviator = () => {
  const { gameState } = useSocket();
  const betsEnabled = gameState.betsEnabled !== false;

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
