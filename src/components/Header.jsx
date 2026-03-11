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
      <header className="bg-[#0d0d12] border-b border-white/10 px-3 py-2.5 sticky top-0 z-40 overflow-hidden">
        <div className="max-w-md mx-auto flex justify-between items-center min-w-0 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 text-white/60 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {(isAdmin || isSubAdmin) ? (
              <Link
                to="/admin"
                className="p-1.5 text-amber-400 hover:text-amber-300 transition-transform hover:scale-110"
                aria-label="Admin"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
              </Link>
            ) : null}
            <Link to="/dashboard">
              <span className="text-base font-extrabold text-white leading-none">Rushkro<span className="text-red-500">Ludo</span></span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="p-1.5 text-amber-400 hover:text-amber-300 transition-transform hover:scale-110"
              aria-label="Landing Page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
            <Link
              to="/wallet"
              className="transition-transform hover:scale-110"
              aria-label="Wallet"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)' }}>
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 7H3a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zm-1 12H4V9h16v10z"/>
                  <path d="M5 7V5a2 2 0 0 1 2-2h8l4 4"/>
                  <path d="M16 14a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  <path d="M6 3h9l4 4H5V5a2 2 0 0 1 1-1.73z" opacity="0.6"/>
                </svg>
              </div>
            </Link>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {(isAdmin || isSubAdmin) && activeUserCount > 0 && (
                <span className="text-emerald-400/70 text-[10px] font-medium">{activeUserCount}</span>
              )}
              <span className="text-emerald-400 font-semibold text-sm">
                ₹{user?.walletBalance?.toFixed(2) || '0.00'}
              </span>
            </div>
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
