import { Link } from 'react-router-dom';
import { IoClose, IoDocumentTextOutline } from 'react-icons/io5';
import { HiOutlineCog6Tooth } from 'react-icons/hi2';
import { IoNotificationsOutline, IoLogOutOutline, IoGameControllerOutline } from 'react-icons/io5';
import { PiSpinnerBallFill, PiDiceFiveFill } from 'react-icons/pi';
import { useAuth } from '../context/AuthContext';

const SideDrawer = ({ open, onClose }) => {
  const { user, logout } = useAuth();

  if (!open) return null;

  const links = [
    { to: '/history', label: 'Game History', icon: IoGameControllerOutline },
    { to: '/spinner-records', label: 'Spinner Records', icon: PiSpinnerBallFill },
    { to: '/notifications', label: 'Notifications', icon: IoNotificationsOutline },
    { to: '/terms', label: 'Terms & Conditions', icon: IoDocumentTextOutline },
    { to: '/profile', label: 'Profile Settings', icon: HiOutlineCog6Tooth },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-[70] h-full w-72 bg-[#13131b] shadow-2xl border-l border-white/10 flex flex-col animate-slideInRight"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-white font-semibold text-base">{user?.name || 'User'}</p>
            <p className="text-white/50 text-xs">{user?.email || ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <item.icon className="text-lg" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-6 pt-2 border-t border-white/10">
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
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

export default SideDrawer;
