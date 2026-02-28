import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import DatePickerModal from '../components/DatePickerModal';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

const PER_PAGE = 25;

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function SpinnerRecords() {
  const [records, setRecords] = useState([]);
  const [profit, setProfit] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);
  const [loading, setLoading] = useState(false);

  // Date range
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [username, setUsername] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PER_PAGE };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (!startDate && !endDate) params.all = true;
      if (username.trim()) params.username = username.trim();
      const res = await adminAPI.getSpinnerRecords(params);
      setRecords(res.data.records || []);
      setProfit(res.data.profit ?? 0);
      setTotalSpins(res.data.totalSpins ?? 0);
      setTotalCost(res.data.totalCost ?? 0);
      setTotalPayout(res.data.totalPayout ?? 0);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error(err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, username, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDateApply = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
    setDatePickerOpen(false);
  };

  const getRangeLabel = () => {
    if (!startDate && !endDate) return 'All Records';
    if (startDate === getToday() && endDate === getToday()) return "Today's Records";
    if (startDate && endDate && startDate !== endDate) {
      return `${new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(endDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (startDate) {
      return new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'Select date range';
  };

  const formatDateTime = (iso) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Spinner Records</h1>
        <span className="text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
          {getRangeLabel()}
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">Date Range</label>
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <span>{getRangeLabel()}</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">Filter by user name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setPage(1); }}
              placeholder="Search by name..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => { setStartDate(null); setEndDate(null); setPage(1); }}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
            >
              Show All
            </button>
          </div>
        </div>
      </div>

      <DatePickerModal
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onApply={handleDateApply}
        initialStartDate={startDate}
        initialEndDate={endDate}
        rangeMode={true}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Total spins</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{totalSpins}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Total cost</p>
          <p className="text-xl font-bold text-gray-800 mt-1">₹{totalCost}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Total payout</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">₹{totalPayout}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Admin profit</p>
          <p className={`text-xl font-bold mt-1 ${profit >= 0 ? 'text-violet-600' : 'text-red-600'}`}>₹{profit}</p>
        </div>
      </div>

      {/* Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No spinner records found.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '400px' }}>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase bg-gray-50">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Outcome</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Win</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-800 font-medium">{r.userId?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{r.userId?.email ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={r.outcome === 'thank_you' ? 'text-gray-500' : 'text-emerald-600'}>
                          {r.outcome === 'thank_you' ? 'Thank you' : `₹${r.winAmount}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{r.winAmount > 0 ? `+₹${r.winAmount}` : '—'}</td>
                      <td className="py-3 px-4 text-gray-500 text-sm">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex-1 overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: 'calc(100vh - 550px)', minHeight: '300px' }}>
              {records.map((r) => (
                <div key={r._id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{r.userId?.name ?? '—'}</p>
                      <p className="text-sm text-gray-500">{r.userId?.email ?? '—'}</p>
                    </div>
                    <span className={r.winAmount > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}>
                      {r.winAmount > 0 ? `+₹${r.winAmount}` : 'Thank you'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(r.createdAt)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination - Fixed at bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-500">{totalCount} total records</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                <IoChevronBack /> Prev
              </button>
              <span className="text-sm text-gray-500">{page}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next <IoChevronForward />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
