import { useState, useEffect, useCallback } from 'react';
import { spinnerAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

const PER_PAGE = 25;

const SpinnerRecords = () => {
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await spinnerAPI.getHistory({ page, limit: PER_PAGE });
      const data = res.data;
      setRecords(data.records || data);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || (data.records || data).length);
    } catch (err) {
      console.error(err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="min-h-screen bg-[#f3f5f7] pb-20">
      <Header />

      <div className="max-w-md mx-auto px-4 pt-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Spinner Records</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No spinner records yet</div>
        ) : (
          <>
            <div className="space-y-2">
              {records.map((r) => (
                <div
                  key={r._id}
                  className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
                >
                  <div>
                    <p className="font-medium text-gray-800 capitalize">
                      {r.outcome === 'thank_you' ? 'Thank you' : `Won ₹${r.winAmount}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${r.winAmount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {r.winAmount > 0 ? `+₹${r.winAmount}` : '-₹50'}
                    </p>
                    <p className="text-xs text-gray-400">Cost ₹{r.spinCost || 50}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-4 mt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm disabled:opacity-40"
                >
                  <IoChevronBack /> Prev
                </button>
                <span className="text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm disabled:opacity-40"
                >
                  Next <IoChevronForward />
                </button>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 pb-2">
              {totalCount} total record{totalCount !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default SpinnerRecords;
