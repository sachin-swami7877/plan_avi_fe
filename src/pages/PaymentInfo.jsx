import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { walletAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { FiCopy, FiDownload } from 'react-icons/fi';
import { IoArrowBack } from 'react-icons/io5';

const PaymentInfo = () => {
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const amount = searchParams.get('amount') || '';

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await walletAPI.getPaymentInfo();
        setPaymentInfo(res.data);
      } catch (err) {
        console.error('Failed to fetch payment info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
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

  return (
    <div className="min-h-screen bg-[#0a0a14] pb-24 overflow-x-hidden">
      <Header />

      <div className="max-w-md mx-auto px-4 py-4 w-full min-w-0">
        {/* Back button */}
        <button
          onClick={() => navigate('/wallet')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4 text-sm"
        >
          <IoArrowBack className="text-lg" />
          Back to Wallet
        </button>

        {/* Amount badge */}
        {amount && (
          <div className="text-center mb-5">
            <p className="text-white/50 text-sm mb-1">Amount to Pay</p>
            <div className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-6 py-2">
              <span className="text-emerald-400 font-bold text-2xl">&#8377;{amount}</span>
            </div>
          </div>
        )}

        {/* Title */}
        <h2 className="text-white font-bold text-xl text-center mb-1">Payment Details</h2>
        <p className="text-white/40 text-sm text-center mb-6">
          Neeche diye QR code ya UPI ID par payment karein
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : !paymentInfo ? (
          <div className="text-center py-12 text-white/40">Payment details not configured. Contact support.</div>
        ) : (
          <div className="space-y-4">
            {/* No payment methods configured */}
            {!paymentInfo?.qrCodeUrl && !paymentInfo?.upiId && !paymentInfo?.upiNumber && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-center">
                <p className="text-amber-300 font-semibold text-base mb-1">⚠️ Payment Details Not Set</p>
                <p className="text-white/50 text-sm leading-relaxed">Admin ne abhi QR code / UPI ID configure nahi ki hai.<br />Kripya support se contact karein.</p>
              </div>
            )}

            {/* QR Code */}
            {paymentInfo?.qrCodeUrl && (
              <div className="bg-white rounded-2xl p-5 flex flex-col items-center">
                <img
                  src={paymentInfo.qrCodeUrl}
                  alt="Payment QR Code"
                  className="w-56 h-56 object-contain rounded-lg"
                />
                <button
                  onClick={downloadQR}
                  className="mt-3 flex items-center gap-2 text-sm text-emerald-700 font-medium hover:text-emerald-600 transition-colors"
                >
                  <FiDownload /> Download QR
                </button>
              </div>
            )}

            {/* UPI ID */}
            {paymentInfo?.upiId && (
              <div className="bg-[#13131f] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs mb-0.5">UPI ID</p>
                  <p className="text-white font-mono font-bold text-base">{paymentInfo.upiId}</p>
                </div>
                <button
                  onClick={() => copyText(paymentInfo.upiId, 'upi')}
                  className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  {copied === 'upi' ? <span className="text-xs font-medium">Copied!</span> : <FiCopy className="text-lg" />}
                </button>
              </div>
            )}

            {/* UPI Number */}
            {paymentInfo?.upiNumber && (
              <div className="bg-[#13131f] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs mb-0.5">UPI Number</p>
                  <p className="text-white font-mono font-bold text-base">{paymentInfo.upiNumber}</p>
                </div>
                <button
                  onClick={() => copyText(paymentInfo.upiNumber, 'number')}
                  className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  {copied === 'number' ? <span className="text-xs font-medium">Copied!</span> : <FiCopy className="text-lg" />}
                </button>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-300 text-sm font-medium mb-2">Instructions / निर्देश:</p>
              <ol className="text-white/50 text-sm space-y-1.5 list-decimal list-inside">
                <li>UPI app mein jaake QR scan karein ya UPI ID/number par pay karein</li>
                <li>Payment hone ke baad screenshot le lein</li>
                <li>Neeche "Upload Proof" button dabayein</li>
                <li>UTR number aur screenshot upload karein</li>
              </ol>
            </div>

            {/* Action button — go to upload proof */}
            <button
              onClick={() => navigate(`/wallet?amount=${amount}&step=proof`)}
              className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-400 transition-all flex items-center justify-center gap-2"
            >
              Payment Done? Upload Proof
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default PaymentInfo;
