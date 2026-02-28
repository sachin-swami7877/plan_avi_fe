import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { spinnerAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const SEGMENTS = [
  { id: 0, label: '₹50', type: 'cash', value: 50, color: '#ffffff', textColor: '#047857' },
  { id: 1, label: 'Thanks', type: 'thanks', color: '#fef9c3', textColor: '#92400e' },
  { id: 2, label: '₹70', type: 'cash', value: 70, color: '#ffffff', textColor: '#047857' },
  { id: 3, label: '₹100', type: 'cash', value: 100, color: '#ffffff', textColor: '#047857' },
  { id: 4, label: 'iPhone', type: 'prizeImage', image: 'iphone', imageUrl: '/iphone_16.jpeg', color: '#fef3c7', textColor: '#92400e' },
  { id: 5, label: 'Tata Punch', type: 'prizeImage', image: 'tata-punch', imageUrl: '/car_creta.jpg', color: '#fef3c7', textColor: '#92400e' },
];

const NUM_SEGMENTS = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;
const THANK_YOU_INDICES = [1];

function outcomeToSegmentIndex(outcome) {
  if (outcome === '50') return 0;
  if (outcome === '70') return 2;
  if (outcome === '100') return 3;
  if (outcome === 'thank_you') return THANK_YOU_INDICES[Math.floor(Math.random() * THANK_YOU_INDICES.length)];
  return 1;
}

const SPIN_COST = 50;
const MIN_BALANCE = 50;
const SPIN_DURATION_MS = 5500;

/** Build SVG path for a wedge segment from startDeg to endDeg on a circle of radius r centered at (cx, cy). Angles measured clockwise from 12 o'clock. */
function wedgePath(cx, cy, r, startDeg, endDeg) {
  const toRad = (d) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.sin(toRad(startDeg));
  const y1 = cy - r * Math.cos(toRad(startDeg));
  const x2 = cx + r * Math.sin(toRad(endDeg));
  const y2 = cy - r * Math.cos(toRad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function Spinner() {
  const { user, updateBalance } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [waitingForApi, setWaitingForApi] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [landedSegmentIndex, setLandedSegmentIndex] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const wheelRef = useRef(null);
  const pendingResultRef = useRef(null);
  const resultDelayTimerRef = useRef(null);
  const rotationRef = useRef(0);

  const balance = user?.walletBalance ?? 0;

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await spinnerAPI.getHistory();
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.records || []);
      setHistory(list);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Countdown 3→2→1 while waiting for API
  useEffect(() => {
    if (!waitingForApi) { setCountdown(0); return; }
    setCountdown(3);
    const t = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 3)), 1000);
    return () => clearInterval(t);
  }, [waitingForApi]);

  const canSpin = balance >= MIN_BALANCE && !spinning && !waitingForApi;

  // Show result only after wheel has fully stopped
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      if (!pendingResultRef.current) return;
      setSpinning(false);
      if (resultDelayTimerRef.current) clearTimeout(resultDelayTimerRef.current);
      resultDelayTimerRef.current = setTimeout(() => {
        if (pendingResultRef.current) {
          setResult(pendingResultRef.current);
          pendingResultRef.current = null;
          fetchHistory();
        }
        resultDelayTimerRef.current = null;
      }, 400);
    };
    el.addEventListener('transitionend', onEnd);
    return () => {
      el.removeEventListener('transitionend', onEnd);
      if (resultDelayTimerRef.current) clearTimeout(resultDelayTimerRef.current);
    };
  }, [fetchHistory]);

  const spin = useCallback(async () => {
    if (!canSpin) return;
    setError('');
    setResult(null);
    setLandedSegmentIndex(null);
    setWaitingForApi(true);

    try {
      const res = await spinnerAPI.play();
      setWaitingForApi(false);
      const { outcome, winAmount, newBalance, message } = res.data;
      updateBalance(newBalance);

      const segmentIndex = outcomeToSegmentIndex(outcome);
      setLandedSegmentIndex(segmentIndex);
      setSpinning(true);

      const fullTurns = 360 * 6;
      const segmentCenterAngle = (segmentIndex + 0.5) * SEGMENT_ANGLE;
      const targetAngle = (360 - segmentCenterAngle) % 360;
      const currentRotation = rotationRef.current;
      const currentAngle = ((currentRotation % 360) + 360) % 360;
      const delta = (targetAngle - currentAngle + 360) % 360;
      const targetRotation = currentRotation + fullTurns + (delta === 0 ? 360 : delta);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setRotation(targetRotation);
          rotationRef.current = targetRotation;
        });
      });

      pendingResultRef.current = { outcome, winAmount, message };
      setTimeout(() => {
        if (pendingResultRef.current) {
          setSpinning(false);
          setTimeout(() => {
            if (pendingResultRef.current) {
              setResult(pendingResultRef.current);
              pendingResultRef.current = null;
              fetchHistory();
            }
          }, 400);
        }
      }, SPIN_DURATION_MS + 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Spin failed');
      setWaitingForApi(false);
      setSpinning(false);
    }
  }, [canSpin, updateBalance, fetchHistory]);

  // Build conic-gradient with highlight on winning segment
  const showHighlight = result && !spinning && landedSegmentIndex != null;
  const conicStops = SEGMENTS.map((seg, i) => {
    const start = i * SEGMENT_ANGLE;
    const end = (i + 1) * SEGMENT_ANGLE;
    let col;
    if (showHighlight && i === landedSegmentIndex) {
      col = '#fbbf24'; // gold highlight for winner
    } else {
      col = i % 2 === 0 ? '#ffffff' : '#f5f5f0';
    }
    return `${col} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24 w-full max-w-[100vw] overflow-x-hidden box-border">
      <Header />

      <div className="max-w-md mx-auto px-5 pt-4 pb-6 w-full min-w-0 box-border">
        <div className="bg-gradient-to-b from-[#1a1a24] to-[#0d0d12] rounded-2xl border border-white/10 shadow-xl overflow-hidden w-full min-w-0">
          {/* Top bar */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
            <Link
              to="/profile"
              className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-lg font-bold text-white">Lucky Spinner</span>
            <div className="w-9" />
          </div>

          <div className="p-4 sm:p-6 flex flex-col items-center w-full min-w-0 overflow-hidden">
            {/* Wheel */}
            <div className="relative w-full max-w-[300px] aspect-square mx-auto flex-shrink-0">
              {/* Pointer */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                style={{ marginTop: '-2px' }}
              >
                <div className="relative">
                  <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.6)]" />
                  {showHighlight && (
                    <div className="absolute inset-0 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-yellow-300 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Outer glow ring */}
              <div
                className="absolute inset-0 rounded-full transition-shadow duration-500"
                style={{
                  boxShadow: showHighlight
                    ? '0 0 30px 8px rgba(251,191,36,0.4), inset 0 0 20px rgba(251,191,36,0.1)'
                    : '0 0 15px 2px rgba(251,191,36,0.15)',
                }}
              />

              {/* Wheel disc */}
              <div
                ref={wheelRef}
                className="w-full h-full rounded-full border-[5px] border-amber-500 shadow-2xl relative overflow-hidden"
                style={{
                  background: `conic-gradient(${conicStops})`,
                  transition: spinning ? `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                {/* Segment divider lines */}
                {SEGMENTS.map((_, i) => (
                  <div
                    key={`line-${i}`}
                    className="absolute top-0 left-1/2 origin-bottom h-1/2 pointer-events-none"
                    style={{
                      width: '1px',
                      background: 'rgba(0,0,0,0.08)',
                      transform: `rotate(${i * SEGMENT_ANGLE}deg)`,
                      transformOrigin: '50% 100%',
                    }}
                  />
                ))}

                {/* Segment labels */}
                {SEGMENTS.map((seg, i) => {
                  const midAngle = (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) * (Math.PI / 180);
                  const r = 36;
                  const cx = 50 + r * Math.sin(midAngle);
                  const cy = 50 - r * Math.cos(midAngle);
                  const labelRotate = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                  const isPrizeImage = seg.type === 'prizeImage';
                  const isWinner = showHighlight && i === landedSegmentIndex;

                  if (isPrizeImage) {
                    return (
                      <div
                        key={seg.id}
                        className="absolute flex items-center justify-center pointer-events-none rounded-lg shadow-md overflow-hidden"
                        style={{
                          left: `${cx}%`,
                          top: `${cy}%`,
                          width: '22%',
                          height: '22%',
                          marginLeft: '-11%',
                          marginTop: '-11%',
                          transform: `rotate(${labelRotate}deg)`,
                          transformOrigin: 'center center',
                          background: '#fff',
                        }}
                      >
                        {seg.imageUrl ? (
                          <img
                            src={seg.imageUrl}
                            alt={seg.label}
                            className="w-full h-full object-contain p-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-amber-600 font-bold text-[8px]">{seg.label}</span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={seg.id}
                      className="absolute flex items-center justify-center pointer-events-none"
                      style={{
                        left: `${cx}%`,
                        top: `${cy}%`,
                        width: '20%',
                        marginLeft: '-10%',
                        marginTop: '-7%',
                        transform: `rotate(${labelRotate}deg)`,
                        transformOrigin: 'center center',
                      }}
                    >
                      <span
                        className={`block w-full text-center font-extrabold leading-tight ${
                          isWinner ? 'text-[11px]' : 'text-[10px]'
                        }`}
                        style={{ color: isWinner ? '#92400e' : seg.textColor }}
                      >
                        {seg.label}
                      </span>
                    </div>
                  );
                })}

                {/* Center SPIN button */}
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#0d0d12] border-4 border-amber-500 flex items-center justify-center text-amber-400 font-extrabold text-sm shadow-lg z-10">
                  SPIN
                </div>
              </div>
            </div>

            {/* Price & Balance */}
            <div className="w-full max-w-[300px] mt-4 flex justify-between items-center text-sm">
              <span className="text-white/70">₹{SPIN_COST} per spin</span>
              <span className="text-emerald-400 font-semibold">Balance: ₹{balance.toFixed(2)}</span>
            </div>

            {error && (
              <p className="w-full max-w-[300px] mt-2 text-center text-red-400 text-sm">{error}</p>
            )}

            {/* Result card */}
            {result && !spinning && (
              <div
                className={`w-full max-w-[300px] mt-4 p-4 rounded-xl border transition-all duration-500 ${
                  result.winAmount > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <p className="text-center text-lg font-semibold text-white">{result.message}</p>
                {result.winAmount > 0 && (
                  <p className="text-center text-3xl font-bold text-emerald-400 mt-1 animate-bounce">
                    +₹{result.winAmount}
                  </p>
                )}
              </div>
            )}

            {/* Spin button */}
            <button
              type="button"
              onClick={spin}
              disabled={!canSpin}
              className="w-full max-w-[300px] mt-4 py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 min-h-[56px]"
            >
              {waitingForApi ? (
                <>
                  <span className="inline-block w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Getting result... {countdown > 0 ? countdown : ''}</span>
                </>
              ) : spinning ? (
                'Spinning...'
              ) : balance < MIN_BALANCE ? (
                `Min ₹${MIN_BALANCE} to spin`
              ) : (
                'Spin for ₹50'
              )}
            </button>

            {/* Spin history */}
            <div className="w-full max-w-[300px] mt-6">
              <h3 className="text-sm font-semibold text-white/90 mb-2">My spin history</h3>
              {historyLoading ? (
                <p className="text-white/60 text-sm">Loading...</p>
              ) : !Array.isArray(history) || history.length === 0 ? (
                <p className="text-white/60 text-sm">No spins yet.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
                  {history.map((r) => (
                    <li
                      key={r._id}
                      className="flex items-center justify-between gap-2 text-sm py-2 px-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-white/80">
                          {r.outcome === 'thank_you' ? 'Thank you' : `₹${r.winAmount} won`}
                        </span>
                        <span className={r.winAmount > 0 ? 'text-emerald-400 font-medium ml-2' : 'text-white/60 ml-2'}>
                          {r.winAmount > 0 ? `+₹${r.winAmount}` : '—'}
                        </span>
                      </div>
                      <span className="text-white/50 text-xs shrink-0">
                        {new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
