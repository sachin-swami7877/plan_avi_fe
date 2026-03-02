import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { adminAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import GameGraph from '../components/GameGraph';

const PER_PAGE = 25;
const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
];

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
  const [betsPausedDismissed, setBetsPausedDismissed] = useState(false);
  const { socket, gameState } = useSocket();

  // Next-crash admin control
  const [nextCrashInput, setNextCrashInput] = useState('');
  const [adminNextCrash, setAdminNextCrash] = useState(null);
  const [settingCrash, setSettingCrash] = useState(false);

  // Bulk crash: next N user-bet rounds (3 modes: exact, range, auto)
  const [bulkCount, setBulkCount] = useState('');
  const [bulkMode, setBulkMode] = useState('exact'); // 'exact' | 'range' | 'auto'
  const [bulkCrashAt, setBulkCrashAt] = useState('');
  const [bulkMin, setBulkMin] = useState('');
  const [bulkMax, setBulkMax] = useState('');
  const [bulkCrash, setBulkCrash] = useState(null); // { mode, crashAt?, min?, max?, total, remaining }
  const [settingBulk, setSettingBulk] = useState(false);

  // Sequential crash: array of specific values
  const [seqCount, setSeqCount] = useState('');
  const [seqInputs, setSeqInputs] = useState([]); // array of input strings
  const [seqCrashes, setSeqCrashes] = useState([]); // active queue from server
  const [settingSeq, setSettingSeq] = useState(false);
  const [seqReady, setSeqReady] = useState(false); // true once user enters count

  // History pagination & date filter
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [histTotalCount, setHistTotalCount] = useState(0);
  const [histPeriod, setHistPeriod] = useState('all');
  const [histCustomFrom, setHistCustomFrom] = useState('');
  const [histCustomTo, setHistCustomTo] = useState('');
  const [histSearch, setHistSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Multi-select delete
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounce(histSearch); setHistPage(1); }, 400);
    return () => clearTimeout(t);
  }, [histSearch]);

  useEffect(() => {
    fetchBets();
  }, [filter, histPage, histPeriod, searchDebounce]);

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
      const st = res.data.state;
      if (st?.adminNextCrash !== undefined) setAdminNextCrash(st.adminNextCrash);
      if (st?.bulkCrash !== undefined) setBulkCrash(st.bulkCrash);
      if (st?.sequentialCrashes !== undefined) setSeqCrashes(st.sequentialCrashes || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchCurrentRound();
    const interval = setInterval(fetchCurrentRound, 2000);
    return () => clearInterval(interval);
  }, [gameState?.roundId]);

  // Listen for real-time crash queue updates
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.bulkCrash !== undefined) setBulkCrash(data.bulkCrash);
      if (data.sequentialCrashes !== undefined) setSeqCrashes(data.sequentialCrashes || []);
      if (data.adminNextCrash !== undefined) setAdminNextCrash(data.adminNextCrash);
    };
    socket.on('admin:crash-queue-update', handler);
    return () => socket.off('admin:crash-queue-update', handler);
  }, [socket]);

  const fetchBets = async () => {
    try {
      const params = { page: histPage, limit: PER_PAGE };
      if (filter) params.status = filter;
      if (searchDebounce) params.search = searchDebounce;
      if (histPeriod === 'custom' && histCustomFrom && histCustomTo) {
        params.from = histCustomFrom;
        params.to = histCustomTo;
      } else if (histPeriod !== 'all') {
        params.period = histPeriod;
      }
      const res = await adminAPI.getBets(params);
      const data = res.data;
      setBets(data?.data || []);
      setHistTotalPages(data?.totalPages || 1);
      setHistTotalCount(data?.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch bets:', error);
      setBets([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectBet = (id) => {
    setSelectedBets((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedBets.length === bets.length) {
      setSelectedBets([]);
    } else {
      setSelectedBets(bets.map((b) => b._id));
    }
  };

  const handleDeleteSelected = async () => {
    setDeleteConfirm(false);
    setDeleting(true);
    try {
      await adminAPI.deleteBets(selectedBets);
      setSelectedBets([]);
      setSelectMode(false);
      fetchBets();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete bets');
    } finally {
      setDeleting(false);
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

  // ── Bulk crash handlers ──
  const handleSetBulkCrash = async () => {
    const count = parseInt(bulkCount);
    if (isNaN(count) || count < 1) { setMessage('Enter valid round count'); return; }
    const payload = { count, mode: bulkMode };
    if (bulkMode === 'exact') {
      const crashAt = parseFloat(bulkCrashAt);
      if (isNaN(crashAt) || crashAt < 1) { setMessage('Crash value must be >= 1'); return; }
      payload.crashAt = crashAt;
    } else if (bulkMode === 'range') {
      const min = parseFloat(bulkMin);
      const max = parseFloat(bulkMax);
      if (isNaN(min) || min < 1) { setMessage('Min must be >= 1'); return; }
      if (isNaN(max) || max < min) { setMessage('Max must be >= Min'); return; }
      payload.min = min;
      payload.max = max;
    }
    setSettingBulk(true); setMessage('');
    try {
      const res = await adminAPI.setBulkCrash(payload);
      setBulkCrash(res.data.bulkCrash);
      setMessage(res.data.message);
      setBulkCount(''); setBulkCrashAt(''); setBulkMin(''); setBulkMax('');
    } catch (err) { setMessage(err.response?.data?.message || 'Failed to set bulk crash'); }
    finally { setSettingBulk(false); }
  };

  const handleClearBulkCrash = async () => {
    try {
      await adminAPI.clearBulkCrash();
      setBulkCrash(null);
      setMessage('Bulk crash cleared');
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };

  // ── Sequential crash handlers ──
  const handleSeqCountSubmit = () => {
    const n = parseInt(seqCount);
    if (isNaN(n) || n < 1 || n > 100) { setMessage('Enter 1-100'); return; }
    setSeqInputs(Array(n).fill(''));
    setSeqReady(true);
  };

  const updateSeqInput = (idx, val) => {
    setSeqInputs((prev) => { const copy = [...prev]; copy[idx] = val; return copy; });
  };

  const handleSetSequentialCrashes = async () => {
    const values = seqInputs.map((v) => parseFloat(v));
    for (let i = 0; i < values.length; i++) {
      if (isNaN(values[i]) || values[i] < 1) { setMessage(`Round ${i + 1} value must be >= 1`); return; }
    }
    setSettingSeq(true); setMessage('');
    try {
      const res = await adminAPI.setSequentialCrashes(values);
      setSeqCrashes(res.data.sequentialCrashes);
      setMessage(res.data.message);
      setSeqInputs([]); setSeqCount(''); setSeqReady(false);
    } catch (err) { setMessage(err.response?.data?.message || 'Failed to set sequential crashes'); }
    finally { setSettingSeq(false); }
  };

  const handleClearSequentialCrashes = async () => {
    try {
      await adminAPI.clearSequentialCrashes();
      setSeqCrashes([]);
      setMessage('Sequential crashes cleared');
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };

  const handleResetSeqForm = () => {
    setSeqInputs([]); setSeqCount(''); setSeqReady(false);
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
      {/* Bets Paused Banner */}
      {!betsEnabled && !betsPausedDismissed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800">Bets Are Paused</h3>
            <p className="text-xs text-yellow-700">Users cannot place bets right now.</p>
          </div>
          <button
            onClick={() => window.location.href = '/admin/settings'}
            className="px-3 py-1.5 bg-yellow-200 text-yellow-900 rounded-lg text-xs font-medium hover:bg-yellow-300 transition-colors flex-shrink-0"
          >
            Settings
          </button>
          <button
            onClick={() => setBetsPausedDismissed(true)}
            className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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

          {/* ── Bulk Crash: 3 modes ── */}
          {(() => {
            const hasActiveBulk = !!(bulkCrash && bulkCrash.remaining > 0);
            const hasActiveSeq = seqCrashes.length > 0;
            const bulkModeLabel = bulkCrash?.mode === 'range' ? `${bulkCrash.min}x–${bulkCrash.max}x` : bulkCrash?.mode === 'auto' ? 'Auto Random' : `${bulkCrash?.crashAt}x`;
            const isSetDisabled = settingBulk || !bulkCount || hasActiveBulk || hasActiveSeq
              || (bulkMode === 'exact' && !bulkCrashAt)
              || (bulkMode === 'range' && (!bulkMin || !bulkMax));
            return (
            <>
          <div className={`bg-white rounded-xl shadow-sm border ${hasActiveBulk ? 'border-orange-300' : 'border-gray-200'} p-4`}>
            <h3 className="font-semibold text-gray-800 mb-2">Bulk Crash</h3>
            <p className="text-xs text-gray-500 mb-3">
              Next <strong>N</strong> rounds where users bet. Choose mode: exact value, random range, or auto balanced.
            </p>

            {hasActiveBulk && (
              <div className="mb-3 bg-orange-50 border border-orange-300 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-800 font-semibold text-sm">
                      Active: {bulkCrash.remaining} of {bulkCrash.total} rounds remaining
                    </p>
                    <p className="text-orange-700 text-xs mt-0.5">
                      Mode: <strong>{bulkCrash.mode === 'exact' ? `Fixed ${bulkCrash.crashAt}x` : bulkCrash.mode === 'range' ? `Range ${bulkCrash.min}x–${bulkCrash.max}x` : 'Auto Random'}</strong> • {bulkCrash.total - bulkCrash.remaining} completed
                    </p>
                  </div>
                  <button onClick={handleClearBulkCrash} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                    Clear
                  </button>
                </div>
                <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${((bulkCrash.total - bulkCrash.remaining) / bulkCrash.total) * 100}%` }} />
                </div>
              </div>
            )}

            {hasActiveSeq && !hasActiveBulk && (
              <p className="text-xs text-amber-600 mb-3">Clear sequential crashes first to set bulk crash.</p>
            )}

            {/* Mode selector */}
            <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'exact', label: 'Exact Value' },
                { key: 'range', label: 'Range' },
                { key: 'auto', label: 'Auto Random' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBulkMode(key)}
                  disabled={hasActiveBulk || hasActiveSeq}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${bulkMode === key ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'} disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <input
                type="number"
                min="1"
                max="100"
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                placeholder="Rounds (e.g. 50)"
                className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={hasActiveBulk || hasActiveSeq}
              />
              {bulkMode === 'exact' && (
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={bulkCrashAt}
                  onChange={(e) => setBulkCrashAt(e.target.value)}
                  placeholder="Crash at (e.g. 1.5)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={hasActiveBulk || hasActiveSeq}
                />
              )}
              {bulkMode === 'range' && (
                <>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={bulkMin}
                    onChange={(e) => setBulkMin(e.target.value)}
                    placeholder="Min (e.g. 1)"
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={hasActiveBulk || hasActiveSeq}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={bulkMax}
                    onChange={(e) => setBulkMax(e.target.value)}
                    placeholder="Max (e.g. 3)"
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={hasActiveBulk || hasActiveSeq}
                  />
                </>
              )}
              <button
                onClick={handleSetBulkCrash}
                disabled={isSetDisabled}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {settingBulk ? 'Setting…' : 'Set'}
              </button>
            </div>
            {bulkMode === 'exact' && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[1, 1.5, 2, 3, 5].map((v) => (
                  <button key={v} onClick={() => setBulkCrashAt(String(v))} disabled={hasActiveBulk || hasActiveSeq} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-50">{v}x</button>
                ))}
              </div>
            )}
            {bulkMode === 'range' && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[{l:'1x-2x',min:'1',max:'2'},{l:'1x-3x',min:'1',max:'3'},{l:'2x-5x',min:'2',max:'5'},{l:'1x-8x',min:'1',max:'8'}].map(({l,min,max}) => (
                  <button key={l} onClick={() => {setBulkMin(min);setBulkMax(max);}} disabled={hasActiveBulk || hasActiveSeq} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-50">{l}</button>
                ))}
              </div>
            )}
            {bulkMode === 'auto' && (
              <p className="text-xs text-gray-500 mt-2">System will use balanced distribution: 40% below 2x, 10% above 6x (max 8x)</p>
            )}
          </div>

          {/* ── Sequential Crash: different value per round ── */}
          <div className={`bg-white rounded-xl shadow-sm border ${hasActiveSeq ? 'border-purple-300' : 'border-gray-200'} p-4`}>
            <h3 className="font-semibold text-gray-800 mb-2">Sequential Crash (Per-Round Values)</h3>
            <p className="text-xs text-gray-500 mb-3">
              Set specific crash values for each of the next N user-bet rounds. Empty rounds are skipped.
            </p>

            {hasActiveSeq && (
              <div className="mb-3 bg-purple-50 border border-purple-300 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-purple-800 font-semibold text-sm">Active: {seqCrashes.length} rounds remaining</p>
                  </div>
                  <button onClick={handleClearSequentialCrashes} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {seqCrashes.map((v, i) => (
                    <span key={i} className="bg-purple-100 text-purple-800 text-xs font-mono px-2 py-0.5 rounded">
                      #{i + 1}: {v}x
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!hasActiveSeq && !seqReady && (
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={seqCount}
                  onChange={(e) => setSeqCount(e.target.value)}
                  placeholder="How many rounds?"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleSeqCountSubmit}
                  disabled={!seqCount}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}

            {seqReady && !hasActiveSeq && (
              <div>
                <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                  {seqInputs.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-10">#{idx + 1}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={val}
                        onChange={(e) => updateSeqInput(idx, e.target.value)}
                        placeholder="e.g. 1.5"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
                {hasActiveBulk && (
                  <p className="text-xs text-amber-600 mb-2">Clear bulk crash first to set sequential crashes.</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleResetSeqForm}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetSequentialCrashes}
                    disabled={settingSeq || hasActiveBulk || seqInputs.some((v) => !v || isNaN(parseFloat(v)) || parseFloat(v) < 1)}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {settingSeq ? 'Setting…' : `Set ${seqInputs.length} Crashes`}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <p className="text-xs text-gray-400 w-full">Quick fill all:</p>
                  {[1, 1.2, 1.5, 2, 3].map((v) => (
                    <button
                      key={v}
                      onClick={() => setSeqInputs(seqInputs.map(() => String(v)))}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      All {v}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
            </>
            );
          })()}

          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm ${message.includes('Failed') || message.includes('must be') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message}
            </div>
          )}

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
          {/* Filters row: period + status + search all in one row */}
          <div className="flex gap-2 mb-3 items-center flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setHistPeriod(p.value); setHistPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  histPeriod === p.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setHistPeriod('custom')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                histPeriod === 'custom'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Custom
            </button>
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setHistPage(1); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <input
              type="text"
              value={histSearch}
              onChange={(e) => setHistSearch(e.target.value)}
              placeholder="Search name or phone..."
              className="flex-1 min-w-[140px] px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {(histPeriod !== 'all' || filter || histSearch) && (
              <button
                onClick={() => { setHistPeriod('all'); setFilter(''); setHistSearch(''); setHistCustomFrom(''); setHistCustomTo(''); setHistPage(1); }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              >
                Clear
              </button>
            )}
          </div>

          {histPeriod === 'custom' && (
            <div className="flex gap-2 mb-3 items-end flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={histCustomFrom} onChange={(e) => setHistCustomFrom(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={histCustomTo} onChange={(e) => setHistCustomTo(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <button
                onClick={() => { if (histCustomFrom && histCustomTo) { setHistPage(1); fetchBets(); } }}
                disabled={!histCustomFrom || !histCustomTo}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}

          {/* Count + select/delete toolbar */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">{histTotalCount} total bets</p>
            <div className="flex items-center gap-2">
              {selectMode && selectedBets.length > 0 && (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  disabled={deleting}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : `Delete (${selectedBets.length})`}
                </button>
              )}
              {selectMode && bets.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium"
                >
                  {selectedBets.length === bets.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
              <button
                onClick={() => { setSelectMode(!selectMode); setSelectedBets([]); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectMode ? 'bg-primary-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {Array.isArray(bets) && bets.length > 0 ? (
              bets.map((bet) => (
                <div
                  key={bet._id}
                  onClick={() => selectMode && toggleSelectBet(bet._id)}
                  className={`bg-white rounded-xl p-4 shadow-sm ${selectMode ? 'cursor-pointer' : ''} ${
                    selectedBets.includes(bet._id) ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={selectedBets.includes(bet._id)}
                          onChange={() => toggleSelectBet(bet._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800">{bet.userId?.name}</h3>
                        <p className="text-xs text-gray-500">{bet.userId?.phone}</p>
                      </div>
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

          {/* Pagination */}
          {histTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-white rounded-xl px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500">{histTotalCount} total</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                  disabled={histPage <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <IoChevronBack className="w-4 h-4" /> Prev
                </button>
                <span className="text-sm font-medium text-gray-700">{histPage} / {histTotalPages}</span>
                <button
                  onClick={() => setHistPage((p) => Math.min(histTotalPages, p + 1))}
                  disabled={histPage >= histTotalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <IoChevronForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Delete confirmation dialog */}
          <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}>
            <DialogTitle>Delete Bets</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete {selectedBets.length} bet{selectedBets.length > 1 ? 's' : ''}? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
              <Button variant="contained" color="error" onClick={handleDeleteSelected} disabled={deleting}>
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Deleting...
                  </span>
                ) : 'Delete'}
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default Bets;
