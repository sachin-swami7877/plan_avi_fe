import { Link, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const navItems = [
  {
    path: '/wallet',
    label: 'Money',
    matchPaths: ['/wallet'],
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
  {
    path: '/ludo',
    label: 'Ludo',
    matchPaths: ['/ludo'],
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6.5" cy="6.5" r="1" fill={active ? 'white' : 'currentColor'} stroke="none" />
        <circle cx="17.5" cy="6.5" r="1" fill={active ? 'white' : 'currentColor'} stroke="none" />
        <circle cx="6.5" cy="17.5" r="1" fill={active ? 'white' : 'currentColor'} stroke="none" />
        <circle cx="17.5" cy="17.5" r="1" fill={active ? 'white' : 'currentColor'} stroke="none" />
      </svg>
    ),
  },
  // Home is handled separately (floating center button)
  {
    path: '/referral',
    label: 'Refer',
    matchPaths: ['/referral'],
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    path: '/notifications',
    label: 'Alerts',
    matchPaths: ['/notifications'],
    badge: true,
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Profile',
    matchPaths: ['/profile'],
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
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

  const isHomePage = location.pathname === '/dashboard' || location.pathname === '/aviator' || location.pathname === '/spinner';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 relative">
        {/* Left side items */}
        {navItems.slice(0, 2).map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-2 px-2 min-w-[48px]"
            >
              <div className="relative">
                {item.icon(active)}
                {item.badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Center floating Home button */}
        <Link
          to="/dashboard"
          className="relative -mt-6 flex flex-col items-center"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isHomePage
              ? 'bg-blue-600 shadow-blue-300/50'
              : 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-blue-200/50'
          }`}>
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </div>
          <span className={`text-[10px] mt-0.5 font-medium ${isHomePage ? 'text-blue-600' : 'text-gray-400'}`}>
            Home
          </span>
        </Link>

        {/* Right side items */}
        {navItems.slice(2).map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-2 px-2 min-w-[48px]"
            >
              <div className="relative">
                {item.icon(active)}
                {item.badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
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
