import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ludoAPI } from '../services/api';
import { playWinSound } from '../utils/audioSounds';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const ENTRY_MIN = 50;
const WAITING_EXPIRY_MIN = 10;


function formatTime12hr(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' });
}

function getHistoryStatusStyle(m) {
  if (m.status === 'completed') return { label: 'Completed', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' };
  if (m.status === 'cancelled') {
    const autoExpired = (m.cancelReason || '').toLowerCase().includes('expired');
    return { label: autoExpired ? 'Auto expired' : 'Cancelled', bg: autoExpired ? 'bg-red-100 border-red-300' : 'bg-red-50 border-red-200', dot: autoExpired ? 'bg-orange-500' : 'bg-red-500' };
  }
  return { label: m.status || '—', bg: 'bg-white border-gray-200', dot: 'bg-gray-400' };
}

function getRemainingDisplay(expiryDate, nowMs = Date.now()) {
  if (!expiryDate) return null;
  const ms = new Date(expiryDate) - nowMs;
  if (ms <= 0) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Indian male names + game-style usernames for dummy running battles
const INDIAN_MALE_NAMES = ['Rahul', 'Amit', 'Vikram', 'Arjun', 'Rohan', 'Suresh', 'Rajesh', 'Karan', 'Anil', 'Deepak', 'Sachin', 'Ravi', 'Sanjay', 'Vijay', 'Manish', 'Pradeep', 'Nitin', 'Gaurav', 'Akash', 'Rishabh', 'Kunal', 'Yash', 'Aditya', 'Varun', 'Abhishek', 'danglegame123', 'boss123', 'ludoking11', 'khiladi123', 'gamerking11', 'Harsh', 'Mohit', 'Tushar', 'Pawan', 'Dinesh', 'Naveen', 'Rakesh', 'Hitesh', 'Jatin', 'Ankit', 'Sumit', 'Lalit', 'Tarun', 'Bharat', 'Yogesh'];
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const AVATAR_GRADIENTS = [
  'from-orange-400 to-red-500',
  'from-blue-500 to-indigo-600',
  'from-emerald-400 to-green-600',
  'from-purple-500 to-pink-500',
  'from-yellow-400 to-orange-500',
  'from-teal-400 to-cyan-600',
  'from-rose-500 to-red-600',
  'from-violet-500 to-purple-700',
  'from-sky-400 to-blue-600',
  'from-fuchsia-500 to-pink-600',
];
function getAvatarGradient(name, offset = 0) {
  const code = (name || 'A').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[(code + offset) % AVATAR_GRADIENTS.length];
}

function calcPrizeFrontend(entry, tiers) {
  const pool = entry * 2;
  let commission;
  if (entry <= (tiers?.tier1Max ?? 250)) {
    commission = Math.round((pool * (tiers?.tier1Pct ?? 10)) / 100);
  } else if (entry <= (tiers?.tier2Max ?? 600)) {
    commission = Math.round((pool * (tiers?.tier2Pct ?? 8)) / 100);
  } else {
    commission = Math.round((pool * (tiers?.tier3Pct ?? 5)) / 100);
  }
  return pool - commission;
}


function generateDummyBattles(countFromSettings, tiers) {
  if (countFromSettings <= 0) return [];
  const minCount = Math.max(1, countFromSettings - 5);
  const count = randomInt(minCount, countFromSettings);
  const seed = Date.now();
  const battles = [];
  for (let i = 0; i < count; i++) {
    const entry = randomInt(50, 3000);
    const prize = calcPrizeFrontend(entry, tiers);
    const useGameStyle = Math.random() < 0.3;
    const name1 = useGameStyle ? `Game${randomInt(1000, 9999)}` : pickRandom(INDIAN_MALE_NAMES);
    const name2 = useGameStyle ? `Player${randomInt(100, 999)}` : pickRandom(INDIAN_MALE_NAMES);
    battles.push({
      _id: `dummy-${seed}-${i}`,
      entryAmount: entry,
      playingFor: entry,
      prize,
      players: [{ userName: name1 }, { userName: name2 }],
      isDummy: true,
    });
  }
  return battles;
}

export default function Ludo() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('play');
  const [myWaitingList, setMyWaitingList] = useState([]);
  const [myLive, setMyLive] = useState([]);
  const [myRequested, setMyRequested] = useState([]);
  const [history, setHistory] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [runningBattles, setRunningBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [entryAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(null);
  const [confirmJoinMatch, setConfirmJoinMatch] = useState(null);
  const [ludoDummyRunningBattles, setLudoDummyRunningBattles] = useState(15);
  const [commTiers, setCommTiers] = useState({ tier1Max: 250, tier1Pct: 10, tier2Max: 600, tier2Pct: 8, tier3Pct: 5 });
  const [ludoEnabled, setLudoEnabled] = useState(true);
  const [ludoDisableReason, setLudoDisableReason] = useState('');
  const [ludoWarning, setLudoWarning] = useState('');
  const [dummyBattles, setDummyBattles] = useState([]);
  const [exitingIds, setExitingIds] = useState(new Set());
  const [enteringIds, setEnteringIds] = useState(new Set());
  const dummyBattlesRef = useRef([]);
  const myWaitingRef = useRef(null);
  const [tick, setTick] = useState(() => Date.now());
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keep refs in sync (avoids stale closure)
  useEffect(() => { dummyBattlesRef.current = dummyBattles; }, [dummyBattles]);
  useEffect(() => { myWaitingRef.current = myWaitingList; }, [myWaitingList]);

  // Generate dummy running battles; roll 5 out / 5 in every 30 sec with animation
  useEffect(() => {
    const n = Math.max(0, Number(ludoDummyRunningBattles) || 0);
    if (n === 0) { setDummyBattles([]); return; }
    const initial = generateDummyBattles(n, commTiers);
    setDummyBattles(initial);
    dummyBattlesRef.current = initial;
    const ANIM_MS = 400;
    const t = setInterval(() => {
      const prev = dummyBattlesRef.current;
      if (prev.length === 0) { setDummyBattles(generateDummyBattles(n, commTiers)); return; }
      // Replace every alternate item (index 0, 2, 4, ...)
      const toExitIds = new Set(prev.filter((_, i) => i % 2 === 0).map((b) => b._id));
      setExitingIds(toExitIds);
      setTimeout(() => {
        setDummyBattles((p) => {
          const updated = p.map((item, i) => {
            if (i % 2 === 0) {
              const entry = randomInt(50, 3000);
              const prize = calcPrizeFrontend(entry, commTiers);
              const useGameStyle = Math.random() < 0.3;
              const name1 = useGameStyle ? `Game${randomInt(1000, 9999)}` : pickRandom(INDIAN_MALE_NAMES);
              const name2 = useGameStyle ? `Player${randomInt(100, 999)}` : pickRandom(INDIAN_MALE_NAMES);
              return { _id: `dummy-${Date.now()}-${i}`, entryAmount: entry, playingFor: entry, prize, players: [{ userName: name1 }, { userName: name2 }], isDummy: true };
            }
            return item;
          });
          return updated;
        });
        setExitingIds(new Set());
        setDummyBattles((p) => {
          setEnteringIds(new Set(p.filter((_, i) => i % 2 === 0).map((b) => b._id)));
          return p;
        });
        setTimeout(() => setEnteringIds(new Set()), ANIM_MS);
      }, ANIM_MS);
    }, 30 * 1000);
    return () => clearInterval(t);
  }, [ludoDummyRunningBattles, commTiers]);

  const effectiveAmount = customAmount.trim() !== '' && !isNaN(Number(customAmount))
    ? Number(customAmount)
    : entryAmount;

  const fetchMyMatches = useCallback(async () => {
    try {
      const [waitRes, liveRes, reqRes, histRes] = await Promise.all([
        ludoAPI.getMyMatches({ status: 'waiting' }),
        ludoAPI.getMyMatches({ status: 'live' }),
        ludoAPI.getMyMatches({ status: 'requested' }),
        ludoAPI.getMyMatches({ status: 'history' }),
      ]);
      const waitList = waitRes.data?.records || (Array.isArray(waitRes.data) ? waitRes.data : []);
      const liveList = liveRes.data?.records || (Array.isArray(liveRes.data) ? liveRes.data : []);
      const reqList = reqRes.data?.records || (Array.isArray(reqRes.data) ? reqRes.data : []);
      const histList = histRes.data?.records || (Array.isArray(histRes.data) ? histRes.data : []);
      setMyWaitingList(waitList);
      setMyLive(liveList);
      setMyRequested(reqList);
      setHistory(histList);
    } catch (err) {
      if (err.response?.status !== 401) toast.error(err.response?.data?.message || 'Failed to load matches');
      setMyWaitingList([]);
      setMyLive([]);
      setMyRequested([]);
      setHistory([]);
    }
  }, []);

  const fetchWaitingList = useCallback(async () => {
    try {
      const res = await ludoAPI.getWaitingList();
      setWaitingList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setWaitingList([]);
    }
  }, []);

  const fetchRunningBattles = useCallback(async () => {
    try {
      const res = await ludoAPI.getRunningBattles();
      setRunningBattles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setRunningBattles([]);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchMyMatches(),
      fetchWaitingList(),
      fetchRunningBattles(),
      ludoAPI.getSettings().then((r) => {
        const d = r.data || {};
        setLudoDummyRunningBattles(d.ludoDummyRunningBattles ?? 15);
        setCommTiers({
          tier1Max: d.ludoCommTier1Max ?? 250,
          tier1Pct: d.ludoCommTier1Pct ?? 10,
          tier2Max: d.ludoCommTier2Max ?? 600,
          tier2Pct: d.ludoCommTier2Pct ?? 8,
          tier3Pct: d.ludoCommTier3Pct ?? 5,
        });
        setLudoEnabled(d.ludoEnabled ?? true);
        setLudoDisableReason(d.ludoDisableReason || '');
        setLudoWarning(d.ludoWarning || '');
      }).catch(() => {}),
    ]);
    setLoading(false);
  }, [fetchMyMatches, fetchWaitingList, fetchRunningBattles]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!socket) return;
    socket.on('ludo:match-live', () => {
      if (myWaitingRef.current?.length > 0) playWinSound();
      fetchMyMatches();
      fetchWaitingList();
      fetchRunningBattles();
    });
    socket.on('ludo:waiting-updated', () => {
      fetchMyMatches();
      fetchWaitingList();
      fetchRunningBattles();
    });
    return () => {
      socket.off('ludo:match-live');
      socket.off('ludo:waiting-updated');
    };
  }, [socket, fetchMyMatches, fetchWaitingList, fetchRunningBattles]);

  const handleCreateClick = () => {
    if (!ludoEnabled) {
      toast.error(ludoDisableReason || 'Ludo matches are currently disabled');
      return;
    }
    if (effectiveAmount < ENTRY_MIN) {
      toast.error(`Minimum entry is Rs. ${ENTRY_MIN}`);
      return;
    }
    if ((user?.walletBalance ?? 0) < effectiveAmount) {
      toast.error('Insufficient balance');
      return;
    }
    setConfirmOpen('create');
  };

  const handleCreateConfirm = async () => {
    setCreating(true);
    setConfirmOpen(null);
    try {
      const res = await ludoAPI.createMatch(effectiveAmount);
      toast.success(res.data?.message || 'Match created');
      await refreshUser();
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create match');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (matchId) => {
    if (!matchId) return;
    setCancelling(true);
    try {
      await ludoAPI.cancelMatch(matchId);
      toast.success('Match cancelled. Refunded.');
      await refreshUser();
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const openConfirmJoin = (m) => {
    if (!ludoEnabled) {
      toast.error(ludoDisableReason || 'Ludo matches are currently disabled');
      return;
    }
    setConfirmJoinMatch(m);
  };
  const closeConfirmJoin = () => setConfirmJoinMatch(null);

  const handleConfirmAndStart = async () => {
    if (!confirmJoinMatch?._id) return;
    setJoining(true);
    try {
      const check = await ludoAPI.checkMatchWaiting(confirmJoinMatch._id);
      if (!check.data?.ok) {
        toast.error(check.data?.message || 'This game has been taken by another person.');
        closeConfirmJoin();
        await fetchWaitingList();
        setJoining(false);
        return;
      }
      const res = await ludoAPI.joinMatch(confirmJoinMatch._id);
      toast.success(res.data?.message || 'Joined');
      await refreshUser();
      closeConfirmJoin();
      navigate(`/ludo/match/${confirmJoinMatch._id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'This game has been taken by another person.';
      toast.error(msg);
      closeConfirmJoin();
      await fetchWaitingList();
    } finally {
      setJoining(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 pb-[200px] overflow-x-hidden">
      <Header />
      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Ludo (Room Code)</h1>

        <div className="flex gap-2 mb-4 bg-white rounded-xl p-1 shadow-sm">
          <button onClick={() => setActiveTab('play')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab === 'play' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}>Play</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab === 'history' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}>History</button>
        </div>

        {activeTab === 'play' && (
          <div className="space-y-5">
            {/* Ludo Warning Banner */}
            {ludoWarning && (
              <div className="bg-white border-2 border-red-500 rounded-xl p-3 text-base font-semibold text-gray-900">
                {ludoWarning}
              </div>
            )}

            {/* Ludo Disabled Banner */}
            {!ludoEnabled && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-center">
                <p className="text-red-700 font-semibold mb-1">Ludo matches are currently disabled</p>
                {ludoDisableReason && <p className="text-sm text-red-600">{ludoDisableReason}</p>}
              </div>
            )}

            {/* Rules button */}
            {/* <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="w-full flex items-center justify-between bg-white rounded-xl shadow-sm px-4 py-3 hover:bg-gray-50 active:scale-[0.99] transition-all"
            >
              <span className="flex items-center gap-2 font-semibold text-gray-800">
                <span className="text-lg">📜</span> Ludo Rules &amp; Commission
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button> */}

            {/* Create a battle */}
            {ludoEnabled && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Create a battle</h2>
                <div className="flex gap-2">
                  <input type="number" min={ENTRY_MIN} placeholder="Enter amount (min ₹50)" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={handleCreateClick} disabled={creating || !customAmount.trim() || effectiveAmount < ENTRY_MIN || (user?.walletBalance ?? 0) < effectiveAmount} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                    {creating ? '...' : `SET`}
                  </button>
                </div>
              </div>
            )}

            {/* Your battles — waiting or live */}
            {(myWaitingList.length > 0 || myLive.length > 0) && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Your battles</h3>
                {myWaitingList.map((w) => (
                  <div key={w._id} className="relative rounded-2xl overflow-hidden border border-gray-200 mb-3">
                    <div className="absolute inset-0" style={{ backgroundImage: 'url(/ludoopen.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm text-gray-200">Waiting for opponent</p>
                        <span className="text-amber-300 font-mono font-semibold text-xs">{getRemainingDisplay(w.joinExpiryAt, tick) ?? '0:00'} min</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] text-gray-300">Entry Fee</p>
                          <p className="text-white font-extrabold text-base flex items-center gap-1"><span className="text-yellow-400">₹</span> {w.entryAmount}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => navigate(`/ludo/match/${w._id}`)} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transition-colors">View</button>
                          <button onClick={() => handleCancel(w._id)} disabled={cancelling} className="bg-red-500 hover:bg-red-400 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transition-colors">{cancelling ? '...' : 'Cancel'}</button>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-300">Prize</p>
                          <p className="text-white font-extrabold text-base flex items-center justify-end gap-1"><span className="text-green-400">₹</span> {calcPrizeFrontend(w.entryAmount, commTiers)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {myLive.map((m) => {
                  const gameActuallyStarted = m.roomCode && m.roomCode.trim() !== '' && !!m.gameActualStartAt;
                  const elapsedDisplay = (() => {
                    if (!gameActuallyStarted) return null;
                    const ms = tick - new Date(m.gameActualStartAt).getTime();
                    if (ms < 0) return '0:00:00';
                    const totalSec = Math.floor(ms / 1000);
                    const h = Math.floor(totalSec / 3600);
                    const min = Math.floor((totalSec % 3600) / 60);
                    const sec = totalSec % 60;
                    return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                  })();
                  const livePrize = calcPrizeFrontend(m.entryAmount, commTiers);
                  const lp1 = m.players?.[0]?.userName || '—';
                  const lp2 = m.players?.[1]?.userName || '—';
                  return (
                    <div key={m._id} className="relative rounded-2xl overflow-hidden border border-gray-200 mb-3">
                      <div className="absolute inset-0" style={{ backgroundImage: 'url(/ludoopen.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-green-400 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live — {lp1} vs {lp2}
                          </p>
                          {elapsedDisplay != null && (
                            <span className="font-mono font-bold text-sky-300 text-xs bg-white/10 px-2 py-0.5 rounded-lg">
                              {elapsedDisplay}
                            </span>
                          )}
                        </div>
                        {!gameActuallyStarted && (
                          <p className="text-xs text-amber-300 mb-1">Waiting for room code...</p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] text-gray-300">Entry Fee</p>
                            <p className="text-white font-extrabold text-base flex items-center gap-1"><span className="text-yellow-400">₹</span> {m.entryAmount}</p>
                          </div>
                          <button onClick={() => navigate(`/ludo/match/${m._id}`)} className="bg-blue-500 hover:bg-blue-400 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg transition-colors">View</button>
                          <div className="text-right">
                            <p className="text-[11px] text-gray-300">Prize</p>
                            <p className="text-white font-extrabold text-base flex items-center justify-end gap-1"><span className="text-green-400">₹</span> {livePrize}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Result Pending — matches where result was submitted, waiting for admin */}
            {myRequested.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Result Pending</h3>
                {myRequested.map((m) => (
                  <div key={m._id} className="rounded-xl p-3 border-l-4 border-purple-500 bg-purple-50 mb-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-purple-800 font-semibold text-sm">⏳ Awaiting Admin Review</p>
                    </div>
                    <p className="text-sm text-gray-700">₹{m.entryAmount} • {m.players?.map((p) => p.userName).join(', ')}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => navigate(`/ludo/match/${m._id}`)} className="text-sm font-semibold text-primary-600">View →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Open Battles */}
            <div className="rounded-xl overflow-hidden shadow-lg">
              <div className="bg-gray-300 px-4 pt-4 pb-2 rounded-t-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                    <span className="text-red-500 text-lg">❌</span> <span className="text-green-600">Open Battles</span>
                  </h3>
                  <button type="button" onClick={() => setRulesOpen(true)} className="text-xs text-green-600 font-bold flex items-center gap-1 uppercase tracking-wide">Rules <span className="inline-flex w-4 h-4 rounded-full border border-gray-500 items-center justify-center text-[10px] text-gray-600">i</span></button>
                </div>
              </div>
              <div className="bg-gray-300 px-2 pb-4">
                {loading ? (
                  <p className="text-gray-400 text-sm py-3">Loading...</p>
                ) : waitingList.length === 0 ? (
                  <p className="text-gray-600 text-sm py-3 text-center">No open battles right now.</p>
                ) : (
                  <div className="space-y-3">
                    {waitingList.map((m) => {
                      const remaining = getRemainingDisplay(m.joinExpiryAt);
                      const prize = calcPrizeFrontend(m.entryAmount, commTiers);
                      return (
                        <div key={m._id} className="relative rounded-2xl overflow-hidden border border-gray-200">
                          <div className="absolute inset-0" style={{ backgroundImage: 'url(/ludoopen.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
                          <div className="absolute inset-0 bg-black/40" />
                          <div className="relative px-3 py-2">
                            <p className="text-sm text-gray-200 mb-0.5">Challange From <span className="font-bold text-white italic">{m.creatorName || 'Player'}</span></p>
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-[11px] text-gray-300">Entry Fee</p>
                                <p className="text-white font-extrabold text-base flex items-center gap-1"><span className="text-yellow-400">₹</span> {m.entryAmount}</p>
                              </div>
                              <button onClick={() => openConfirmJoin(m)} className="bg-green-500 hover:bg-green-400 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg transition-colors">Play</button>
                              <div className="text-right">
                                <p className="text-[11px] text-gray-300">Prize</p>
                                <p className="text-white font-extrabold text-base flex items-center justify-end gap-1"><span className="text-green-400">₹</span> {prize}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Running Battles */}
            <div className="rounded-xl overflow-hidden shadow-lg">
              {/* Red divider line + header */}
              <div className="h-1 bg-red-500" />
              <div className="bg-gray-300 px-4 pt-3 pb-2">
                <h3 className="font-bold flex items-center gap-2 text-base">
                  <span className="text-red-500 text-lg">❌</span> <span className="text-green-600">Running Battles</span>
                  {(runningBattles.length + dummyBattles.length) > 0 && (
                    <span className="ml-1 text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full font-semibold">
                      {runningBattles.length + dummyBattles.length}
                    </span>
                  )}
                </h3>
              </div>
              <div className="bg-gray-300 px-1 pb-4">
                {loading ? (
                  <p className="text-gray-400 text-sm py-3">Loading...</p>
                ) : (runningBattles.length === 0 && dummyBattles.length === 0) ? (
                  <p className="text-gray-400 text-sm py-3">No running battles.</p>
                ) : (
                  <div className="bg-gray-300 rounded-xl overflow-hidden flex flex-col gap-3 p-2">
                    {[...runningBattles, ...dummyBattles].map((b) => {
                      const isDummy = b._id.startsWith('dummy-');
                      const amIIn = !isDummy && myLive.some((m) => m._id === b._id);
                      const amount = b.playingFor ?? b.entryAmount;
                      const p1 = b.players?.[0]?.userName || '—';
                      const p2 = b.players?.[1]?.userName || '—';
                      const p1Initial = p1.charAt(0).toUpperCase();
                      const p2Initial = p2.charAt(0).toUpperCase();
                      const p1Gradient = getAvatarGradient(p1, 0);
                      const p2Gradient = getAvatarGradient(p2, 5);
                      const animStyle = isDummy
                        ? exitingIds.has(b._id)
                          ? { animation: 'dummySlideOut 0.4s ease forwards' }
                          : enteringIds.has(b._id)
                            ? { animation: 'dummySlideIn 0.4s ease' }
                            : undefined
                        : undefined;
                      return (
                        <div key={b._id} className="relative overflow-hidden rounded-2xl" style={animStyle}>
                          <div className="absolute inset-0" style={{ backgroundImage: 'url(/ludoopen.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
                          <div className="absolute inset-0 bg-black/40" />
                          <div className="relative px-4 py-3">
                            {/* Playing For / Prize top row */}
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm text-gray-200 font-medium">Playing For <span className="text-white font-extrabold text-base"><span className="text-yellow-400">₹</span> {amount}</span></p>
                              <p className="text-sm text-gray-200 font-medium">Prize <span className="text-white font-extrabold text-base"><span className="text-green-400">₹</span> {b.prize}</span></p>
                            </div>
                            {/* Players row */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${p1Gradient} text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg ring-2 ring-white/40`}>{p1Initial}</span>
                                <span className="text-base font-bold text-white truncate max-w-[85px]" title={p1}>{p1}</span>
                              </div>
                              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-black flex items-center justify-center shadow-xl">
                                <span className="text-lg font-black bg-gradient-to-b from-orange-400 to-red-600 bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VS</span>
                              </div>
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                <span className="text-base font-bold text-white truncate max-w-[85px]" title={p2}>{p2}</span>
                                <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${p2Gradient} text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg ring-2 ring-white/40`}>{p2Initial}</span>
                              </div>
                            </div>
                            {amIIn && (
                              <button onClick={() => navigate(`/ludo/match/${b._id}`)} className="w-full mt-2 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold shadow">View</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" /></div> : history.length === 0 ? <p className="text-gray-500 text-center py-6">No history yet.</p> : history.map((m) => {
              const st = getHistoryStatusStyle(m);
              return (
              <div key={m._id} className={`rounded-xl p-4 shadow-sm border ${st.bg}`}>
                <p className="font-medium text-gray-800 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                  ₹{m.entryAmount} • {st.label}{m.winnerId && ` • Winner: ${m.players?.find((p) => p.userId === m.winnerId)?.userName || '—'}`}
                </p>
                <p className="text-xs text-gray-500">{formatTime12hr(m.createdAt)} • {m.players?.map((p) => p.userName).join(', ')}</p>
              </div>
            ); })}
          </div>
        )}
      </div>

      {/* Confirm create */}
      {confirmOpen === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">Confirm</h3>
            <p className="text-gray-600 text-sm mb-4">₹{effectiveAmount} will be deducted from your wallet. Continue?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(null)} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
              <button onClick={handleCreateConfirm} className="flex-1 py-2 rounded-lg bg-primary-600 text-white font-medium">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm and Start (join) popup */}
      {confirmJoinMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">Confirm and start</h3>
            <p className="text-gray-600 text-sm mb-2">Bet amount: ₹{confirmJoinMatch.entryAmount}</p>
            <p className="text-xs text-gray-500 mb-4">₹{confirmJoinMatch.entryAmount} will be deducted. If someone else took this game, you will see a message.</p>
            <div className="flex gap-2">
              <button onClick={closeConfirmJoin} disabled={joining} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
              <button onClick={handleConfirmAndStart} disabled={joining} className="flex-1 py-2 rounded-lg bg-primary-600 text-white font-medium">{joining ? '...' : 'Confirm and start'}</button>
            </div>
          </div>
        </div>
      )}


      {/* ══ Rules & Commission Modal ══ */}
      {rulesOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col" onClick={() => setRulesOpen(false)}>
          <div
            className="mt-auto bg-white rounded-t-3xl w-full max-w-md mx-auto flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <span>📜</span> Ludo Rules &amp; Commission
              </h2>
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3 text-sm text-gray-700">
              {[
                'दिए गए समय में Room Code डालें, नहीं तो game expire हो जाएगा और दोनों को refund मिलेगा।',
                'यदि आप जान भुजकर Autoexit करते है तो भी आपको 100% Loss कर दिया जायेगा ! यदि दोनों प्लेयर में किसी की काटी खुली नहीं तो उसे हम कैंसिल कर सकते है !',
                'यदि एक टोकन बाहर है और घर के पास है तो 30% Loss दिया जायेगा लेकिन यदि गेम खेला गया है और 2 काटी बहार आयी हो तो गेम को लेफ्ट करने वाले को 100% Loss कर दिया जायेगा !',
                'यदि आपको लगता है की Opponent ने जानभूझकर गेम को Autoexit में छोड़ा है लेकिन Admin ने कैंसिल कर दिया है तो आपसे वीडियो प्रूफ माँगा जायेगा इसलिए हर गेम को रिकॉर्ड करना जरुरी है ! यदि आप वीडियो प्रूफ नहीं देते है तो गेम रिजल्ट एडमिन के अनुसार ही अपडेट किया जायेगा चाहे आप विन हो या गेम कैंसिल हो !',
                'Game शुरू होने के बाद किसी भी Player को Game छोड़ने की अनुमति नहीं है ! Game छोड़ने वाले को Loss माना जायेगा !',
                'Win होने के बाद आप गलत स्क्रीनशॉट डालते है तो गेम को सीधा Cancel कर दिया जायेगा इसलिए यदि आप स्क्रीनशॉट लेना भूल गए है तो पहले Live Chat में एडमिन को संपर्क करे उसके बाद ही उनके बताये अनुसार रिजल्ट पोस्ट करे !',
                "'कैंसिल' रिजल्ट डालने के बाद गेम प्ले करके जीत जाते है तो उसमे हमारी कोई ज़िम्मेदारी नहीं होगी अतः गेम कैंसिल करने के बाद स्टार्ट न करे अन्यथा वो कैंसिल ही माना जायेगा",
                'एक बार रिजल्ट डालने के बाद बदला नहीं जा सकता है इसलिए सोच समझकर रिजल्ट पोस्ट करे गलत रिजल्ट डालने पर पेनल्टी भी लगायी जाएगी चाहे आपने वो गलती से डाला हो या जान भुजकर',
              ].map((rule, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">{idx + 1}</span>
                  <p className="leading-relaxed">{rule}</p>
                </div>
              ))}

              {/* Commission Rates */}
              <div className="pt-2">
                <p className="font-bold text-gray-800 mb-3">कमीशन दरें / Commission Rates:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <span className="text-gray-700">Battle <strong>₹{commTiers.tier1Max} तक</strong></span>
                    <span className="font-bold text-blue-700">{commTiers.tier1Pct}% Commission</span>
                  </div>
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-3">
                    <span className="text-gray-700">Battle <strong>₹{commTiers.tier1Max + 1}–₹{commTiers.tier2Max}</strong></span>
                    <span className="font-bold text-purple-700">{commTiers.tier2Pct}% Commission</span>
                  </div>
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                    <span className="text-gray-700">Battle <strong>₹{commTiers.tier2Max} से ऊपर</strong></span>
                    <span className="font-bold text-green-700">{commTiers.tier3Pct}% Commission</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer close button */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm"
              >
                Got it — Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dummySlideOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-40px); }
        }
        @keyframes dummySlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <Navbar />
    </div>
  );
}
