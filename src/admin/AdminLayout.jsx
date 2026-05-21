import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useState, useEffect } from 'react';
import { IoGridOutline, IoGrid } from 'react-icons/io5';
import { IoPeopleOutline, IoPeople } from 'react-icons/io5';
import { HiCurrencyRupee, HiOutlineCurrencyRupee } from 'react-icons/hi2';
import { IoBarChartOutline, IoBarChart } from 'react-icons/io5';
import { IoNotificationsOutline, IoNotifications } from 'react-icons/io5';
import { HiOutlineBars3 } from 'react-icons/hi2';
import AdminSideDrawer from './AdminSideDrawer';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../utils/audioSounds';
import { adminAPI, settingsAPI } from '../services/api';

// localStorage keys for "last viewed" timestamps
const LS_MONEY   = 'adminViewedMoneyAt';
const LS_ALERTS  = 'adminViewedAlertsAt';
const LS_LUDO    = 'adminViewedLudoAt';
const LS_KYC     = 'adminViewedKycAt';

const AdminLayout = () => {
  const { user, logout, isAdmin, isSubAdmin, role } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();

  // Unread counts (survive refresh via localStorage timestamps)
  const [unreadMoney, setUnreadMoney]   = useState(0); // deposits + withdrawals unread
  const [unreadAlerts, setUnreadAlerts] = useState(0); // all 4 categories unread
  const [unreadLudo, setUnreadLudo]     = useState(0);
  const [unreadKyc, setUnreadKyc]       = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appLogoUrl, setAppLogoUrl] = useState(null);

  // All available menu items
  const allSidebarItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', subAdmin: true },
    { path: '/admin/users', label: 'Users', icon: '👥', subAdmin: true },
    { path: '/admin/money', label: 'Money', icon: '💰', badge: unreadMoney, subAdmin: true },
    { path: '/admin/bets', label: 'All Bets', icon: '🎰', subAdmin: false },
    { path: '/admin/wins-bets', label: 'Winning Bets', icon: '🏆', subAdmin: false },
    { path: '/admin/spinner-records', label: 'Spinner Records', icon: '🎡', subAdmin: false },
    { path: '/admin/notifications', label: 'Notifications', icon: '🔔', badge: unreadAlerts, subAdmin: true },
    { path: '/admin/bonus-records', label: 'Bonus Records', icon: '🎁', subAdmin: false },
    { path: '/admin/ludo', label: 'Ludo', icon: '🎲', badge: unreadLudo, subAdmin: true },
    { path: '/admin/profit', label: 'Profit', icon: '💹', subAdmin: false },
    { path: '/admin/kyc', label: 'KYC', icon: '🪪', badge: unreadKyc, subAdmin: false },
    { path: '/admin/database', label: 'Database', icon: '🗄️', subAdmin: false },
    ...(role === 'superadmin' ? [{ path: '/admin/credit-log', label: 'Credit Log', icon: '📝', subAdmin: false }] : []),
    { path: '/admin/settings', label: 'Settings', icon: '⚙️', subAdmin: false },
    { path: '/admin/profile', label: 'Your Profile', icon: '👤', subAdmin: true },
  ];

  // Filter items based on role (managers see only subAdmin:true items)
  const isManager = role === 'manager' || (isSubAdmin && !isAdmin);
  const sidebarItems = isManager
    ? allSidebarItems.filter(item => item.subAdmin)
    : allSidebarItems;

  // Mobile bottom tabs - filter based on role
  const allMobileNavItems = [
    { path: '/admin', label: 'Home', icon: IoGridOutline, activeIcon: IoGrid, subAdmin: true },
    { path: '/admin/users', label: 'Users', icon: IoPeopleOutline, activeIcon: IoPeople, subAdmin: true },
    { path: '/admin/money', label: 'Money', icon: HiOutlineCurrencyRupee, activeIcon: HiCurrencyRupee, badge: unreadMoney, subAdmin: true },
    { path: '/admin/bets', label: 'Bets', icon: IoBarChartOutline, activeIcon: IoBarChart, subAdmin: false },
    { path: '/admin/notifications', label: 'Alerts', icon: IoNotificationsOutline, activeIcon: IoNotifications, badge: unreadAlerts, subAdmin: true },
    { path: '/admin/ludo', label: 'Ludo', icon: IoGridOutline, activeIcon: IoGrid, badge: unreadLudo, subAdmin: true },
  ];

  const mobileNavItems = isManager
    ? allMobileNavItems.filter(item => item.subAdmin)
    : allMobileNavItems;

  // Fetch dynamic logo
  useEffect(() => {
    settingsAPI.getLogo().then(res => {
      if (res.data?.logoUrl) setAppLogoUrl(res.data.logoUrl);
    }).catch(() => {});
  }, []);

  // Single fetch on mount — passes all 4 timestamps, backend returns per-badge unread counts
  useEffect(() => {
    const params = {};
    const m = localStorage.getItem(LS_MONEY);
    const a = localStorage.getItem(LS_ALERTS);
    const l = localStorage.getItem(LS_LUDO);
    const k = localStorage.getItem(LS_KYC);
    if (m) params.sinceMoney  = m;
    if (a) params.sinceAlerts = a;
    if (l) params.sinceLudo   = l;
    if (k) params.sinceKyc    = k;

    adminAPI.getPendingCounts(Object.keys(params).length ? params : undefined).then(res => {
      const d = res.data;
      setUnreadMoney((d.unreadDeposits || 0) + (d.unreadWithdrawals || 0));
      setUnreadAlerts(d.unreadAlerts || 0);
      setUnreadLudo(d.unreadLudo || 0);
      setUnreadKyc(d.unreadKyc   || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('admin:wallet-request', () => {
      setUnreadMoney(prev => prev + 1);
      setUnreadAlerts(prev => prev + 1);
      playNotificationSound();
    });
    socket.on('admin:withdrawal-request', () => {
      setUnreadMoney(prev => prev + 1);
      setUnreadAlerts(prev => prev + 1);
      playNotificationSound();
    });
    socket.on('admin:ludo-result-request', (data) => {
      toast(`Ludo result submitted by ${data?.userName || 'a player'}`, { icon: '🎲', duration: 5000 });
      setUnreadLudo(prev => prev + 1);
      setUnreadAlerts(prev => prev + 1);
      playNotificationSound();
    });
    socket.on('admin:new-user', (data) => {
      toast(`New user registered: ${data?.phone || data?.email || 'Unknown'}`, { icon: '🆕', duration: 5000 });
      playNotificationSound();
    });
    socket.on('admin:kyc-request', (data) => {
      toast(`KYC request from ${data?.userName || 'a user'}`, { icon: '🪪', duration: 6000 });
      setUnreadKyc(prev => prev + 1);
      setUnreadAlerts(prev => prev + 1);
      playNotificationSound();
    });
    return () => {
      socket.off('admin:wallet-request');
      socket.off('admin:withdrawal-request');
      socket.off('admin:ludo-result-request');
      socket.off('admin:new-user');
      socket.off('admin:kyc-request');
    };
  }, [socket]);

  // Mark as read when admin visits a page — persists to localStorage so refresh keeps it read
  useEffect(() => {
    const now = new Date().toISOString();
    if (location.pathname.startsWith('/admin/money')) {
      localStorage.setItem(LS_MONEY, now);
      setUnreadMoney(0);
    }
    if (location.pathname.startsWith('/admin/notifications')) {
      localStorage.setItem(LS_ALERTS, now);
      setUnreadAlerts(0);
    }
    if (location.pathname.startsWith('/admin/ludo')) {
      localStorage.setItem(LS_LUDO, now);
      setUnreadLudo(0);
    }
    if (location.pathname.startsWith('/admin/kyc')) {
      localStorage.setItem(LS_KYC, now);
      setUnreadKyc(0);
    }
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100" style={{ overflowX: 'clip' }}>
      {/* Top Bar */}
      <header className="bg-primary-800 text-white px-3 md:px-6 py-2.5 sticky top-0 z-50">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={appLogoUrl || '/logo.jpeg'} alt="Logo" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-2 ring-white/20" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight">Rushkro<span className="text-emerald-300">Ludo</span></h1>
              {!isManager && (
                <p className="text-white/60 text-xs leading-none">{role === 'superadmin' ? 'Super Admin' : 'Admin'}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <Link
              to="/dashboard"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>🎮</span>
              <span className="hidden sm:inline">Play</span>
            </Link>
            <span className="text-xs text-primary-200 hidden lg:inline max-w-[120px] truncate">Welcome, {user?.name}</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <HiOutlineBars3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex min-w-0 w-full">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white min-h-screen shadow-sm hidden md:block">
          <nav className="p-4 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 overflow-hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around px-1 py-1.5">
            {mobileNavItems?.map((item) => {
              const active = isActive(item.path);
              const Icon = active ? item.activeIcon : item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center w-14 py-1.5 rounded-xl transition-all"
                >
                  {active && (
                    <span className="absolute -top-1.5 w-7 h-1 rounded-full bg-primary-600" />
                  )}
                  <div className="relative">
                    <Icon className={`text-[20px] ${active ? 'text-primary-700' : 'text-gray-400'}`} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-0.5 font-medium ${active ? 'text-primary-700' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <AdminSideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default AdminLayout;
