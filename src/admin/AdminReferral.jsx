import { useState, useEffect, useCallback } from 'react';
import { referralAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DatePickerModal from '../components/DatePickerModal';
import toast from 'react-hot-toast';

function toISODate(d) { return d.toISOString().slice(0, 10); }
function getToday() { return toISODate(new Date()); }

const AdminReferral = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';

  const [groups, setGroups] = useState([]);
  const [topEarners, setTopEarners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingStats, setPendingStats] = useState({ total: 0, count: 0 });
  const [redeemedStats, setRedeemedStats] = useState({ total: 0, count: 0 });

  const [openReferrer, setOpenReferrer] = useState(null);
  const [statusTab, setStatusTab] = useState('all'); // all | pending | redeemed | top
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState(null); // { id, currentAmount, referrerName }
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const applyQuickFilter = (key) => {
    setQuickFilter(key);
    if (key === 'all') { setStartDate(''); setEndDate(''); }
    else if (key === 'today') { const d = getToday(); setStartDate(d); setEndDate(d); }
    else if (key === 'yesterday') { const d = toISODate(new Date(Date.now() - 86400000)); setStartDate(d); setEndDate(d); }
    else if (key === '5days') { setStartDate(toISODate(new Date(Date.now() - 4 * 86400000))); setEndDate(getToday()); }
    setPage(1);
  };

  const handleDateApply = (s, e) => {
    setStartDate(s); setEndDate(e);
    setQuickFilter('custom'); setPage(1);
    setDatePickerOpen(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statusTab !== 'all' && statusTab !== 'top') params.status = statusTab;
      if (statusTab === 'top') params.view = 'top';

      const res = await referralAPI.getAdminReferrals(params);
      const d = res.data;

      if (statusTab === 'top') {
        setTopEarners(d.topEarners || []);
        setTotalCount(d.totalCount || 0);
        setTotalPages(d.totalPages || 1);
      } else {
        setGroups(d.groups || []);
        setTotalCommission(d.totalCommission || 0);
        setTotalCount(d.totalCount || 0);
        setTotalPages(d.totalPages || 1);
        setPendingStats(d.pendingStats || { total: 0, count: 0 });
        setRedeemedStats(d.redeemedStats || { total: 0, count: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, statusTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdjust = async () => {
    if (!adjustModal || adjusting) return;
    const newAmt = Number(adjustValue);
    if (isNaN(newAmt) || newAmt < 0) return toast.error('Invalid amount');
    setAdjusting(true);
    try {
      await referralAPI.adjustCommission(adjustModal.id, { commissionAmount: newAmt, note: adjustNote });
      toast.success('Commission adjusted');
      setAdjustModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setAdjusting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) +
      ' ' + dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending` },
    { key: 'redeemed', label: 'Redeemed' },
    { key: 'top', label: 'Top Earners' },
  ];

  const quickBtns = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '5days', label: 'Last 5D' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Referral Commissions</h1>
      <p className="text-sm text-gray-500 mb-4">2% commission on Ludo wins — pending until user redeems</p>

      {/* Status Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4 gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setStatusTab(t.key); setPage(1); setOpenReferrer(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${statusTab === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickBtns.map(b => (
          <button key={b.key} onClick={() => applyQuickFilter(b.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${quickFilter === b.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {b.label}
          </button>
        ))}
        <button onClick={() => setDatePickerOpen(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${quickFilter === 'custom' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {quickFilter === 'custom' ? `${startDate} → ${endDate}` : 'Custom Range'}
        </button>
      </div>

      {/* Summary Stats */}
      {statusTab !== 'top' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-gray-800">{totalCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Total Records</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-green-600">₹{totalCommission}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Total Commission</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 shadow-sm border border-amber-100 text-center">
            <p className="text-xl font-bold text-amber-600">₹{pendingStats.total}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Pending ({pendingStats.count})</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 shadow-sm border border-green-100 text-center">
            <p className="text-xl font-bold text-green-600">₹{redeemedStats.total}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Redeemed ({redeemedStats.count})</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : statusTab === 'top' ? (
        /* Top Earners View */
        <div className="space-y-3">
          {topEarners.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500">No data found</div>
          ) : topEarners.map((e, idx) => (
            <div key={e._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-primary-500'}`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{e.referrer?.name || '—'}</p>
                  <p className="text-xs text-gray-400">
                    Code: <span className="font-mono text-primary-600">{e.referrer?.referralCode || '—'}</span>
                    {' • '}{e.referrer?.phone || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₹{e.totalEarned?.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">{e.count} win{e.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <span className="text-amber-600 font-medium">Pending: ₹{e.pendingAmount?.toFixed(2)}</span>
                <span className="text-green-600 font-medium">Redeemed: ₹{e.redeemedAmount?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">No referral commissions found</div>
      ) : (
        /* Grouped accordion view */
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
                      <div className="flex gap-2 mt-0.5">
                        {g.pendingAmount > 0 && <span className="text-[10px] text-amber-600 font-medium">Pending: ₹{g.pendingAmount}</span>}
                        {g.redeemedAmount > 0 && <span className="text-[10px] text-green-600 font-medium">Redeemed: ₹{g.redeemedAmount}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-bold text-green-600 text-sm">+₹{g.totalEarned}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                    {g.commissions.map((c) => (
                      <div key={c._id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{c.referredUserId?.name || '—'}</span>
                            <span className="text-gray-400 text-xs ml-1">({c.referredUserId?.phone || ''})</span>
                            <span className="text-gray-500 ml-1">— Bet ₹{c.betAmount}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${c.status === 'redeemed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {c.status}
                            </span>
                            {c.status === 'redeemed' && c.redeemedAt && (
                              <span className="text-[10px] text-gray-400">Redeemed {formatDate(c.redeemedAt)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-green-600 font-semibold text-sm">+₹{c.commissionAmount} ({c.commissionPct}%)</p>
                          {isSuperAdmin && c.status === 'pending' && (
                            <button
                              onClick={() => { setAdjustModal({ id: c._id, currentAmount: c.commissionAmount, referrerName: g.referrer?.name }); setAdjustValue(String(c.commissionAmount)); setAdjustNote(''); }}
                              className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                            >
                              Adjust
                            </button>
                          )}
                        </div>
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

      {/* Adjust Commission Modal (super admin only) */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Adjust Commission</h3>
            <p className="text-sm text-gray-500 mb-4">
              For <strong>{adjustModal.referrerName}</strong> — current: ₹{adjustModal.currentAmount}
            </p>
            <div className="mb-3">
              <label className="block text-xs text-gray-600 font-medium mb-1">New Amount (₹)</label>
              <input
                type="number"
                value={adjustValue}
                onChange={e => setAdjustValue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="0"
                step="0.01"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-600 font-medium mb-1">Note (optional)</label>
              <input
                type="text"
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdjustModal(null)} disabled={adjusting} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm">Cancel</button>
              <button onClick={handleAdjust} disabled={adjusting} className="flex-1 bg-primary-700 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-60">
                {adjusting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReferral;
