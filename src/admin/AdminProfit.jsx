import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import DatePickerModal from '../components/DatePickerModal';

function toISODate(d) { return d.toISOString().slice(0, 10); }
function getToday() { return toISODate(new Date()); }

export default function AdminProfit() {
  const [tab, setTab] = useState('ludo'); // 'ludo' | 'aviator'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProfit, setTotalProfit] = useState(0);
  const [total, setTotal] = useState(0);

  // Default: today
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Quick filter tabs
  const [quickFilter, setQuickFilter] = useState('today');

  const applyQuickFilter = (key) => {
    setQuickFilter(key);
    const now = new Date();
    let s, e;
    if (key === 'today') {
      s = e = getToday();
    } else if (key === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      s = e = toISODate(d);
    } else if (key === '7days') {
      const d = new Date(); d.setDate(d.getDate() - 6);
      s = toISODate(d); e = getToday();
    } else if (key === '1month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      s = toISODate(d); e = getToday();
    }
    setStartDate(s);
    setEndDate(e);
    setPage(1);
  };

  const handleDateApply = (s, e) => {
    setStartDate(s);
    setEndDate(e);
    setQuickFilter('custom');
    setPage(1);
    setDatePickerOpen(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = tab === 'ludo'
        ? await adminAPI.getLudoProfit(params)
        : await adminAPI.getAviatorProfit(params);

      setRows(res.data.rows || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalProfit(res.data.totalProfit || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getDateLabel = () => {
    if (quickFilter === 'today') return 'Today';
    if (quickFilter === 'yesterday') return 'Yesterday';
    if (quickFilter === '7days') return 'Last 7 Days';
    if (quickFilter === '1month') return 'Last Month';
    if (startDate && endDate && startDate !== endDate) {
      return `${new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(endDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    }
    if (startDate) return new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return 'Select Date';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Admin Profit</h1>
        <div className={`text-lg font-bold ${(totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Total: {(totalProfit || 0) >= 0 ? '+' : ''}{(totalProfit || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
        </div>
      </div>

      {/* Tab: Ludo / Aviator */}
      <div className="flex gap-2">
        {['ludo', 'aviator'].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'ludo' ? 'Ludo Profit' : 'Aviator Profit'}
          </button>
        ))}
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { key: 'today', label: 'Today' },
          { key: 'yesterday', label: 'Yesterday' },
          { key: '7days', label: 'Last 7 Days' },
          { key: '1month', label: '1 Month' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => applyQuickFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              quickFilter === f.key ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setDatePickerOpen(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            quickFilter === 'custom' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {quickFilter === 'custom' ? getDateLabel() : 'Custom'}
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{total} records found</span>
        <span className="text-gray-500">{getDateLabel()}</span>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No data for this period</div>
      ) : tab === 'ludo' ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    +{r.commission.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                </div>
                <span className="text-xs text-gray-500">Entry: {r.entryAmount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-green-600 font-semibold">{r.winnerName}</span>
                  <span className="text-gray-400 mx-1">vs</span>
                  <span className="text-red-500">{r.loserName}</span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <span>Pool: {r.pool}</span>
                  <span className="mx-1">|</span>
                  <span>Prize: {r.prize}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    (r.profit || 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {(r.profit || 0) >= 0 ? '+' : ''}{(r.profit || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {r.crashMultiplier}x
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Round: {r.roundId?.slice(-6) || '—'}</span>
                <div className="text-xs">
                  <span>Bets: {r.totalBet}</span>
                  <span className="mx-1">|</span>
                  <span>Wins: {r.totalWin}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <DatePickerModal
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onApply={handleDateApply}
        initialStartDate={startDate}
        initialEndDate={endDate}
        rangeMode
      />
    </div>
  );
}
