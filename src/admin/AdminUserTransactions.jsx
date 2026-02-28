import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { IoChevronBack, IoChevronForward, IoArrowBack } from 'react-icons/io5';

const PER_PAGE = 30;

const CATEGORY_LABELS = {
  deposit:           { label: 'Deposit Approved', icon: '💰', color: 'bg-green-50 text-green-700' },
  withdrawal:        { label: 'Withdrawal',        icon: '🏧', color: 'bg-red-50 text-red-700' },
  withdrawal_refund: { label: 'Withdrawal Refund', icon: '↩️', color: 'bg-blue-50 text-blue-700' },
  game_bet:          { label: 'Aviator Bet',       icon: '✈️', color: 'bg-orange-50 text-orange-700' },
  game_win:          { label: 'Aviator Win',       icon: '🏆', color: 'bg-yellow-50 text-yellow-700' },
  spin_cost:         { label: 'Spinner Play',      icon: '🎰', color: 'bg-purple-50 text-purple-700' },
  spin_win:          { label: 'Spinner Win',       icon: '🎁', color: 'bg-pink-50 text-pink-700' },
  ludo_entry:        { label: 'Ludo Entry',        icon: '🎲', color: 'bg-indigo-50 text-indigo-700' },
  ludo_win:          { label: 'Ludo Win',          icon: '🏅', color: 'bg-teal-50 text-teal-700' },
  ludo_refund:       { label: 'Ludo Refund',       icon: '↩️', color: 'bg-cyan-50 text-cyan-700' },
  bonus:             { label: 'Bonus Claimed',     icon: '🎉', color: 'bg-emerald-50 text-emerald-700' },
  admin_credit:      { label: 'Admin Credit',      icon: '➕', color: 'bg-green-50 text-green-700' },
  admin_debit:       { label: 'Admin Debit',       icon: '➖', color: 'bg-red-50 text-red-700' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const AdminUserTransactions = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUserTransactions(id, { page, limit: PER_PAGE });
      setTransactions(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error(err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  // Fetch user name from user detail
  useEffect(() => {
    adminAPI.getUserDetail(id)
      .then((res) => setUserName(res.data.user?.name || ''))
      .catch(() => {});
  }, [id]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const totalCredit = transactions.reduce((s, t) => s + (t.type === 'credit' ? t.amount : 0), 0);
  const totalDebit  = transactions.reduce((s, t) => s + (t.type === 'debit'  ? t.amount : 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/admin/users/${id}`)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <IoArrowBack size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Wallet History</h1>
          {userName && <p className="text-sm text-gray-500">{userName}</p>}
        </div>
      </div>

      {/* Summary row */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-50 rounded-xl p-3 border">
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-bold text-gray-700">{totalCount} txns</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <p className="text-xs text-green-600">Credit (this page)</p>
            <p className="font-bold text-green-700">+₹{totalCredit.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <p className="text-xs text-red-600">Debit (this page)</p>
            <p className="font-bold text-red-700">-₹{totalDebit.toFixed(2)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No transactions yet</div>
      ) : (
        <>
          <div className="space-y-2">
            {transactions.map((tx) => {
              const meta = CATEGORY_LABELS[tx.category] || { label: tx.category, icon: '💼', color: 'bg-gray-50 text-gray-700' };
              const isCredit = tx.type === 'credit';
              return (
                <div key={tx._id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3">
                  {/* Category badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>

                  {/* Middle - description + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                    <p className="text-xs text-gray-400">Balance after: ₹{tx.balanceAfter}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-lg ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isCredit ? '+' : '-'}₹{tx.amount}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 mt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm border disabled:opacity-40"
              >
                <IoChevronBack /> Prev
              </button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm border disabled:opacity-40"
              >
                Next <IoChevronForward />
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pb-2">
            {totalCount} total transaction{totalCount !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
};

export default AdminUserTransactions;
