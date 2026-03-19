import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'];

export default function AdminKyc() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [statusTab, setStatusTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [acting, setActing] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getKycRequests({ status: statusTab, page, limit: 30 });
      setRequests(res.data.requests || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
      setPendingCount(res.data.pendingCount || 0);
    } catch {
      toast.error('Failed to load KYC requests');
    } finally {
      setLoading(false);
    }
  }, [statusTab, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id) => {
    setActing(true);
    try {
      await adminAPI.approveKyc(id);
      toast.success('KYC approved');
      fetchRequests();
      setExpanded(null);
    } catch {
      toast.error('Failed to approve');
    } finally { setActing(false); }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) { toast.error('Please enter rejection reason'); return; }
    setActing(true);
    try {
      await adminAPI.rejectKyc(id, rejectReason.trim());
      toast.success('KYC rejected');
      setRejectReason('');
      setRejectingId(null);
      fetchRequests();
      setExpanded(null);
    } catch {
      toast.error('Failed to reject');
    } finally { setActing(false); }
  };

  const handleDelete = async (id) => {
    setActing(true);
    try {
      await adminAPI.deleteKyc(id);
      toast.success('KYC deleted. User must resubmit.');
      setDeletingId(null);
      fetchRequests();
      setExpanded(null);
    } catch {
      toast.error('Failed to delete');
    } finally { setActing(false); }
  };

  const statusColor = (s) => s === 'approved' ? 'bg-green-100 text-green-700' : s === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">KYC Requests</h1>
        {pendingCount > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">{pendingCount} pending</span>}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setStatusTab(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${statusTab === t ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t}{t === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-400">{total} requests</div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No {statusTab} KYC requests</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === r._id ? null : r._id)}
              >
                <div>
                  <p
                    className="font-semibold text-primary-700 text-sm hover:underline inline-block"
                    onClick={(e) => { e.stopPropagation(); if (r.userId?._id) navigate(`/admin/users/${r.userId._id}`); }}
                  >
                    {r.userId?.name || '—'}
                  </p>
                  <p className="text-xs text-gray-500">{r.userId?.phone} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === r._id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>

              {expanded === r._id && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  <div className="space-y-2 text-sm">
                    <div><p className="text-xs text-gray-400">Email</p><p className="font-medium">{r.email || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Aadhaar Number</p><p className="font-medium font-mono">{r.aadhaarNumber || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Address</p><p className="font-medium">{r.address || '—'}</p></div>
                  </div>

                  {r.aadhaarFrontUrl ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Aadhaar Photo</p>
                      <a href={r.aadhaarFrontUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={r.aadhaarFrontUrl}
                          alt="Aadhaar"
                          className="w-full max-h-56 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                        />
                        <p style={{display:'none'}} className="text-xs text-red-400 mt-1">Image failed to load. <a href={r.aadhaarFrontUrl} target="_blank" rel="noopener noreferrer" className="underline">Open directly</a></p>
                      </a>
                      <p className="text-xs text-blue-500 mt-1">Tap to open full image</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No photo uploaded</p>
                  )}

                  {r.status === 'rejected' && r.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-600 font-semibold">Rejection Reason</p>
                      <p className="text-sm text-red-700">{r.rejectionReason}</p>
                    </div>
                  )}

                  {r.status === 'pending' && (
                    <div className="space-y-2">
                      {rejectingId === r._id ? (
                        <div className="space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleReject(r._id)} disabled={acting} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Confirm Reject</button>
                            <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(r._id)} disabled={acting} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Approve</button>
                          <button onClick={() => setRejectingId(r._id)} disabled={acting} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold">Reject</button>
                        </div>
                      )}
                    </div>
                  )}

                  {r.status !== 'pending' && r.reviewedAt && (
                    <p className="text-xs text-gray-400">Reviewed on {new Date(r.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  )}

                  {/* Delete KYC — resets user to scratch */}
                  <div className="pt-1 border-t border-gray-100">
                    {deletingId === r._id ? (
                      <div className="space-y-2">
                        <p className="text-xs text-red-600 font-semibold">User ki KYC delete ho jaegi aur unhe dobara submit karni padegi. Confirm?</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(r._id)} disabled={acting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Yes, Delete</button>
                          <button onClick={() => setDeletingId(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(r._id)} disabled={acting} className="w-full py-2 bg-gray-50 text-red-500 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
                        🗑 Delete KYC (Reset)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
