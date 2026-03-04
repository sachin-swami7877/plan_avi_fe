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

function getLudoStatusDisplay(m) {
  if (m.status === 'cancel_requested') return { label: 'Cancel Requested', bg: 'bg-orange-100 border-orange-300', dot: 'bg-orange-500' };
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

function getCancelReasonLabel(reasonCode, customReason) {
  const labels = {
    connection_issue: 'Internet / Connection में Problem',
    game_not_loaded: 'Game Load नहीं हुआ',
    wrong_room_code: 'Room Code गलत था',
    opponent_left: 'Opponent ने Game छोड़ दिया',
    other: customReason || 'अन्य कारण',
  };
  return labels[reasonCode] || reasonCode || '—';
}

function getWinReasonLabel(reasonCode, customReason) {
  const labels = {
    i_clearly_won: 'मैंने Clearly Game जीता है',
    opponent_left_mid_game: 'Opponent ने बीच में Game छोड़ दिया',
    have_proof: 'मेरे पास Screenshot Proof है',
    unfair_cancel: 'Cancel Request अनुचित था',
    other: customReason || 'अन्य कारण',
  };
  return labels[reasonCode] || reasonCode || '—';
}

const TABS = [
  { id: 'battles', label: 'Battles' },
  { id: 'records', label: 'All Records' },
  { id: 'requests', label: 'Result Requests' },
];

const REFUND_OPTIONS = [
  { value: 'full', label: 'Full Refund' },
  { value: 'refund_win_percent', label: 'Refund + Win %' },
  { value: 'custom_percent', label: 'Custom % Refund' },
  { value: 'zero', label: '0 (No Refund)' },
  { value: 'custom', label: 'Custom Amount (₹)' },
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  // Cancel dispute resolve state
  const [disputeModal, setDisputeModal] = useState(null); // { request, match }
  const [refundDecisions, setRefundDecisions] = useState({}); // { userId: { refundType, customAmount } }
  const [adminNote, setAdminNote] = useState('');
  const [resolvingDispute, setResolvingDispute] = useState(false);
  const [disputeResolveMode, setDisputeResolveMode] = useState('refund'); // 'winner' | 'refund'
  const [disputeWinnerId, setDisputeWinnerId] = useState('');

  // Admin cancel with refund option
  const [adminCancelModal, setAdminCancelModal] = useState(null); // matchId
  const [adminCancelRefund, setAdminCancelRefund] = useState(true);
  const [adminCancelLoading, setAdminCancelLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tick]);

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
        return { ...m, prize, playingFor: m.entryAmount };
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

  const handleAdminCancelBattle = (matchId) => {
    setAdminCancelRefund(true);
    setAdminCancelModal(matchId);
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

  // Open dispute resolve modal
  const openDisputeModal = (request) => {
    const matchData = request.matchId;
    const players = matchData?.players || [];
    // Initialize refund decisions with defaults
    const defaults = {};
    players.forEach((p) => {
      defaults[p.userId] = { refundType: 'full', customAmount: '', winPercent: '70', customPercent: '50' };
    });
    setRefundDecisions(defaults);
    setAdminNote('');
    setDisputeResolveMode('refund');
    setDisputeWinnerId('');
    setDisputeModal({ request, match: matchData });
  };

  const handleRefundTypeChange = (userId, refundType) => {
    setRefundDecisions((prev) => ({ ...prev, [userId]: { ...prev[userId], refundType } }));
  };

  const handleCustomAmountChange = (userId, val) => {
    setRefundDecisions((prev) => ({ ...prev, [userId]: { ...prev[userId], customAmount: val } }));
  };

  const handleWinPercentChange = (userId, val) => {
    setRefundDecisions((prev) => ({ ...prev, [userId]: { ...prev[userId], winPercent: val } }));
  };

  const handleCustomPercentChange = (userId, val) => {
    setRefundDecisions((prev) => ({ ...prev, [userId]: { ...prev[userId], customPercent: val } }));
  };

  const handleResolveDispute = async () => {
    if (!disputeModal) return;

    let body = { adminNote };

    if (disputeResolveMode === 'winner') {
      if (!disputeWinnerId) { toast.error('Winner select करें'); return; }
      body.winnerId = disputeWinnerId;
    } else {
      body.refundDecisions = Object.entries(refundDecisions).map(([userId, d]) => ({
        userId,
        refundType: d.refundType,
        customAmount: d.refundType === 'custom' ? Number(d.customAmount) : undefined,
        winPercent: d.refundType === 'refund_win_percent' ? Number(d.winPercent) : undefined,
        customPercent: d.refundType === 'custom_percent' ? Number(d.customPercent) : undefined,
      }));
    }

    setResolvingDispute(true);
    try {
      await adminAPI.resolveDispute(disputeModal.request._id, body);
      toast.success('Dispute resolved. Players notified.');
      setDisputeModal(null);
      fetchRequests();
      if (activeTab === 'records') fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolvingDispute(false);
    }
  };

  // Admin cancel with refund choice
  const handleAdminCancelConfirm = async () => {
    if (!adminCancelModal) return;
    setAdminCancelLoading(true);
    try {
      await adminAPI.updateLudoMatchStatus(adminCancelModal, {
        status: 'cancelled',
        cancelReason: 'Admin cancelled',
        refund: adminCancelRefund,
      });
      toast.success(adminCancelRefund ? 'Cancelled. Refund done.' : 'Cancelled. No refund.');
      setAdminCancelModal(null);
      setDetailMatch(null);
      if (activeTab === 'battles') fetchBattles();
      if (activeTab === 'records') fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setAdminCancelLoading(false);
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
  const detailCountdown = useCountdown(detailMatch?.status === 'waiting' ? detailMatch.joinExpiryAt : null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Ludo</h1>

      <div className="flex justify-between mb-4 flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === t.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Battles Tab ── */}
      {activeTab === 'battles' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><span className="text-xl">🏆</span> Open battles</h3>
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
                          <span><span className="font-medium">Amount</span> <span className="font-semibold text-gray-900">₹{m.entryAmount}</span></span>
                          <span><span className="font-medium">Prize</span> <span className="font-semibold text-gray-900">💰 ₹{prize}</span></span>
                        </p>
                        <p className="text-xs font-medium text-red-600 mt-1 font-mono">Expires in: {remaining ?? '0:00'} min</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openDetail(m._id)} className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">View</button>
                        <button onClick={() => handleAdminCancelBattle(m._id)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><span className="text-xl">🏆</span> Running battles</h3>
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
                        <span><span className="font-medium">Amount</span> <span className="font-semibold text-gray-900">₹{amount}</span></span>
                        <span><span className="font-medium">Prize</span> <span className="font-semibold text-gray-900">💰 ₹{b.prize}</span></span>
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">{p1}</span>
                        <span className="text-amber-600 font-bold flex-shrink-0">Vs</span>
                        <span className="text-sm font-semibold text-gray-800 truncate">{p2}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openDetail(b._id)} className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">View</button>
                        <button onClick={() => handleAdminCancelBattle(b._id)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Records Tab ── */}
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
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === f.value ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {records.some((m) => m.status === 'cancelled') && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <button onClick={selectAllDeletable} className="text-xs font-medium text-primary-600 hover:underline">
                {selectedIds.size > 0 ? 'Deselect All' : 'Select All Expired/Cancelled'}
              </button>
              {selectedIds.size > 0 && (
                <button onClick={handleBulkDelete} disabled={deleting} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                  {deleting ? 'Deleting...' : `Delete ${selectedIds.size} selected`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isDeletable && (
                          <input type="checkbox" checked={selectedIds.has(m._id)} onChange={() => toggleSelect(m._id)} className="w-4 h-4 rounded border-gray-300 text-primary-600 flex-shrink-0" />
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
                          <button onClick={() => handleAdminCancelBattle(m._id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Cancel</button>
                        )}
                      </div>
                    </div>
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
                    {/* Show cancel reason if cancel_requested */}
                    {m.status === 'cancel_requested' && m.cancelReasonCode && (
                      <p className="text-xs text-orange-700 mt-1 font-medium">
                        Cancel Reason: <span className="font-bold">{getCancelReasonLabel(m.cancelReasonCode, m.cancelReasonCustom)}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50">Prev</button>
              <span className="py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}

      {/* ── Result Requests Tab ── */}
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
                const isCancelDispute = r.disputeType === 'cancel_dispute';
                const isCancelAccepted = r.disputeType === 'cancel_accepted';
                const isAdminDispute = isCancelDispute || isCancelAccepted;
                const hasLegacy = !claims.length && r.userId;

                return (
                  <div key={r._id} className={`bg-white rounded-xl p-4 shadow-sm border-2 ${isCancelDispute ? 'border-orange-300' : isCancelAccepted ? 'border-blue-300' : 'border-gray-100'}`}>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      {isCancelDispute && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">⚠️ CANCEL DISPUTE (Win Claim)</span>
                      )}
                      {isCancelAccepted && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">✅ CANCEL ACCEPTED (Admin Refund)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mb-1">Match ID: {matchId?._id}</p>
                    <p className="font-medium text-gray-800">Match: ₹{matchId?.entryAmount} • Room: {matchId?.roomCode || '—'}</p>
                    <p className="text-sm text-gray-500 mb-2">Players: {players.map((p) => p.userName).join(', ')}</p>

                    {/* Cancel Reason Info (shown for both dispute types) */}
                    {isAdminDispute && matchId?.cancelReasonCode && (
                      <div className={`border rounded-lg px-3 py-2 mb-3 ${isCancelDispute ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                        <p className={`text-xs font-semibold uppercase mb-0.5 ${isCancelDispute ? 'text-red-600' : 'text-blue-600'}`}>Cancel Request कारण</p>
                        <p className={`font-bold text-sm ${isCancelDispute ? 'text-red-800' : 'text-blue-800'}`}>
                          {getCancelReasonLabel(matchId.cancelReasonCode, matchId.cancelReasonCustom)}
                        </p>
                        <p className={`text-xs mt-0.5 ${isCancelDispute ? 'text-red-600' : 'text-blue-600'}`}>
                          Cancel by: {players.find((p) => p.userId?.toString() === matchId.cancelRequestedBy?.toString())?.userName || '—'}
                          {isCancelAccepted && ' • Accepted by opponent'}
                        </p>
                      </div>
                    )}

                    {/* Claims */}
                    <div className="space-y-2 mb-3">
                      {claims.map((c, i) => (
                        <div key={i} className={`rounded-lg px-3 py-2 ${c.type === 'win_dispute' ? 'bg-orange-50 border border-orange-200' : c.type === 'win' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">{c.userName}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.type === 'win_dispute' ? 'bg-orange-100 text-orange-700' : c.type === 'win' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {c.type === 'win_dispute' ? 'Win Dispute' : c.type === 'win' ? 'Win Claim' : 'Loss'}
                            </span>
                          </div>
                          {c.winReasonCode && (
                            <p className="text-xs text-gray-600 mt-1">
                              Win Reason: <span className="font-semibold text-gray-800">{getWinReasonLabel(c.winReasonCode, c.winReasonCustom)}</span>
                            </p>
                          )}
                          {c.screenshotUrl && (
                            <a href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-primary-600 text-xs underline font-medium">
                              📷 Screenshot देखें
                            </a>
                          )}
                        </div>
                      ))}
                      {isCancelAccepted && claims.length === 0 && (
                        <p className="text-sm text-blue-600 italic">दोनों players ने cancel agree किया है। Refund amount set करें।</p>
                      )}
                      {hasLegacy && (
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
                          <span className="font-medium text-gray-800">{r.userName}</span>
                          <span className="text-sm text-green-600 font-medium">Won request</span>
                          {r.screenshotUrl && (
                            <a href={r.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs underline ml-2">Screenshot</a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isAdminDispute ? (
                      /* Cancel Dispute / Cancel Accepted → Show "Resolve" button */
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openDisputeModal(r)}
                          className={`text-white px-4 py-2 rounded-lg text-sm font-bold ${isCancelDispute ? 'bg-orange-600' : 'bg-blue-600'}`}
                        >
                          {isCancelDispute ? '⚖️ Resolve करें (Refund / Winner)' : '⚖️ Refund Set करें & Resolve'}
                        </button>
                        <button
                          onClick={() => rejectRequest(r._id)}
                          disabled={rejectingId === r._id}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {rejectingId === r._id ? '...' : 'Reject'}
                        </button>
                      </div>
                    ) : (
                      /* Normal result request */
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
                          <button onClick={() => approveRequest(r._id, r.userId)} disabled={approvingId === r._id} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                            {approvingId === r._id ? '...' : 'Approve'}
                          </button>
                        )}
                        <button onClick={() => rejectRequest(r._id)} disabled={rejectingId === r._id} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                          {rejectingId === r._id ? '...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Match Detail Modal ── */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6">Loading...</div>
        </div>
      )}
      {detailMatch && !detailLoading && (() => {
        const rr = detailMatch.resultRequest;
        const rrClaims = rr?.claims || [];
        const cancellerName = detailMatch.players?.find((p) => p.userId?.toString() === detailMatch.cancelRequestedBy?.toString())?.userName;
        const winnerName = detailMatch.winnerId ? detailMatch.players?.find((p) => p.userId?.toString() === detailMatch.winnerId?.toString())?.userName : null;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Match Detail</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{detailMatch._id}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                detailMatch.status === 'completed' ? 'bg-green-100 text-green-700' :
                detailMatch.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                detailMatch.status === 'live' ? 'bg-violet-100 text-violet-700' :
                detailMatch.status === 'cancel_requested' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'
              }`}>{detailMatch.status}</span>
            </div>

            {/* Basic info */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 mb-3">
              <p className="text-sm text-gray-700">Room: <strong>{detailMatch.roomCode || '—'}</strong></p>
              <p className="text-sm text-gray-700">Entry: <strong>₹{detailMatch.entryAmount}</strong> • Prize: <strong>₹{Math.round(2 * detailMatch.entryAmount * 0.9)}</strong></p>
              <p className="text-sm text-gray-700">Players: {detailMatch.players?.map((p) => p.userName).join(' vs ')}</p>
              {winnerName && <p className="text-sm text-green-700 font-semibold">🏆 Winner: {winnerName}</p>}
              {detailMatch.gameStartedAt && <p className="text-xs text-gray-500">Started: {formatTime12hr(detailMatch.gameStartedAt)}</p>}
              {detailMatch.joinExpiryAt && detailMatch.status === 'waiting' && (
                <p className="text-xs text-gray-500">
                  Join expires: <span className="font-mono font-medium">{detailCountdown.expired ? '0:00' : `${detailCountdown.display} min`}</span>
                </p>
              )}
            </div>

            {/* Cancel Reason */}
            {detailMatch.cancelReasonCode && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 mb-3">
                <p className="text-xs text-orange-600 font-bold uppercase mb-0.5">Cancel Request</p>
                <p className="text-orange-800 font-semibold text-sm">{getCancelReasonLabel(detailMatch.cancelReasonCode, detailMatch.cancelReasonCustom)}</p>
                {cancellerName && <p className="text-xs text-orange-600 mt-0.5">By: <strong>{cancellerName}</strong></p>}
              </div>
            )}

            {/* Result Request Info */}
            {rr && (
              <div className="border-2 border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Result Request</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rr.disputeType === 'cancel_dispute' ? 'bg-orange-100 text-orange-700' :
                    rr.disputeType === 'cancel_accepted' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {rr.disputeType === 'cancel_dispute' ? '⚠️ Cancel Dispute' :
                     rr.disputeType === 'cancel_accepted' ? '✅ Cancel Accepted' : 'Normal'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${rr.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {rr.status === 'resolved' ? 'Resolved' : 'Pending'}
                  </span>
                </div>

                {/* Claims */}
                {rrClaims.map((c, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 ${c.type === 'win_dispute' ? 'bg-orange-50 border border-orange-200' : c.type === 'win' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-sm">{c.userName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'win_dispute' ? 'bg-orange-100 text-orange-700' : c.type === 'win' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.type === 'win_dispute' ? 'Win Dispute' : c.type === 'win' ? 'Win' : 'Loss'}
                      </span>
                    </div>
                    {c.winReasonCode && <p className="text-xs text-gray-600 mt-0.5">{getWinReasonLabel(c.winReasonCode, c.winReasonCustom)}</p>}
                    {c.screenshotUrl && (
                      <a href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-primary-600 text-xs underline font-medium">
                        📷 Screenshot देखें
                      </a>
                    )}
                  </div>
                ))}

                {/* Refund Decisions (if resolved with refunds) */}
                {rr.status === 'resolved' && rr.refundDecisions?.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-green-700 mb-1.5">Refund Decisions</p>
                    {rr.refundDecisions.map((rd, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{rd.userName || '—'}</span>
                        <span className={`font-bold ${rd.amount > 0 ? 'text-green-700' : 'text-red-500'}`}>
                          {rd.amount > 0 ? `₹${rd.amount} refund` : 'No Refund'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Note */}
                {rr.adminNote && (
                  <p className="text-xs text-gray-500 italic bg-gray-50 rounded px-2 py-1">Admin Note: {rr.adminNote}</p>
                )}
              </div>
            )}

            {/* Actions (only for active/pending matches) */}
            {(detailMatch.status === 'waiting' || detailMatch.status === 'live' || detailMatch.status === 'cancel_requested') && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {detailMatch.status === 'waiting' && (
                    <button onClick={() => { setAdminCancelRefund(true); setAdminCancelModal(detailMatch._id); }} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm">
                      Cancel Match
                    </button>
                  )}
                  {(detailMatch.status === 'live' || detailMatch.status === 'cancel_requested') && (
                    <>
                      {detailMatch.players?.map((p) => (
                        <button key={p.userId} onClick={() => updateMatchStatus(detailMatch._id, { status: 'completed', winnerId: p.userId })} disabled={updatingStatus} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50">
                          {updatingStatus ? '...' : `Set ${p.userName} as winner`}
                        </button>
                      ))}
                      <button onClick={() => { setAdminCancelRefund(true); setAdminCancelModal(detailMatch._id); }} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm">
                        Cancel Match
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => setDetailMatch(null)} className="mt-4 w-full py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium">Close</button>
          </div>
        </div>
        );
      })()}

      {/* ── Dispute Resolve Modal ── */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-1 text-lg">
              {disputeModal.request.disputeType === 'cancel_accepted' ? '✅ Cancel Accepted — Refund Set करें' : '⚖️ Cancel Dispute Resolve करें'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {disputeModal.request.disputeType === 'cancel_accepted'
                ? 'दोनों players ने cancel agree किया है। हर player के लिए refund amount set करें।'
                : 'Dispute resolve करें — winner declare करें या refund set करें।'}
            </p>

            {/* Cancel Reason */}
            {disputeModal.match?.cancelReasonCode && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                <p className="text-xs text-red-600 font-semibold uppercase mb-0.5">Cancel Request कारण</p>
                <p className="text-red-800 font-bold text-sm">{getCancelReasonLabel(disputeModal.match.cancelReasonCode, disputeModal.match.cancelReasonCustom)}</p>
                <p className="text-xs text-red-600 mt-0.5">
                  By: {disputeModal.match.players?.find((p) => p.userId?.toString() === disputeModal.match.cancelRequestedBy?.toString())?.userName || '—'}
                  {disputeModal.request.disputeType === 'cancel_accepted' && ' • Opponent ने accept किया'}
                </p>
              </div>
            )}

            {/* Win Dispute Claim */}
            {disputeModal.request.claims?.filter((c) => c.type === 'win_dispute').map((c, i) => (
              <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
                <p className="text-xs text-orange-600 font-semibold uppercase mb-0.5">Win Claim</p>
                <p className="text-orange-800 font-bold text-sm">{c.userName} — {getWinReasonLabel(c.winReasonCode, c.winReasonCustom)}</p>
                {c.screenshotUrl && (
                  <a href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-primary-600 text-xs underline font-medium">
                    📷 Screenshot देखें
                  </a>
                )}
              </div>
            ))}

            {/* Resolution Mode Toggle — only for cancel_dispute */}
            {disputeModal.request.disputeType === 'cancel_dispute' && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setDisputeResolveMode('refund')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${disputeResolveMode === 'refund' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  💰 Refund Set करें
                </button>
                <button
                  onClick={() => setDisputeResolveMode('winner')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${disputeResolveMode === 'winner' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  🏆 Winner Declare करें
                </button>
              </div>
            )}

            {/* Winner Selection (cancel_dispute + winner mode) */}
            {disputeModal.request.disputeType === 'cancel_dispute' && disputeResolveMode === 'winner' && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Winner कौन है?</p>
                <div className="space-y-2">
                  {(disputeModal.match?.players || []).map((player) => (
                    <label key={player.userId} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${disputeWinnerId === player.userId?.toString() ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="disputeWinner"
                        value={player.userId?.toString()}
                        checked={disputeWinnerId === player.userId?.toString()}
                        onChange={() => setDisputeWinnerId(player.userId?.toString())}
                        className="accent-green-600"
                      />
                      <span className="font-semibold text-gray-800">{player.userName}</span>
                      {player.userId?.toString() === disputeModal.match?.cancelRequestedBy?.toString() && (
                        <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full ml-auto">Canceller</span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Winner को full prize (commission minus) milega. Loser को kuch nahi.</p>
              </div>
            )}

            {/* Refund decisions (when in refund mode) */}
            {disputeResolveMode === 'refund' && (
              <div className="space-y-4 mb-4">
                {(disputeModal.match?.players || []).map((player) => {
                  const decision = refundDecisions[player.userId] || { refundType: 'full', customAmount: '', winPercent: '70' };
                  const isCanceller = player.userId?.toString() === disputeModal.match?.cancelRequestedBy?.toString();
                  const entryAmt = player.amountPaid || disputeModal.match?.entryAmount || 0;
                  const prize = Math.round(2 * (disputeModal.match?.entryAmount || 0) * 0.9);
                  const winPct = Math.max(0, Math.min(100, Number(decision.winPercent) || 0));
                  // Win portion = X% of one side's entry, after commission deducted proportionally
                  // Simplified: prize/2 * winPct/100  (prize/2 = per-player share after commission)
                  const winPortionPreview = Math.round((prize / 2) * winPct / 100);
                  const custPct = Math.max(0, Math.min(100, Number(decision.customPercent) || 0));
                  const previewAmt = decision.refundType === 'full' ? entryAmt
                    : decision.refundType === 'refund_win_percent' ? entryAmt + winPortionPreview
                    : decision.refundType === 'custom_percent' ? Math.round(entryAmt * custPct / 100)
                    : decision.refundType === 'zero' ? 0
                    : Number(decision.customAmount) || 0;

                  return (
                    <div key={player.userId} className="border-2 border-gray-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-gray-800">{player.userName}</p>
                        {isCanceller && <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full">Canceller</span>}
                        <span className="text-xs text-gray-500 ml-auto">Entry: ₹{entryAmt} • Prize: ₹{prize}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {REFUND_OPTIONS.map((opt) => (
                          <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer text-sm transition-colors ${decision.refundType === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-gray-50'}`}>
                            <input
                              type="radio"
                              name={`refund_${player.userId}`}
                              value={opt.value}
                              checked={decision.refundType === opt.value}
                              onChange={() => handleRefundTypeChange(player.userId, opt.value)}
                              className="accent-primary-600"
                            />
                            <span className="font-medium text-gray-800">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      {decision.refundType === 'refund_win_percent' && (
                        <div className="mb-2">
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Winning % (0–100)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="e.g. 70"
                              value={decision.winPercent}
                              onChange={(e) => handleWinPercentChange(player.userId, e.target.value)}
                              min={0}
                              max={100}
                              className="w-24 border-2 border-purple-300 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
                            />
                            <span className="text-xs text-gray-500">% of ₹{entryAmt} entry (after commission) = <strong>₹{winPortionPreview}</strong></span>
                          </div>
                          <p className="text-xs text-purple-600 mt-1">Total = ₹{entryAmt} (entry) + ₹{winPortionPreview} (win) = ₹{previewAmt}</p>
                        </div>
                      )}
                      {decision.refundType === 'custom_percent' && (
                        <div className="mb-2">
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Refund % (0–100)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="e.g. 50"
                              value={decision.customPercent}
                              onChange={(e) => handleCustomPercentChange(player.userId, e.target.value)}
                              min={0}
                              max={100}
                              className="w-24 border-2 border-blue-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                            />
                            <span className="text-xs text-gray-500">{custPct}% of ₹{entryAmt} = <strong>₹{previewAmt}</strong></span>
                          </div>
                        </div>
                      )}
                      {decision.refundType === 'custom' && (
                        <input
                          type="number"
                          placeholder="Amount (₹)"
                          value={decision.customAmount}
                          onChange={(e) => handleCustomAmountChange(player.userId, e.target.value)}
                          min={0}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:border-primary-400 outline-none"
                        />
                      )}
                      <div className={`border rounded-lg px-3 py-1.5 text-center ${decision.refundType === 'refund_win_percent' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
                        <p className={`font-bold text-sm ${decision.refundType === 'refund_win_percent' ? 'text-purple-800' : 'text-green-800'}`}>
                          {decision.refundType === 'refund_win_percent' ? `Total: ₹${previewAmt}` : `Refund: ₹${previewAmt}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Admin Note */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Note (Optional)</label>
              <textarea
                placeholder="Internal note..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-primary-400 outline-none resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setDisputeModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium">
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                disabled={resolvingDispute}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold disabled:opacity-50 ${disputeResolveMode === 'winner' ? 'bg-green-600' : 'bg-orange-600'}`}
              >
                {resolvingDispute ? 'Applying...' : disputeResolveMode === 'winner' ? '🏆 Winner Declare करें' : '✅ Refund Apply करें'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Cancel Modal (with refund option) ── */}
      {adminCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-1 text-lg">Match Cancel करें</h3>
            <p className="text-sm text-gray-500 mb-4">क्या players को refund देना है?</p>
            <div className="space-y-2 mb-5">
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${adminCancelRefund ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <input
                  type="radio"
                  name="adminCancelRefund"
                  checked={adminCancelRefund}
                  onChange={() => setAdminCancelRefund(true)}
                  className="accent-green-600"
                />
                <div>
                  <p className="font-semibold text-gray-800">हाँ — Full Refund दें</p>
                  <p className="text-xs text-gray-500">दोनों players को उनकी entry वापस होगी।</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${!adminCancelRefund ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <input
                  type="radio"
                  name="adminCancelRefund"
                  checked={!adminCancelRefund}
                  onChange={() => setAdminCancelRefund(false)}
                  className="accent-red-600"
                />
                <div>
                  <p className="font-semibold text-gray-800">नहीं — No Refund</p>
                  <p className="text-xs text-gray-500">किसी को भी पैसे वापस नहीं होंगे।</p>
                </div>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdminCancelModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium">
                Back
              </button>
              <button
                onClick={handleAdminCancelConfirm}
                disabled={adminCancelLoading}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold disabled:opacity-50 ${adminCancelRefund ? 'bg-orange-600' : 'bg-red-700'}`}
              >
                {adminCancelLoading ? '...' : adminCancelRefund ? 'Cancel & Refund' : 'Cancel (No Refund)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
