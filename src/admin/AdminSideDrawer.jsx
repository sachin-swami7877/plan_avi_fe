import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IoClose } from 'react-icons/io5';
import { HiOutlineCog6Tooth, HiOutlineGift } from 'react-icons/hi2';
import { IoLogOutOutline, IoGridOutline } from 'react-icons/io5';
import { PiSpinnerBallFill } from 'react-icons/pi';

const AdminSideDrawer = ({ open, onClose }) => {
  const { user, logout, isAdmin, isSubAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  if (!open) return null;

  const allLinks = [
    { to: '/admin/spinner-records', label: 'Spinner Records', icon: PiSpinnerBallFill, subAdmin: false },
    { to: '/admin/bonus-records', label: 'Bonus Records', icon: HiOutlineGift, subAdmin: false },
    { to: '/admin/ludo', label: 'Ludo', icon: IoGridOutline, subAdmin: true },
    { to: '/admin/settings', label: 'Settings', icon: HiOutlineCog6Tooth, subAdmin: false },
  ];

  // Filter links based on role
  const links = isSubAdmin && !isAdmin
    ? allLinks.filter(link => link.subAdmin)
    : allLinks;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-[70] h-full w-72 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slideInRight"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-primary-800 text-white">
          <div>
            <p className="font-semibold text-base">{user?.name || 'Admin'}</p>
            <p className="text-primary-200 text-xs">{user?.email || ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-primary-100 text-primary-800 font-medium'
                    : 'text-gray-700 hover:text-primary-700 hover:bg-primary-50'
                }`}
              >
                <item.icon className="text-lg" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-6 pt-2 border-t border-gray-200">
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <IoLogOutOutline className="text-lg" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideInRight {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  );
};

export default AdminSideDrawer;
