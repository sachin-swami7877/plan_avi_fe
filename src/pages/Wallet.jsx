import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { walletAPI, authAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { IoChevronBack, IoChevronForward, IoWarningOutline, IoCloseCircle } from 'react-icons/io5';
import { FiCopy, FiDownload } from 'react-icons/fi';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

const PER_PAGE = 25;

const QUICK_AMOUNTS = [100, 250, 500, 2000];

const Wallet = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAmount = searchParams.get('amount') || '';
  const paramStep = searchParams.get('step') || '';

  const [tab, setTab] = useState('deposit');
  const [depositStep, setDepositStep] = useState(paramStep === 'proof' ? 'proof' : 'choose');
  const [amount, setAmount] = useState(paramAmount || '');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [histTotalCount, setHistTotalCount] = useState(0);
  const { user, updateBalance, refreshUser } = useAuth();

  // UPI popup
  const [upiPopupOpen, setUpiPopupOpen] = useState(false);
  const [upiForm, setUpiForm] = useState({ upiId: '', upiNumber: '' });
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiErrors, setUpiErrors] = useState({});

  // T&C popup
  const [tcOpen, setTcOpen] = useState(false);

  // Earnings info for withdrawal
  const [earningsInfo, setEarningsInfo] = useState({ walletBalance: 0, totalDeposited: 0, earnings: 0 });

  useEffect(() => {
    if (user && !user.upiId && !user.upiNumber) {
      setUpiPopupOpen(true);
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await walletAPI.getHistory({ page: histPage, limit: PER_PAGE });
      const data = res.data;
      setHistory(data.data || data);
      setHistTotalPages(data.totalPages || 1);
      setHistTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, [histPage]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const fetchPaymentInfo = async () => {
    try {
      const res = await walletAPI.getPaymentInfo();
      setPaymentInfo(res.data);
    } catch (error) {
      console.error('Failed to fetch payment info:', error);
    }
  };

  const fetchEarningsInfo = useCallback(async () => {
    try {
      const res = await walletAPI.getWithdrawalInfo();
      setEarningsInfo(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { if (tab === 'withdraw') fetchEarningsInfo(); }, [tab, fetchEarningsInfo]);

  useEffect(() => {
    fetchPaymentInfo();
    checkFirstDeposit();
    fetchEarningsInfo();
  }, []);

  const checkFirstDeposit = async () => {
    try {
      if (!localStorage.getItem('tcSeen')) {
        setTcOpen(true);
        localStorage.setItem('tcSeen', '1');
      }
    } catch { /* silent */ }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!user?.upiId && !user?.upiNumber) {
      setUpiPopupOpen(true);
      setMessage({ type: 'error', text: 'Please save your UPI details first' });
      return;
    }
    if (!amount || Number(amount) < 100) { setMessage({ type: 'error', text: 'Minimum deposit is ₹100' }); return; }
    if (!utrNumber.trim()) { setMessage({ type: 'error', text: 'UTR number is required' }); return; }
    if (!screenshot) { setMessage({ type: 'error', text: 'Screenshot is required' }); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('utrNumber', utrNumber);
      formData.append('screenshot', screenshot);
      await walletAPI.deposit(formData);
      setMessage({ type: 'success', text: 'Deposit request submitted! Waiting for approval.' });
      setAmount(''); setUtrNumber(''); setScreenshot(null); setDepositStep('choose');
      setHistPage(1); fetchHistory();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit request' });
    } finally { setLoading(false); }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!user?.upiId && !user?.upiNumber) {
      setUpiPopupOpen(true);
      setMessage({ type: 'error', text: 'Please save your UPI details first' });
      return;
    }
    if (!amount || Number(amount) < 100) { setMessage({ type: 'error', text: 'Minimum withdrawal is ₹100' }); return; }
    if (Number(amount) > earningsInfo.earnings) { setMessage({ type: 'error', text: `You can only withdraw earnings. Withdrawable: ₹${earningsInfo.earnings.toFixed(2)}` }); return; }
    setLoading(true);
    try {
      const res = await walletAPI.withdraw(Number(amount));
      updateBalance(res.data.newBalance);
      setMessage({ type: 'success', text: 'Withdrawal request submitted!' });
      setAmount(''); setHistPage(1); fetchHistory(); fetchEarningsInfo();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit request' });
    } finally { setLoading(false); }
  };

  const validateUpiForm = () => {
    const errs = {};
    if (!upiForm.upiId.trim() && !upiForm.upiNumber.trim()) {
      errs.upiId = 'Enter at least one UPI ID or number';
      errs.upiNumber = 'Enter at least one UPI ID or number';
    }
    if (upiForm.upiNumber.trim() && !/^\d{10,}$/.test(upiForm.upiNumber.trim())) {
      errs.upiNumber = 'Enter a valid mobile number (at least 10 digits)';
    }
    setUpiErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveUpi = async () => {
    if (!validateUpiForm()) return;
    setUpiSaving(true);
    try {
      await authAPI.updateProfile({ upiId: upiForm.upiId.trim(), upiNumber: upiForm.upiNumber.trim() });
      await refreshUser();
      setUpiPopupOpen(false);
      setMessage({ type: 'success', text: 'UPI details saved!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch {
      setUpiErrors({ upiId: 'Failed to save, please try again' });
    } finally { setUpiSaving(false); }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 1500);
  };

  const downloadQR = () => {
    if (!paymentInfo?.qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = paymentInfo.qrCodeUrl;
    link.download = 'payment-qr.png';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f7] pb-20 overflow-x-hidden">
      <Header />

      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-800 rounded-xl p-6 text-white mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-200">Total Balance</p>
              <h2 className="text-3xl font-bold mt-1">₹{user?.walletBalance?.toFixed(2) || '0.00'}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-200">Withdrawable Earnings</p>
              <h2 className="text-2xl font-bold mt-1 text-green-300">₹{earningsInfo.earnings.toFixed(2)}</h2>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
          <button onClick={() => setTab('deposit')} className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${tab === 'deposit' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500'}`}>Deposit</button>
          <button onClick={() => setTab('withdraw')} className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${tab === 'withdraw' ? 'bg-rose-600 text-white shadow' : 'text-gray-500'}`}>Withdrawal</button>
        </div>

        {/* T&C / Warning button */}
        <button onClick={() => setTcOpen(true)} className="flex items-center gap-2 mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-full">
          <IoWarningOutline className="text-lg flex-shrink-0" />
          <span>Payment Instructions / भुगतान निर्देश</span>
        </button>

        {message.text && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
        )}

        {/* Deposit Flow */}
        {tab === 'deposit' && depositStep === 'choose' && (
          <div className="bg-[#13131f] rounded-2xl p-5 shadow-lg border border-white/10">
            <h3 className="text-white font-bold text-lg text-center mb-1">Choose Amount To Add 💰</h3>
            <p className="text-white/40 text-xs text-center mb-5">Minimum ₹100</p>

            {/* Amount input */}
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">Enter Amount</label>
            <div className="flex items-center bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 mb-5">
              <span className="text-white/50 font-bold text-lg mr-3">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="flex-1 bg-transparent text-white text-lg font-bold outline-none placeholder-white/25"
              />
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-base font-semibold transition-all ${
                    Number(amount) === q
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-[#1a1a2e] border-white/10 text-white/70 hover:border-white/20'
                  }`}
                >
                  🪙 {q}
                </button>
              ))}
            </div>

            {/* NEXT button → go to PaymentInfo page */}
            <button
              type="button"
              onClick={() => {
                if (!amount || Number(amount) < 100) {
                  setMessage({ type: 'error', text: 'Minimum deposit is ₹100' });
                  return;
                }
                if (!user?.upiId && !user?.upiNumber) {
                  setUpiPopupOpen(true);
                  setMessage({ type: 'error', text: 'Please save your UPI details first' });
                  return;
                }
                navigate(`/payment-info?amount=${amount}`);
              }}
              className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg hover:from-blue-500 hover:to-cyan-400 transition-all flex items-center justify-center gap-2"
            >
              NEXT
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
        )}

        {/* Deposit Step 2: Upload Proof (UTR + Screenshot) */}
        {tab === 'deposit' && depositStep === 'proof' && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Upload Payment Proof</h3>
              <button
                type="button"
                onClick={() => { setDepositStep('choose'); setMessage({ type: '', text: '' }); }}
                className="text-sm text-emerald-600 font-medium"
              >
                ← Change Amount
              </button>
            </div>

            {amount && (
              <div className="bg-emerald-50 rounded-lg p-3 mb-4 text-center">
                <p className="text-sm text-gray-500">Deposit Amount</p>
                <p className="text-2xl font-bold text-emerald-700">₹{amount}</p>
              </div>
            )}

            <form onSubmit={handleDeposit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">UTR / Transaction ID</label>
                <input type="text" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} placeholder="Enter UTR number" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Screenshot</label>
                <input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files[0])} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {screenshot && <p className="text-xs text-gray-500 mt-1">{screenshot.name}</p>}
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Deposit Request'}
              </button>
            </form>
          </div>
        )}

        {/* Withdraw Form */}
        {tab === 'withdraw' && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            {/* Earnings breakdown */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-800 font-semibold mb-2">You can only withdraw your earnings from games</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Balance</span>
                <span className="font-bold text-gray-800">₹{user?.walletBalance?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deposited Amount</span>
                <span className="font-medium text-gray-700">₹{earningsInfo.totalDeposited.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1 pt-1 border-t border-amber-200">
                <span className="text-green-700 font-semibold">Withdrawable Earnings</span>
                <span className="font-bold text-green-700">₹{earningsInfo.earnings.toFixed(2)}</span>
              </div>
            </div>
            <form onSubmit={handleWithdraw}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (Min ₹100)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" max={earningsInfo.earnings} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
                <p className="text-xs text-gray-500 mt-1">Withdrawable: ₹{earningsInfo.earnings.toFixed(2)} | Max 2 requests/day</p>
              </div>
              <button type="submit" disabled={loading || earningsInfo.earnings < 100} className="w-full bg-rose-600 text-white py-3 rounded-lg font-medium hover:bg-rose-700 disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Withdrawal Request'}
              </button>
            </form>
          </div>
        )}

        {/* History */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-3">Transaction History</h3>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No transactions yet</p>
            ) : (
              history.map((item) => (
                <div key={item._id} className="bg-white rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-medium capitalize text-gray-800">{item.type}</p>
                    <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${item.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.type === 'deposit' ? '+' : '-'}₹{item.amount}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(item.status)}`}>{item.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {histTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 mt-2">
              <button onClick={() => setHistPage((p) => Math.max(1, p - 1))} disabled={histPage <= 1} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm disabled:opacity-40">
                <IoChevronBack /> Prev
              </button>
              <span className="text-sm text-gray-500">{histPage}/{histTotalPages}</span>
              <button onClick={() => setHistPage((p) => Math.min(histTotalPages, p + 1))} disabled={histPage >= histTotalPages} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm disabled:opacity-40">
                Next <IoChevronForward />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ UPI Details Modal (Custom UI) ═══════ */}
      {upiPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">Enter Your UPI Information</h3>
                <p className="text-emerald-100 text-xs mt-0.5">Required to use wallet features</p>
              </div>
              <button
                type="button"
                onClick={() => setUpiPopupOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <IoCloseCircle className="text-white text-xl" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI ID</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    type="text"
                    value={upiForm.upiId}
                    onChange={(e) => { setUpiForm({ ...upiForm, upiId: e.target.value }); setUpiErrors({}); }}
                    placeholder="yourname@upi"
                    className={`w-full pl-8 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      upiErrors.upiId
                        ? 'border-red-300 focus:ring-red-400 bg-red-50'
                        : 'border-gray-200 focus:ring-emerald-500 bg-gray-50 focus:bg-white'
                    }`}
                  />
                </div>
                {upiErrors.upiId && <p className="text-xs text-red-500 mt-1">{upiErrors.upiId}</p>}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI Number (Mobile)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📱</span>
                  <input
                    type="tel"
                    value={upiForm.upiNumber}
                    onChange={(e) => { setUpiForm({ ...upiForm, upiNumber: e.target.value.replace(/\D/g, '') }); setUpiErrors({}); }}
                    placeholder="9876543210"
                    maxLength={12}
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      upiErrors.upiNumber
                        ? 'border-red-300 focus:ring-red-400 bg-red-50'
                        : 'border-gray-200 focus:ring-emerald-500 bg-gray-50 focus:bg-white'
                    }`}
                  />
                </div>
                {upiErrors.upiNumber && <p className="text-xs text-red-500 mt-1">{upiErrors.upiNumber}</p>}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Enter at least one UPI ID or mobile number. This is required for withdrawals.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={handleSaveUpi}
                disabled={upiSaving || (!upiForm.upiId.trim() && !upiForm.upiNumber.trim())}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20"
              >
                {upiSaving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ T&C / Payment Instructions Popup (Hindi + English) ═══════ */}
      <Dialog open={tcOpen} onClose={() => setTcOpen(false)} maxWidth="sm" fullWidth>
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="font-bold text-lg text-gray-800">भुगतान निर्देश / Payment Instructions</h2>
          <button type="button" onClick={() => setTcOpen(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <IoCloseCircle className="text-gray-400 text-xl" />
          </button>
        </div>
        <DialogContent>
          <div className="space-y-5 text-sm">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-2 text-base">💰 जमा कैसे करें (Deposit)</h4>
              <p className="text-gray-700 leading-relaxed mb-2">
                सबसे पहले अपने UPI ऐप में जाकर यहाँ दिए गए QR कोड या UPI नंबर पर कम से कम ₹100 add करें। उसके बाद यहाँ वापस आकर deposit वाले भाग में UTR नंबर, स्क्रीनशॉट और कितनी राशि जमा की है — यह सब भरें। यह जानकारी एडमिन तक पहुँचेगी और एडमिन राशि वॉलेट में जोड़ देगा। मदद के लिए दिए गए सपोर्ट नंबर पर भी कॉल कर सकते हैं।
              </p>
      
            </div>

            <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
              <h4 className="font-bold text-rose-800 mb-2 text-base">🏦 निकासी कैसे करें (Withdrawal)</h4>
              <p className="text-gray-700 leading-relaxed mb-2">
                जितनी राशि निकालनी है, कम से कम ₹100, उसका request भेज दें। Admin दिए गए UPI नंबर पर amount भेज देगा। Help के लिए Support से भी संपर्क कर सकते हैं।
              </p>
           
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-semibold text-sm leading-relaxed">
                ⚠️ एक दिन में अधिकतम 2 बार withdraw का request कर सकते हैं।
              </p>
        
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTcOpen(false)} variant="contained" color="primary" sx={{ borderRadius: 2 }}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <Navbar />
    </div>
  );
};

export default Wallet;
