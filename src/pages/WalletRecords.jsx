import { useState, useEffect, useCallback } from 'react';
import { walletAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

const PER_PAGE = 30;

const CATEGORY_LABELS = {
  deposit:           { label: 'Deposit Approved', icon: '💰' },
  withdrawal:        { label: 'Withdrawal',        icon: '🏧' },
  withdrawal_refund: { label: 'Withdrawal Refund', icon: '↩️' },
  game_bet:          { label: 'Aviator Bet',       icon: '✈️' },
  game_win:          { label: 'Aviator Win',       icon: '🏆' },
  spin_cost:         { label: 'Spinner Play',      icon: '🎰' },
  spin_win:          { label: 'Spinner Win',       icon: '🎁' },
  ludo_entry:        { label: 'Ludo Entry',        icon: '🎲' },
  ludo_win:          { label: 'Ludo Win',          icon: '🏅' },
  ludo_refund:       { label: 'Ludo Refund',       icon: '↩️' },
  bonus:             { label: 'Bonus Claimed',     icon: '🎉' },
  admin_credit:      { label: 'Admin Credit',      icon: '➕' },
  admin_debit:       { label: 'Admin Debit',       icon: '➖' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

const WalletRecords = () => {
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await walletAPI.getTransactions({ page, limit: PER_PAGE });
      setRecords(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error(err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return (
    <div className="min-h-screen bg-[#f3f5f7] pb-24">
      <Header />

      <div className="max-w-md mx-auto px-4 pt-4">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Wallet History</h1>
        <p className="text-sm text-gray-500 mb-4">All money added &amp; deducted from your wallet</p>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No transactions yet</div>
        ) : (
          <>
            <div className="space-y-2">
              {records.map((tx) => {
                const meta = CATEGORY_LABELS[tx.category] || { label: tx.category, icon: '💼' };
                const isCredit = tx.type === 'credit';
                return (
                  <div
                    key={tx._id}
                    className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: isCredit ? '#dcfce7' : '#fee2e2' }}>
                      {meta.icon}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{meta.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>

                    {/* Amount + balance */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-base ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isCredit ? '+' : '-'}₹{tx.amount}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Bal: ₹{tx.balanceAfter}</p>
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
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm disabled:opacity-40"
                >
                  <IoChevronBack /> Prev
                </button>
                <span className="text-sm text-gray-500">{page} / {totalPages}</span>
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
              {totalCount} total transaction{totalCount !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default WalletRecords;
