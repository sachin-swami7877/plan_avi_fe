import { useState, useEffect, useMemo, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { gameAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Pool of fake user data (names + avatars)
const FAKE_POOL = [
  { name: 'd***0', avatar: '🦝' },
  { name: 'd***9', avatar: '😎' },
  { name: 'd***5', avatar: '🐵' },
  { name: 'd***8', avatar: '💸' },
  { name: 'd***1', avatar: '🦅' },
  { name: 'r***7', avatar: '🍀' },
  { name: 'a***n', avatar: '🐱' },
  { name: 't***2', avatar: '🎯' },
  { name: 'p***w', avatar: '🐶' },
  { name: 'n***l', avatar: '🦊' },
  { name: 'm***v', avatar: '🐻' },
  { name: 'k***p', avatar: '🎮' },
];

const BET_AMOUNTS = [50, 100, 150, 200, 300, 500, 750, 1000];

function randomBet() {
  return BET_AMOUNTS[Math.floor(Math.random() * BET_AMOUNTS.length)];
}

function generateFakeUsers(count = 10) {
  // Repeat FAKE_POOL to support counts larger than pool size
  const repeatedPool = [];
  while (repeatedPool.length < count) {
    repeatedPool.push(...FAKE_POOL);
  }
  const shuffled = repeatedPool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((u, i) => ({
    id: `fake-${i}-${Date.now()}-${Math.random()}`,
    name: u.name,
    avatar: u.avatar,
    bet: randomBet(),
    mult: null,
    cashout: null,
    isFake: true,
    isMe: false,
  }));
}

const maskName = (name) => {
  if (!name || name.length < 3) return '***';
  return name[0] + '***' + name[name.length - 1];
};

const LiveBets = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [bets, setBets] = useState([]);
  const [fakeUsers, setFakeUsers] = useState([]);
  const [dummyUserCount, setDummyUserCount] = useState(10);
  const cashoutTimersRef = useRef([]);
  const hasGeneratedForRound = useRef(null);
  const { socket, gameState } = useSocket();
  const { user } = useAuth();

  // Fetch dummy user count from settings
  useEffect(() => {
    const fetchDummyCount = async () => {
      try {
        const res = await settingsAPI.getSupport();
        if (res.data?.dummyUserCount) {
          setDummyUserCount(res.data.dummyUserCount);
        }
      } catch {
        // Silent fail, use default
      }
    };
    fetchDummyCount();
  }, []);

  // Generate fake users only when game starts (running status)
  useEffect(() => {
    const status = gameState.status;
    const roundId = gameState.roundId;

    // Only generate once per round when game starts running
    if (roundId && hasGeneratedForRound.current !== roundId && status === 'running') {
      hasGeneratedForRound.current = roundId;
      const fakes = generateFakeUsers(dummyUserCount);
      setFakeUsers(fakes);
      cashoutTimersRef.current.forEach(clearTimeout);
      cashoutTimersRef.current = [];
      scheduleFakeCashouts(fakes);
    }
    
    // Clear fake users when round ends
    if (status === 'crashed' || status === 'waiting') {
      if (hasGeneratedForRound.current !== roundId) {
        setFakeUsers([]);
      }
    }
  }, [gameState.roundId, gameState.status, dummyUserCount]);

  // When round transitions to running, ensure cashouts are scheduled
  useEffect(() => {
    if (gameState.status !== 'running') return;

    // Reset cashout state & schedule if not already done
    setFakeUsers((prev) => {
      // Only schedule if we haven't already (check if any have mult set)
      const anyHasCashout = prev.some((u) => u.mult != null);
      if (anyHasCashout) return prev; // already scheduled

      const updated = prev.map((u) => ({ ...u, mult: null, cashout: null }));
      scheduleFakeCashouts(updated);
      return updated;
    });

    return () => {
      // Don't clear timers here, let them complete
    };
  }, [gameState.status]);

  function scheduleFakeCashouts(users) {
    // Only 33% of dummy users will cashout
    const cashoutCount = Math.floor(users.length * 0.33);
    const indices = users
      .map((_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, cashoutCount);

    indices.forEach((idx) => {
      const delay = 1500 + Math.random() * 8000;
      const timer = setTimeout(() => {
        setFakeUsers((curr) =>
          curr.map((u, i) => {
            if (i !== idx || u.mult != null) return u;
            const mult = Number((1.1 + Math.random() * 3.5).toFixed(2));
            return { ...u, mult, cashout: Number((u.bet * mult).toFixed(2)) };
          })
        );
      }, delay);
      cashoutTimersRef.current.push(timer);
    });
  }

  // When crashed, clear timers
  useEffect(() => {
    if (gameState.status === 'crashed') {
      cashoutTimersRef.current.forEach(clearTimeout);
      cashoutTimersRef.current = [];
    }
  }, [gameState.status]);

  // Fetch real bets from API on mount AND on roundId change
  useEffect(() => {
    const fetchBets = async () => {
      try {
        const res = await gameAPI.getCurrentBets();
        setBets(res.data || []);
      } catch {
        setBets([]);
      }
    };

    // Fetch immediately on mount
    fetchBets();

    // Also re-fetch when roundId changes
  }, [gameState.roundId]);

  // Also fetch real bets on game status changes (catch running after refresh)
  useEffect(() => {
    if (gameState.status === 'running' || gameState.status === 'waiting') {
      const fetchBets = async () => {
        try {
          const res = await gameAPI.getCurrentBets();
          setBets(res.data || []);
        } catch {
          // silent
        }
      };
      fetchBets();
    }
  }, [gameState.status]);

  // Listen for real-time bet events
  useEffect(() => {
    if (!socket) return;
    socket.on('bet:placed', (data) => {
      setBets((prev) => {
        // Prevent duplicates
        const exists = prev.some((b) => b.userName === data.userName && b.amount === data.amount);
        if (exists) return prev;
        return [
          { userName: data.userName, amount: data.amount, status: 'active', userId: data.userId },
          ...prev,
        ];
      });
    });
    socket.on('bet:cashout', (data) => {
      setBets((prev) =>
        prev.map((b) =>
          b.userName === data.userName
            ? { ...b, status: 'won', cashOutMultiplier: data.multiplier, profit: data.profit }
            : b
        )
      );
    });
    return () => {
      socket.off('bet:placed');
      socket.off('bet:cashout');
    };
  }, [socket]);

  const realRows = useMemo(
    () =>
      bets.map((b, i) => ({
        id: `real-${i}-${b.userName}-${b.amount}`,
        name: maskName(b.userName),
        avatar: null,
        bet: b.amount,
        mult: b.cashOutMultiplier ?? null,
        cashout: b.profit != null ? b.amount + b.profit : null,
        isMe: user?.name && b.userName === user.name,
        isFake: false,
      })),
    [bets, user?.name]
  );

  const allRows = useMemo(() => [...realRows, ...fakeUsers], [realRows, fakeUsers]);
  const myRows = useMemo(() => realRows.filter((r) => r.isMe), [realRows]);
  const topRows = useMemo(
    () => [...allRows].filter((r) => r.cashout != null).sort((a, b) => b.cashout - a.cashout).slice(0, 20),
    [allRows]
  );

  const rows = activeTab === 'all' ? allRows : activeTab === 'my' ? myRows : topRows;
  const totalCount = rows.length;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex border-b border-white/10">
        {['all', 'my', 'top'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'bg-white/15 text-white border-b-2 border-emerald-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {tab === 'all' ? 'All Bets' : tab === 'my' ? 'My Bets' : 'Top'}
          </button>
        ))}
      </div>

      <div className="px-3 py-2 flex justify-between items-center text-white/70 text-xs">
        <span className="font-semibold uppercase">
          {activeTab === 'all' ? 'All Bets' : activeTab === 'my' ? 'My Bets' : 'Top'} ({totalCount})
        </span>
      </div>

      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/60 border-b border-white/10">
              <th className="text-left py-2 px-3 font-medium">Player</th>
              <th className="text-right py-2 px-3 font-medium">Bet INR</th>
              <th className="text-right py-2 px-3 font-medium">X</th>
              <th className="text-right py-2 px-3 font-medium">Win INR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-white/5 ${row.isMe ? 'bg-emerald-500/10' : ''} ${
                  row.mult != null ? 'bg-emerald-900/10' : ''
                }`}
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
                      {row.avatar || row.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-white font-medium text-xs">{row.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-white text-xs">
                  {typeof row.bet === 'number' ? row.bet.toFixed(2) : row.bet}
                </td>
                <td className="py-2.5 px-3 text-right text-xs">
                  {row.mult != null ? (
                    <span className="text-emerald-400 font-semibold">{row.mult.toFixed(2)}x</span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-xs">
                  {row.cashout != null ? (
                    <span className="text-emerald-400 font-semibold">{row.cashout.toFixed(2)}</span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="py-8 text-center text-white/50 text-sm">
          {activeTab === 'my' ? 'You have no bets this round' : 'Waiting for bets...'}
        </div>
      )}
    </div>
  );
};

export default LiveBets;
