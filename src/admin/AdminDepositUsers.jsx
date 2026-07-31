import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IoDownloadOutline } from 'react-icons/io5';

const SITE_NAME = 'Rush Karo Ludo';

const AdminDepositUsers = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (minAmount !== '') params.minAmount = minAmount;
      if (maxAmount !== '') params.maxAmount = maxAmount;
      const res = await adminAPI.getDepositUsersReport(params);
      setRows(res.data.rows || []);
    } catch (err) {
      console.error('Failed to fetch deposit users:', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, minAmount, maxAmount]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const clearFilters = () => {
    setFromDate(''); setToDate(''); setMinAmount(''); setMaxAmount('');
  };

  const downloadPdf = () => {
    if (!rows.length) return;
    setDownloading(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(`${SITE_NAME} — Deposit Users`, 14, 16);

      doc.setFontSize(10);
      doc.setTextColor(100);
      const filterParts = [];
      if (fromDate || toDate) filterParts.push(`Date: ${fromDate || 'start'} to ${toDate || 'today'}`);
      if (minAmount !== '' || maxAmount !== '') filterParts.push(`Amount: Rs.${minAmount || '0'} to Rs.${maxAmount || 'any'}`);
      filterParts.push(`Total Users: ${rows.length}`);
      doc.text(filterParts.join('   |   '), 14, 23);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);

      autoTable(doc, {
        startY: 33,
        head: [['S.No', 'Name', 'Phone', 'Deposit (Rs.)', 'Deposit Date']],
        body: rows.map((r, i) => [
          i + 1,
          r.name || '—',
          r.phone || '—',
          r.amount != null ? r.amount : '—',
          formatDate(r.depositedAt),
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 250] },
      });

      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`deposit-users-${stamp}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Deposit Users</h1>
          <p className="text-sm text-gray-500 mb-4">
            Unique users with approved deposits — one entry per user ({rows.length} users)
          </p>
        </div>
        <button
          onClick={downloadPdf}
          disabled={downloading || loading || rows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-40 transition-colors"
        >
          <IoDownloadOutline className="text-lg" />
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Min Amount (₹)</label>
            <input type="number" min="0" placeholder="e.g. 300" value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Amount (₹)</label>
            <input type="number" min="0" placeholder="e.g. 400" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 transition-colors">
            Apply Filters
          </button>
          <button onClick={clearFilters}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">No deposit users found for the selected filters</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Deposit Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r._id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.phone || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">₹{r.amount}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(r.depositedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDepositUsers;
