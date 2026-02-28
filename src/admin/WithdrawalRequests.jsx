import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const WithdrawalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const res = await adminAPI.getWalletRequests({ type: 'withdrawal', status: filter !== 'all' ? filter : undefined });
      setRequests(res.data.filter(r => r.type === 'withdrawal'));
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id, action) => {
    try {
      await adminAPI.processWalletRequest(id, action);
      fetchRequests();
    } catch (error) {
      console.error('Failed to process request:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Withdrawal Requests</h1>

      {/* Filter Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === status ? 'bg-white shadow text-primary-700' : 'text-gray-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            No {filter} withdrawal requests
          </div>
        ) : (
          requests.map((request) => (
            <div key={request._id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className={`p-4 ${
                request.status === 'pending' ? 'bg-orange-50 border-l-4 border-orange-500' :
                request.status === 'approved' ? 'bg-green-50 border-l-4 border-green-500' :
                'bg-red-50 border-l-4 border-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
                      <span className="text-lg">💸</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{request.userId?.name}</h3>
                      <p className="text-xs text-gray-500">{request.userId?.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">₹{request.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      request.status === 'pending' ? 'bg-orange-200 text-orange-800' :
                      request.status === 'approved' ? 'bg-green-200 text-green-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500">Current Balance</p>
                  <p className="font-bold text-lg">₹{request.userId?.walletBalance?.toFixed(2)}</p>
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  Requested: {new Date(request.createdAt).toLocaleString()}
                </p>

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleProcess(request._id, 'approve')}
                      className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium"
                    >
                      Mark as Paid
                    </button>
                    <button
                      onClick={() => handleProcess(request._id, 'reject')}
                      className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium"
                    >
                      Reject & Refund
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WithdrawalRequests;
