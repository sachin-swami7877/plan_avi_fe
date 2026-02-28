import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { spinnerAPI } from '../services/api';

const SEGMENTS = [
  { id: 0, label: '₹50', type: 'cash', value: 50 },
  { id: 1, label: '🙏 Thank you', type: 'thanks' },
  { id: 2, label: '₹70', type: 'cash', value: 70 },
  { id: 3, label: '🙏 Thank you', type: 'thanks' },
  { id: 4, label: '₹100', type: 'cash', value: 100 },
  { id: 5, label: '🙏 Thank you', type: 'thanks' },
  { id: 6, label: '📱 iPhone 16 Pro', type: 'prize' },
  { id: 7, label: '🙏 Thank you', type: 'thanks' },
  { id: 8, label: '💻 MacBook', type: 'prize' },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length; // 40°

// Thank you segment indices (we never land on 6 or 8 - iPhone/MacBook)
const THANK_YOU_INDICES = [1, 3, 5, 7];

function outcomeToSegmentIndex(outcome) {
  if (outcome === '50') return 0;
  if (outcome === '70') return 2;
  if (outcome === '100') return 4;
  if (outcome === 'thank_you') return THANK_YOU_INDICES[Math.floor(Math.random() * THANK_YOU_INDICES.length)];
  return 1;
}

const SPIN_COST = 50;
const MIN_BALANCE = 50;

export default function SpinnerWheel({ open, onClose }) {
  const { user, updateBalance } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const wheelRef = useRef(null);

  const balance = user?.walletBalance ?? 0;
  const canSpin = balance >= MIN_BALANCE && !spinning;

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
      const res = await spinnerAPI.play();
      const { outcome, winAmount, newBalance, message } = res.data;
      updateBalance(newBalance);

      const segmentIndex = outcomeToSegmentIndex(outcome);
      // 5 full turns + bring segment to top (pointer at 12 o'clock)
      const segmentOffset = segmentIndex * SEGMENT_ANGLE;
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
  }, [canSpin, rotation, updateBalance]);

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
                background: `conic-gradient(${SEGMENTS.map((_, i) => {
                  const start = i * SEGMENT_ANGLE;
                  const end = (i + 1) * SEGMENT_ANGLE;
                  const col = i % 2 === 0 ? '#2d2d3a' : '#3d3d4d';
                  return `${col} ${start}deg ${end}deg`;
                }).join(', ')})`,
                transition: spinning ? 'transform 5.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* Segment labels - positioned at middle of each slice, rotated to read outward */}
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
                    {seg.type === 'prize' ? (
                      <span className="text-[9px] font-bold leading-tight text-center text-amber-300/90">{seg.label}</span>
                    ) : (
                      <span className={`text-[11px] font-bold ${seg.type === 'cash' ? 'text-emerald-400' : 'text-white/90'}`}>
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
            <span className="text-white/70">₹{SPIN_COST} per spin</span>
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
            {spinning ? 'Spinning...' : balance < MIN_BALANCE ? `Min ₹${MIN_BALANCE} to spin` : 'Spin for ₹50'}
          </button>
        </div>
      </div>
    </div>
  );
}
