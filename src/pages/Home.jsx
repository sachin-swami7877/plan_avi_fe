import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const Home = () => {
  const navigate = useNavigate();
  const [userWarning, setUserWarning] = useState('');
  const [supportWhatsApp, setSupportWhatsApp] = useState('');

  useEffect(() => {
    settingsAPI.getUserWarning().then(res => {
      if (res.data?.userWarning) setUserWarning(res.data.userWarning);
    }).catch(() => {});
    settingsAPI.getSupport().then(res => {
      if (res.data?.supportWhatsApp) setSupportWhatsApp(res.data.supportWhatsApp);
    }).catch(() => {});
  }, []);

  const gameCards = [
    {
      id: 'ludo',
      title: 'Ludo King',
      subtitle: 'Room code • Bet & play',
      path: '/ludo',
      gradient: 'from-green-500 to-emerald-600',
      // Add ludo-king.png to public folder for real Ludo King logo, or use external URL
      image: '/ludo.jpeg',
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
      customRender: (
        <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-2">
          <svg className="w-20 h-20" viewBox="0 0 24 24" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span className="text-white font-bold text-lg">Support</span>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-24 overflow-x-hidden">
      <Header />

      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
          <p className="text-gray-600 text-sm">Choose a game to play</p>
        </div>

        {/* User Warning */}
        {userWarning && (
          <div className="mb-4 bg-white border-2 border-red-500 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-red-500 text-xl mt-0.5">&#9888;</span>
            <p className="text-gray-900 text-base font-semibold">{userWarning}</p>
          </div>
        )}

        {/* Games */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Games</h3>
          <div className="grid grid-cols-2 gap-4">
            {gameCards.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  if (game.isExternal) {
                    window.location.href = supportWhatsApp ? `https://wa.me/${supportWhatsApp}` : 'https://wa.me/';
                  } else {
                    navigate(game.path);
                  }
                }}
                className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg active:scale-[0.98] transition-all w-full aspect-square"
              >
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
        </div>
      </div>

      <Navbar />
    </div>
  );
};

export default Home;
