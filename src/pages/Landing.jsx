import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { settingsAPI } from '../services/api';

// Single layout fetch (avoids duplicate calls from React Strict Mode / remounts)
let layoutFetchPromise = null;
const fetchLayoutOnce = () => {
  if (!layoutFetchPromise) layoutFetchPromise = settingsAPI.getLayout();
  return layoutFetchPromise;
};

/* ────────── Animated multiplier counter ────────── */
const LiveMultiplier = () => {
  const [val, setVal] = useState(1.0);
  const [crashed, setCrashed] = useState(false);
  const frameRef = useRef(null);

  useEffect(() => {
    let start = Date.now();
    const crashAt = 2.5 + Math.random() * 5;
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const next = Math.pow(Math.E, 0.12 * elapsed);
      if (next >= crashAt) {
        setVal(Number(crashAt.toFixed(2)));
        setCrashed(true);
        setTimeout(() => { setCrashed(false); setVal(1.0); start = Date.now(); frameRef.current = requestAnimationFrame(tick); }, 2000);
        return;
      }
      setVal(Number(next.toFixed(2)));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className={`font-black tabular-nums transition-colors duration-200 ${crashed ? 'text-red-500' : 'text-emerald-400'}`}>
      <span className="text-5xl sm:text-7xl lg:text-8xl">{val.toFixed(2)}</span>
      <span className="text-3xl sm:text-5xl lg:text-6xl ml-1">x</span>
    </div>
  );
};

/* ────────── Floating particles ────────── */
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 20 }).map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white/10"
        style={{
          width: 2 + Math.random() * 4,
          height: 2 + Math.random() * 4,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `floatParticle ${6 + Math.random() * 10}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 6}s`,
        }}
      />
    ))}
  </div>
);

/* ────────── Plane SVG ────────── */
const PlaneSvg = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M58 12L6 30l16 4 4 18 10-12 14 4z" fill="currentColor" opacity="0.9" />
    <path d="M58 12L22 34m0 0l4 18m-4-18L6 30" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
  </svg>
);

/* ────────── RushkroLudo Logo SVG (Dice + Plane) ────────── */
const LogoSvg = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="24" height="24" rx="5" fill="white" opacity="0.95"/>
    <circle cx="9" cy="15" r="2.5" fill="#ef4444"/>
    <circle cx="19" cy="15" r="2.5" fill="#ef4444"/>
    <circle cx="14" cy="20" r="2.5" fill="#ef4444"/>
    <circle cx="9" cy="25" r="2.5" fill="#ef4444"/>
    <circle cx="19" cy="25" r="2.5" fill="#ef4444"/>
    <path d="M30 4l8 5-14 9 6-14z" fill="white" opacity="0.85"/>
    <path d="M30 4l2 1" stroke="white" strokeWidth="1" opacity="0.5"/>
  </svg>
);

/* ────────── Game data for showcase ────────── */
const GAME_DATA = [
  {
    id: 'ludo',
    title: 'Ludo King',
    desc: 'Classic board game',
    path: '/ludo',
    gradient: 'from-green-500 to-emerald-600',
    image: '/ludo.jpeg',
    fallbackEmoji: '🎲',
  },
  {
    id: 'aviator',
    title: 'Aviator',
    desc: 'Crash & cash out',
    path: '/aviator',
    gradient: 'from-red-500 to-orange-600',
    image: '/avi.jpeg',
    fallbackEmoji: '✈️',
  },
  {
    id: 'spinner',
    title: 'Lucky Spinner',
    desc: 'Spin & win big',
    path: '/spinner',
    gradient: 'from-amber-500 to-orange-600',
    image: '/spinner.jpeg',
    fallbackEmoji: '🎡',
  },
];


const Landing = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [layoutEnabled, setLayoutEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchLayoutOnce()
      .then((res) => {
        if (!cancelled) setLayoutEnabled(res.data.layout || false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch layout setting:', err);
          setLayoutEnabled(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Fetch WhatsApp support number
    settingsAPI.getSupport()
      .then((res) => {
        if (!cancelled) {
          const num = res.data?.supportWhatsApp || res.data?.supportPhone || '';
          setWhatsAppNumber(num);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const handlePlay = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login', { state: { from: '/dashboard' } });
  };

  const handleGameClick = (path) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/login', { state: { from: path } });
    }
  };

  const handleDownload = () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => { window.deferredPrompt = null; });
    } else {
      alert('To install this app:\n\nOn Android: Tap the menu (⋮) and select "Add to Home screen"\n\nOn iOS: Tap the Share button and select "Add to Home Screen"');
    }
  };

  // Show motivational layout if enabled
  if (!loading && layoutEnabled) {
    return <MotivationalLanding handlePlay={handlePlay} isAuthenticated={isAuthenticated} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070d] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  const features = [
    { icon: '🎲', title: 'Ludo King', desc: 'Play classic Ludo with room codes. Create or join rooms, bet and compete with friends.' },
    { icon: '✈️', title: 'Aviator Game', desc: 'Watch the multiplier climb and cash out before it crashes. Fast rounds, big wins.' },
    { icon: '🎡', title: 'Lucky Spinner', desc: 'Spin the wheel of fortune and win instant prizes. Try your luck every day!' },
    { icon: '💰', title: 'Real Winnings', desc: 'Deposit via UPI, play your favorite game, and withdraw your earnings instantly.' },
    { icon: '🔒', title: 'Secure & Fair', desc: 'Transparent system with provable outcomes. Your funds are always safe.' },
    { icon: '📱', title: 'Play Anywhere', desc: 'Optimized for mobile and desktop. Play on the go, anytime, anywhere.' },
  ];

  const steps = [
    { num: '01', title: 'Create Account', desc: 'Sign up with your email in seconds. Quick OTP verification.' },
    { num: '02', title: 'Add Funds', desc: 'Deposit via UPI or QR code. Minimum ₹100 to get started.' },
    { num: '03', title: 'Choose Your Game', desc: 'Pick from Ludo King, Aviator, or Lucky Spinner and start playing.' },
    { num: '04', title: 'Win & Withdraw', desc: 'Win real cash and withdraw your winnings to UPI instantly!' },
  ];

  return (
    <div className="min-h-screen bg-[#07070d] text-white overflow-x-hidden relative">
      {/* ═══ Background layers ═══ */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(220,38,38,0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#07070d] via-transparent to-transparent" />
        <Particles />
      </div>

      {/* ═══ Navbar ═══ */}
      <header className="relative z-30 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow">
              <LogoSvg className="w-7 h-7" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">Rushkro<span className="text-red-500">Ludo</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-sm text-white/70 hover:text-white transition-colors font-medium">Play</Link>
                <Link to="/wallet" className="text-sm text-white/70 hover:text-white transition-colors font-medium">Wallet</Link>
                <Link to="/profile" className="text-sm text-white/70 hover:text-white transition-colors font-medium">Profile</Link>
              </>
            ) : (
              <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors font-medium">Login</Link>
            )}
            <button onClick={handlePlay} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 hover:shadow-red-500/30">
              Play Now
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Menu">
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-white/5 bg-[#0d0d15]/95 backdrop-blur-xl px-4 py-3 space-y-1">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 font-medium">Play</Link>
                <Link to="/wallet" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 font-medium">Wallet</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 font-medium">Profile</Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 font-medium">Login</Link>
            )}
            <button onClick={() => { setMenuOpen(false); handlePlay(); }} className="w-full mt-2 px-4 py-3 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-center">
              Play Now
            </button>
          </div>
        )}
      </header>

      {/* ═══ Game Showcase — 3 clickable game cards ═══ */}
      <section className="relative z-10 px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-sm font-semibold text-white/50 uppercase tracking-widest mb-5">Choose Your Game</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {GAME_DATA.map((game) => (
              <button
                key={game.id}
                onClick={() => handleGameClick(game.path)}
                className={`group relative rounded-2xl overflow-hidden bg-gradient-to-br ${game.gradient} shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]`}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full  group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden absolute inset-0 items-center justify-center text-5xl sm:text-7xl">
                    {game.fallbackEmoji}
                  </div>
                </div>
                <div className="pb-3 sm:pb-4 text-center bg-gradient-to-t from-black/40 to-transparent -mt-4 pt-6">
                  <p className="font-bold text-white text-sm sm:text-base drop-shadow">{game.title}</p>
                  <p className="text-white/70 text-[10px] sm:text-xs mt-0.5">{game.desc}</p>
                </div>
                {/* Play badge */}
                <div className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </button>
            ))}
          </div>
          {/* Share & Copy buttons */}
          <div className="flex gap-3 mt-5 justify-center">
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Play Ludo, Aviator & Lucky Spinner! Win real cash. Join now: ' + window.location.origin)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 max-w-[200px] bg-[#25D366] text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm hover:bg-[#20bd5a] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Share
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.origin); alert('Link copied!'); }}
              className="flex-1 max-w-[200px] bg-white/10 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm border border-white/10 hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copy Link
            </button>
          </div>
        </div>
      </section>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 px-4 sm:px-6 pt-10 sm:pt-16 pb-12 sm:pb-20">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Left text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE — Players winning right now
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6">
              Play Ludo, Aviator
              <span className="block bg-gradient-to-r from-red-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                & Lucky Spinner.
              </span>
              Win Real Cash!
            </h1>
            <p className="text-white/60 text-base sm:text-lg lg:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Three exciting games on one platform. Play Ludo with friends, bet on the Aviator, or spin the lucky wheel — all with real money winnings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={handlePlay}
                className="group relative px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-red-600 to-red-500 text-white shadow-2xl shadow-red-600/30 hover:shadow-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Play Now
                  <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
              <button
                onClick={handleDownload}
                className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-600/20 hover:shadow-green-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download App
              </button>
              <button
                onClick={() => document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-xl font-bold text-lg border border-white/15 text-white/80 hover:bg-white/5 hover:text-white transition-all"
              >
                How to Play
              </button>
            </div>
          </div>

          {/* Right — live multiplier demo */}
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 -m-10 bg-gradient-to-br from-red-600/20 via-orange-500/10 to-transparent rounded-full blur-3xl" />
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-3xl bg-gradient-to-br from-[#12121f] to-[#0a0a14] border border-white/10 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`h${i}`} className="absolute w-full h-px bg-white" style={{ top: `${(i + 1) * 12.5}%` }} />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`v${i}`} className="absolute h-full w-px bg-white" style={{ left: `${(i + 1) * 12.5}%` }} />
                ))}
              </div>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="none">
                <path d="M0 380 Q100 370 150 340 Q200 300 250 220 Q300 120 350 40" stroke="url(#curveGrad)" strokeWidth="3" fill="none" opacity="0.6" />
                <defs>
                  <linearGradient id="curveGrad" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute top-8 right-8 animate-bounce-slow">
                <PlaneSvg className="w-10 h-10 text-red-500/60 -rotate-45" />
              </div>
              <LiveMultiplier />
              <p className="text-white/30 text-xs mt-3 font-medium tracking-wider uppercase">Live Demo</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Stats bar ═══ */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { val: '10K+', label: 'Players' },
            { val: '₹50L+', label: 'Won Today' },
            { val: '3 Games', label: 'Ludo, Aviator, Spinner' },
            { val: '24/7', label: 'Live Games' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{s.val}</p>
              <p className="text-white/40 text-sm mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Why Players Love <span className="text-red-500">RushkroLudo</span></h2>
            <p className="text-white/50 max-w-2xl mx-auto">Three exciting games, real winnings, and the best gaming experience.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How to Play ═══ */}
      <section id="how-to-play" className="relative z-10 px-4 sm:px-6 py-16 sm:py-24 bg-gradient-to-b from-transparent via-red-950/5 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">How to Play</h2>
            <p className="text-white/50">Get started in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden group hover:border-red-500/20 transition-all">
                <span className="absolute -top-3 -right-2 text-7xl font-black text-white/[0.03] group-hover:text-red-500/5 transition-colors select-none">{s.num}</span>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-sm font-black mb-4 shadow-lg shadow-red-500/20">
                    {s.num}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Game Details — 3 game description cards ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Our <span className="text-red-500">Games</span></h2>
            <p className="text-white/50">Something for every player</p>
          </div>
          <div className="space-y-6">
            {/* Ludo King */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#12121f] to-[#0e0e1a] border border-white/5 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
                  <span className="text-4xl sm:text-5xl">🎲</span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-black mb-2">Ludo King</h3>
                  <p className="text-white/50 leading-relaxed mb-3">
                    Play the classic Ludo board game with a modern twist! Create private rooms with room codes, invite your friends, and compete for real money stakes. Roll the dice, strategize your moves, and race your tokens to victory.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">Room Codes</span>
                    <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">Play with Friends</span>
                    <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">Real Stakes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviator */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#12121f] to-[#0e0e1a] border border-white/5 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
                  <PlaneSvg className="w-12 h-12 sm:w-14 sm:h-14 text-white -rotate-12" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-black mb-2">Aviator</h3>
                  <p className="text-white/50 leading-relaxed mb-3">
                    The ultimate crash game! Place your bet and watch the multiplier rise as the plane flies higher. Cash out before it crashes to lock in your winnings. Every round is different — the multiplier could crash at 1.2x or soar past 50x!
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">Fast Rounds</span>
                    <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">Rising Multiplier</span>
                    <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">Cash Out Anytime</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lucky Spinner */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#12121f] to-[#0e0e1a] border border-white/5 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                  <span className="text-4xl sm:text-5xl">🎡</span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-black mb-2">Lucky Spinner</h3>
                  <p className="text-white/50 leading-relaxed mb-3">
                    Feeling lucky? Spin the colorful wheel of fortune and win instant prizes! Multiple prize segments with different multipliers. Simple, fun, and exciting — just spin and see where the wheel stops.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">Instant Prizes</span>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">Multiple Multipliers</span>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">Daily Spins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Download App Section ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/20 p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Download the App</h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              Install RushkroLudo on your phone for the best gaming experience. Quick access, faster loading, and play anytime!
            </p>
            <button
              onClick={handleDownload}
              className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-600 to-green-500 text-white shadow-2xl shadow-green-600/30 hover:shadow-green-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Now
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Ready to <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">Play & Win?</span>
          </h2>
          <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of players winning every day. Create your account, add funds, and choose from Ludo, Aviator, or Spinner!
          </p>
          <button
            onClick={handlePlay}
            className="group relative px-10 py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-red-600 to-red-500 text-white shadow-2xl shadow-red-600/30 hover:shadow-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              Start Playing
              <PlaneSvg className="w-6 h-6 -rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <LogoSvg className="w-6 h-6" />
              </div>
              <span className="font-extrabold">Rushkro<span className="text-red-500">Ludo</span></span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-sm text-white/40">
              <div className="flex items-center gap-6">
                <Link to="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
                <Link to="/support" className="hover:text-white/70 transition-colors">Support</Link>
                <span>18+ | Play Responsibly</span>
              </div>
              <a href="tel:+919166821247" className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +91 91668 21247
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ Floating Support Phone Icon ═══ */}
      <a
        href="tel:+919166821247"
        className="fixed right-4 z-[9999] w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
        style={{
          bottom: '24px',
          animation: 'bounce 2s infinite',
          boxShadow: '0 6px 25px rgba(59, 130, 246, 0.5)',
        }}
        aria-label="Call Support"
      >
        <svg className="w-7 h-7" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </a>

      {/* ═══ Floating WhatsApp Icon ═══ */}
      {whatsAppNumber && (
        <a
          href={`https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-4 z-[9999] w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
          style={{
            bottom: '96px',
            animation: 'bounce 2s infinite',
            animationDelay: '0.3s',
            boxShadow: '0 6px 25px rgba(37, 211, 102, 0.5)',
          }}
          aria-label="Contact Support on WhatsApp"
        >
          <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* ═══ CSS Animations ═══ */}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-15px) translateX(-8px); opacity: 0.4; }
          75% { transform: translateY(-40px) translateX(15px); opacity: 0.5; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(-45deg); }
          50% { transform: translateY(-12px) rotate(-45deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

/* ────────── Shayri Landing Page ────────── */
const MotivationalLanding = ({ handlePlay, isAuthenticated, menuOpen, setMenuOpen }) => {
  const quotes = [
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "रौशनी तेरी ढूँढती है अँधेरा अपना, तू रहा खामोश सितारों की तरह।", author: "John Elia" },
    { text: "दिल की बात कहने का सलीका नहीं आता, सोचता रहता हूँ तुझे क्या कहूँ।", author: "John Elia" },
    { text: "ज़िंदगी यूँ ही गुज़र जाएगी अगर तू नहीं, तेरी यादों में खोकर जी लूँगा मैं।", author: "John Elia" },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#1a1a2e] to-[#0f0f1e] text-white overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(139,92,246,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_80%,rgba(59,130,246,0.08),transparent)]" />
        <Particles />
      </div>

      {/* Navbar */}
      <header className="relative z-30 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-lg">📜</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight">Shayri<span className="text-violet-400">.com</span></span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-sm text-white/70 hover:text-white transition-colors font-medium">Account</Link>
                <Link to="/profile" className="text-sm text-white/70 hover:text-white transition-colors font-medium">Profile</Link>
              </>
            ) : (
              <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors font-medium">Login</Link>
            )}
            <button onClick={handlePlay} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/20">
              Get Started
            </button>
          </nav>

          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-white/5 bg-[#0d0d15]/95 backdrop-blur-xl px-4 py-3 space-y-1">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 font-medium">Account</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 font-medium">Profile</Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 font-medium">Login</Link>
            )}
            <button onClick={() => { setMenuOpen(false); handlePlay(); }} className="w-full mt-2 px-4 py-3 rounded-lg font-bold bg-violet-600 hover:bg-violet-500 text-center">
              Get Started
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-8">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            Beautiful Shayri Collection
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-8">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Words from the
            </span>
            <br />
            <span className="text-white">Heart</span>
            <br />
            <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
              in Shayri.
            </span>
          </h1>

          <p className="text-white/70 text-xl sm:text-2xl leading-relaxed mb-12 max-w-3xl mx-auto">
            Where every word touches the soul. Hindi and Urdu shayari curated for you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handlePlay}
              className="group relative px-10 py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Explore Shayri
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>
          </div>

          {/* Shayri Section */}
          <div className="max-w-3xl mx-auto">
            <div className="relative p-8 sm:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
              <div className="absolute top-4 left-4 text-6xl font-black text-white/[0.05] select-none">"</div>
              <p className="text-2xl sm:text-3xl font-bold text-white/90 leading-relaxed mb-6 relative z-10">
                {quotes[currentIndex].text}
              </p>
              <p className="text-white/50 text-sm font-medium">— {quotes[currentIndex].author}</p>
              <div className="flex justify-center gap-2 mt-6">
                {quotes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-violet-400 w-6' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Why <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Our Shayri</span>?
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Thousands of readers come here every day for beautiful words
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📖', title: 'Hindi Shayri', desc: 'Heart-touching Hindi shayari. A world of emotions and beautiful words.' },
              { icon: '🖋️', title: 'John Elia', desc: 'Famous shayaris by John Elia. Deep emotions and beautiful expression.' },
              { icon: '❤️', title: 'Words of the Heart', desc: 'Love, longing, and life. Shayari for every mood.' },
            ].map((f, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/30 hover:bg-white/[0.06] transition-all duration-300">
                <div className="text-5xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-xl mb-3">{f.title}</h3>
                <p className="text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 border border-violet-500/20">
            <h2 className="text-4xl sm:text-5xl font-black mb-6">
              Ready to <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Explore</span>?
            </h2>
            <p className="text-white/70 text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of readers. Create your account and discover beautiful shayari.
            </p>
            <button
              onClick={handlePlay}
              className="group relative px-12 py-6 rounded-2xl font-black text-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                Get Started
                <svg className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>

            {/* Share & Invite */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join me on ${document.title || 'our platform'}! Play Ludo, Aviator & more. ${window.location.origin}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share on WhatsApp
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.origin); }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white/80 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-base">📜</span>
              </div>
              <span className="font-extrabold">Shayri<span className="text-violet-400">.com</span></span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link to="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
              <Link to="/support" className="hover:text-white/70 transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
