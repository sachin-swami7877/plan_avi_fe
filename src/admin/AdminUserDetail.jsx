import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const TABS = [
  { key: 'wallet',  label: 'Wallet',   icon: '💰' },
  { key: 'aviator', label: 'Aviator',  icon: '✈️' },
  { key: 'ludo',    label: 'Ludo',     icon: '🎲' },
  { key: 'spinner', label: 'Spinner',  icon: '🎡' },
];

const AdminUserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('wallet');

  useEffect(() => {
    adminAPI.getUserDetail(id)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load user details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-12 text-red-500 font-medium">{error}</div>;
  }

  const { user, walletRequests, aviatorBets, ludoMatches, spinnerRecords } = data;

  // Summary stats
  const totalDeposited = walletRequests
    .filter(r => r.type === 'deposit' && r.status === 'approved')
    .reduce((s, r) => s + r.amount, 0);
  const totalWithdrawn = walletRequests
    .filter(r => r.type === 'withdrawal' && r.status === 'approved')
    .reduce((s, r) => s + r.amount, 0);
  const totalAviatorBet = aviatorBets.reduce((s, b) => s + b.amount, 0);
  const totalAviatorWon = aviatorBets
    .filter(b => b.status === 'won')
    .reduce((s, b) => s + (b.profit || 0), 0);
  const totalSpinWon = spinnerRecords.reduce((s, r) => s + r.winAmount, 0);
  const totalSpinCost = spinnerRecords.reduce((s, r) => s + r.spinCost, 0);
  const totalLudoWins = ludoMatches.filter(
    m => m.status === 'completed' && String(m.winnerId) === String(id)
  ).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Users
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-bold text-2xl">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">{user.name || '(no name)'}</h1>
              {user.isAdmin && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                user.status === 'active' ? 'bg-green-100 text-green-700' :
                user.status === 'blocked' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {user.status}
              </span>
            </div>
            {user.email && <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>}
            {user.phone && <p className="text-sm text-gray-600 mt-0.5">📱 {user.phone}</p>}
            {user.upiId && <p className="text-xs text-gray-400 mt-0.5">UPI ID: {user.upiId}</p>}
            {user.upiNumber && <p className="text-xs text-gray-400">UPI No: {user.upiNumber}</p>}
            <p className="text-xs text-gray-400 mt-1">Joined: {fmt(user.createdAt)}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Wallet Balance</p>
            <p className="font-bold text-emerald-600 text-lg">₹{user.walletBalance?.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Total Deposited</p>
            <p className="font-bold text-blue-600">₹{totalDeposited.toFixed(0)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Total Withdrawn</p>
            <p className="font-bold text-red-500">₹{totalWithdrawn.toFixed(0)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Aviator Bet Total</p>
            <p className="font-bold text-amber-600">₹{totalAviatorBet.toFixed(0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Aviator Won</p>
            <p className="font-bold text-purple-600">₹{totalAviatorWon.toFixed(0)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Ludo Wins</p>
            <p className="font-bold text-green-600">{totalLudoWins} match{totalLudoWins !== 1 ? 'es' : ''}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Spinner Won</p>
            <p className="font-bold text-orange-500">₹{totalSpinWon} / ₹{totalSpinCost} spent</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1 ${
              tab === t.key
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {t.key === 'wallet' ? walletRequests.length :
               t.key === 'aviator' ? aviatorBets.length :
               t.key === 'ludo' ? ludoMatches.length :
               spinnerRecords.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Wallet Tab ── */}
      {tab === 'wallet' && (
        <div className="space-y-2">
          {walletRequests.length === 0 ? (
            <EmptyState icon="💰" text="No wallet requests" />
          ) : walletRequests.map(r => (
            <div key={r._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    r.type === 'deposit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {r.type === 'deposit' ? '⬆ Deposit' : '⬇ Withdrawal'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    r.status === 'rejected' ? 'bg-red-50 text-red-500' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{fmt(r.createdAt)}</p>
                {r.utrNumber && <p className="text-xs text-gray-500 mt-0.5">UTR: {r.utrNumber}</p>}
              </div>
              <p className={`text-lg font-bold ${r.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>
                ₹{r.amount}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Aviator Tab ── */}
      {tab === 'aviator' && (
        <div className="space-y-2">
          {aviatorBets.length === 0 ? (
            <EmptyState icon="✈️" text="No Aviator bets" />
          ) : aviatorBets.map(b => (
            <div key={b._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    b.status === 'won' ? 'bg-green-100 text-green-700' :
                    b.status === 'lost' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {b.status}
                  </span>
                  {b.cashOutMultiplier && (
                    <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
                      {b.cashOutMultiplier}x
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{fmt(b.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800">₹{b.amount}</p>
                {b.status === 'won' && (
                  <p className="text-xs text-green-600 font-semibold">+₹{b.profit?.toFixed(2)}</p>
                )}
                {b.status === 'lost' && (
                  <p className="text-xs text-red-500 font-semibold">-₹{b.amount}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ludo Tab ── */}
      {tab === 'ludo' && (
        <div className="space-y-2">
          {ludoMatches.length === 0 ? (
            <EmptyState icon="🎲" text="No Ludo matches" />
          ) : ludoMatches.map(m => {
            const isWinner = m.winnerId && String(m.winnerId) === String(id);
            const opponent = m.players?.find(p => String(p.userId) !== String(id));
            const myEntry = m.players?.find(p => String(p.userId) === String(id));
            return (
              <div key={m._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'completed'
                        ? (isWinner ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')
                        : m.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-600'
                          : m.status === 'live'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-amber-100 text-amber-600'
                    }`}>
                      {m.status === 'completed'
                        ? (isWinner ? '🏆 Won' : '❌ Lost')
                        : m.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">₹{m.entryAmount}</span>
                    {myEntry?.amountPaid && myEntry.amountPaid !== m.entryAmount && (
                      <span className="text-xs text-gray-500">(paid ₹{myEntry.amountPaid})</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{fmt(m.createdAt)}</p>
                </div>
                {opponent && (
                  <p className="text-xs text-gray-600 mt-1">
                    vs <strong>{opponent.userName || 'Unknown'}</strong>
                  </p>
                )}
                {m.roomCode && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">Room: {m.roomCode}</p>
                )}
                {m.cancelReason && (
                  <p className="text-xs text-red-400 mt-0.5">Reason: {m.cancelReason}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Spinner Tab ── */}
      {tab === 'spinner' && (
        <div className="space-y-2">
          {spinnerRecords.length === 0 ? (
            <EmptyState icon="🎡" text="No Spinner records" />
          ) : spinnerRecords.map(r => (
            <div key={r._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    r.winAmount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {r.outcome === 'thank_you' ? 'No Win' : `🎉 Won ₹${r.winAmount}`}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{fmt(r.createdAt)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Balance after: ₹{r.balanceAfter?.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Cost: ₹{r.spinCost}</p>
                {r.winAmount > 0
                  ? <p className="font-bold text-green-600 text-lg">+₹{r.winAmount}</p>
                  : <p className="font-bold text-gray-400">—</p>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ icon, text }) => (
  <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-50">
    <p className="text-4xl mb-2">{icon}</p>
    <p className="text-gray-400 text-sm">{text}</p>
  </div>
);

export default AdminUserDetail;
