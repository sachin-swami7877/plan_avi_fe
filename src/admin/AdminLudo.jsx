import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { useCountdown } from '../hooks/useCountdown';
import toast from 'react-hot-toast';

function formatTime12hr(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' });
}

function getRemainingDisplay(expiryDate) {
  if (!expiryDate) return null;
  const end = new Date(expiryDate);
  const now = new Date();
  const ms = end - now;
  if (ms <= 0) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Status display and row background for admin + user history
function getLudoStatusDisplay(m) {
  if (m.hasPendingRequest && m.status === 'live') return { label: 'Requested', bg: 'bg-amber-100 border-amber-300', dot: 'bg-amber-500' };
  if (m.status === 'completed') return { label: 'Completed', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' };
  if (m.status === 'cancelled') {
    const autoExpired = (m.cancelReason || '').toLowerCase().includes('expired');
    return { label: autoExpired ? 'Auto expired' : 'Cancelled', bg: autoExpired ? 'bg-red-100 border-red-300' : 'bg-red-50 border-red-200', dot: autoExpired ? 'bg-orange-500' : 'bg-red-500' };
  }
  if (m.status === 'live') return { label: 'Live', bg: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500' };
  if (m.status === 'waiting') return { label: 'Waiting', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-500' };
  return { label: m.status || '—', bg: 'bg-white border-gray-200', dot: 'bg-gray-400' };
}

const TABS = [
  { id: 'battles', label: 'Battles' },
  { id: 'records', label: 'All Records' },
  { id: 'requests', label: 'Result Requests' },
];

export default function AdminLudo() {
  const [activeTab, setActiveTab] = useState('requests');
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [detailMatch, setDetailMatch] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [tick, setTick] = useState(() => Date.now());
  const [openBattles, setOpenBattles] = useState([]);
  const [runningBattles, setRunningBattles] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminAPI.getLudoMatches(params);
      setRecords(res.data?.data || []);
      setTotalCount(res.data?.totalCount || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await adminAPI.getLudoResultRequests({ status: 'pending' });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, []);


  const fetchBattles = useCallback(async () => {
    setLoading(true);
    try {
      const [waitRes, liveRes] = await Promise.all([
        adminAPI.getLudoMatches({ status: 'waiting', limit: 50 }),
        adminAPI.getLudoMatches({ status: 'live', limit: 50 }),
      ]);
      setOpenBattles(waitRes.data?.data || []);
      const live = (liveRes.data?.data || []).filter((m) => !m.hasPendingRequest);
      setRunningBattles(live.map((m) => {
        const pool = (m.players || []).reduce((s, p) => s + (p.amountPaid || 0), 0) || m.entryAmount * 2;
        const prize = Math.round(pool * 0.9);
        return {
          ...m,
          prize,
          playingFor: m.entryAmount,
        };
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
      setOpenBattles([]);
      setRunningBattles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'battles') fetchBattles();
    if (activeTab === 'records') fetchRecords();
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab, fetchBattles, fetchRecords, fetchRequests]);

  const openDetail = async (id) => {
    setDetailMatch(null);
    setDetailLoading(true);
    try {
      const res = await adminAPI.getLudoMatchDetail(id);
      setDetailMatch(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load match');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateMatchStatus = async (matchId, body) => {
    setUpdatingStatus(true);
    try {
      await adminAPI.updateLudoMatchStatus(matchId, body);
      toast.success('Status updated');
      setDetailMatch(null);
      if (activeTab === 'battles') fetchBattles();
      if (activeTab === 'records') fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAdminCancelBattle = async (matchId) => {
    setCancellingId(matchId);
    try {
      await adminAPI.updateLudoMatchStatus(matchId, { status: 'cancelled', cancelReason: 'Admin cancelled' });
      toast.success('Battle cancelled');
      if (activeTab === 'battles') fetchBattles();
      if (activeTab === 'records') fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const approveRequest = async (id, winnerId) => {
    setApprovingId(id);
    try {
      await adminAPI.approveLudoResultRequest(id, winnerId);
      toast.success('Result approved. Winner credited.');
      setDetailMatch(null);
      fetchRequests();
      if (activeTab === 'records') fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };

  const rejectRequest = async (id) => {
    setRejectingId(id);
    try {
      await adminAPI.rejectLudoResultRequest(id);
      toast.success('Result rejected');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setRejectingId(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDeletable = () => {
    const deletable = records.filter((m) => m.status === 'cancelled' || ((m.cancelReason || '').toLowerCase().includes('expired')));
    if (deletable.length === selectedIds.size && deletable.every((m) => selectedIds.has(m._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletable.map((m) => m._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await adminAPI.deleteLudoMatches([...selectedIds]);
      toast.success(`${selectedIds.size} matches deleted`);
      setSelectedIds(new Set());
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / 25);
  const detailCountdown = useCountdown(
    detailMatch?.status === 'waiting' ? detailMatch.joinExpiryAt : null
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Ludo</h1>

      <div className="flex justify-between mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === t.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Battles — same layout as user Ludo; admin can cancel */}
      {activeTab === 'battles' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">🏆</span> Open battles
            </h3>
            {loading ? (
              <div className="text-center py-4 text-gray-600">Loading...</div>
            ) : openBattles.length === 0 ? (
              <p className="text-gray-600 text-sm">No open battles.</p>
            ) : (
              <div className="space-y-3">
                {openBattles.map((m) => {
                  const remaining = getRemainingDisplay(m.joinExpiryAt);
                  const prize = Math.round(2 * m.entryAmount * 0.9);
                  return (
                    <div key={m._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Challenge from</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{m.creatorName || 'Player'}</p>
                        <p className="text-sm text-gray-700 mt-1.5 flex items-center gap-3 flex-wrap">
                          <span><span className="font-medium text-gray-700">Amount</span> <span className="font-semibold text-gray-900">₹{m.entryAmount}</span></span>
                          <span><span className="font-medium text-gray-700">Prize</span> <span className="font-semibold text-gray-900">💰 ₹{prize}</span></span>
                        </p>
                        <p className="text-xs font-medium text-red-600 mt-1 font-mono">Expires in: {remaining ?? '0:00'} min</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openDetail(m._id)} className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">View</button>
                        <button onClick={() => handleAdminCancelBattle(m._id)} disabled={cancellingId === m._id} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">{cancellingId === m._id ? '...' : 'Cancel'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">🏆</span> Running battles
            </h3>
            {loading ? (
              <div className="text-center py-4 text-gray-600">Loading...</div>
            ) : runningBattles.length === 0 ? (
              <p className="text-gray-600 text-sm">No running battles.</p>
            ) : (
              <div className="space-y-3">
                {runningBattles.map((b) => {
                  const p1 = b.players?.[0]?.userName || '—';
                  const p2 = b.players?.[1]?.userName || '—';
                  const amount = b.playingFor ?? b.entryAmount;
                  return (
                    <div key={b._id} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <p className="text-sm text-gray-700 flex items-center gap-3 flex-wrap mb-2">
                        <span><span className="font-medium text-gray-700">Amount</span> <span className="font-semibold text-gray-900">₹{amount}</span></span>
                        <span><span className="font-medium text-gray-700">Prize</span> <span className="font-semibold text-gray-900">💰 ₹{b.prize}</span></span>
                      </p>
                      <p className="text-xs font-medium text-gray-600 mb-1">Opponent name</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate" title={p1}>{p1}</span>
                        <span className="text-amber-600 font-bold flex-shrink-0">Vs</span>
                        <span className="text-sm font-semibold text-gray-800 truncate" title={p2}>{p2}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openDetail(b._id)} className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">View</button>
                        <button onClick={() => handleAdminCancelBattle(b._id)} disabled={cancellingId === b._id} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">{cancellingId === b._id ? '...' : 'Cancel'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status filter for All Records */}
      {activeTab === 'records' && (
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap mb-2">
            {[
              { value: '', label: 'All' },
              { value: 'waiting', label: 'Waiting' },
              { value: 'live', label: 'Live' },
              { value: 'requested', label: 'Requested' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); setSelectedIds(new Set()); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
            {statusFilter && (
              <button
                onClick={() => { setStatusFilter(''); setPage(1); setSelectedIds(new Set()); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              >
                Clear Filter
              </button>
            )}
          </div>
          {/* Bulk delete bar */}
          {records.some((m) => m.status === 'cancelled') && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <button onClick={selectAllDeletable} className="text-xs font-medium text-primary-600 hover:underline">
                {selectedIds.size > 0 ? 'Deselect All' : 'Select All Expired/Cancelled'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : `Delete ${selectedIds.size} selected`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* All Records — card layout */}
      {activeTab === 'records' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-600">No matches</div>
          ) : (
            <div className="space-y-2">
              {records.map((m) => {
                const statusInfo = getLudoStatusDisplay(m);
                const waitingRemaining = m.status === 'waiting' && m.joinExpiryAt ? getRemainingDisplay(m.joinExpiryAt) : null;
                const prize = Math.round(2 * m.entryAmount * 0.9);
                const p1 = m.players?.[0]?.userName || '—';
                const p2 = m.players?.[1]?.userName || '—';
                const isWaiting = m.status === 'waiting';
                const isLive = m.status === 'live';
                const isCompleted = m.status === 'completed';

                const isDeletable = m.status === 'cancelled';

                return (
                  <div key={m._id} className={`rounded-lg px-3 py-2.5 border ${statusInfo.bg}`}>
                    {/* Row 1: Status + Amount/Prize + Buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isDeletable && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m._id)}
                            onChange={() => toggleSelect(m._id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                          />
                        )}
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.dot}`} />
                        <span className="font-semibold text-gray-800 text-sm">{statusInfo.label}</span>
                        <span className="text-gray-400 text-xs">|</span>
                        <span className="text-sm font-bold text-gray-900">₹{m.entryAmount}</span>
                        <span className="text-xs text-gray-500">Prize</span>
                        <span className="text-sm font-bold text-green-700">₹{prize}</span>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => openDetail(m._id)} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">View</button>
                        {(isWaiting || isLive) && (
                          <button onClick={() => handleAdminCancelBattle(m._id)} disabled={cancellingId === m._id} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">{cancellingId === m._id ? '...' : 'Cancel'}</button>
                        )}
                      </div>
                    </div>
                    {/* Row 2: Players + meta */}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-600 truncate">
                        <span className="font-semibold text-gray-800">{p1}</span>
                        {' '}<span className="text-amber-600 font-bold">Vs</span>{' '}
                        <span className="font-semibold text-gray-800">{p2}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isWaiting && waitingRemaining != null && <span className="text-[10px] font-mono text-red-600">{waitingRemaining}</span>}
                        {isCompleted && m.winnerId && <span className="text-[10px] text-green-700 font-medium">W: {m.players?.find((p) => p.userId?.toString() === m.winnerId?.toString())?.userName || '—'}</span>}
                        <span className="text-[10px] text-gray-400">{formatTime12hr(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === 'records' && totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Result Requests (one per match, claims from both users) */}
      {activeTab === 'requests' && (
        <>
          {requestsLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500">No pending result requests</div>
          ) : (
            <div className="space-y-4">
              {requests.map((r) => {
                const matchId = r.matchId;
                const players = matchId?.players || [];
                const claims = Array.isArray(r.claims) ? r.claims : [];
                const hasLegacy = !claims.length && r.userId;
                return (
                  <div key={r._id} className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500 font-mono mb-1">Match ID: {matchId?._id}</p>
                    <p className="font-medium text-gray-800">Match: ₹{matchId?.entryAmount} • Room: {matchId?.roomCode}</p>
                    <p className="text-sm text-gray-500 mb-2">Players: {players.map((p) => p.userName).join(', ')}</p>
                    <div className="space-y-2 mb-3">
                      {claims.map((c, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                          <span className="font-medium text-gray-800">{c.userName}</span>
                          <span className={`text-sm ${c.type === 'win' ? 'text-green-600' : 'text-gray-500'}`}>
                            {c.type === 'win' ? 'Won request' : 'Loss request'}
                          </span>
                          {c.screenshotUrl && (
                            <a href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs underline ml-2">
                              Screenshot
                            </a>
                          )}
                        </div>
                      ))}
                      {hasLegacy && (
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                          <span className="font-medium text-gray-800">{r.userName}</span>
                          <span className="text-sm text-green-600">Won request</span>
                          {r.screenshotUrl && (
                            <a href={r.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs underline ml-2">Screenshot</a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {players.length ? players.map((p) => (
                        <button
                          key={p.userId}
                          onClick={() => approveRequest(r._id, p.userId)}
                          disabled={approvingId === r._id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {approvingId === r._id ? '...' : `${p.userName} won ✓`}
                        </button>
                      )) : hasLegacy && (
                        <button
                          onClick={() => approveRequest(r._id, r.userId)}
                          disabled={approvingId === r._id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {approvingId === r._id ? '...' : 'Approve'}
                        </button>
                      )}
                      <button
                        onClick={() => rejectRequest(r._id)}
                        disabled={rejectingId === r._id}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {rejectingId === r._id ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6">Loading...</div>
        </div>
      )}
      {detailMatch && !detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full my-8">
            <h3 className="font-bold text-gray-800 mb-2">Match detail</h3>
            <p className="text-sm text-gray-600">
              Room: <strong>{detailMatch.roomCode || '—'}</strong> • Entry: ₹{detailMatch.entryAmount} • Status: {detailMatch.status}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Players: {detailMatch.players?.map((p) => p.userName).join(', ')}
            </p>
            {detailMatch.gameStartedAt && detailMatch.status === 'live' && (
              <p className="text-sm text-gray-500 mt-1">
                Started: {formatTime12hr(detailMatch.gameStartedAt)}
              </p>
            )}
            {detailMatch.joinExpiryAt && detailMatch.status === 'waiting' && (
              <p className="text-sm text-gray-500 mt-1">
                Join expires: <span className="font-mono font-medium">{detailCountdown.expired ? '0:00' : `${detailCountdown.display} min`}</span> ({formatTime12hr(detailMatch.joinExpiryAt)})
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Change status</p>
              <div className="flex flex-wrap gap-2">
                {detailMatch.status === 'waiting' && (
                  <button
                    onClick={() => updateMatchStatus(detailMatch._id, { status: 'cancelled', cancelReason: 'Admin cancelled' })}
                    disabled={updatingStatus}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
                  >
                    Cancel & refund all
                  </button>
                )}
                {detailMatch.status === 'live' && (
                  <>
                    {detailMatch.players?.map((p) => (
                      <button
                        key={p.userId}
                        onClick={() => updateMatchStatus(detailMatch._id, { status: 'completed', winnerId: p.userId })}
                        disabled={updatingStatus}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
                      >
                        Set {p.userName} as winner
                      </button>
                    ))}
                    <button
                      onClick={() => updateMatchStatus(detailMatch._id, { status: 'cancelled', cancelReason: 'Admin cancelled' })}
                      disabled={updatingStatus}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
                    >
                      Cancel & refund all
                    </button>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setDetailMatch(null)}
              className="mt-4 w-full py-2 rounded-lg border border-gray-300 text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
