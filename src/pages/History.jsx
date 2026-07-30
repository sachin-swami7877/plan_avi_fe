import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ludoAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const PAGE_LIMIT = 25;

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const History = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Ludo state
  const [ludoMatches, setLudoMatches] = useState([]);
  const [ludoPage, setLudoPage] = useState(1);
  const [ludoTotal, setLudoTotal] = useState(0);

  const fetchLudo = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await ludoAPI.getMyMatches({ status: 'history', page, limit: PAGE_LIMIT });
      const data = res.data;
      setLudoMatches(data.records || data || []);
      setLudoTotal(data.totalPages || 1);
      setLudoPage(data.page || page);
    } catch (err) {
      console.error('Failed to fetch ludo history:', err);
      setLudoMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLudo(1);
  }, [fetchLudo]);

  const getLudoStatus = (match) => {
    if (match.status === 'cancelled') return { label: 'Cancelled', style: 'bg-[#E3F2FD] text-gray-600' };
    if (!match.winnerId) return { label: 'Draw / Pending', style: 'bg-yellow-100 text-yellow-800' };
    const isWinner = match.winnerId === user?._id;
    return isWinner
      ? { label: 'Won', style: 'bg-green-100 text-green-800' }
      : { label: 'Lost', style: 'bg-red-100 text-red-800' };
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4 pb-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white shadow-sm border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <span className="text-sm text-gray-600 px-2">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white shadow-sm border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
      <Header />

      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Game History</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          ludoMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No ludo matches yet. Start playing!</div>
          ) : (
            <>
              <div className="space-y-3">
                {ludoMatches.map((match) => {
                  const st = getLudoStatus(match);
                  const prize = Math.round(2 * match.entryAmount * 0.9);
                  const isWinner = match.winnerId === user?._id;
                  return (
                    <div key={match._id} className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-gray-500">{formatTime(match.createdAt)}</p>
                          <p className="text-xs text-gray-400">
                            Players: {match.players?.map((p) => p.userName).join(' vs ') || 'N/A'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.style}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-gray-600 text-sm">Entry Amount</p>
                          <p className="font-bold text-lg">₹{match.entryAmount}</p>
                        </div>
                        <div className="text-right">
                          {match.winnerId ? (
                            isWinner ? (
                              <>
                                <p className="text-gray-600 text-sm">Prize Won</p>
                                <p className="font-bold text-lg text-green-600">+₹{prize}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-gray-600 text-sm">Lost</p>
                                <p className="font-bold text-lg text-red-600">-₹{match.entryAmount}</p>
                              </>
                            )
                          ) : match.status === 'cancelled' ? (
                            <p className="text-gray-500 text-sm">Cancelled</p>
                          ) : (
                            <p className="text-gray-500 text-sm">Pending result</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination currentPage={ludoPage} totalPages={ludoTotal} onPageChange={(p) => fetchLudo(p)} />
            </>
          )
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default History;
