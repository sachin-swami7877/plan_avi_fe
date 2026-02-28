import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

const PER_PAGE = 25;

const BonusRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getBonusRecords({ page, limit: PER_PAGE });
      const d = res.data;
      setRecords(d.data || []);
      setTotalPages(d.totalPages || 1);
      setTotalCount(d.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch bonus records:', error);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Bonus Records</h1>
      <p className="text-sm text-gray-500 mb-4">History of all cashback bonuses awarded to users.</p>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">No bonus records yet</div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div key={rec._id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-500">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800">{rec.userId?.name || 'Unknown'}</h3>
                  <p className="text-xs text-gray-500">{rec.userId?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600">+₹{rec.bonusAmount}</p>
                  <p className="text-xs text-gray-400">{new Date(rec.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Threshold: ₹{rec.thresholdAmount}</span>
                <span>Total Bets at Claim: ₹{rec.totalBetsAtClaim}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-white rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">{totalCount} total</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40">
              <IoChevronBack /> Prev
            </button>
            <span className="text-sm text-gray-500">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40">
              Next <IoChevronForward />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusRecords;
