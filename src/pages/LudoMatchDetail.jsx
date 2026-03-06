import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ludoAPI, settingsAPI } from '../services/api';
import { useCountdown, useElapsedTimer } from '../hooks/useCountdown';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

function formatTime12hr(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' });
}

// Reasons shown before room code (waiting / early live cancel → full refund)
const PRE_GAME_CANCEL_REASONS = [
  { code: 'opponent_not_joined', label: 'Opponent ने Join नहीं किया' },
  { code: 'dont_want_to_play', label: 'मुझे अभी खेलना नहीं है' },
  { code: 'technical_issue', label: 'Technical / Internet Problem है' },
  { code: 'wrong_entry', label: 'गलती से Match Join हो गया' },
  { code: 'other', label: 'अन्य कारण' },
];

// Cancel reasons shown when user clicks "Cancel Game" after game started
const CANCEL_REASONS = [
  { code: 'connection_issue', label: 'Internet / Connection में Problem' },
  { code: 'game_not_loaded', label: 'Game Load नहीं हुआ' },
  { code: 'wrong_room_code', label: 'Room Code गलत था' },
  { code: 'opponent_left', label: 'Opponent ने Game छोड़ दिया' },
  { code: 'other', label: 'अन्य कारण' },
];

// Win result reasons shown when submitting "I Won" result normally
const WIN_RESULT_REASONS = [
  { code: 'i_won_clearly', label: 'मैंने Game Clearly जीता है' },
  { code: 'all_tokens_home', label: 'मेरे सभी Tokens घर पहुंच गए' },
  { code: 'opponent_conceded', label: 'Opponent ने हार मान ली' },
  { code: 'have_screenshot', label: 'मेरे पास Screenshot Proof है' },
  { code: 'other', label: 'अन्य कारण' },
];

// Win dispute reasons shown when opponent cancelled and user claims win
const WIN_DISPUTE_REASONS = [
  { code: 'i_clearly_won', label: 'मैंने Clearly Game जीता है' },
  { code: 'opponent_left_mid_game', label: 'Opponent ने बीच में Game छोड़ दिया' },
  { code: 'have_proof', label: 'मेरे पास Screenshot Proof है' },
  { code: 'unfair_cancel', label: 'Cancel Request अनुचित था' },
  { code: 'other', label: 'अन्य कारण' },
];

function getCancelReasonLabel(reasonCode, customReason) {
  if (reasonCode === 'other') return customReason || 'अन्य कारण';
  return CANCEL_REASONS.find((r) => r.code === reasonCode)?.label || reasonCode || '—';
}

export default function LudoMatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [submitResultOpen, setSubmitResultOpen] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [winResultReason, setWinResultReason] = useState('');
  const [winResultReasonCustom, setWinResultReasonCustom] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [lossConfirmOpen, setLossConfirmOpen] = useState(false);
  const [submittingLoss, setSubmittingLoss] = useState(false);
  const [lossScreenshotFile, setLossScreenshotFile] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [submittingRoomCode, setSubmittingRoomCode] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState(null);

  // Pre-game cancel reason modal (waiting / before room code — full refund)
  const [preGameCancelOpen, setPreGameCancelOpen] = useState(false);
  const [preGameCancelReason, setPreGameCancelReason] = useState('');
  const [preGameCancelCustom, setPreGameCancelCustom] = useState('');

  // Cancel with reason modal state (after game started — creates dispute)
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [submittingCancelRequest, setSubmittingCancelRequest] = useState(false);

  // Win dispute modal state (when opponent cancelled)
  const [winDisputeOpen, setWinDisputeOpen] = useState(false);
  const [selectedWinReason, setSelectedWinReason] = useState('');
  const [winCustomReason, setWinCustomReason] = useState('');
  const [disputeScreenshotFile, setDisputeScreenshotFile] = useState(null);
  const [submittingWinDispute, setSubmittingWinDispute] = useState(false);

  // Accept cancel modal state
  const [acceptCancelOpen, setAcceptCancelOpen] = useState(false);
  const [acceptingCancel, setAcceptingCancel] = useState(false);

  useEffect(() => {
    settingsAPI.getSupport()
      .then((r) => {
        const num = r.data?.supportWhatsApp || r.data?.supportPhone || null;
        setWhatsAppNumber(num);
      })
      .catch(() => {});
  }, []);

  const loadMatch = async () => {
    try {
      const res = await ludoAPI.getMatchDetail(id);
      setMatch(res.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/ludo');
      else toast.error(err.response?.data?.message || 'Failed to load match');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await loadMatch();
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [id, navigate]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data) => {
      if (data.matchId === id) {
        setMatch((prev) => prev ? {
          ...prev,
          roomCode: data.roomCode,
          gameActualStartAt: data.gameActualStartAt,
          gameStartedAt: data.gameStartedAt,
        } : prev);
        toast.success('Game started!');
      }
    };

    const handleMatchLive = (data) => {
      if (!data?.matchId || data?.matchId?.toString() === id) loadMatch();
    };

    const handleMatchUpdate = () => { loadMatch(); };
    const handleWalletUpdate = () => { refreshUser(); };

    const handleMatchCancelled = (data) => {
      if (data?.matchId === id) loadMatch();
    };

    const handleLossSubmitted = (data) => {
      if (data?.matchId === id) {
        toast(`${data.loserName} ने game हारने की request submit की है।\nआप game जीत गए हो, screenshot upload करें!`, {
          duration: 8000, icon: '🏆',
        });
        loadMatch();
      }
    };

    const handleCancelRequested = (data) => {
      if (data?.matchId === id) {
        toast.error(`${data.cancellerName} ने cancel request दी है!\nकारण: ${data.displayReason}`, { duration: 8000 });
        loadMatch();
      }
    };

    const handleWinDisputeSubmitted = (data) => {
      if (data?.matchId === id) {
        toast(`Opponent ने Win Claim किया। Admin review करेगा।`, { duration: 6000, icon: '⚖️' });
        loadMatch();
      }
    };

    const handleCancelAccepted = (data) => {
      if (data?.matchId === id) {
        toast(`Cancel accept हो गया। Admin refund तय करेगा।`, { duration: 6000, icon: '✅' });
        loadMatch();
      }
    };

    const handleMatchResolved = (data) => {
      if (data?.matchId === id) {
        toast(`Admin ने match resolve कर दिया!`, { duration: 6000, icon: '✅' });
        loadMatch();
        refreshUser();
      }
    };

    socket.on('ludo:game-started', handleGameStarted);
    socket.on('ludo:match-live', handleMatchLive);
    socket.on('ludo:waiting-updated', handleMatchUpdate);
    socket.on('wallet:balance-updated', handleWalletUpdate);
    socket.on('ludo:match-cancelled', handleMatchCancelled);
    socket.on('ludo:loss-submitted', handleLossSubmitted);
    socket.on('ludo:cancel-requested', handleCancelRequested);
    socket.on('ludo:cancel-request-sent', handleMatchUpdate);
    socket.on('ludo:win-dispute-submitted', handleWinDisputeSubmitted);
    socket.on('ludo:cancel-accepted', handleCancelAccepted);
    socket.on('ludo:match-resolved', handleMatchResolved);

    return () => {
      socket.off('ludo:game-started', handleGameStarted);
      socket.off('ludo:match-live', handleMatchLive);
      socket.off('ludo:waiting-updated', handleMatchUpdate);
      socket.off('wallet:balance-updated', handleWalletUpdate);
      socket.off('ludo:match-cancelled', handleMatchCancelled);
      socket.off('ludo:loss-submitted', handleLossSubmitted);
      socket.off('ludo:cancel-requested', handleCancelRequested);
      socket.off('ludo:cancel-request-sent', handleMatchUpdate);
      socket.off('ludo:win-dispute-submitted', handleWinDisputeSubmitted);
      socket.off('ludo:cancel-accepted', handleCancelAccepted);
      socket.off('ludo:match-resolved', handleMatchResolved);
    };
  }, [socket, id]);

  // ── All hooks called unconditionally ──
  const isWaiting = match?.status === 'waiting';
  const isLive = match?.status === 'live';
  const isCancelRequested = match?.status === 'cancel_requested';
  const joinCountdown = useCountdown(isWaiting ? match?.joinExpiryAt : null);

  const _noRoomCode = isLive && !(match?.roomCode && match?.roomCode.trim() !== '');
  const roomCodeCountdown = useCountdown(_noRoomCode ? match?.roomCodeExpiryAt : null);

  const _hasRoomCode = !!(match?.roomCode && match?.roomCode.trim() !== '');
  const _isCreator = match?.creatorId?.toString() === user?._id?.toString();

  const gameActuallyStarted = _hasRoomCode && !!match?.gameActualStartAt;
  const elapsedTimer = useElapsedTimer(gameActuallyStarted ? match?.gameActualStartAt : null);

  useEffect(() => {
    if (!roomCodeCountdown.expired || !isLive || _hasRoomCode) return;
    let cancelled = false;
    const triggerExpiry = async () => {
      try {
        const res = await ludoAPI.checkExpiry(id);
        if (res.data?.expired) {
          await loadMatch();
          await refreshUser();
        } else if (!cancelled) {
          setTimeout(triggerExpiry, 3000);
        }
      } catch {
        if (!cancelled) setTimeout(() => loadMatch(), 3000);
      }
    };
    triggerExpiry();
    return () => { cancelled = true; };
  }, [roomCodeCountdown.expired, isLive, _hasRoomCode]);

  // ── Handlers ──
  const handleCancel = async () => {
    if (!match?._id) return;
    setCancelling(true);
    try {
      await ludoAPI.cancelMatch(match._id);
      toast.success('Match cancelled. Refunded.');
      await refreshUser();
      navigate('/ludo');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  // New: Cancel with reason (after game has started)
  const handleRequestCancel = async () => {
    if (!selectedCancelReason) { toast.error('कृपया एक कारण चुनें'); return; }
    if (selectedCancelReason === 'other' && !cancelCustomReason.trim()) {
      toast.error('कृपया कारण लिखें'); return;
    }
    setSubmittingCancelRequest(true);
    try {
      await ludoAPI.requestCancel(match._id, selectedCancelReason, cancelCustomReason.trim());
      toast.success('Cancel request submit हो गई। Opponent को notify किया गया।');
      setCancelReasonOpen(false);
      setSelectedCancelReason('');
      setCancelCustomReason('');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit cancel request');
    } finally {
      setSubmittingCancelRequest(false);
    }
  };

  // Accept opponent's cancel request — sends to admin review for refund decision
  const handleAcceptCancel = async () => {
    setAcceptingCancel(true);
    setAcceptCancelOpen(false);
    try {
      await ludoAPI.acceptCancel(match._id);
      toast.success('Cancel accept हो गया। Admin refund तय करेगा।');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept cancel');
    } finally {
      setAcceptingCancel(false);
    }
  };

  // Submit win dispute (when opponent cancelled)
  const handleSubmitWinDispute = async () => {
    if (!selectedWinReason) { toast.error('कृपया एक कारण चुनें'); return; }
    if (selectedWinReason === 'other' && !winCustomReason.trim()) {
      toast.error('कृपया कारण लिखें'); return;
    }
    if (!disputeScreenshotFile) { toast.error('Screenshot जरूरी है'); return; }
    setSubmittingWinDispute(true);
    try {
      const formData = new FormData();
      formData.append('matchId', match._id);
      formData.append('winReasonCode', selectedWinReason);
      formData.append('winReasonCustom', winCustomReason.trim());
      formData.append('screenshot', disputeScreenshotFile);
      await ludoAPI.submitWinDispute(formData);
      toast.success('Win claim submit हो गई। Admin verify करेगा।');
      setWinDisputeOpen(false);
      setSelectedWinReason('');
      setWinCustomReason('');
      setDisputeScreenshotFile(null);
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmittingWinDispute(false);
    }
  };

  const handleSubmitLoss = async () => {
    if (!match?._id) return;
    if (!lossScreenshotFile) { toast.error('Screenshot upload करें'); return; }
    setLossConfirmOpen(false);
    setSubmittingLoss(true);
    try {
      const formData = new FormData();
      formData.append('matchId', match._id);
      formData.append('screenshot', lossScreenshotFile);
      await ludoAPI.submitLoss(formData);
      toast.success('Loss submitted. Admin will decide winner.');
      setLossScreenshotFile(null);
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmittingLoss(false);
    }
  };

  const copyRoomCode = () => {
    if (match?.roomCode) {
      navigator.clipboard.writeText(match.roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleSubmitRoomCode = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) { toast.error('Enter room code from Ludo King'); return; }
    setSubmittingRoomCode(true);
    try {
      await ludoAPI.submitRoomCode(match._id, code);
      toast.success('Room code set! Game started!');
      setMatch((prev) => prev ? { ...prev, roomCode: code, gameActualStartAt: new Date().toISOString(), gameStartedAt: new Date().toISOString() } : prev);
      setRoomCodeInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit room code');
    } finally {
      setSubmittingRoomCode(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!winResultReason) { toast.error('जीत का कारण चुनें'); return; }
    if (winResultReason === 'other' && !winResultReasonCustom.trim()) { toast.error('कृपया कारण लिखें'); return; }
    if (!screenshotFile) { toast.error('Screenshot जरूरी है'); return; }
    setSubmittingResult(true);
    try {
      const formData = new FormData();
      formData.append('matchId', match._id);
      formData.append('winReasonCode', winResultReason);
      formData.append('winReasonCustom', winResultReasonCustom.trim());
      formData.append('screenshot', screenshotFile);
      await ludoAPI.submitResult(match._id, formData);
      toast.success('Result submitted for admin approval');
      setSubmitResultOpen(false);
      setScreenshotFile(null);
      setWinResultReason('');
      setWinResultReasonCustom('');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmittingResult(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (!match) return null;

  const resultRequest = match.resultRequest || null;
  const claims = resultRequest?.claims || [];
  const myUserId = user?._id?.toString();
  const myWinClaim = claims.find((c) => c.userId?.toString() === myUserId && c.type === 'win');
  const myLossClaim = claims.find((c) => c.userId?.toString() === myUserId && c.type === 'loss');
  const myWinDisputeClaim = claims.find((c) => c.userId?.toString() === myUserId && c.type === 'win_dispute');
  const otherWinClaim = claims.find((c) => c.userId?.toString() !== myUserId && c.type === 'win');
  const otherLossClaim = claims.find((c) => c.userId?.toString() !== myUserId && c.type === 'loss');
  const hasAnyClaim = claims.length > 0;
  const isResolved = resultRequest?.status === 'resolved';
  const winnerId = resultRequest?.winnerId?.toString();
  const iWon = winnerId === myUserId;
  const iHadWinClaimButRejected = myWinClaim && winnerId && winnerId !== myUserId;

  const isCreator = _isCreator;
  const hasRoomCode = _hasRoomCode;

  // Cancel request helpers
  const iAmTheCanceller = isCancelRequested && match.cancelRequestedBy?.toString() === myUserId;
  const iAmTheOpponentOfCanceller = isCancelRequested && match.cancelRequestedBy?.toString() !== myUserId;
  const cancelDisplayReason = getCancelReasonLabel(match.cancelReasonCode, match.cancelReasonCustom);

  // Refund decision (after admin resolves cancel dispute)
  const myRefundDecision = resultRequest?.refundDecisions?.find((d) => d.userId?.toString() === myUserId);

  // Cancel accepted state (both agreed, waiting admin review)
  const isCancelAccepted = resultRequest?.disputeType === 'cancel_accepted';
  // Under admin review: has any claim OR cancel was accepted
  const isUnderAdminReview = hasAnyClaim || isCancelAccepted;

  // Winner declared by admin (match completed via dispute)
  const matchWinnerId = match.winnerId?.toString();

  const RoomCodeDisplay = () => (
    <div className="flex items-center gap-2 mb-2">
      <span className="flex-1 font-mono text-2xl font-bold tracking-widest bg-blue-50 border-2 border-blue-500 text-gray-900 px-4 py-3 rounded-xl text-center">{match.roomCode}</span>
      <button
        onClick={copyRoomCode}
        className={`flex items-center gap-1.5 px-3 py-3 rounded-xl font-semibold text-sm transition-all ${codeCopied ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}
        title="Copy room code"
      >
        {codeCopied ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Copied!</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );

  const GameWarning = () => (
    <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-xl p-3 space-y-1.5">
      <p className="text-sm text-yellow-800 font-semibold">⚠️ Warning — गेम शुरू हो चुका है</p>
      <p className="text-sm text-yellow-800 leading-relaxed">
        • Cancel करने पर आपको कारण देना होगा और Opponent को notify किया जाएगा।
      </p>
      <p className="text-sm text-yellow-800 leading-relaxed">
        • Admin दोनों का पक्ष देखकर refund तय करेगा।
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-[200px] overflow-x-hidden">
      <Header />
      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        <button onClick={() => navigate('/ludo')} className="text-primary-600 text-sm font-medium mb-4 flex items-center gap-1">
          ← Back to Ludo
        </button>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* VS Battle Header */}
          {(() => {
            const p1 = match.players?.[0];
            const p2 = match.players?.[1];
            const prize = Math.round(match.entryAmount * 2 * 0.95);
            const statusColor = isWaiting ? 'bg-amber-500'
              : isLive ? 'bg-green-500'
              : isCancelRequested ? 'bg-orange-500'
              : match.status === 'cancelled' ? 'bg-red-500'
              : 'bg-gray-500';
            const statusLabel = isWaiting ? 'Waiting'
              : isLive ? 'Live'
              : isCancelRequested ? 'Cancel Requested'
              : match.status === 'cancelled' ? 'Cancelled'
              : match.status === 'completed' ? 'Completed'
              : match.status;
            const avatarColors = ['bg-blue-500', 'bg-red-500'];
            return (
              <div className="bg-[#1a1a2e] px-4 pt-4 pb-5">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Entry</p>
                    <p className="text-white font-bold text-base leading-tight">₹{match.entryAmount}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide ${statusColor}`}>
                    {statusLabel}
                  </span>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Prize</p>
                    <p className="text-green-400 font-bold text-base leading-tight">₹{prize}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-full ${avatarColors[0]} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                      {p1?.userName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <p className="text-white font-semibold text-sm text-center leading-tight truncate max-w-full px-1">{p1?.userName ?? '—'}</p>
                    {p1?.userId?.toString() === myUserId && <span className="text-[11px] text-blue-300 font-medium">(You)</span>}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow">VS</div>
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    {p2 ? (
                      <>
                        <div className={`w-12 h-12 rounded-full ${avatarColors[1]} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                          {p2.userName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <p className="text-white font-semibold text-sm text-center leading-tight truncate max-w-full px-1">{p2.userName}</p>
                        {p2.userId?.toString() === myUserId && <span className="text-[11px] text-blue-300 font-medium">(You)</span>}
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-500 border-t-gray-300" />
                        </div>
                        <p className="text-gray-400 text-xs text-center">Waiting...</p>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 font-mono mt-4 text-center">ID: {match._id}</p>
              </div>
            );
          })()}

          <div className="p-4">

            {/* ── Waiting for opponent ── */}
            {isWaiting && (
              <p className="text-sm font-medium text-gray-500">Room code will be added after an opponent joins.</p>
            )}

            {/* ── LIVE: Creator, no room code yet ── */}
            {isLive && isCreator && !hasRoomCode && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Add Room Code</p>
                <p className="text-xs text-gray-500 mb-2">Opponent joined! Open Ludo King, create a room, and paste the code below.</p>
                {match.roomCodeExpiryAt && (
                  <div className={`rounded-xl p-3 mb-3 text-center ${roomCodeCountdown.expired ? 'bg-red-50 border border-red-300' : 'bg-amber-50 border border-amber-300'}`}>
                    <p className="text-2xl font-bold font-mono text-red-600">
                      {roomCodeCountdown.expired ? '0:00' : roomCodeCountdown.display}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 font-medium">⚠️ दिए गए समय में Room Code डालें, नहीं तो game expire हो जाएगा।</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="flex-1 border-2 border-blue-500 rounded-xl px-4 py-3 text-lg font-mono font-bold uppercase tracking-widest text-center placeholder:text-gray-400 placeholder:text-base placeholder:tracking-normal placeholder:font-normal"
                  />
                  <button
                    onClick={handleSubmitRoomCode}
                    disabled={submittingRoomCode || !roomCodeInput.trim()}
                    className="bg-primary-600 text-white px-5 py-3 rounded-xl text-base font-bold disabled:opacity-50"
                  >
                    {submittingRoomCode ? '...' : 'Set'}
                  </button>
                </div>
              </div>
            )}

            {/* ── LIVE: Opponent, waiting for room code ── */}
            {isLive && !isCreator && !hasRoomCode && (
              <div>
                <p className="text-base font-bold text-gray-800 mb-2">Room Code</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent flex-shrink-0" />
                  <p className="text-sm text-amber-700">Waiting for creator to share the room code...</p>
                </div>
                {match.roomCodeExpiryAt && (
                  <div className={`rounded-xl p-3 text-center ${roomCodeCountdown.expired ? 'bg-red-50 border border-red-300' : 'bg-amber-50 border border-amber-300'}`}>
                    <p className="text-2xl font-bold font-mono text-red-600">
                      {roomCodeCountdown.expired ? '0:00' : roomCodeCountdown.display}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 font-medium">⚠️ यदि दिए गए समय में Room Code नहीं डाला गया तो game expire हो जाएगा।</p>
                  </div>
                )}
              </div>
            )}

            {/* ── LIVE: Game started (room code set) ── */}
            {isLive && gameActuallyStarted && (
              <div>
                <p className="text-base font-bold text-gray-800 mb-1">Room Code</p>
                <RoomCodeDisplay />
                {resultRequest && !isResolved ? (
                  <div className="mt-3 bg-purple-50 border border-purple-300 rounded-xl p-4 text-center">
                    <p className="text-xs text-purple-600 uppercase font-semibold tracking-wide mb-1">Result Submitted</p>
                    <p className="text-2xl font-bold text-purple-700">⏳ Awaiting Admin</p>
                    <p className="text-xs text-gray-500 mt-1">Game played: {formatTime12hr(match.gameActualStartAt || match.gameStartedAt)}</p>
                  </div>
                ) : !resultRequest ? (
                  <>
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide mb-1">Game running</p>
                      <p className="text-3xl font-bold font-mono text-blue-700">{elapsedTimer.display}</p>
                      <p className="text-xs text-gray-500 mt-1">Started: {formatTime12hr(match.gameActualStartAt || match.gameStartedAt)}</p>
                    </div>
                    <GameWarning />
                  </>
                ) : null}
              </div>
            )}

            {/* ── CANCEL REQUESTED: I am the canceller ── */}
            {isCancelRequested && iAmTheCanceller && (
              <div className="mt-2 space-y-3">
                {hasRoomCode && (
                  <div>
                    <p className="text-base font-bold text-gray-800 mb-1">Room Code</p>
                    <RoomCodeDisplay />
                  </div>
                )}
                {isCancelAccepted ? (
                  <div className="bg-purple-50 border border-purple-300 rounded-xl p-4">
                    <p className="text-purple-800 font-bold text-sm mb-1">✅ Opponent ने Cancel Accept किया</p>
                    <p className="text-purple-700 text-sm">Admin refund तय करेगा। जल्द ही amount वापस होगा।</p>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
                    <p className="text-orange-800 font-bold text-sm mb-1">⏳ Cancel Request Pending</p>
                    <p className="text-orange-700 text-sm">आपने cancel request दी है। Opponent के response का wait करें।</p>
                    {cancelDisplayReason && (
                      <p className="text-orange-900 font-semibold text-sm mt-2">
                      Your Reason: <span className="font-bold">{cancelDisplayReason}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CANCEL REQUESTED: I am the OTHER player (opponent cancelled) ── */}
            {isCancelRequested && iAmTheOpponentOfCanceller && !hasAnyClaim && (
              <div className="mt-2 space-y-3">
                {hasRoomCode && (
                  <div>
                    <p className="text-base font-bold text-gray-800 mb-1">Room Code</p>
                    <RoomCodeDisplay />
                  </div>
                )}
                {/* Red bold banner showing cancel reason */}
                <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4">
                  <p className="text-red-700 font-extrabold text-base">
                    ⚠️ {match.players?.find((p) => p.userId?.toString() === match.cancelRequestedBy?.toString())?.userName || 'Opponent'} ने Game Cancel करने की Request दी है!
                  </p>
                  <p className="text-red-800 font-bold text-sm mt-2">
                    कारण: <span className="text-red-900 font-extrabold">{cancelDisplayReason}</span>
                  </p>
                  <p className="text-red-600 text-sm mt-2 font-medium">
                    अगर आप game जीत गए हैं तो "Win claim" button दबाएं। Ya aapko Lag rha samne wale ne janboojhkar game cancel kiya h to Win claim kare!
                  </p>
                </div>
              </div>
            )}

            {/* ── CANCEL REQUESTED: Opponent submitted win dispute OR cancel accepted (waiting admin) ── */}
            {isCancelRequested && isUnderAdminReview && (
              <div className="mt-2 bg-purple-50 border border-purple-300 rounded-xl p-4 text-center">
                <p className="text-xs text-purple-600 uppercase font-semibold tracking-wide mb-1">
                  {isCancelAccepted ? 'Cancel Accepted' : 'Dispute Submitted'}
                </p>
                <p className="text-xl font-bold text-purple-700">⏳ Admin Review में है</p>
                <p className="text-sm text-gray-600 mt-1">
                  {isCancelAccepted
                    ? 'Admin refund तय करेगा। जल्द ही पैसा वापस होगा।'
                    : 'Admin दोनों का पक्ष देखकर निर्णय लेगा।'}
                </p>
              </div>
            )}

            {/* ── Cancelled — show reason + full detail ── */}
            {match?.status === 'cancelled' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                <p className="text-gray-700 font-bold mb-2">Match Cancelled</p>
                {/* Cancel reason */}
                {match.cancelReasonCode ? (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Cancel Reason</p>
                    <p className="text-sm font-semibold text-gray-800">{getCancelReasonLabel(match.cancelReasonCode, match.cancelReasonCustom)}</p>
                    <p className="text-xs text-gray-500">
                      by: {match.players?.find((p) => p.userId?.toString() === match.cancelRequestedBy?.toString())?.userName || '—'}
                      {resultRequest?.disputeType === 'cancel_accepted' && ' • Opponent ने accept किया'}
                    </p>
                  </div>
                ) : match.cancelReason ? (
                  <p className="text-sm text-gray-600 mb-2">{match.cancelReason}</p>
                ) : null}
                {/* Refund decision for current user only */}
                {isResolved && myRefundDecision && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Your Refund</p>
                    <div className={`flex justify-between items-center rounded-lg px-3 py-2 border ${myRefundDecision.amount > 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-200'}`}>
                      <span className="text-sm font-medium text-gray-700">आपको मिला</span>
                      <span className={`text-sm font-bold ${myRefundDecision.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {myRefundDecision.amount > 0 ? `₹${myRefundDecision.amount}` : 'No Refund'}
                      </span>
                    </div>
                  </div>
                )}
                {/* Admin note */}
                {isResolved && resultRequest?.adminNote && (
                  <p className="text-xs text-gray-500 mt-2 italic">Admin Note: {resultRequest.adminNote}</p>
                )}
              </div>
            )}

            {/* ── Completed / cancelled — room code display ── */}
            {!isWaiting && !isLive && !isCancelRequested && (
              <div>
                <p className="text-base font-bold text-gray-800 mb-1">Room Code</p>
                <span className="font-mono text-2xl font-bold tracking-widest bg-blue-50 border-2 border-blue-500 text-gray-900 px-4 py-3 rounded-xl inline-block">{match.roomCode || '—'}</span>
              </div>
            )}

            {/* Join expiry countdown */}
            {isWaiting && match.joinExpiryAt && (
              <p className="text-sm text-amber-700 mt-3">
                Join expires: <span className="font-mono font-medium">{joinCountdown.expired ? '0:00' : `${joinCountdown.display} min`}</span>
                {!joinCountdown.expired && ` (${formatTime12hr(match.joinExpiryAt)})`}. After that match auto-cancels and you get refund.
              </p>
            )}

            {/* ── LIVE: Cancel button BEFORE room code ── */}
            {isLive && !hasRoomCode && (
              <button
                onClick={() => setPreGameCancelOpen(true)}
                disabled={cancelling}
                className="w-full mt-3 py-3 rounded-xl border border-red-300 text-red-600 font-medium disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Match (Full Refund)'}
              </button>
            )}
          </div>

          {/* ── Completed — full result details ── */}
          {match?.status === 'completed' && (
            <div className="px-4 pb-2">
              <div className={`rounded-xl p-4 border ${matchWinnerId === myUserId ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="font-bold text-gray-800 mb-2">Match Completed</p>
                {matchWinnerId && (
                  <p className="text-sm text-gray-800">
                    Winner: <span className="font-extrabold text-green-700">{match.players?.find((p) => p.userId?.toString() === matchWinnerId)?.userName || '—'}</span>
                    {matchWinnerId === myUserId && ' 🏆 (You)'}
                  </p>
                )}
                {/* Dispute/cancel details if applicable */}
                {resultRequest?.disputeType === 'cancel_dispute' && isResolved && (
                  <div className="mt-2">
                    {/* Cancel reason */}
                    {match.cancelReasonCode && (
                      <p className="text-xs text-gray-500 mt-1">Cancel reason: {getCancelReasonLabel(match.cancelReasonCode, match.cancelReasonCustom)}</p>
                    )}
                    {/* Win claim screenshot */}
                    {claims.filter((c) => c.screenshotUrl).map((c, i) => (
                      <a key={i} href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-primary-600 text-xs underline font-medium">
                        📷 {c.userName} का Screenshot
                      </a>
                    ))}
                  </div>
                )}
                {/* Admin note */}
                {resultRequest?.adminNote && (
                  <p className="text-xs text-gray-500 mt-2 italic">Admin Note: {resultRequest.adminNote}</p>
                )}
              </div>
            </div>
          )}

          {/* Result request state */}
          {resultRequest && match?.status !== 'completed' && (
            <div className="px-4 pb-2">
              {isResolved && !myRefundDecision && (
                <div className="rounded-xl p-3 bg-gray-100 border border-gray-200">
                  {iWon && <p className="text-green-700 font-medium">You won ✓</p>}
                  {iHadWinClaimButRejected && <p className="text-red-600 text-sm">Your request is rejected by the admin. Contact support.</p>}
                  {winnerId && !iWon && !iHadWinClaimButRejected && <p className="text-gray-600 text-sm">Match completed. Winner: {match.players?.find((p) => p.userId?.toString() === winnerId)?.userName || '—'} ✓</p>}
                  {resultRequest?.adminNote && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">Admin Note: {resultRequest.adminNote}</p>
                  )}
                </div>
              )}
              {!isResolved && otherLossClaim && !myWinClaim && (
                <div className="rounded-xl p-3 bg-green-50 border border-green-300 mb-2">
                  <p className="text-green-800 font-bold text-base">🏆 {otherLossClaim.userName} ने game हारने की request submit की है।</p>
                  <p className="text-green-700 text-sm mt-1">आप game जीत गए हो, screenshot upload करें!</p>
                </div>
              )}
              {!isResolved && otherWinClaim && (
                <div className="rounded-xl p-3 bg-amber-50 border border-amber-300 mb-2">
                  <p className="text-amber-800 font-bold text-base">🏆 {otherWinClaim.userName} has claimed the win.</p>
                </div>
              )}
              {!isResolved && myWinClaim && (
                <p className="text-primary-700 font-bold text-base mb-2">You have uploaded the win request. Wait for admin.</p>
              )}
              {!isResolved && myLossClaim && (
                <p className="text-orange-700 font-bold text-base mb-2">आपने game हारने की request submit की है। Admin verify करेगा।</p>
              )}
              {!isResolved && myWinDisputeClaim && (
                <p className="text-primary-700 font-bold text-base mb-2">आपने win dispute submit किया है। Admin verify करेगा।</p>
              )}
            </div>
          )}

          <div className="p-4 pt-0 flex flex-col gap-2">
            {isWaiting && isCreator && (
              <button onClick={() => setPreGameCancelOpen(true)} disabled={cancelling} className="w-full py-3 rounded-xl border border-red-300 text-red-600 font-medium disabled:opacity-50">
                {cancelling ? 'Cancelling...' : 'Cancel & get refund'}
              </button>
            )}

            {/* Action buttons after game started (room code set) — LIVE */}
            {isLive && !isResolved && gameActuallyStarted && (
              <div className="space-y-3 pt-1">
                {!myWinClaim && !myLossClaim && (
                  <button
                    onClick={() => setSubmitResultOpen(true)}
                    className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    🏆 I Won — Submit Result
                  </button>
                )}
                {!myWinClaim && !myLossClaim && (
                  <button
                    onClick={() => setLossConfirmOpen(true)}
                    disabled={submittingLoss}
                    className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingLoss ? '...' : '😔 I Lost the Game'}
                  </button>
                )}
                {/* New Cancel button — opens reason modal */}
                {!hasAnyClaim && (
                  <button
                    onClick={() => setCancelReasonOpen(true)}
                    className="w-full py-3 rounded-2xl border-2 border-red-500 text-red-600 font-semibold text-sm bg-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    ❌ Game Cancel करें (कारण दें)
                  </button>
                )}
              </div>
            )}

            {/* Opponent of canceller — "I Won" + "Accept Cancel" buttons (only when no result request yet) */}
            {isCancelRequested && iAmTheOpponentOfCanceller && !isUnderAdminReview && (
              <div className="space-y-3 pt-1">
                <button
                  onClick={() => setWinDisputeOpen(true)}
                  className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  🏆 Win Claim करें
                </button>
                <button
                  onClick={() => setAcceptCancelOpen(true)}
                  disabled={acceptingCancel}
                  className="w-full py-3 rounded-2xl border-2 border-gray-400 text-gray-700 font-semibold text-sm bg-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {acceptingCancel ? '...' : '✅ Cancel Accept करें (Admin Review)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: Pre-game cancel reason (waiting / before room code) ── */}
      {preGameCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-1 text-lg">Cancel क्यों करना है?</h3>
            <p className="text-sm text-gray-500 mb-4">एक कारण चुनें, फिर Full Refund मिलेगा।</p>
            <div className="space-y-2 mb-4">
              {PRE_GAME_CANCEL_REASONS.map((r) => (
                <label key={r.code} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${preGameCancelReason === r.code ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="preGameCancelReason"
                    value={r.code}
                    checked={preGameCancelReason === r.code}
                    onChange={() => setPreGameCancelReason(r.code)}
                    className="accent-red-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{r.label}</span>
                </label>
              ))}
            </div>
            {preGameCancelReason === 'other' && (
              <textarea
                placeholder="कारण लिखें..."
                value={preGameCancelCustom}
                onChange={(e) => setPreGameCancelCustom(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-sm mb-4 focus:border-red-400 outline-none resize-none"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setPreGameCancelOpen(false); setPreGameCancelReason(''); setPreGameCancelCustom(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (!preGameCancelReason) { toast.error('कृपया एक कारण चुनें'); return; }
                  if (preGameCancelReason === 'other' && !preGameCancelCustom.trim()) { toast.error('कृपया कारण लिखें'); return; }
                  setPreGameCancelOpen(false);
                  setPreGameCancelReason('');
                  setPreGameCancelCustom('');
                  handleCancel();
                }}
                disabled={cancelling || !preGameCancelReason}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50"
              >
                {cancelling ? '...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Cancel with reason ── */}
      {cancelReasonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-1 text-lg">Game Cancel क्यों करना है?</h3>
            <p className="text-sm text-gray-500 mb-4">कारण Admin और Opponent दोनों को दिखेगा।</p>
            <div className="space-y-2 mb-4">
              {CANCEL_REASONS.map((r) => (
                <label key={r.code} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedCancelReason === r.code ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="cancelReason"
                    value={r.code}
                    checked={selectedCancelReason === r.code}
                    onChange={() => setSelectedCancelReason(r.code)}
                    className="accent-red-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{r.label}</span>
                </label>
              ))}
            </div>
            {selectedCancelReason === 'other' && (
              <textarea
                placeholder="कारण लिखें..."
                value={cancelCustomReason}
                onChange={(e) => setCancelCustomReason(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-sm mb-4 focus:border-red-400 outline-none resize-none"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => { setCancelReasonOpen(false); setSelectedCancelReason(''); setCancelCustomReason(''); }} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium">Back</button>
              <button
                onClick={handleRequestCancel}
                disabled={submittingCancelRequest || !selectedCancelReason}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50"
              >
                {submittingCancelRequest ? '...' : 'Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Win Dispute (opponent cancelled, I claim win) ── */}
      {winDisputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full my-4">
            <h3 className="font-bold text-gray-800 mb-1 text-lg">🏆 Win Claim करें</h3>
            <p className="text-sm text-gray-500 mb-4">जीत का कारण और Screenshot दें। Admin verify करेगा।</p>
            <div className="space-y-2 mb-4">
              {WIN_DISPUTE_REASONS.map((r) => (
                <label key={r.code} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedWinReason === r.code ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="winReason"
                    value={r.code}
                    checked={selectedWinReason === r.code}
                    onChange={() => setSelectedWinReason(r.code)}
                    className="accent-green-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{r.label}</span>
                </label>
              ))}
            </div>
            {selectedWinReason === 'other' && (
              <textarea
                placeholder="कारण लिखें..."
                value={winCustomReason}
                onChange={(e) => setWinCustomReason(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-sm mb-3 focus:border-green-400 outline-none resize-none"
              />
            )}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Screenshot Upload करें <span className="text-red-500">*</span></p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setDisputeScreenshotFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-100 file:text-green-700"
              />
              {disputeScreenshotFile && <p className="text-xs text-green-600 mt-1">✓ {disputeScreenshotFile.name}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setWinDisputeOpen(false); setSelectedWinReason(''); setWinCustomReason(''); setDisputeScreenshotFile(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium">Back</button>
              <button
                onClick={handleSubmitWinDispute}
                disabled={submittingWinDispute || !selectedWinReason || !disputeScreenshotFile}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
              >
                {submittingWinDispute ? '...' : 'Submit करें'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Accept Cancel Confirmation ── */}
      {acceptCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">✅ Cancel Accept करें?</h3>
            <p className="text-gray-600 text-sm mb-1">दोनों players को पूरा refund मिलेगा।</p>
            <p className="text-green-700 font-semibold text-sm mb-4">आपको वापस मिलेगा: ₹{match?.entryAmount}</p>
            <div className="flex gap-2">
              <button onClick={() => setAcceptCancelOpen(false)} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700">वापस जाएं</button>
              <button onClick={handleAcceptCancel} disabled={acceptingCancel} className="flex-1 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50">{acceptingCancel ? '...' : 'हाँ, Accept करें'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Submit Win Result (normal) ── */}
      {submitResultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-1 text-lg">🏆 Submit Result (I Won)</h3>
            <p className="text-sm text-gray-500 mb-4">जीत का कारण चुनें और screenshot upload करें। Admin verify करेगा।</p>
            <div className="space-y-2 mb-4">
              {WIN_RESULT_REASONS.map((r) => (
                <label key={r.code} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${winResultReason === r.code ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="winResultReason"
                    value={r.code}
                    checked={winResultReason === r.code}
                    onChange={() => setWinResultReason(r.code)}
                    className="accent-green-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{r.label}</span>
                </label>
              ))}
            </div>
            {winResultReason === 'other' && (
              <textarea
                placeholder="कारण लिखें..."
                value={winResultReasonCustom}
                onChange={(e) => setWinResultReasonCustom(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-sm mb-3 focus:border-green-400 outline-none resize-none"
              />
            )}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Screenshot Upload करें <span className="text-red-500">*</span></p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-100 file:text-green-700"
              />
              {screenshotFile && <p className="text-xs text-green-600 mt-1">✓ {screenshotFile.name}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSubmitResultOpen(false); setScreenshotFile(null); setWinResultReason(''); setWinResultReasonCustom(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSubmitResult}
                disabled={!winResultReason || !screenshotFile || submittingResult}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
              >
                {submittingResult ? '...' : 'Submit करें'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirm I Lost ── */}
      {lossConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">😔 क्या आप सच में हार गए?</h3>
            <p className="text-gray-600 text-sm mb-1">यह request Admin को भेजी जाएगी।</p>
            <p className="text-red-600 text-sm font-semibold mb-3">एक बार submit करने के बाद बदला नहीं जा सकता।</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot upload करें *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLossScreenshotFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700"
              />
              {lossScreenshotFile && <p className="text-xs text-orange-600 mt-1">✓ {lossScreenshotFile.name}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setLossConfirmOpen(false); setLossScreenshotFile(null); }} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700">वापस जाएं</button>
              <button onClick={handleSubmitLoss} disabled={submittingLoss || !lossScreenshotFile} className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-50">{submittingLoss ? '...' : 'हाँ, मैं हार गया'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Support Button */}
      {whatsAppNumber && (
        <a
          href={`https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}`}
          rel="noopener noreferrer"
          aria-label="Contact Support on WhatsApp"
          className="fixed right-4 z-[9999] w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer"
          style={{ bottom: '90px', boxShadow: '0 6px 25px rgba(37, 211, 102, 0.5)', animation: 'bounce 2s infinite' }}
        >
          <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}

      <Navbar />
    </div>
  );
}
