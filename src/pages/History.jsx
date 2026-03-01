import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { gameAPI, ludoAPI, spinnerAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const TABS = [
  { id: 'aviator', label: 'Aviator', icon: '✈️' },
  { id: 'ludo', label: 'Ludo', icon: '🎲' },
  { id: 'spinner', label: 'Spinner', icon: '🎡' },
];

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
  const [activeTab, setActiveTab] = useState('aviator');
  const [loading, setLoading] = useState(true);

  // Aviator state
  const [aviatorBets, setAviatorBets] = useState([]);
  const [aviatorPage, setAviatorPage] = useState(1);
  const [aviatorTotal, setAviatorTotal] = useState(0);

  // Ludo state
  const [ludoMatches, setLudoMatches] = useState([]);
  const [ludoPage, setLudoPage] = useState(1);
  const [ludoTotal, setLudoTotal] = useState(0);

  // Spinner state
  const [spinnerRecords, setSpinnerRecords] = useState([]);
  const [spinnerPage, setSpinnerPage] = useState(1);
  const [spinnerTotal, setSpinnerTotal] = useState(0);

  const fetchAviator = useCallback(async (page = 1) => {
    try {
      const res = await gameAPI.getHistory({ page, limit: PAGE_LIMIT });
      const data = res.data;
      setAviatorBets(data.records || data || []);
      setAviatorTotal(data.totalPages || 1);
      setAviatorPage(data.page || page);
    } catch (err) {
      console.error('Failed to fetch aviator history:', err);
      setAviatorBets([]);
    }
  }, []);

  const fetchLudo = useCallback(async (page = 1) => {
    try {
      const res = await ludoAPI.getMyMatches({ status: 'history', page, limit: PAGE_LIMIT });
      const data = res.data;
      setLudoMatches(data.records || data || []);
      setLudoTotal(data.totalPages || 1);
      setLudoPage(data.page || page);
    } catch (err) {
      console.error('Failed to fetch ludo history:', err);
      setLudoMatches([]);
    }
  }, []);

  const fetchSpinner = useCallback(async (page = 1) => {
    try {
      const res = await spinnerAPI.getHistory({ page, limit: PAGE_LIMIT });
      const data = res.data;
      setSpinnerRecords(data.records || data || []);
      setSpinnerTotal(data.totalPages || 1);
      setSpinnerPage(data.page || page);
    } catch (err) {
      console.error('Failed to fetch spinner history:', err);
      setSpinnerRecords([]);
    }
  }, []);

  // Track which tabs have been fetched at least once
  const [fetched, setFetched] = useState({ aviator: false, ludo: false, spinner: false });

  const fetchTabData = useCallback(async (tabId, page = 1) => {
    setLoading(true);
    try {
      if (tabId === 'aviator') await fetchAviator(page);
      else if (tabId === 'ludo') await fetchLudo(page);
      else if (tabId === 'spinner') await fetchSpinner(page);
      setFetched((prev) => ({ ...prev, [tabId]: true }));
    } finally {
      setLoading(false);
    }
  }, [fetchAviator, fetchLudo, fetchSpinner]);

  // Only fetch active tab on mount
  useEffect(() => {
    fetchTabData('aviator', 1);
  }, [fetchTabData]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Lazy-load: fetch only if not already fetched
    if (!fetched[tabId]) {
      fetchTabData(tabId, 1);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getLudoStatus = (match) => {
    if (match.status === 'cancelled') return { label: 'Cancelled', style: 'bg-gray-100 text-gray-600' };
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

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Aviator History */}
            {activeTab === 'aviator' && (
              aviatorBets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No aviator bets yet. Start playing!</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {aviatorBets.map((bet) => (
                      <div key={bet._id} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs text-gray-500">{formatTime(bet.createdAt)}</p>
                            <p className="text-xs text-gray-400">Round: {bet.gameRoundId?.roundId || 'N/A'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(bet.status)}`}>
                            {bet.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-gray-600 text-sm">Bet Amount</p>
                            <p className="font-bold text-lg">₹{bet.amount}</p>
                          </div>
                          <div className="text-right">
                            {bet.status === 'won' ? (
                              <>
                                <p className="text-gray-600 text-sm">Cashed at {bet.cashOutMultiplier}x</p>
                                <p className="font-bold text-lg text-green-600">+₹{bet.profit?.toFixed(2)}</p>
                              </>
                            ) : bet.status === 'lost' ? (
                              <>
                                <p className="text-gray-600 text-sm">Crashed at {bet.gameRoundId?.crashMultiplier}x</p>
                                <p className="font-bold text-lg text-red-600">-₹{bet.amount}</p>
                              </>
                            ) : (
                              <p className="text-gray-600 text-sm">In progress...</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={aviatorPage} totalPages={aviatorTotal} onPageChange={(p) => fetchTabData('aviator', p)} />
                </>
              )
            )}

            {/* Ludo History */}
            {activeTab === 'ludo' && (
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
                  <Pagination currentPage={ludoPage} totalPages={ludoTotal} onPageChange={(p) => fetchTabData('ludo', p)} />
                </>
              )
            )}

            {/* Spinner History */}
            {activeTab === 'spinner' && (
              spinnerRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No spinner records yet. Try your luck!</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {spinnerRecords.map((rec) => (
                      <div key={rec._id} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs text-gray-500">{formatTime(rec.createdAt)}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${rec.winAmount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {rec.winAmount > 0 ? 'Won' : 'Lost'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-gray-600 text-sm">Spin Cost</p>
                            <p className="font-bold text-lg">₹{rec.spinCost}</p>
                          </div>
                          <div className="text-right">
                            {rec.winAmount > 0 ? (
                              <>
                                <p className="text-gray-600 text-sm">Won ₹{rec.outcome}</p>
                                <p className="font-bold text-lg text-green-600">+₹{rec.winAmount}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-gray-600 text-sm">Thank you</p>
                                <p className="font-bold text-lg text-red-600">-₹{rec.spinCost}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={spinnerPage} totalPages={spinnerTotal} onPageChange={(p) => fetchTabData('spinner', p)} />
                </>
              )
            )}
          </>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default History;
