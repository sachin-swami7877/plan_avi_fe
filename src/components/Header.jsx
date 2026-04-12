import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { HiOutlineBars3 } from 'react-icons/hi2';
import SideDrawer from './SideDrawer';

const Header = () => {
  const { user, isAdmin, isSubAdmin } = useAuth();
  const { connected, activeUserCount } = useSocket();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="bg-[#0d0d12] px-3 py-2 sticky top-0 z-40 overflow-hidden">
        <div className="max-w-md mx-auto flex justify-between items-center min-w-0 w-full">
          {/* Left — back + admin + logo */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1 text-white/50 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {(isAdmin || isSubAdmin) && (
              <Link to="/admin" className="text-amber-400 hover:text-amber-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
              </Link>
            )}
            <Link to="/dashboard" className="flex items-center">
              <div className="relative">
                <img src="/logo.jpeg" alt="RushkroLudo" className="w-9 h-9 rounded-full" />
                <span className="absolute top-0 right-0 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-[#0d0d12]" />
                </span>
              </div>
            </Link>
          </div>

          {/* Center — home icon */}
          <Link to="/landing" className="text-amber-400 hover:text-amber-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          {/* Right — wallet balance in bordered box + menu */}
          <div className="flex items-center gap-2">
            <Link to="/wallet" className="flex items-center gap-1.5 border border-white/20 rounded-lg px-2.5 py-1.5">
              {/* Wallet icon — filled/colored */}
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                <circle cx="17" cy="14" r="1.5" />
              </svg>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {(isAdmin || isSubAdmin) && activeUserCount > 0 && (
                <span className="text-emerald-400/70 text-[10px] font-medium">{activeUserCount}</span>
              )}
              <span className="text-emerald-400 font-bold text-sm">
                ₹{user?.walletBalance?.toFixed(2) || '0.00'}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 text-white/70 hover:text-white transition-colors"
              aria-label="Menu"
            >
              <HiOutlineBars3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default Header;
