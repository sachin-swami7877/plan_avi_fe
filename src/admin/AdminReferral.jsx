import { useState, useEffect, useCallback } from 'react';
import { referralAPI } from '../services/api';
import DatePickerModal from '../components/DatePickerModal';

function toISODate(d) { return d.toISOString().slice(0, 10); }
function getToday() { return toISODate(new Date()); }

const AdminReferral = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openReferrer, setOpenReferrer] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState('today');
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());

  const applyQuickFilter = (key) => {
    setQuickFilter(key);
    const now = new Date();
    let s, e;
    if (key === 'today') {
      s = e = getToday();
    } else if (key === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      s = e = toISODate(d);
    } else if (key === '5days') {
      const d = new Date(); d.setDate(d.getDate() - 4);
      s = toISODate(d); e = getToday();
    }
    setStartDate(s); setEndDate(e); setPage(1);
  };

  const handleDateApply = (s, e) => {
    setStartDate(s); setEndDate(e);
    setQuickFilter('custom'); setPage(1);
    setDatePickerOpen(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await referralAPI.getAdminReferrals({ startDate, endDate, page, limit: 50 });
      setGroups(res.data.groups || []);
      setTotalCommission(res.data.totalCommission || 0);
      setTotalCount(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) +
      ' ' + dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const quickBtns = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '5days', label: 'Last 5 Days' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Referral Commissions</h1>
      <p className="text-sm text-gray-500 mb-5">2% commission paid to referrers on their friends' Ludo wins</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickBtns.map(b => (
          <button key={b.key} onClick={() => applyQuickFilter(b.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${quickFilter === b.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {b.label}
          </button>
        ))}
        <button onClick={() => setDatePickerOpen(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${quickFilter === 'custom' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {quickFilter === 'custom' ? `${startDate} → ${endDate}` : 'Custom'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Commissions</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600">₹{totalCommission}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Paid Out</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">No referral commissions found</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, idx) => {
            const uid = g.referrer?._id?.toString() || idx;
            const isOpen = openReferrer === uid;
            return (
              <div key={uid} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button onClick={() => setOpenReferrer(isOpen ? null : uid)}
                  className="w-full flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                      {g.referrer?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-sm">{g.referrer?.name || '—'}</p>
                      <p className="text-xs text-gray-400">
                        Code: <span className="font-mono text-primary-600">{g.referrer?.referralCode || '—'}</span>
                        {' • '}{g.commissions.length} record{g.commissions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-sm">+₹{g.totalEarned}</p>
                    <svg className={`w-4 h-4 text-gray-400 ml-auto mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                    {g.commissions.map((c) => (
                      <div key={c._id} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{c.referredUserId?.name || '—'}</span> — Bet ₹{c.betAmount}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                        </div>
                        <p className="text-green-600 font-semibold text-sm">+₹{c.commissionAmount} ({c.commissionPct}%)</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30">Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30">Next</button>
        </div>
      )}

      <DatePickerModal open={datePickerOpen} onClose={() => setDatePickerOpen(false)} onApply={handleDateApply} initialStart={startDate} initialEnd={endDate} />
    </div>
  );
};

export default AdminReferral;
