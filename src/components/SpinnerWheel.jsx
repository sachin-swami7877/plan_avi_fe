import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { spinnerAPI } from '../services/api';

// ── ₹50 spin segments (11) ──
const SEGMENTS_50 = [
  { id: 0, label: '₹50', type: 'cash', value: 50, bg: '#0d3320', text: '#4ade80' },
  { id: 1, label: '🙏 Thank you', type: 'thanks', bg: '#2d2d3a', text: '#e2e8f0' },
  { id: 2, label: '₹70', type: 'cash', value: 70, bg: '#172554', text: '#60a5fa' },
  { id: 3, label: '🙏 Thank you', type: 'thanks', bg: '#3d3d4d', text: '#e2e8f0' },
  { id: 4, label: '₹100', type: 'cash', value: 100, bg: '#2e1065', text: '#c084fc' },
  { id: 5, label: '🙏 Thank you', type: 'thanks', bg: '#2d2d3a', text: '#e2e8f0' },
  { id: 6, label: '₹120', type: 'cash', value: 120, bg: '#4c0519', text: '#fb7185' },
  { id: 7, label: '🙏 Thank you', type: 'thanks', bg: '#3d3d4d', text: '#e2e8f0' },
  { id: 8, label: 'iPhone', type: 'prizeImage', imageUrl: '/iphone_16.jpeg', bg: '#451a03', text: '#fbbf24' },
  { id: 9, label: '🙏 Thank you', type: 'thanks', bg: '#2d2d3a', text: '#e2e8f0' },
  { id: 10, label: '₹5000', type: 'cash', value: 5000, bg: '#451a03', text: '#fbbf24' },
];

// ── ₹100 spin segments (11) — no ₹70, adds ₹170 & ₹200 ──
const SEGMENTS_100 = [
  { id: 0, label: '₹50', type: 'cash', value: 50, bg: '#0d3320', text: '#4ade80' },
  { id: 1, label: '🙏 Thank you', type: 'thanks', bg: '#2d2d3a', text: '#e2e8f0' },
  { id: 2, label: '₹100', type: 'cash', value: 100, bg: '#2e1065', text: '#c084fc' },
  { id: 3, label: '🙏 Thank you', type: 'thanks', bg: '#3d3d4d', text: '#e2e8f0' },
  { id: 4, label: '₹120', type: 'cash', value: 120, bg: '#4c0519', text: '#fb7185' },
  { id: 5, label: '🙏 Thank you', type: 'thanks', bg: '#2d2d3a', text: '#e2e8f0' },
  { id: 6, label: '₹170', type: 'cash', value: 170, bg: '#164e63', text: '#22d3ee' },
  { id: 7, label: '🙏 Thank you', type: 'thanks', bg: '#3d3d4d', text: '#e2e8f0' },
  { id: 8, label: '₹200', type: 'cash', value: 200, bg: '#451a03', text: '#fbbf24' },
  { id: 9, label: 'iPhone', type: 'prizeImage', imageUrl: '/iphone_16.jpeg', bg: '#451a03', text: '#fbbf24' },
  { id: 10, label: '₹5000', type: 'cash', value: 5000, bg: '#451a03', text: '#fbbf24' },
];

const TY_INDICES_50 = [1, 3, 5, 7, 9];
const TY_INDICES_100 = [1, 3, 5, 7];

function outcomeToIndex50(outcome) {
  if (outcome === '50') return 0;
  if (outcome === '70') return 2;
  if (outcome === '100') return 4;
  if (outcome === '120') return 6;
  if (outcome === 'thank_you') return TY_INDICES_50[Math.floor(Math.random() * TY_INDICES_50.length)];
  return 1;
}

function outcomeToIndex100(outcome) {
  if (outcome === '50') return 0;
  if (outcome === '100') return 2;
  if (outcome === '120') return 4;
  if (outcome === '170') return 6;
  if (outcome === '200') return 8;
  if (outcome === 'thank_you') return TY_INDICES_100[Math.floor(Math.random() * TY_INDICES_100.length)];
  return 1;
}

export default function SpinnerWheel({ open, onClose }) {
  const { user, updateBalance } = useAuth();
  const [spinCost, setSpinCost] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const wheelRef = useRef(null);

  const balance = user?.walletBalance ?? 0;
  const canSpin = balance >= spinCost && !spinning;
  const SEGMENTS = spinCost === 100 ? SEGMENTS_100 : SEGMENTS_50;
  const SEGMENT_ANGLE = 360 / SEGMENTS.length;
  const outcomeToIndex = spinCost === 100 ? outcomeToIndex100 : outcomeToIndex50;

  useEffect(() => {
    if (open) {
      setResult(null);
      setError('');
    }
  }, [open]);

  const spin = useCallback(async () => {
    if (!canSpin) return;
    setError('');
    setResult(null);
    setSpinning(true);

    try {
      const res = await spinnerAPI.play(spinCost);
      const { outcome, winAmount, newBalance, message } = res.data;
      updateBalance(newBalance);

      const segmentIndex = outcomeToIndex(outcome);
      const segAngle = 360 / (spinCost === 100 ? SEGMENTS_100.length : SEGMENTS_50.length);
      const segmentOffset = segmentIndex * segAngle;
      const fullTurns = 360 * 6;
      const totalRotation = rotation + fullTurns + (360 - segmentOffset);
      setRotation(totalRotation);

      setTimeout(() => {
        setSpinning(false);
        setResult({ outcome, winAmount, message });
      }, 5500);
    } catch (err) {
      setError(err.response?.data?.message || 'Spin failed');
      setSpinning(false);
    }
  }, [canSpin, spinCost, rotation, updateBalance, outcomeToIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-[#1a1a24] to-[#0d0d12] rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
          <span className="text-lg font-bold text-white">Lucky Spinner</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Spin cost selector */}
          <div className="flex gap-2 mb-4">
            {[50, 100].map((cost) => (
              <button
                key={cost}
                type="button"
                disabled={spinning}
                onClick={() => { setSpinCost(cost); setResult(null); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  spinCost === cost
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                } disabled:opacity-60`}
              >
                ₹{cost} Spin
              </button>
            ))}
          </div>

          {/* Wheel container */}
          <div className="relative mx-auto w-72 h-72">
            {/* Pointer at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-lg" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-[11] w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-amber-300" />

            {/* Wheel */}
            <div
              ref={wheelRef}
              className="w-full h-full rounded-full border-4 border-amber-500/50 shadow-xl relative"
              style={{
                background: `conic-gradient(${SEGMENTS.map((seg, i) => {
                  const start = i * SEGMENT_ANGLE;
                  const end = (i + 1) * SEGMENT_ANGLE;
                  return `${seg.bg} ${start}deg ${end}deg`;
                }).join(', ')})`,
                transition: spinning ? 'transform 5.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* Segment labels */}
              {SEGMENTS.map((seg, i) => {
                const midAngle = (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) * (Math.PI / 180);
                const r = 68;
                const cx = 50 + r * Math.sin(midAngle);
                const cy = 50 - r * Math.cos(midAngle);
                const labelRotate = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                return (
                  <div
                    key={seg.id}
                    className="absolute flex items-center justify-center pointer-events-none"
                    style={{
                      left: `${cx}%`,
                      top: `${cy}%`,
                      width: '22%',
                      marginLeft: '-11%',
                      marginTop: '-8%',
                      transform: `rotate(${labelRotate}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {seg.type === 'prizeImage' && seg.imageUrl ? (
                      <img src={seg.imageUrl} alt={seg.label} className="w-8 h-8 object-contain rounded" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[11px] font-bold" style={{ color: seg.text }}>
                        {seg.label}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Center circle */}
              <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#0d0d12] border-4 border-amber-500 flex items-center justify-center text-amber-500 font-bold text-xs shadow-inner">
                SPIN
              </div>
            </div>
          </div>

          {/* Cost & balance */}
          <div className="flex justify-between items-center mt-4 text-sm">
            <span className="text-white/70">₹{spinCost} per spin</span>
            <span className="text-emerald-400 font-semibold">Balance: ₹{balance.toFixed(2)}</span>
          </div>

          {error && (
            <p className="mt-2 text-center text-red-400 text-sm">{error}</p>
          )}

          {/* Result overlay */}
          {result && !spinning && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in duration-300">
              <p className="text-center text-lg font-semibold text-white">
                {result.message}
              </p>
              {result.winAmount > 0 && (
                <p className="text-center text-2xl font-bold text-emerald-400 mt-1">+₹{result.winAmount}</p>
              )}
            </div>
          )}

          {/* Spin button */}
          <button
            type="button"
            onClick={spin}
            disabled={!canSpin}
            className="mt-4 w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            {spinning ? 'Spinning...' : balance < spinCost ? `Min ₹${spinCost} to spin` : `Spin for ₹${spinCost}`}
          </button>
        </div>
      </div>
    </div>
  );
}
