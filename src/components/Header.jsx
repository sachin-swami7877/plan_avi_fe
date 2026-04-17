import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { HiOutlineBars3 } from 'react-icons/hi2';
import SideDrawer from './SideDrawer';
import { settingsAPI } from '../services/api';

const Header = () => {
  const { user, isAdmin, isSubAdmin, totalCommission } = useAuth();
  const { connected, activeUserCount, unreadNotifCount } = useSocket();
  const unreadCount = unreadNotifCount || 0;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appLogoUrl, setAppLogoUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    settingsAPI.getLogo().then(res => {
      if (res.data?.logoUrl) setAppLogoUrl(res.data.logoUrl);
    }).catch(() => {});
  }, []);

  return (
    <>
      <header className="bg-[#0d0d12] px-3 py-2 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center w-full">
          {/* Left — admin badge + logo */}
          <div className="flex items-center gap-2">
            {(isAdmin || isSubAdmin) && (
              <Link to="/admin" className="text-amber-400 hover:text-amber-300 p-1" title="Admin Panel">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
              </Link>
            )}
            <Link to="/landing" className="flex items-center">
              <div className="relative">
                <img src={appLogoUrl || '/logo.jpeg'} alt="RushkroLudo" className="w-9 h-9 rounded-full ring-2 ring-emerald-500/40 object-cover" />
                <span className="absolute top-0 right-0 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-[#0d0d12]" />
                </span>
              </div>
            </Link>
          </div>


          {/* Right — notification bell + wallet + commission + menu */}
          <div className="flex items-center gap-1.5">
            {/* Notification bell with unread badge */}
            <Link to="/notifications" className="relative p-1">
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Wallet balance box */}
            <Link to="/wallet" className="flex items-center gap-1 border border-white/20 rounded-lg px-2 py-1.5">
              <img src="/wallet.jpeg" alt="wallet" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {(isAdmin || isSubAdmin) && activeUserCount > 0 && (
                <span className="text-emerald-400/70 text-[10px] font-medium">{activeUserCount}</span>
              )}
              <span className="text-emerald-400 font-bold text-sm">
                ₹{user?.walletBalance?.toFixed(2) || '0.00'}
              </span>
            </Link>

            {/* Commission box — all logged-in users */}
            {user && (
              <Link to="/referral" className="flex items-center gap-1 border border-amber-400/40 rounded-lg px-2 py-1.5 bg-amber-500/10">
                <img src="/commision.jpeg" alt="commission" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
                <span className="text-amber-400 font-bold text-sm">
                  ₹{(totalCommission || 0).toFixed(2)}
                </span>
              </Link>
            )}

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
