import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { settingsAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

/* ── Auto-sliding Ad Carousel ── */
const AD_SLIDES = ['/slider1.png', '/slider2.png'];
const AdCarousel = () => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % AD_SLIDES.length), 3000);
  }, []);

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current); }, [startTimer]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-sm mb-3">
      <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${current * 100}%)` }}>
        {AD_SLIDES.map((src, i) => (
          <img key={i} src={src} alt={`Slide ${i + 1}`} className="w-full flex-shrink-0 h-auto object-cover" draggable={false} />
        ))}
      </div>
      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {AD_SLIDES.map((_, i) => (
          <button key={i} onClick={() => { setCurrent(i); startTimer(); }}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [userWarning, setUserWarning] = useState('');
  const [supportWhatsApp, setSupportWhatsApp] = useState('');
  const [showInstallTip, setShowInstallTip] = useState(false);
  const [aviatorComingSoon, setAviatorComingSoon] = useState(false);
  const [spinnerComingSoon, setSpinnerComingSoon] = useState(false);
  const [gameStatusLoaded, setGameStatusLoaded] = useState(false);

  const handleDownload = () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => { window.deferredPrompt = null; });
    } else {
      setShowInstallTip(true);
      setTimeout(() => setShowInstallTip(false), 5000);
    }
  };

  useEffect(() => {
    settingsAPI.getUserWarning().then(res => {
      if (res.data?.userWarning) setUserWarning(res.data.userWarning);
    }).catch(() => {});
    settingsAPI.getSupport().then(res => {
      if (res.data?.supportWhatsApp) setSupportWhatsApp(res.data.supportWhatsApp);
    }).catch(() => {});
    settingsAPI.getAviatorStatus().then(res => {
      if (res.data?.aviatorComingSoon) setAviatorComingSoon(true);
      if (res.data?.spinnerComingSoon) setSpinnerComingSoon(true);
    }).catch(() => {}).finally(() => setGameStatusLoaded(true));
  }, []);

  const gameCards = [
    {
      id: 'ludo',
      title: 'Ludo King',
      subtitle: 'Room code • Bet & play',
      path: '/ludo',
      gradient: 'from-green-500 to-emerald-600',
      // Add ludo-king.png to public folder for real Ludo King logo, or use external URL
      image: '/ludo-classic1.png',
      fallbackIcon: (
        <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12h16v16H12V12zm24 0h16v16H36V12zM12 36h16v16H12V52zm24 0h16v16H36V52z" fill="currentColor" />
          <circle cx="20" cy="20" r="4" fill="white" />
          <circle cx="44" cy="20" r="4" fill="white" />
          <circle cx="20" cy="44" r="4" fill="white" />
          <circle cx="44" cy="44" r="4" fill="white" />
        </svg>
      ),
    },
    {
      id: 'aviator',
      title: 'Aviator',
      subtitle: 'Watch it fly & cash out',
      path: '/aviator',
      gradient: 'from-red-500 to-orange-600',
      image: '/avi.jpeg',
      fallbackIcon: (
        <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 8 L40 24 L56 28 L44 40 L46 56 L32 48 L18 56 L20 40 L8 28 L24 24 Z" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 20 L36 28 L44 30 L38 36 L39 42 L32 38 L25 42 L26 36 L20 30 L28 28 Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'lucky-draw',
      title: 'Lucky Draw',
      subtitle: 'Spin the wheel & win',
      path: '/spinner',
      gradient: 'from-amber-500 to-orange-600',
      image: '/spinner.jpeg',
      fallbackIcon: (
        <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" fill="none" />
          <path d="M32 4 L32 60 M32 32 L56 32 M32 32 L8 32 M32 32 L50 12 M32 32 L14 52 M32 32 L50 52 M32 32 L14 12" stroke="currentColor" strokeWidth="2" />
          <circle cx="32" cy="32" r="6" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Contact support',
      path: null,
      gradient: 'from-black to-gray-900',
      image: null,
      isExternal: true,
      image: '/ludosupport.png',
    },
  ];

  return (
    <div className="min-h-screen bg-[#E3F2FD] pb-28 overflow-x-hidden">
      <Header />

      <div className="max-w-md mx-auto p-3 w-full min-w-0">
        {/* User Warning — above carousel */}
        {userWarning && (
          <div className="mb-3 bg-[#7B1F3A] rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-yellow-300 text-xl mt-0.5">&#9888;</span>
            <p className="text-white text-sm font-semibold">{userWarning}</p>
          </div>
        )}

        {/* Ad Carousel */}
        <AdCarousel />

        {/* Install tip toast */}
        {showInstallTip && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg text-center max-w-xs">
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install
          </div>
        )}

        {/* Games — wait for status API, then filter hidden games */}
        <div className="mb-4">
          {!gameStatusLoaded ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-4 pt-3">
            {gameCards.filter((g) => {
              if (g.id === 'aviator' && aviatorComingSoon) return false;
              if (g.id === 'lucky-draw' && spinnerComingSoon) return false;
              return true;
            }).map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  if (game.isExternal) {
                    window.location.href = supportWhatsApp ? `https://wa.me/${supportWhatsApp}` : 'https://wa.me/';
                  } else {
                    navigate(game.path);
                  }
                }}
                className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg active:scale-[0.98] transition-all w-full aspect-square relative"
              >
                {/* LIVE badge — inside image top-left */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'liveBlink 1s ease-in-out infinite' }} />
                  <span className="text-[10px] font-bold text-white uppercase">LIVE</span>
                </div>
                {game.customRender ? (
                  game.customRender
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${game.gradient} flex items-center justify-center text-white relative overflow-hidden`}>
                    {game.image ? (
                      <>
                        <img
                          src={game.image}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const el = e.target.nextElementSibling;
                            if (el) el.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 hidden items-center justify-center" style={{ display: 'none' }}>
                          <div className="w-14 h-14">{game.fallbackIcon}</div>
                        </div>
                      </>
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0">{game.fallbackIcon || game.icon}</div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
          )}

          {/* Download App bar — addaking style */}
          <div className="fixed bottom-20 left-3 right-3 max-w-md mx-auto z-40 bg-white rounded-xl p-3 shadow-lg flex items-center justify-between" style={{ animation: 'floatUpDown 2s ease-in-out infinite' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/logo.jpeg" alt="RushkroLudo" className="w-10 h-10 rounded-full" />
                <span className="absolute top-0 right-0 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white" />
                </span>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">RushkroLudo App</p>
                <p className="text-gray-400 text-xs">Play faster in the app</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="px-5 py-2 rounded-lg bg-[#4DB6AC] text-white font-bold text-sm active:scale-95 transition-transform"
            >
              Install
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes liveBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      <Navbar />
    </div>
  );
};

export default Home;
