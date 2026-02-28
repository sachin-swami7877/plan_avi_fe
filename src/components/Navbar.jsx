import { Link, useLocation } from 'react-router-dom';
import { IoGameController, IoGameControllerOutline } from 'react-icons/io5';
import { HiCurrencyRupee, HiOutlineCurrencyRupee } from 'react-icons/hi2';
import { IoTimeSharp, IoTimeOutline } from 'react-icons/io5';
import { IoPerson, IoPersonOutline } from 'react-icons/io5';
import { IoNotifications, IoNotificationsOutline } from 'react-icons/io5';
import { useSocket } from '../context/SocketContext';

const navItems = [
  {
    path: '/dashboard',
    label: 'Play',
    icon: IoGameControllerOutline,
    activeIcon: IoGameController,
    matchPaths: ['/dashboard', '/aviator', '/ludo', '/spinner'],
  },
  {
    path: '/wallet',
    label: 'Money',
    icon: HiOutlineCurrencyRupee,
    activeIcon: HiCurrencyRupee,
  },
  {
    path: '/notifications',
    label: 'Alerts',
    icon: IoNotificationsOutline,
    activeIcon: IoNotifications,
    badge: true,
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: IoPersonOutline,
    activeIcon: IoPerson,
  },
  {
    path: '/history',
    label: 'History',
    icon: IoTimeOutline,
    activeIcon: IoTimeSharp,
  },
];

const Navbar = () => {
  const location = useLocation();
  let unreadCount = 0;
  try {
    const ctx = useSocket();
    unreadCount = ctx?.unreadNotifCount || 0;
  } catch { /* Navbar may render outside SocketProvider */ }

  const isActive = (item) =>
    item.matchPaths
      ? item.matchPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
      : location.pathname === item.path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d12] border-t border-white/10 overflow-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = active ? item.activeIcon : item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-16 py-1.5 rounded-xl transition-all duration-200"
            >
              {active && (
                <span className="absolute -top-1.5 w-8 h-1 rounded-full bg-emerald-400" />
              )}
              <div className="relative">
                <Icon
                  className={`text-[22px] transition-colors duration-200 ${
                    active ? 'text-emerald-400' : 'text-white/50'
                  }`}
                />
                {item.badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 font-medium transition-colors duration-200 ${
                  active ? 'text-emerald-400' : 'text-white/40'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
