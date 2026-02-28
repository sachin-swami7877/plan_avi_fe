import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const GoOverlay = ({ show }) => {
  const textRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const el = textRef.current;
    if (!el) return;

    gsap.set(el, { scale: 0, opacity: 0 });
    const tl = gsap.timeline();
    tl.to(el, { scale: 1.5, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });
    tl.to(el, { scale: 1.2, duration: 0.1 });
    tl.to(el, { opacity: 0, scale: 1.5, duration: 0.25 }, '+=0.2');

    return () => tl.kill();
  }, [show]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl pointer-events-none">
      <span
        ref={textRef}
        className="text-7xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]"
      >
        GO!
      </span>
    </div>
  );
};

export default GoOverlay;
