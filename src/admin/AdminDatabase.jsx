import { useState } from 'react';
import { adminAPI } from '../services/api';
import DatePickerModal from '../components/DatePickerModal';
import toast from 'react-hot-toast';

function toISODate(d) { return d.toISOString().slice(0, 10); }
function getToday() { return toISODate(new Date()); }

function QuickDateButtons({ onSelect, active }) {
  const buttons = [
    { key: 'last7', label: 'Last 7 Days', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 7); return { start: toISODate(d), end: getToday() }; } },
    { key: 'lastMonth', label: 'Last Month', getRange: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return { start: toISODate(d), end: getToday() }; } },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => (
        <button
          key={b.key}
          onClick={() => onSelect(b.key, b.getRange())}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            active === b.key ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

function CleanupSection({ title, icon, type }) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleQuickSelect = (key, range) => {
    setQuickFilter(key);
    setStartDate(range.start);
    setEndDate(range.end);
    setPreview(null);
  };

  const handleDateApply = (s, e) => {
    setStartDate(s);
    setEndDate(e);
    setQuickFilter('custom');
    setPreview(null);
    setDatePickerOpen(false);
  };

  const handlePreview = async () => {
    if (!startDate || !endDate) return toast.error('Select a date range first');
    setLoading(true);
    try {
      const res = await adminAPI.getCleanupPreview({ type, startDate, endDate });
      setPreview(res.data);
    } catch (err) {
      toast.error('Failed to get count');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const photoTypes = ['ludo_photos', 'deposit_photos', 'kyc_photos'];
      const res = photoTypes.includes(type)
        ? await adminAPI.cleanupPhotos({ startDate, endDate, photoType: type })
        : type === 'photos'
          ? await adminAPI.cleanupPhotos({ startDate, endDate })
          : await adminAPI.cleanupLudoMatches({ startDate, endDate });
      toast.success(res.data.message);
      setPreview(null);
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const getDateLabel = () => {
    if (!startDate || !endDate) return 'No date selected';
    if (startDate === endDate) return new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(endDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {/* Quick date buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <QuickDateButtons onSelect={handleQuickSelect} active={quickFilter} />
          <button
            onClick={() => setDatePickerOpen(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              quickFilter === 'custom' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {quickFilter === 'custom' ? getDateLabel() : 'Custom Date'}
          </button>
        </div>

        {/* Selected date info */}
        {startDate && endDate && (
          <div className="text-sm text-gray-500">
            Selected: <span className="font-medium text-gray-700">{getDateLabel()}</span>
          </div>
        )}

        {/* Check count */}
        <button
          onClick={handlePreview}
          disabled={!startDate || !endDate || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Checking...' : 'Check Count'}
        </button>

        {/* Preview result */}
        {preview && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Found <span className="text-red-600 font-bold">{preview.count}</span> items to delete
            </p>
            {type === 'photos' && preview.ludoPhotos != null && (
              <p className="text-xs text-gray-500">
                Ludo screenshots: {preview.ludoPhotos} | Wallet screenshots: {preview.walletPhotos}
              </p>
            )}
            {type === 'ludo' && preview.expired != null && (
              <p className="text-xs text-gray-500">
                Expired waiting: {preview.expired} | Cancelled: {preview.cancelled}
              </p>
            )}
            {preview.sampleUrl && (
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <p className="text-[10px] text-gray-400 mb-1 font-semibold uppercase">Sample URL (Cloudinary confirm)</p>
                <a href={preview.sampleUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 break-all hover:underline">{preview.sampleUrl}</a>
              </div>
            )}
            {preview.count > 0 && (
              <button
                onClick={() => setConfirmOpen(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete {preview.count} items
              </button>
            )}
          </div>
        )}

        {/* Confirm modal */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleting && setConfirmOpen(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-red-600 mb-2">Confirm Delete</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <span className="font-bold text-red-600">{preview?.count}</span> items?
                <br /><span className="text-xs text-gray-400">Date range: {getDateLabel()}</span>
                <br /><span className="text-xs text-red-500 font-medium">This action cannot be undone!</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <DatePickerModal
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onApply={handleDateApply}
        initialStartDate={startDate}
        initialEndDate={endDate}
        rangeMode
      />
    </div>
  );
}

export default function AdminDatabase() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Database Management</h1>
      <p className="text-sm text-gray-500">Clean up old data to save storage and improve performance.</p>

      <CleanupSection
        title="Delete Ludo Result Screenshots"
        icon="🎲"
        type="ludo_photos"
      />

      <CleanupSection
        title="Delete Deposit Screenshots"
        icon="💰"
        type="deposit_photos"
      />

      <CleanupSection
        title="Delete KYC Aadhaar Photos"
        icon="🪪"
        type="kyc_photos"
      />

      <CleanupSection
        title="Delete Expired & Cancelled Ludo Matches"
        icon="🗑️"
        type="ludo"
      />
    </div>
  );
}
