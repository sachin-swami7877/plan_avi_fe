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
  const [cancelAsLossConfirm, setCancelAsLossConfirm] = useState(false);
  const [lossConfirmOpen, setLossConfirmOpen] = useState(false);
  const [cancellingAsLoss, setCancellingAsLoss] = useState(false);
  const [submittingLoss, setSubmittingLoss] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [submittingRoomCode, setSubmittingRoomCode] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState(null);

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

    // New: game started immediately after room code
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

    const handleMatchUpdate = () => {
      loadMatch();
    };

    const handleWalletUpdate = () => {
      refreshUser();
    };

    const handleMatchCancelled = (data) => {
      if (data?.matchId === id) loadMatch();
    };

    const handleLossSubmitted = (data) => {
      if (data?.matchId === id) {
        toast(`${data.loserName} ने game हारने की request submit की है।\nआप game जीत गए हो, screenshot upload करें!`, {
          duration: 8000,
          icon: '🏆',
        });
        loadMatch();
      }
    };

    socket.on('ludo:game-started', handleGameStarted);
    socket.on('ludo:match-live', handleMatchLive);
    socket.on('ludo:waiting-updated', handleMatchUpdate);
    socket.on('wallet:balance-updated', handleWalletUpdate);
    socket.on('ludo:match-cancelled', handleMatchCancelled);
    socket.on('ludo:loss-submitted', handleLossSubmitted);

    return () => {
      socket.off('ludo:game-started', handleGameStarted);
      socket.off('ludo:match-live', handleMatchLive);
      socket.off('ludo:waiting-updated', handleMatchUpdate);
      socket.off('wallet:balance-updated', handleWalletUpdate);
      socket.off('ludo:match-cancelled', handleMatchCancelled);
      socket.off('ludo:loss-submitted', handleLossSubmitted);
    };
  }, [socket, id]);

  // ── All hooks called unconditionally (Rules of Hooks) ──
  const isWaiting = match?.status === 'waiting';
  const isLive = match?.status === 'live';
  const joinCountdown = useCountdown(isWaiting ? match?.joinExpiryAt : null);

  // Room code expiry countdown — shown when live + no room code
  const _noRoomCode = isLive && !(match?.roomCode && match?.roomCode.trim() !== '');
  const roomCodeCountdown = useCountdown(_noRoomCode ? match?.roomCodeExpiryAt : null);

  // Pre-early-return derivations needed for hook calls
  const _hasRoomCode = !!(match?.roomCode && match?.roomCode.trim() !== '');
  const _isCreator = match?.creatorId?.toString() === user?._id?.toString();

  // Elapsed timer — counts UP from gameActualStartAt
  const gameActuallyStarted = _hasRoomCode && !!match?.gameActualStartAt;
  const elapsedTimer = useElapsedTimer(gameActuallyStarted ? match?.gameActualStartAt : null);

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

  const handleCancelAsLoss = async () => {
    if (!match?._id) return;
    setCancellingAsLoss(true);
    setCancelAsLossConfirm(false);
    try {
      await ludoAPI.cancelAsLoss(match._id);
      toast.success('Match cancelled. No refund applied.');
      await refreshUser();
      navigate('/ludo');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCancellingAsLoss(false);
    }
  };

  const handleSubmitLoss = async () => {
    if (!match?._id) return;
    setLossConfirmOpen(false);
    setSubmittingLoss(true);
    try {
      await ludoAPI.submitLoss(match._id);
      toast.success('Loss submitted. Admin will decide winner.');
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
      toast.success('Room code copied');
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
    if (!match?._id || !screenshotFile) { toast.error('Select a screenshot'); return; }
    setSubmittingResult(true);
    try {
      const formData = new FormData();
      formData.append('matchId', match._id);
      formData.append('screenshot', screenshotFile);
      await ludoAPI.submitResult(match._id, formData);
      toast.success('Result submitted for admin approval');
      setSubmitResultOpen(false);
      setScreenshotFile(null);
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
  const otherWinClaim = claims.find((c) => c.userId?.toString() !== myUserId && c.type === 'win');
  const otherLossClaim = claims.find((c) => c.userId?.toString() !== myUserId && c.type === 'loss');
  const hasAnyClaim = claims.length > 0;
  const isResolved = resultRequest?.status === 'resolved';
  const winnerId = resultRequest?.winnerId?.toString();
  const iWon = winnerId === myUserId;
  const iHadWinClaimButRejected = myWinClaim && winnerId && winnerId !== myUserId;

  const isCreator = _isCreator;
  const hasRoomCode = _hasRoomCode;

  const CopyIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8a2 2 0 01-2 2h-2m-8 0H6" />
    </svg>
  );

  const RoomCodeDisplay = () => (
    <div className="flex items-center gap-2 mb-2">
      <span className="flex-1 font-mono text-lg bg-gray-100 px-3 py-2 rounded-lg">{match.roomCode}</span>
      <button onClick={copyRoomCode} className="p-2 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200" title="Copy">
        <CopyIcon />
      </button>
    </div>
  );

  const GameWarning = () => (
    <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-xl p-3 space-y-1.5">
      <p className="text-sm text-yellow-800 font-semibold">⚠️ चेतावनी — गेम शुरू हो चुका है</p>
      <p className="text-sm text-yellow-800 leading-relaxed">
        • यदि आप गेम बीच में <strong>Cancel</strong> करते हैं, तो आपको <strong>कोई भी Refund नहीं मिलेगा।</strong>
      </p>
      <p className="text-sm text-yellow-800 leading-relaxed">
        • दूसरे खिलाड़ी को उनकी <strong>पूरी Bet का 100% वापस</strong> मिल जाएगा।
      </p>
      <p className="text-sm text-yellow-800 leading-relaxed">
        • यदि सामने वाला खिलाड़ी गेम छोड़ता है, तो आप प्रमाण के रूप में वीडियो बनाएं और Support से संपर्क करें।
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
            const statusColor = isWaiting ? 'bg-amber-500' : isLive ? 'bg-green-500' : match.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500';
            const avatarColors = ['bg-blue-500', 'bg-red-500'];
            return (
              <div className="bg-[#1a1a2e] px-4 pt-4 pb-5">
                {/* Entry / Status badge / Prize */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Entry</p>
                    <p className="text-white font-bold text-base leading-tight">₹{match.entryAmount}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide ${statusColor}`}>
                    {match.status}
                  </span>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Prize</p>
                    <p className="text-green-400 font-bold text-base leading-tight">₹{prize}</p>
                  </div>
                </div>

                {/* Players row */}
                <div className="flex items-center justify-between gap-2">
                  {/* Player 1 */}
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-full ${avatarColors[0]} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                      {p1?.userName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <p className="text-white font-semibold text-sm text-center leading-tight truncate max-w-full px-1">
                      {p1?.userName ?? '—'}
                    </p>
                    {p1?.userId?.toString() === myUserId && (
                      <span className="text-[11px] text-blue-300 font-medium">(You)</span>
                    )}
                  </div>

                  {/* VS badge */}
                  <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow">
                    VS
                  </div>

                  {/* Player 2 */}
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    {p2 ? (
                      <>
                        <div className={`w-12 h-12 rounded-full ${avatarColors[1]} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                          {p2.userName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <p className="text-white font-semibold text-sm text-center leading-tight truncate max-w-full px-1">
                          {p2.userName}
                        </p>
                        {p2.userId?.toString() === myUserId && (
                          <span className="text-[11px] text-blue-300 font-medium">(You)</span>
                        )}
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

                {/* Match ID */}
                <p className="text-[10px] text-gray-600 font-mono mt-4 text-center">ID: {match._id}</p>
              </div>
            );
          })()}

          <div className="p-4">

            {/* ── Waiting for opponent to join ── */}
            {isWaiting && (
              <p className="text-sm font-medium text-gray-500">Room code will be added after an opponent joins.</p>
            )}

            {/* ── LIVE: Creator, no room code yet → input + countdown ── */}
            {isLive && isCreator && !hasRoomCode && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Add Room Code</p>
                <p className="text-xs text-gray-500 mb-2">Opponent joined! Open Ludo King, create a room, and paste the code below.</p>

                {/* Room code expiry countdown */}
                {match.roomCodeExpiryAt && (
                  <div className={`rounded-xl p-3 mb-3 text-center ${roomCodeCountdown.expired ? 'bg-red-50 border border-red-300' : 'bg-amber-50 border border-amber-300'}`}>
                    <p className="text-2xl font-bold font-mono text-red-600">
                      {roomCodeCountdown.expired ? '0:00' : roomCodeCountdown.display}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 font-medium">
                      ⚠️ दिए गए समय में Room Code डालें, नहीं तो game expire हो जाएगा ।
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Room Code"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase"
                  />
                  <button
                    onClick={handleSubmitRoomCode}
                    disabled={submittingRoomCode || !roomCodeInput.trim()}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {submittingRoomCode ? '...' : 'Set'}
                  </button>
                </div>
              </div>
            )}

            {/* ── LIVE: Opponent, waiting for room code ── */}
            {isLive && !isCreator && !hasRoomCode && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Room code</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent flex-shrink-0" />
                  <p className="text-sm text-amber-700">Waiting for creator to share the room code...</p>
                </div>

                {/* Room code expiry countdown */}
                {match.roomCodeExpiryAt && (
                  <div className={`rounded-xl p-3 text-center ${roomCodeCountdown.expired ? 'bg-red-50 border border-red-300' : 'bg-amber-50 border border-amber-300'}`}>
                    <p className="text-2xl font-bold font-mono text-red-600">
                      {roomCodeCountdown.expired ? '0:00' : roomCodeCountdown.display}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 font-medium">
                      ⚠️ यदि दिए गए समय में Room Code नहीं डाला गया तो game expire हो जाएगा और दोनों को refund मिलेगा।
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── LIVE: Game started (room code set) — show room code + elapsed timer ── */}
            {isLive && gameActuallyStarted && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Room code</p>
                <RoomCodeDisplay />

                {resultRequest && !isResolved ? (
                  /* Result submitted — game is over, awaiting admin */
                  <div className="mt-3 bg-purple-50 border border-purple-300 rounded-xl p-4 text-center">
                    <p className="text-xs text-purple-600 uppercase font-semibold tracking-wide mb-1">Result Submitted</p>
                    <p className="text-2xl font-bold text-purple-700">⏳ Awaiting Admin</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Game played: {formatTime12hr(match.gameActualStartAt || match.gameStartedAt)}
                    </p>
                  </div>
                ) : !resultRequest ? (
                  /* Game still running — show timer */
                  <>
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide mb-1">Game running</p>
                      <p className="text-3xl font-bold font-mono text-blue-700">{elapsedTimer.display}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Started: {formatTime12hr(match.gameActualStartAt || match.gameStartedAt)}
                      </p>
                    </div>
                    <GameWarning />
                  </>
                ) : null}
              </div>
            )}

            {/* ── LIVE: Cancel button for both players BEFORE room code ── */}
            {isLive && !hasRoomCode && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full mt-3 py-3 rounded-xl border border-red-300 text-red-600 font-medium disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Match (Full Refund)'}
              </button>
            )}

            {/* ── Cancelled — show reason + refund info ── */}
            {match?.status === 'cancelled' && (
              <div className="rounded-xl overflow-hidden mb-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-gray-700 font-bold mb-1">Match Cancelled</p>
                  {match.cancelReason && <p className="text-sm text-gray-500">{match.cancelReason}</p>}
                </div>
              </div>
            )}

            {/* ── Completed / cancelled — room code display ── */}
            {!isWaiting && !isLive && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Room code</p>
                <span className="font-mono text-lg bg-gray-100 px-3 py-2 rounded-lg inline-block">{match.roomCode || '—'}</span>
              </div>
            )}

            {/* Join expiry countdown */}
            {isWaiting && match.joinExpiryAt && (
              <p className="text-sm text-amber-700 mt-3">
                Join expires: <span className="font-mono font-medium">{joinCountdown.expired ? '0:00' : `${joinCountdown.display} min`}</span>
                {!joinCountdown.expired && ` (${formatTime12hr(match.joinExpiryAt)})`}. After that match auto-cancels and you get refund.
              </p>
            )}
          </div>

          {/* Result request state */}
          {resultRequest && (
            <div className="px-4 pb-2">
              {isResolved && (
                <div className="rounded-xl p-3 bg-gray-100 border border-gray-200">
                  {iWon && <p className="text-green-700 font-medium">You won ✓</p>}
                  {iHadWinClaimButRejected && <p className="text-red-600 text-sm">Your request is rejected by the admin. Contact support.</p>}
                  {winnerId && !iWon && !iHadWinClaimButRejected && <p className="text-gray-600 text-sm">Match completed. Winner: {match.players?.find((p) => p.userId?.toString() === winnerId)?.userName || '—'} ✓</p>}
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
            </div>
          )}

          <div className="p-4 pt-0 flex flex-col gap-2">
            {isWaiting && isCreator && (
              <button onClick={handleCancel} disabled={cancelling} className="w-full py-3 rounded-xl border border-red-300 text-red-600 font-medium disabled:opacity-50">
                {cancelling ? 'Cancelling...' : 'Cancel & get refund'}
              </button>
            )}

            {/* Action buttons — shown after game has actually started (room code set) */}
            {isLive && !isResolved && gameActuallyStarted && (
              <div className="space-y-3 pt-1">
                {/* I WON */}
                {!myWinClaim && !myLossClaim && (
                  <button
                    onClick={() => setSubmitResultOpen(true)}
                    className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    🏆 I Won — Submit Result
                  </button>
                )}

                {/* I LOST */}
                {!myWinClaim && !myLossClaim && (
                  <button
                    onClick={() => setLossConfirmOpen(true)}
                    disabled={submittingLoss}
                    className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingLoss ? '...' : '😔 I Lost the Game'}
                  </button>
                )}

                {/* CANCEL / FORFEIT */}
                {!hasAnyClaim && (
                  <button
                    onClick={() => setCancelAsLossConfirm(true)}
                    disabled={cancellingAsLoss}
                    className="w-full py-3 rounded-2xl border-2 border-red-500 text-red-600 font-semibold text-sm bg-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {cancellingAsLoss ? '...' : '❌ Cancel Game (No refund)'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm forfeit dialog */}
      {cancelAsLossConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">⚠️ गेम Cancel करें?</h3>
            <p className="text-red-600 text-sm font-semibold mb-2">आपको कोई भी Refund नहीं मिलेगा।</p>
            <p className="text-gray-600 text-sm mb-4">दूसरे खिलाड़ी को उनकी पूरी Bet (₹{match?.entryAmount}) वापस मिल जाएगी। क्या आप सच में Cancel करना चाहते हैं?</p>
            <div className="flex gap-2">
              <button onClick={() => setCancelAsLossConfirm(false)} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700">वापस जाएं</button>
              <button onClick={handleCancelAsLoss} disabled={cancellingAsLoss} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50">{cancellingAsLoss ? '...' : 'हाँ, Cancel करें'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit win result dialog */}
      {submitResultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">Submit result (I won)</h3>
            <p className="text-sm text-gray-600 mb-3">Upload screenshot. Admin will verify.</p>
            <input type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary-100 file:text-primary-700" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setSubmitResultOpen(false); setScreenshotFile(null); }} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
              <button onClick={handleSubmitResult} disabled={!screenshotFile || submittingResult} className="flex-1 py-2 rounded-lg bg-primary-600 text-white font-medium disabled:opacity-50">{submittingResult ? '...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm "I Lost" dialog */}
      {lossConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">😔 क्या आप सच में हार गए?</h3>
            <p className="text-gray-600 text-sm mb-1">यह request Admin को भेजी जाएगी।</p>
            <p className="text-red-600 text-sm font-semibold mb-4">एक बार submit करने के बाद बदला नहीं जा सकता।</p>
            <div className="flex gap-2">
              <button onClick={() => setLossConfirmOpen(false)} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700">वापस जाएं</button>
              <button onClick={handleSubmitLoss} disabled={submittingLoss} className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-50">{submittingLoss ? '...' : 'हाँ, मैं हार गया'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Support Button */}
      {whatsAppNumber && (
        <a
          href={`https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact Support on WhatsApp"
          className="fixed right-4 z-[9999] w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer"
          style={{
            bottom: '90px',
            boxShadow: '0 6px 25px rgba(37, 211, 102, 0.5)',
            animation: 'bounce 2s infinite',
          }}
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
