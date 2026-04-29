import { useState, useEffect, useCallback } from 'react';
import { referralAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DatePickerModal from '../components/DatePickerModal';
import toast from 'react-hot-toast';

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function getToday() { return toISODate(new Date()); }

/* ── Shared search input ── */
const SearchInput = ({ value, onChange, placeholder }) => (
  <div className="relative mb-4">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
    />
    {value && (
      <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    )}
  </div>
);

/* ══════════════════════════════════════════════════════
   TAB 1 — Commission Records (existing)
══════════════════════════════════════════════════════ */
const CommissionsTab = ({ isSuperAdmin }) => {
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
  const [statusTab, setStatusTab] = useState('all');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState(null);
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

  // Client-side search filter on groups
  const filteredGroups = search.trim()
    ? groups.filter(g => {
        const q = search.toLowerCase();
        return (
          g.referrer?.name?.toLowerCase().includes(q) ||
          g.referrer?.phone?.includes(q) ||
          g.referrer?.referralCode?.toLowerCase().includes(q)
        );
      })
    : groups;

  const subTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
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
      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Search by referrer name, phone or code…" />

      {/* Sub-tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4 gap-1">
        {subTabs.map(t => (
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
                  <p className="text-xs text-gray-400">Code: <span className="font-mono text-primary-600">{e.referrer?.referralCode || '—'}</span>{' • '}{e.referrer?.phone || ''}</p>
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
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          {search ? 'No results match your search' : 'No referral commissions found'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((g, idx) => {
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
                    <p className="font-bold text-green-600 text-sm">+₹{g.totalEarned}</p>
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
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-green-600 font-semibold text-sm">+₹{c.commissionAmount} ({c.commissionPct}%)</p>
                          {isSuperAdmin && c.status === 'pending' && (
                            <button
                              onClick={() => { setAdjustModal({ id: c._id, currentAmount: c.commissionAmount, referrerName: g.referrer?.name }); setAdjustValue(String(c.commissionAmount)); setAdjustNote(''); }}
                              className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100"
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
      {!search && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30">Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30">Next</button>
        </div>
      )}

      <DatePickerModal open={datePickerOpen} onClose={() => setDatePickerOpen(false)} onApply={(s, e) => { setStartDate(s); setEndDate(e); setQuickFilter('custom'); setPage(1); setDatePickerOpen(false); }} initialStart={startDate} initialEnd={endDate} />

      {/* Adjust Commission Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Adjust Commission</h3>
            <p className="text-sm text-gray-500 mb-4">For <strong>{adjustModal.referrerName}</strong> — current: ₹{adjustModal.currentAmount}</p>
            <div className="mb-3">
              <label className="block text-xs text-gray-600 font-medium mb-1">New Amount (₹)</label>
              <input type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" min="0" step="0.01" />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-600 font-medium mb-1">Note (optional)</label>
              <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Reason..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
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

/* ══════════════════════════════════════════════════════
   TAB 2 — All Referred Users
   Shows every user who registered with a referral code,
   grouped by referrer, even if no commissions yet.
══════════════════════════════════════════════════════ */
const AllReferredUsersTab = () => {
  const [referrers, setReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openReferrer, setOpenReferrer] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Commission history modal state
  const [historyModal, setHistoryModal] = useState(null); // { referrerId, referrerName, referredUserId, referredUserName }
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = useCallback(async (ref) => {
    setHistoryModal(ref);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const res = await referralAPI.getCommissionHistory({
        referrerId: ref.referrerId,
        ...(ref.referredUserId && { referredUserId: ref.referredUserId }),
      });
      setHistoryData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Debounce search to avoid hammering the server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await referralAPI.getAllReferredUsers({ page, limit: 50, search: debouncedSearch });
      const d = res.data;
      setReferrers(d.referrers || []);
      setTotalCount(d.totalCount || 0);
      setTotalPages(d.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div>
      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Search referrer by name, phone or code…" />

      {/* Summary */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-4 inline-flex items-center gap-2">
        <span className="text-lg font-bold text-primary-700">{totalCount}</span>
        <span className="text-sm text-gray-500">Referrers with referred users</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : referrers.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          {search ? 'No referrers match your search' : 'No referred users found'}
        </div>
      ) : (
        <div className="space-y-3">
          {referrers.map((g, idx) => {
            const rid = g.referrer?._id?.toString() || idx;
            const isOpen = openReferrer === rid;
            return (
              <div key={rid} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Referrer header */}
                <button
                  onClick={() => setOpenReferrer(isOpen ? null : rid)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                      {g.referrer?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{g.referrer?.name || '—'}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {g.referrer?.phone || '—'}
                        {' • '}Code: <span className="font-mono text-primary-600">{g.referrer?.referralCode || '—'}</span>
                      </p>
                      {/* Commission summary */}
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                          {g.totalReferredCount} referred
                        </span>
                        {g.totalCommission > 0 && (
                          <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium">
                            Total ₹{g.totalCommission}
                          </span>
                        )}
                        {g.todayCommission > 0 && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                            Today ₹{g.todayCommission}
                          </span>
                        )}
                        {g.pending > 0 && (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                            Pending ₹{g.pending}
                          </span>
                        )}
                        {g.redeemed > 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                            Redeemed ₹{g.redeemed}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Referred users list */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                    {g.referredUsers.map((ru, i) => (
                      <div key={ru.user?._id || i} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                              {ru.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{ru.user?.name || '—'}</p>
                              <p className="text-xs text-gray-400">{ru.user?.phone || '—'} • Joined {formatDate(ru.user?.createdAt)}</p>
                            </div>
                          </div>
                          {/* Per-user commission stats */}
                          <div className="flex-shrink-0 text-right space-y-0.5">
                            {ru.totalCommission > 0 ? (
                              <>
                                <p className="text-xs font-semibold text-green-600">₹{ru.totalCommission} total</p>
                                <div className="flex gap-1.5 justify-end items-center">
                                  {ru.todayCommission > 0 && <span className="text-[10px] text-blue-500">Today ₹{ru.todayCommission}</span>}
                                  {ru.pending > 0 && <span className="text-[10px] text-amber-500">Pen ₹{ru.pending}</span>}
                                  {ru.redeemed > 0 && <span className="text-[10px] text-emerald-500">Red ₹{ru.redeemed}</span>}
                                  <button
                                    onClick={() => openHistory({
                                      referrerId: g.referrer?._id,
                                      referrerName: g.referrer?.name,
                                      referredUserId: ru.user?._id,
                                      referredUserName: ru.user?.name,
                                    })}
                                    className="text-[10px] bg-primary-600 text-white px-2 py-0.5 rounded-full font-semibold ml-1"
                                  >
                                    History
                                  </button>
                                </div>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">No earnings yet</span>
                            )}
                          </div>
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

      {/* Commission History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setHistoryModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Commission History</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Referrer: <strong>{historyModal.referrerName}</strong>
                    {historyModal.referredUserName && <> • From: <strong>{historyModal.referredUserName}</strong></>}
                  </p>
                </div>
                <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              {historyData?.summary && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-500">Records</p>
                    <p className="text-sm font-bold text-gray-800">{historyData.summary.totalRecords}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-green-600">Total</p>
                    <p className="text-sm font-bold text-green-700">₹{historyData.summary.totalEarned}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-amber-600">Pending</p>
                    <p className="text-sm font-bold text-amber-700">₹{historyData.summary.pending}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-emerald-600">Redeemed</p>
                    <p className="text-sm font-bold text-emerald-700">₹{historyData.summary.redeemed}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !historyData?.records?.length ? (
                <p className="text-sm text-gray-500 text-center py-6">No commission records found</p>
              ) : (
                <div className="space-y-2">
                  {historyData.records.map((r) => (
                    <div key={r._id} className={`rounded-lg border p-3 ${r.status === 'redeemed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">
                            From: {r.referredUserId?.name || '—'} <span className="text-xs text-gray-400 font-normal">({r.referredUserId?.phone || '—'})</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Bet ₹{r.betAmount} • {r.commissionPct}% commission
                            {r.matchId?.roomCode && <> • Room {r.matchId.roomCode}</>}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(r.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {r.redeemedAt && <> • Redeemed {new Date(r.redeemedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-600">+₹{r.commissionAmount}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${r.status === 'redeemed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
const AdminReferral = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const [mainTab, setMainTab] = useState('commissions');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Referral Management</h1>
      <p className="text-sm text-gray-500 mb-4">3-4% commission on Ludo wins — track referrers and their referred users</p>

      {/* Main page tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
        <button
          onClick={() => setMainTab('commissions')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mainTab === 'commissions' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
        >
          Commission Records
        </button>
        <button
          onClick={() => setMainTab('all-referred')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mainTab === 'all-referred' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
        >
          All Referred Users
        </button>
      </div>

      {mainTab === 'commissions'
        ? <CommissionsTab isSuperAdmin={isSuperAdmin} />
        : <AllReferredUsersTab />
      }
    </div>
  );
};

export default AdminReferral;
