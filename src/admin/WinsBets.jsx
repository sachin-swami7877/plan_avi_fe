import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { IoChevronBack, IoChevronForward, IoCalendarOutline, IoFunnelOutline, IoCloseCircle } from 'react-icons/io5';

const PER_PAGE = 20;

const todayStr = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

const WinsBets = () => {
  // Data
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [totalBetAmount, setTotalBetAmount] = useState(0);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // User list for dropdown
  const [users, setUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  // Active filter label for quick reference
  const hasFilters = startDate || endDate || selectedUserId || minAmount || maxAmount;

  // Fetch users list once (for dropdown)
  useEffect(() => {
    if (usersLoaded) return;
    const fetchUsers = async () => {
      try {
        const res = await adminAPI.getUsers();
        const list = (Array.isArray(res.data) ? res.data : res.data?.data || [])
          .filter((u) => !u.isAdmin)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setUsers(list);
      } catch {
        /* silent */
      } finally {
        setUsersLoaded(true);
      }
    };
    fetchUsers();
  }, [usersLoaded]);

  const fetchBets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PER_PAGE };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedUserId) params.userId = selectedUserId;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;

      const res = await adminAPI.getWinningBets(params);
      const d = res.data;
      setBets(Array.isArray(d.data) ? d.data : []);
      setTotalPages(d.totalPages || 1);
      setTotalCount(d.totalCount || 0);
      setTotalWinnings(d.totalWinnings || 0);
      setTotalBetAmount(d.totalBetAmount || 0);
    } catch (error) {
      console.error('Failed to fetch winning bets:', error);
      setBets([]);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, selectedUserId, minAmount, maxAmount]);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // Quick filter: Today
  const handleToday = () => {
    const today = todayStr();
    setStartDate(today);
    setEndDate(today);
    setPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUserId('');
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
  };

  // Apply button (just resets page)
  const handleApply = () => {
    setPage(1);
    setShowFilters(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Winning Bets</h1>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">Total Winnings Paid{hasFilters ? ' (filtered)' : ''}</p>
            <p className="text-3xl font-bold">₹{totalWinnings.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Wins / Bet Total</p>
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-xs opacity-70">₹{totalBetAmount.toFixed(2)} wagered</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Today button */}
          <button
            type="button"
            onClick={handleToday}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              startDate === todayStr() && endDate === todayStr()
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <IoCalendarOutline className="text-base" />
            Today
          </button>

          {/* Toggle full filter panel */}
          <button
            type="button"
            onClick={() => setShowFilters((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <IoFunnelOutline className="text-base" />
            Filters
            {hasFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-red-500 inline-block" />
            )}
          </button>

          {/* Clear */}
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all"
            >
              <IoCloseCircle className="text-base" />
              Clear
            </button>
          )}

          {/* Active filter tags */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                  {startDate === endDate ? startDate : `${startDate || '…'} → ${endDate || '…'}`}
                </span>
              )}
              {selectedUserId && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                  User: {users.find((u) => u._id === selectedUserId)?.name || selectedUserId.slice(-6)}
                </span>
              )}
              {(minAmount || maxAmount) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                  ₹{minAmount || '0'} – ₹{maxAmount || '∞'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* User dropdown */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name || 'Unnamed'} — {u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Bet Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Bet Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Apply button */}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : bets.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          {hasFilters ? 'No winning bets match your filters' : 'No winning bets yet'}
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <div key={bet._id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {bet.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{bet.userId?.name || 'Unknown'}</h3>
                      <p className="text-xs text-gray-500">{bet.userId?.email} · {bet.userId?.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">+₹{bet.profit?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Bet Amount</p>
                    <p className="font-bold text-lg">₹{bet.amount}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Cash Out</p>
                    <p className="font-bold text-lg text-green-600">{bet.cashOutMultiplier}x</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Crashed At</p>
                    <p className="font-bold text-lg text-red-600">{bet.gameRoundId?.crashMultiplier}x</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Round: {bet.gameRoundId?.roundId || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(bet.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-white rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-all"
            >
              <IoChevronBack /> Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    p === page
                      ? 'bg-green-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-all"
            >
              Next <IoChevronForward />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WinsBets;
