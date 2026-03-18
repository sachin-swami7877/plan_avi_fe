import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { IoChevronBack, IoChevronForward, IoChevronDown } from 'react-icons/io5';
import DatePickerModal from '../components/DatePickerModal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PER_PAGE = 25;

const MoneyRequests = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [tab, setTab] = useState('deposit');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [editAmounts, setEditAmounts] = useState({});
  const [processing, setProcessing] = useState(null);
  const [rejectDeductConfirm, setRejectDeductConfirm] = useState(null); // { id, amount, userName }
  const [depositTotals, setDepositTotals] = useState({ totalAmount: 0, count: 0 });
  const [withdrawalTotals, setWithdrawalTotals] = useState({ totalAmount: 0, count: 0 });

  // Date filter state
  const [datePreset, setDatePreset] = useState(''); // '', 'today', 'last5', 'custom'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        type: tab === 'deposit' ? 'deposit' : 'withdrawal',
        page,
        limit: PER_PAGE,
      };
      if (filter !== 'all') params.status = filter;
      if (datePreset && datePreset !== 'custom') params.datePreset = datePreset;
      if (datePreset === 'custom' && startDate && endDate) {
        params.from = startDate;
        params.to = endDate;
      }
      const res = await adminAPI.getWalletRequests(params);
      const data = res.data;
      setRequests(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      setDepositTotals(data.depositTotals || { totalAmount: 0, count: 0 });
      setWithdrawalTotals(data.withdrawalTotals || { totalAmount: 0, count: 0 });
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [tab, filter, page, datePreset, startDate, endDate]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Auto-refresh on new deposit/withdrawal socket events
  useEffect(() => {
    if (!socket) return;
    const handleNewRequest = () => {
      if (filter === 'pending' || filter === 'all') fetchRequests();
    };
    socket.on('admin:wallet-request', handleNewRequest);
    socket.on('admin:withdrawal-request', handleNewRequest);
    return () => {
      socket.off('admin:wallet-request', handleNewRequest);
      socket.off('admin:withdrawal-request', handleNewRequest);
    };
  }, [socket, filter, fetchRequests]);

  const handleProcess = async (id, action) => {
    setProcessing(`${id}-${action}`);
    try {
      const edited = editAmounts[id];
      await adminAPI.processWalletRequest(id, action, edited !== undefined ? Number(edited) : undefined);
      toast.success(`Request ${action}d successfully`);
      setEditAmounts((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    } finally {
      setProcessing(null);
    }
  };

  const switchTab = (t) => { setTab(t); setPage(1); };
  const switchFilter = (f) => { setFilter(f); setPage(1); };

  const setPreset = (preset) => {
    setDatePreset(preset);
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const handleDateApply = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setDatePreset('custom');
    setPage(1);
    setDatePickerOpen(false);
  };

  const clearDateFilter = () => {
    setDatePreset('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const getDateLabel = () => {
    if (datePreset === 'today') return 'Today';
    if (datePreset === 'last5') return 'Last 5 Days';
    if (datePreset === 'custom' && startDate && endDate) {
      return `${new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(endDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    }
    return 'All Time';
  };

  const currentTotals = tab === 'deposit' ? depositTotals : withdrawalTotals;

  return (
    <div>
      {/* Top tabs: Deposit / Withdrawal */}
      <div className="flex bg-white rounded-xl p-1 mb-3 shadow-sm">
        <button
          onClick={() => switchTab('deposit')}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
            tab === 'deposit' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Deposit Requests
        </button>
        <button
          onClick={() => switchTab('withdrawal')}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
            tab === 'withdrawal' ? 'bg-rose-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Withdrawal Requests
        </button>
      </div>

      {/* Summary + Date Filters — single row */}
      <div className={`rounded-xl p-3 mb-3 flex items-center justify-between gap-3 ${tab === 'deposit' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <div>
            <p className="text-[10px] text-gray-500 leading-tight">Count</p>
            <p className={`text-lg font-bold leading-tight ${tab === 'deposit' ? 'text-emerald-700' : 'text-rose-700'}`}>{currentTotals.count}</p>
          </div>
          <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 leading-tight">Total</p>
            <p className={`text-lg font-bold leading-tight ${tab === 'deposit' ? 'text-emerald-700' : 'text-rose-700'}`}>₹{(currentTotals.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {[
            { label: 'All', value: '' },
            { label: 'Today', value: 'today' },
            { label: '5D', value: 'last5' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                (datePreset === p.value || (!datePreset && p.value === ''))
                  ? (tab === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')
                  : 'bg-white/70 text-gray-600 hover:bg-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setDatePickerOpen(true)}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
              datePreset === 'custom'
                ? (tab === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')
                : 'bg-white/70 text-gray-600 hover:bg-white'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {datePreset === 'custom' ? getDateLabel() : 'Range'}
          </button>
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

      {/* Status Filter */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => switchFilter(status)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === status ? 'bg-white shadow text-gray-800' : 'text-gray-500'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          No {filter} {tab} requests
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const isExpanded = expandedId === request._id;
            return (
            <div key={request._id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              {/* Accordion header — always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : request._id)}
                className={`w-full p-4 ${
                  request.status === 'pending'
                    ? (tab === 'deposit' ? 'bg-yellow-50 border-l-4 border-yellow-500' : 'bg-orange-50 border-l-4 border-orange-500')
                    : request.status === 'approved' ? 'bg-green-50 border-l-4 border-green-500'
                    : 'bg-red-50 border-l-4 border-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
                      <span className="text-lg">{tab === 'deposit' ? '₹' : '💸'}</span>
                    </div>
                    <div className="text-left min-w-0 max-w-[130px]">
                      <h3
                        className="font-bold text-gray-800 truncate cursor-pointer hover:text-primary-600 transition-colors"
                        title={request.userId?.name}
                        onClick={(e) => { e.stopPropagation(); if (request.userId?._id) navigate(`/admin/users/${request.userId._id}`); }}
                      >
                        {request.userId?.name || '(no name)'}
                      </h3>
                      <p
                        className="text-xs text-gray-500 cursor-pointer hover:text-primary-600 transition-colors"
                        onClick={(e) => { e.stopPropagation(); if (request.userId?._id) navigate(`/admin/users/${request.userId._id}`); }}
                      >
                        {request.userId?.phone || request.userId?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${tab === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{editAmounts[request._id] !== undefined ? editAmounts[request._id] : request.amount}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        request.status === 'pending' ? (tab === 'deposit' ? 'bg-yellow-200 text-yellow-800' : 'bg-orange-200 text-orange-800') :
                        request.status === 'approved' ? 'bg-green-200 text-green-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <IoChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>

              {/* Accordion body — expanded details */}
              {isExpanded && (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {tab === 'deposit' && request.utrNumber && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">UTR Number</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-medium text-sm">{request.utrNumber}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(request.utrNumber);
                            toast.success('Copied');
                          }}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                          title="Copy UTR"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {tab === 'withdrawal' && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Current Balance</p>
                      <p className="font-bold text-sm">₹{request.userId?.walletBalance?.toFixed(2)}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Requested</p>
                    <p className="text-sm">{new Date(request.createdAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'short',
                      timeStyle: 'short',
                      hour12: true
                    })}</p>
                  </div>
                </div>

                {/* User Payment Info */}
                {(request.userId?.upiId || request.userId?.upiNumber || request.userId?.phone ||
                  request.userId?.bankAccountNumber || request.userId?.bankIfscCode) && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1 font-medium">User Payment Info</p>
                    {request.userId?.upiId && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm"><span className="text-gray-500">UPI ID:</span> <span className="font-mono font-medium">{request.userId.upiId}</span></p>
                        <button onClick={() => { navigator.clipboard.writeText(request.userId.upiId); toast.success('UPI ID copied'); }} className="p-0.5 rounded hover:bg-blue-100" title="Copy">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    )}
                    {request.userId?.upiNumber && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm"><span className="text-gray-500">UPI No:</span> <span className="font-mono font-medium">{request.userId.upiNumber}</span></p>
                        <button onClick={() => { navigator.clipboard.writeText(request.userId.upiNumber); toast.success('UPI number copied'); }} className="p-0.5 rounded hover:bg-blue-100" title="Copy">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    )}
                    {request.userId?.bankAccountNumber && (
                      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-blue-200">
                        <p className="text-sm"><span className="text-gray-500">Acc No:</span> <span className="font-mono font-medium">{request.userId.bankAccountNumber}</span></p>
                        <button onClick={() => { navigator.clipboard.writeText(request.userId.bankAccountNumber); toast.success('Account number copied'); }} className="p-0.5 rounded hover:bg-blue-100" title="Copy">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    )}
                    {request.userId?.bankIfscCode && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm"><span className="text-gray-500">IFSC:</span> <span className="font-mono font-medium">{request.userId.bankIfscCode}</span></p>
                        <button onClick={() => { navigator.clipboard.writeText(request.userId.bankIfscCode); toast.success('IFSC copied'); }} className="p-0.5 rounded hover:bg-blue-100" title="Copy">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    )}
                    {request.userId?.bankAccountHolder && (
                      <p className="text-sm"><span className="text-gray-500">Holder:</span> <span className="font-medium">{request.userId.bankAccountHolder}</span></p>
                    )}
                    {request.userId?.phone && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm"><span className="text-gray-500">Phone:</span> <span className="font-medium">{request.userId.phone}</span></p>
                        <button onClick={() => { navigator.clipboard.writeText(request.userId.phone); toast.success('Phone copied'); }} className="p-0.5 rounded hover:bg-blue-100" title="Copy">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'deposit' && request.screenshotUrl && (
                  <a
                    href={request.screenshotUrl.startsWith('http') ? request.screenshotUrl : `${import.meta.env.VITE_APP_ENVIRONMENT === 'production' ? import.meta.env.VITE_APP_PRODUCTION_API_URL : import.meta.env.VITE_APP_LOCAL_API_URL}${request.screenshotUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-violet-50 text-violet-700 text-center py-2 rounded-lg mb-3 font-medium text-sm"
                  >
                    View Screenshot
                  </a>
                )}

                {request.status === 'pending' && (
                  <div>
                    {/* Editable amount for deposit requests */}
                    {tab === 'deposit' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                        <label className="block text-xs text-amber-800 font-semibold mb-1.5">Edit Amount (if different)</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-bold">₹</span>
                          <input
                            type="number"
                            value={editAmounts[request._id] !== undefined ? editAmounts[request._id] : request.amount}
                            onChange={(e) => setEditAmounts((prev) => ({ ...prev, [request._id]: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                            min="1"
                          />
                          {editAmounts[request._id] !== undefined && Number(editAmounts[request._id]) !== request.amount && (
                            <button
                              onClick={() => setEditAmounts((prev) => { const copy = { ...prev }; delete copy[request._id]; return copy; })}
                              className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        {editAmounts[request._id] !== undefined && Number(editAmounts[request._id]) !== request.amount && (
                          <p className="text-xs text-amber-700 mt-1">Original: ₹{request.amount} → Edited: ₹{editAmounts[request._id]}</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleProcess(request._id, 'approve')}
                        disabled={processing === `${request._id}-approve`}
                        className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {processing === `${request._id}-approve` ? (
                          <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Processing...</>
                        ) : (tab === 'deposit' ? 'Approve' : 'Mark as Paid')}
                      </button>
                      <button
                        onClick={() => handleProcess(request._id, 'reject')}
                        disabled={processing === `${request._id}-reject`}
                        className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {processing === `${request._id}-reject` ? (
                          <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Processing...</>
                        ) : (tab === 'deposit' ? 'Reject' : 'Reject & Refund')}
                      </button>
                    </div>
                    {tab === 'withdrawal' && (
                      <button
                        onClick={() => setRejectDeductConfirm({ id: request._id, amount: request.amount, userName: request.userId?.name || 'User' })}
                        disabled={!!processing}
                        className="w-full mt-2 bg-orange-600 text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-60"
                      >
                        Reject (Deduct — No Refund)
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-white rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">{totalCount} total</p>
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
      {/* Reject & Deduct Confirmation Modal */}
      {rejectDeductConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5">
            <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Reject & Deduct</h3>
            <p className="text-sm text-gray-700 mb-1">
              <strong>₹{rejectDeductConfirm.amount}</strong> will be permanently deducted from <strong>{rejectDeductConfirm.userName}</strong>'s account.
            </p>
            <p className="text-sm text-red-600 font-medium mb-4">
              Amount will NOT be refunded to the user. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setRejectDeductConfirm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { id } = rejectDeductConfirm;
                  setRejectDeductConfirm(null);
                  await handleProcess(id, 'reject_deduct');
                }}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium text-sm"
              >
                Yes, Deduct
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyRequests;
