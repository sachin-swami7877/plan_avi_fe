import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 1 Month' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [period]);

  const fetchStats = async () => {
    try {
      const params = {};
      if (period === 'custom' && customFrom && customTo) {
        params.from = customFrom;
        params.to = customTo;
      } else if (period !== 'all') {
        params.period = period;
      }
      const res = await adminAPI.getDashboard(params);
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: 'bg-blue-500', link: '/admin/users' },
    { label: 'Pending Deposits', value: stats?.pendingDeposits || 0, icon: '💰', color: 'bg-yellow-500', link: '/admin/money' },
    { label: 'Pending Withdrawals', value: stats?.pendingWithdrawals || 0, icon: '💸', color: 'bg-orange-500', link: '/admin/money' },
    { label: 'Total Bets', value: stats?.totalBets || 0, icon: '🎰', color: 'bg-primary-500', link: '/admin/bets' },
    { label: 'Total Wins', value: stats?.totalWins || 0, icon: '🏆', color: 'bg-green-500', link: '/admin/wins-bets' },
    { label: 'Total Bet Amount', value: `₹${stats?.totalBetAmount?.toFixed(2) || '0.00'}`, icon: '💵', color: 'bg-indigo-500' },
    { label: 'Total Win Amount', value: `₹${stats?.totalWinAmount?.toFixed(2) || '0.00'}`, icon: '💎', color: 'bg-purple-500' },
    {
      label: 'House Profit',
      value: `₹${((stats?.totalBetAmount || 0) - (stats?.totalWinAmount || 0)).toFixed(2)}`,
      icon: '🏠',
      color: 'bg-emerald-500'
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>

      {/* Period Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => { setPeriod(p.value); setLoading(true); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setPeriod('custom')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            period === 'custom'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Custom Range
        </button>
        {period !== 'all' && (
          <button
            onClick={() => { setPeriod('all'); setCustomFrom(''); setCustomTo(''); setLoading(true); }}
            className="px-4 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Custom Date Range */}
      {period === 'custom' && (
        <div className="flex gap-2 mb-4 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button
            onClick={() => { if (customFrom && customTo) { setLoading(true); fetchStats(); } }}
            disabled={!customFrom || !customTo}
            className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            onClick={() => card.link && navigate(card.link)}
            className={`bg-white rounded-xl p-4 shadow-sm ${card.link ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all active:scale-[0.98]' : ''}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                {card.icon}
              </div>
              <span className="text-sm text-gray-600">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Win Rate */}
      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Win Rate Analysis</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Current Win Rate</p>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-600 transition-all duration-500"
                style={{ 
                  width: `${stats?.totalBets > 0 
                    ? (stats.totalWins / stats.totalBets * 100).toFixed(1) 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-700">
              {stats?.totalBets > 0 
                ? (stats.totalWins / stats.totalBets * 100).toFixed(1) 
                : 0}%
            </p>
            <p className="text-xs text-gray-500">Target: 40%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
