import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { adminAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import GameGraph from '../components/GameGraph';

const Bets = () => {
  const [bets, setBets] = useState([]);
  const [currentRoundData, setCurrentRoundData] = useState({ round: null, state: {}, bets: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState('live');
  const [crashing, setCrashing] = useState(false);
  const [message, setMessage] = useState('');
  const [crashConfirm, setCrashConfirm] = useState({ open: false, betId: null, userName: '' });
  const [betsEnabled, setBetsEnabled] = useState(true);
  const { socket, gameState } = useSocket();

  // Next-crash admin control
  const [nextCrashInput, setNextCrashInput] = useState('');
  const [adminNextCrash, setAdminNextCrash] = useState(null);
  const [settingCrash, setSettingCrash] = useState(false);

  useEffect(() => {
    fetchBets();
  }, [filter]);

  // Fetch settings and listen for changes
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await adminAPI.getSettings();
        setBetsEnabled(res.data.betsEnabled);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    fetchSettings();

    // Listen for settings updates via socket
    if (socket) {
      socket.on('settings:bets-enabled', (data) => {
        setBetsEnabled(data.enabled);
      });
      return () => {
        socket.off('settings:bets-enabled');
      };
    }
  }, [socket]);

  const fetchCurrentRound = async () => {
    try {
      const res = await adminAPI.getCurrentRoundWithBets();
      setCurrentRoundData(res.data);
      // Also capture admin next crash from state
      if (res.data.state?.adminNextCrash !== undefined) {
        setAdminNextCrash(res.data.state.adminNextCrash);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchCurrentRound();
    const interval = setInterval(fetchCurrentRound, 2000);
    return () => clearInterval(interval);
  }, [gameState?.roundId]);

  const fetchBets = async () => {
    try {
      const res = await adminAPI.getBets({ status: filter || undefined });
      // Handle pagination response structure
      const betsData = res.data?.data || res.data || [];
      setBets(Array.isArray(betsData) ? betsData : []);
    } catch (error) {
      console.error('Failed to fetch bets:', error);
      setBets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleForceCrashRound = async () => {
    if (!currentRoundData.state?.isRunning) {
      setMessage('No round is running');
      return;
    }
    setCrashing(true);
    setMessage('');
    try {
      await adminAPI.forceCrashRound();
      setMessage('Round crashed successfully');
      await fetchCurrentRound();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to crash round');
    } finally {
      setCrashing(false);
    }
  };

  const openCrashConfirm = (betId, userName) => {
    setCrashConfirm({ open: true, betId, userName });
  };

  const handleCrashUserConfirm = async () => {
    const { betId, userName } = crashConfirm;
    setCrashConfirm({ open: false, betId: null, userName: '' });
    try {
      await adminAPI.forceCrashBet(betId);
      setMessage(`Bet for ${userName} crashed`);
      await fetchCurrentRound();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to crash bet');
    }
  };

  // ── Next crash handlers ──
  const handleSetNextCrash = async () => {
    const val = parseFloat(nextCrashInput);
    if (isNaN(val) || val < 1) {
      setMessage('Crash value must be a number >= 1');
      return;
    }
    setSettingCrash(true);
    setMessage('');
    try {
      const res = await adminAPI.setNextCrash(val);
      setAdminNextCrash(val);
      setMessage(res.data.message);
      setNextCrashInput('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to set next crash');
    } finally {
      setSettingCrash(false);
    }
  };

  const handleClearNextCrash = async () => {
    try {
      await adminAPI.clearNextCrash();
      setAdminNextCrash(null);
      setMessage('Next crash override cleared');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'won': return 'bg-green-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const { round, state, bets: roundBets } = currentRoundData;
  const isRunning = state?.isRunning;

  return (
    <div>
      {/* Bets Paused Modal */}
      {!betsEnabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full mx-4 p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Bets Are Paused</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please wait for bets to resume or contact support for assistance
              </p>
              <button
                onClick={() => window.location.href = '/admin/settings'}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-4">Bets Management</h1>

      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab('live')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'live' ? 'bg-white shadow text-primary-700' : 'text-gray-600'
          }`}
        >
          Live Bets ({roundBets?.length ?? 0})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-white shadow text-primary-700' : 'text-gray-600'
          }`}
        >
          History
        </button>
      </div>

      {tab === 'live' && (
        <div className="space-y-4">
          {/* Same plan/graph UI as user game */}
          <div className="max-w-md mx-auto">
            <GameGraph />
          </div>

          {/* Round info + Crash round button */}
          <div className="flex flex-wrap items-center gap-4">
            {round && (
              <>
                <div className="px-4 py-2 rounded-lg bg-gray-200">
                  <span className="text-sm text-gray-600">Round</span>
                  <p className="font-semibold">{round.roundId}</p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-200">
                  <span className="text-sm text-gray-600">Status</span>
                  <p className="font-semibold capitalize">{state?.status || round.status}</p>
                </div>
                {isRunning && (
                  <div className="px-4 py-2 rounded-lg bg-amber-100">
                    <span className="text-sm text-amber-800">Multiplier</span>
                    <p className="font-bold text-amber-900">{state?.multiplier?.toFixed(2)}x</p>
                  </div>
                )}
                {isRunning && (
                  <button
                    type="button"
                    onClick={handleForceCrashRound}
                    disabled={crashing}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                  >
                    {crashing ? 'Crashing…' : 'Crash round now'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Set Next Round Crash ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Set Next Round Crash</h3>
            <p className="text-xs text-gray-500 mb-3">
              Set the exact multiplier at which the <strong>next</strong> round will crash. This is <strong>one-time only</strong> — it auto-clears after one round and returns to automatic mode.
            </p>

            {adminNextCrash !== null && (
              <div className="flex items-center gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="text-amber-800 text-sm font-medium">
                  Queued: next round crashes at <strong>{adminNextCrash}x</strong> <span className="text-amber-600 font-normal">(auto-clears after 1 round)</span>
                </span>
                <button onClick={handleClearNextCrash} className="ml-auto text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-1 rounded">
                  Clear
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="1"
                value={nextCrashInput}
                onChange={(e) => setNextCrashInput(e.target.value)}
                placeholder="e.g. 3.5"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSetNextCrash}
                disabled={settingCrash || !nextCrashInput}
                className="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {settingCrash ? 'Setting…' : 'Set Crash'}
              </button>
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[1, 1.5, 2, 3, 4, 5, 6, 7, 10].map((v) => (
                <button
                  key={v}
                  onClick={() => setNextCrashInput(String(v))}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>

          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm ${message.includes('Failed') || message.includes('must be') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message}
            </div>
          )}

          {/* Current round bets table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <h2 className="px-4 py-3 font-semibold text-gray-800 border-b">
              Bets in this round ({roundBets?.length ?? 0})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-2 font-medium text-gray-600">User</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Bet (₹)</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Cash out</th>
                  </tr>
                </thead>
                <tbody>
                  {!roundBets?.length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No round or no bets yet.
                      </td>
                    </tr>
                  ) : (
                    roundBets.map((bet) => (
                      <tr key={bet._id} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium">{bet.userId?.name || '-'}</td>
                        <td className="px-4 py-2 text-gray-600">{bet.userId?.phone || '-'}</td>
                        <td className="px-4 py-2">{bet.amount?.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              bet.status === 'active'
                                ? 'bg-amber-100 text-amber-800'
                                : bet.status === 'won'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {bet.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {bet.status === 'won'
                            ? `${bet.cashOutMultiplier?.toFixed(2)}x (₹${bet.profit?.toFixed(2)})`
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog open={crashConfirm.open} onClose={() => setCrashConfirm({ ...crashConfirm, open: false })}>
        <DialogTitle>Force crash bet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Force crash bet for {crashConfirm.userName}? This will settle the bet as lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrashConfirm({ ...crashConfirm, open: false })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleCrashUserConfirm}>Crash bet</Button>
        </DialogActions>
      </Dialog>

      {tab === 'history' && (
        <div>
          <div className="mb-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Bets</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div className="space-y-3">
            {Array.isArray(bets) && bets.length > 0 ? (
              bets.map((bet) => (
                <div key={bet._id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800">{bet.userId?.name}</h3>
                      <p className="text-xs text-gray-500">{bet.userId?.phone}</p>
                    </div>
                    <span className={`${getStatusColor(bet.status)} text-white px-2 py-1 rounded-full text-xs capitalize`}>
                      {bet.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Bet</p>
                      <p className="font-bold">₹{bet.amount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Multiplier</p>
                      <p className="font-bold">{bet.cashOutMultiplier || '-'}x</p>
                    </div>
                    <div className={`rounded-lg p-2 ${
                      bet.status === 'won' ? 'bg-green-50' : bet.status === 'lost' ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <p className="text-xs text-gray-500">Profit</p>
                      <p className={`font-bold ${
                        bet.status === 'won' ? 'text-green-600' : bet.status === 'lost' ? 'text-red-600' : ''
                      }`}>
                        {bet.status === 'won' ? `+₹${bet.profit?.toFixed(2)}` :
                          bet.status === 'lost' ? `-₹${bet.amount}` : '-'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(bet.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No bets found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bets;
