import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminCreditLog = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getCreditLog({ page: p, limit: 30 });
      setRecords(res.data.records || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error('Failed to fetch credit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) +
      ' ' + dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Admin Credit / Debit Log</h1>
      <p className="text-sm text-gray-500 mb-5">All admin-initiated wallet changes ({totalCount} total)</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">No records found</div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const isCredit = r.category === 'admin_credit';
            return (
              <div key={r._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                      {isCredit ? '💰' : '💸'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{r.userId?.name || '—'}</p>
                      <p className="text-xs text-gray-500">{r.userId?.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-base ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}₹{r.amount}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      ₹{Number(r.balanceBefore).toFixed(2)} → ₹{Number(r.balanceAfter).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">{r.description}</p>
                    {r.adminId?.name && (
                      <p className="text-xs text-blue-500 mt-0.5">By: {r.adminId.name}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchData(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchData(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminCreditLog;
