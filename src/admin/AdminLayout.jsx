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

const AdminLayout = () => {
  const { user, logout, isAdmin, isSubAdmin, role } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState({ deposits: 0, withdrawals: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // All available menu items
  const allSidebarItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', subAdmin: true },
    { path: '/admin/users', label: 'Users', icon: '👥', subAdmin: true },
    { path: '/admin/money', label: 'Money', icon: '💰', badge: pendingCount.deposits + pendingCount.withdrawals, subAdmin: true },
    { path: '/admin/bets', label: 'All Bets', icon: '🎰', subAdmin: false },
    { path: '/admin/wins-bets', label: 'Winning Bets', icon: '🏆', subAdmin: false },
    { path: '/admin/spinner-records', label: 'Spinner Records', icon: '🎡', subAdmin: false },
    { path: '/admin/notifications', label: 'Notifications', icon: '🔔', subAdmin: true },
    { path: '/admin/bonus-records', label: 'Bonus Records', icon: '🎁', subAdmin: false },
    { path: '/admin/ludo', label: 'Ludo', icon: '🎲', subAdmin: true },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️', subAdmin: false },
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
    { path: '/admin/money', label: 'Money', icon: HiOutlineCurrencyRupee, activeIcon: HiCurrencyRupee, badge: pendingCount.deposits + pendingCount.withdrawals, subAdmin: true },
    { path: '/admin/bets', label: 'Bets', icon: IoBarChartOutline, activeIcon: IoBarChart, subAdmin: false },
    { path: '/admin/notifications', label: 'Alerts', icon: IoNotificationsOutline, activeIcon: IoNotifications, subAdmin: true },
    { path: '/admin/ludo', label: 'Ludo', icon: IoGridOutline, activeIcon: IoGrid, subAdmin: true },
  ];

  const mobileNavItems = isManager
    ? allMobileNavItems.filter(item => item.subAdmin)
    : allMobileNavItems;

  useEffect(() => {
    if (!socket) return;
    socket.on('admin:wallet-request', () => {
      setPendingCount(prev => ({ ...prev, deposits: prev.deposits + 1 }));
    });
    socket.on('admin:withdrawal-request', () => {
      setPendingCount(prev => ({ ...prev, withdrawals: prev.withdrawals + 1 }));
    });
    socket.on('admin:ludo-result-request', (data) => {
      toast(`Ludo result submitted by ${data?.userName || 'a player'}`, { icon: '🎲', duration: 5000 });
    });
    return () => {
      socket.off('admin:wallet-request');
      socket.off('admin:withdrawal-request');
      socket.off('admin:ludo-result-request');
    };
  }, [socket]);

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Top Bar */}
      <header className="bg-primary-800 text-white px-4 py-3 sticky top-0 z-50 overflow-hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center min-w-0">
          <div className="flex items-center gap-2">
            <img src="/ludo.jpeg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            <h1 className="text-xl font-bold">Rushkro<span className="text-emerald-300">Ludo</span> <span className="text-white/50 text-sm font-normal">Admin</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <span>🎮</span>
              Play
            </Link>
            <span className="text-sm text-primary-200 hidden sm:inline">Welcome, {user?.name}</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 text-white/80 hover:text-white transition-colors"
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
