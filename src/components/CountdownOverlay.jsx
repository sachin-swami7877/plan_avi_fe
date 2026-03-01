import { useEffect, useRef, useState } from 'react';

const CountdownOverlay = ({ secondsLeft }) => {
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const maxSecondsRef = useRef(5); // 5-second countdown

  useEffect(() => {
    if (secondsLeft == null) return;

    // Track the max seconds we see to auto-detect countdown length
    if (secondsLeft > maxSecondsRef.current) {
      maxSecondsRef.current = secondsLeft;
    }

    const total = maxSecondsRef.current;
    const startPct = (secondsLeft / total) * 100;
    setProgress(startPct);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / total / 10)));
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [secondsLeft]);

  if (secondsLeft == null) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl pointer-events-none gap-3">
      <p className="text-white/80 text-sm font-semibold tracking-wide uppercase">
        Next round in {secondsLeft}s
      </p>
      <div className="w-3/5 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default CountdownOverlay;
