import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { walletAPI, gameAPI, authAPI, settingsAPI, spinnerAPI, ludoAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalBets: 0, totalWins: 0, todayEarnings: 0, spinnerEarnings: 0, ludoEarnings: 0 });
  const [support, setSupport] = useState({ supportPhone: null, supportWhatsApp: null });
  const whatsAppNumber = support.supportWhatsApp || support.supportPhone;
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', upiId: '', upiNumber: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  useEffect(() => {
    fetchStats();
    fetchSupport();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await gameAPI.getHistory();
      const bets = res.data || [];
      const today = new Date().toDateString();
      const todayBets = bets.filter(b => new Date(b.createdAt).toDateString() === today);
      const todayWins = todayBets.filter(b => b.status === 'won');
      const todayEarnings = todayWins.reduce((sum, b) => sum + (b.profit || 0), 0);
      
      // Fetch spinner earnings for today (profit = winAmount - 50 per spin)
      let spinnerEarnings = 0;
      try {
        const spinnerRes = await spinnerAPI.getHistory();
        const spinnerRecords = (spinnerRes.data?.records || spinnerRes.data) || [];
        const todaySpinnerRecords = spinnerRecords.filter(s => new Date(s.createdAt).toDateString() === today);
        spinnerEarnings = todaySpinnerRecords.reduce((sum, s) => sum + ((s.winAmount || 0) - 50), 0);
      } catch (err) {
        // Silent fail for spinner earnings
      }

      // Fetch ludo earnings for today (profit = prize - entryAmount for wins, -entryAmount for losses)
      let ludoEarnings = 0;
      try {
        const ludoRes = await ludoAPI.getMyMatches({ status: 'history' });
        const ludoMatches = Array.isArray(ludoRes.data) ? ludoRes.data : [];
        const todayLudoMatches = ludoMatches.filter(m => new Date(m.createdAt).toDateString() === today);
        ludoEarnings = todayLudoMatches.reduce((sum, m) => {
          if (m.status === 'cancelled') return sum;
          if (!m.winnerId) return sum;
          const isWinner = m.winnerId === user?._id;
          if (isWinner) {
            const prize = Math.round(2 * m.entryAmount * 0.9);
            return sum + (prize - m.entryAmount);
          }
          return sum - m.entryAmount;
        }, 0);
      } catch (err) {
        // Silent fail for ludo earnings
      }

      setStats({
        totalBets: bets.length,
        totalWins: bets.filter(b => b.status === 'won').length,
        todayEarnings: todayEarnings + spinnerEarnings + ludoEarnings,
        spinnerEarnings,
        ludoEarnings,
      });
    } catch (error) {
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
      if (!isNetworkError && error.response?.status !== 401) {
        console.error('Failed to fetch stats:', error.message);
      }
    }
  };

  const fetchSupport = async () => {
    try {
      const res = await settingsAPI.getSupport();
      console.log('Support API response:', res.data);
      setSupport(res.data || { supportPhone: null, supportWhatsApp: null });
      // Debug: log support data
      if (res.data?.supportWhatsApp) {
        console.log('WhatsApp number found:', res.data.supportWhatsApp);
      } else {
        console.warn('No WhatsApp number configured in settings');
      }
    } catch (err) { 
      console.error('Failed to fetch support:', err);
      setSupport({ supportPhone: null, supportWhatsApp: null });
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const openEdit = () => {
    setEditForm({
      name: user?.name || '',
      phone: user?.phone || '',
      upiId: user?.upiId || '',
      upiNumber: user?.upiNumber || '',
    });
    setEditMsg('');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditMsg('');
    try {
      await authAPI.updateProfile(editForm);
      await refreshUser();
      setEditMsg('Profile updated!');
      setTimeout(() => setEditOpen(false), 800);
    } catch (err) {
      setEditMsg(err.response?.data?.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const commonFunctions = [
    { icon: '📋', label: 'History', path: '/history' },
    { icon: '💰', label: 'Deposit', path: '/wallet' },
    { icon: '💸', label: 'Withdraw', path: '/wallet' },
    { icon: '🎧', label: 'Support', path: '/support' },
  ];

  const otherFunctions = [
    { icon: '🎁', label: 'Bonus', path: '/bonus' },
    { icon: '🎰', label: 'Lucky', path: '/spinner' },
    { icon: '📱', label: 'Download', path: '#', isDownload: true },
    { icon: '📜', label: 'T&C', path: '/terms' },
  ];

  const gameCards = [
    {
      id: 'ludo',
      title: 'Ludo',
      subtitle: 'Room code • Bet & play',
      path: '/ludo',
      gradient: 'from-green-500 to-emerald-600',
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
      gradient: 'from-green-500 to-green-600',
      image: null,
      isExternal: true,
      fallbackIcon: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-[200px] overflow-x-hidden relative">
      <Header />

      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        {/* User Info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 truncate">{user?.name || 'User'}</h2>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
          <button onClick={openEdit} className="bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            Edit
          </button>
        </div>

        {/* Games - Show First */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Games</h3>
          <div className="grid grid-cols-2 gap-4">
            {gameCards.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  if (game.isExternal) {
                    window.open(whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}` : 'https://wa.me/', '_blank');
                  } else {
                    navigate(game.path);
                  }
                }}
                className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex flex-col"
              >
                <div className={`h-24 bg-gradient-to-br ${game.gradient} text-white relative overflow-hidden`}>
                  {game.image ? (
                    <>
                      <img
                        src={game.image}
                        alt={game.title}
                        className="absolute inset-0 w-full h-full "
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const el = e.target.nextElementSibling;
                          if (el) el.style.display = 'flex';
                        }}
                      />
                      <div className="absolute inset-0 hidden items-center justify-center" style={{ display: 'none' }}>
                        <div className="w-14 h-14 flex-shrink-0">{game.fallbackIcon}</div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="w-14 h-14 flex-shrink-0">{game.fallbackIcon}</div>
                    </div>
                  )}
                </div>
                <div className="p-3 text-left">
                  <p className="font-bold text-gray-800">{game.title}</p>
                  <p className="text-xs text-gray-500">{game.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-5 mb-4 text-white overflow-hidden">
          <div className="flex justify-between items-start gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm opacity-80">Wallet Balance</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">₹{user?.walletBalance?.toFixed(2) || '0.00'}</p>
              <p className="text-sm opacity-80 mt-1">Today's Earnings: ₹{stats.todayEarnings.toFixed(2)}</p>
              <p className="text-xs opacity-70 mt-0.5">(Aviator: ₹{(stats.todayEarnings - stats.spinnerEarnings - stats.ludoEarnings).toFixed(2)} | Spinner: ₹{stats.spinnerEarnings.toFixed(2)} | Ludo: ₹{stats.ludoEarnings.toFixed(2)})</p>
            </div>
            <button onClick={() => navigate('/wallet')} className="flex-shrink-0 bg-white bg-opacity-20 px-4 py-2 rounded-lg text-sm font-medium">Detail</button>
          </div>
        </div>

        {/* Withdrawal Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-4 text-white overflow-hidden">
          <div className="flex justify-between items-center gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">Withdrawal</h3>
              <div className="flex gap-4 sm:gap-6 mt-2">
                <div><p className="text-xl sm:text-2xl font-bold">0</p><p className="text-xs opacity-80">In transaction</p></div>
                <div><p className="text-xl sm:text-2xl font-bold">0</p><p className="text-xs opacity-80">Today withdraw</p></div>
              </div>
            </div>
            <button onClick={() => navigate('/wallet')} className="flex-shrink-0 bg-white bg-opacity-20 px-4 py-2 rounded-lg text-sm font-medium">Manage</button>
          </div>
        </div>

        {/* Deposit Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 mb-6 text-white">
          <h3 className="font-bold mb-2">Deposit (Add Money)</h3>
          <div className="flex gap-6">
            <div><p className="text-2xl font-bold">{stats.totalBets}</p><p className="text-xs opacity-80">Total Bets</p></div>
            <div><p className="text-2xl font-bold">{stats.totalWins}</p><p className="text-xs opacity-80">Total Wins</p></div>
          </div>
        </div>

        {/* Common Functions */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Common Functions</h3>
          <div className="grid grid-cols-4 gap-3">
            {commonFunctions.map((func, i) => (
              <button key={i} onClick={() => func.path !== '#' && navigate(func.path)} className="bg-white rounded-xl p-4 flex flex-col items-center shadow-sm">
                <span className="text-2xl mb-2">{func.icon}</span>
                <span className="text-xs text-gray-600">{func.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Other Functions */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Other Functions</h3>
          <div className="grid grid-cols-4 gap-3">
            {otherFunctions.map((func, i) => (
              <button 
                key={i} 
                onClick={() => {
                  if (func.isDownload) {
                    // Trigger browser's install prompt if available
                    if (window.deferredPrompt) {
                      window.deferredPrompt.prompt();
                      window.deferredPrompt.userChoice.then((choiceResult) => {
                        window.deferredPrompt = null;
                      });
                    } else {
                      // Fallback: show instructions or open app store
                      alert('To install this app:\n\nOn Android: Tap the menu (⋮) and select "Add to Home screen"\n\nOn iOS: Tap the Share button and select "Add to Home Screen"');
                    }
                  } else if (func.path !== '#') {
                    navigate(func.path);
                  }
                }} 
                className="bg-white rounded-xl p-4 flex flex-col items-center shadow-sm"
              >
                <span className="text-2xl mb-2">{func.icon}</span>
                <span className="text-xs text-gray-600">{func.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp Support */}
        {whatsAppNumber ? (
          <div className="mb-6">
            <a
              href={`https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Contact Support on WhatsApp
            </a>
          </div>
        ) : null}

        {/* Share & Invite */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Share & Invite</h3>
          <div className="flex gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Play Ludo, Aviator & Lucky Spinner! Win real cash with instant UPI withdrawals. Join now: ' + window.location.origin)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Share on WhatsApp
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.origin); alert('Link copied!'); }}
              className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copy Link
            </button>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full bg-red-500 text-white py-4 rounded-xl font-medium">Logout</button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          {editMsg && <div className={`mb-3 p-2 rounded text-sm ${editMsg.includes('updated') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{editMsg}</div>}
          <TextField fullWidth label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="UPI ID" value={editForm.upiId} onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="UPI Number" value={editForm.upiNumber} onChange={(e) => setEditForm({ ...editForm, upiNumber: e.target.value })} sx={{ mb: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editLoading}>{editLoading ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Floating WhatsApp Icon - Absolute position above navbar */}
      {whatsAppNumber && (
        <a
          href={`https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-4 z-[9999] w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:shadow-green-500/50 hover:scale-110 transition-all cursor-pointer"
          style={{
            bottom: '200px',
            animation: 'bounce 2s infinite',
            boxShadow: '0 6px 25px rgba(37, 211, 102, 0.5)',
          }}
          aria-label="Contact Support on WhatsApp"
        >
          <svg className="w-9 h-9" fill="white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      <Navbar />
    </div>
  );
};

export default Profile;
