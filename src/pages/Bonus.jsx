import { useState, useEffect } from 'react';
import { bonusAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const Bonus = () => {
  const { refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      const res = await bonusAPI.getStatus();
      setData(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleClaim = async () => {
    setClaiming(true);
    setMessage('');
    try {
      const res = await bonusAPI.claim();
      setMessage(res.data.message);
      await refreshUser();
      fetchStatus();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to claim');
    } finally { setClaiming(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 pb-20 overflow-x-hidden">
      <Header />
      <p className="text-center text-gray-400 py-8">Loading...</p>
      <Navbar />
    </div>
  );

  const progress = data ? Math.min(100, (data.progressToNext / data.threshold) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 overflow-x-hidden">
      <Header />
      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Bonus & Cashback</h1>

        {/* Offer Card */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 text-white mb-4">
          <h2 className="text-lg font-bold mb-1">Current Offer</h2>
          <p className="text-sm opacity-90">
            Deposit ₹{data?.threshold || 1000} today and get ₹{data?.cashback || 100} cashback!
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Today's Progress</span>
            <span className="font-bold text-gray-800">₹{data?.progressToNext || 0} / ₹{data?.threshold || 1000}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div className="bg-amber-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-500">
            Today's Deposit: ₹{data?.todayDeposit || data?.totalBets || 0} | Milestones: {data?.milestonesCrossed || 0} | Claimed Today: ₹{data?.claimed || 0}
          </p>
        </div>

        {/* Claim */}
        {data?.canClaim && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="text-green-800 font-medium mb-2">You have ₹{data.claimableAmount} bonus to claim!</p>
            <button onClick={handleClaim} disabled={claiming} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium disabled:opacity-50">
              {claiming ? 'Claiming...' : `Claim ₹${data.claimableAmount}`}
            </button>
          </div>
        )}

        {message && <div className="p-3 rounded-lg mb-4 bg-blue-50 text-blue-700 text-sm">{message}</div>}

        {/* History */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Bonus History</h3>
          {data?.history?.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No bonuses yet</p>
          ) : (
            <div className="space-y-2">
              {data?.history?.map((rec) => (
                <div key={rec._id} className="bg-white rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-medium text-green-600">+₹{rec.bonusAmount}</p>
                    <p className="text-xs text-gray-400">{new Date(rec.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Deposit: ₹{rec.totalBetsAtClaim}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default Bonus;
