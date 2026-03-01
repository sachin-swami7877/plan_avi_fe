import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { IoChevronBack, IoChevronForward, IoChevronDown } from 'react-icons/io5';
import toast from 'react-hot-toast';

const PER_PAGE = 25;

const MoneyRequests = () => {
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

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        type: tab === 'deposit' ? 'deposit' : 'withdrawal',
        page,
        limit: PER_PAGE,
      };
      if (filter !== 'all') params.status = filter;
      const res = await adminAPI.getWalletRequests(params);
      const data = res.data;
      setRequests(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [tab, filter, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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

  const switchTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const switchFilter = (f) => {
    setFilter(f);
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Money Requests</h1>

      {/* Top tabs: Deposit / Withdrawal */}
      <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
        <button
          onClick={() => switchTab('deposit')}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
            tab === 'deposit'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Deposit Requests
        </button>
        <button
          onClick={() => switchTab('withdrawal')}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
            tab === 'withdrawal'
              ? 'bg-rose-600 text-white shadow'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Withdrawal Requests
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => switchFilter(status)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
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
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">{request.userId?.name}</h3>
                      <p className="text-xs text-gray-500">{request.userId?.phone || request.userId?.email}</p>
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
                            const btn = document.activeElement;
                            const orig = btn.innerHTML;
                            btn.innerHTML = '<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
                            setTimeout(() => { btn.innerHTML = orig; }, 1500);
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

                {/* User UPI Details */}
                {(request.userId?.upiId || request.userId?.upiNumber || request.userId?.phone) && (
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
    </div>
  );
};

export default MoneyRequests;
