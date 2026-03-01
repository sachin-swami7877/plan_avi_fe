import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  const navigate = useNavigate();
  const { login } = useAuth();

  const startOtpTimer = useCallback(() => setOtpTimer(120), []);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.sendOTP(trimmedEmail);
      setEmail(trimmedEmail);
      startOtpTimer();
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setError('Please enter a 6-digit OTP'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyOTP(email, otp);
      if (!res.data.isAdmin) { setError('You are not authorized as admin'); return; }
      login(res.data, res.data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👑</div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Aviator Game Management</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            {step === 'email' ? 'Admin Login' : 'Verify OTP'}
          </h2>

          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

          {step === 'email' ? (
            <form onSubmit={handleSendOTP}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-900 transition-colors disabled:opacity-50">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit OTP</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter OTP"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest" maxLength={6} />
              </div>
              <div className="text-center mb-4">
                {otpTimer > 0 ? (
                  <p className="text-gray-500 text-sm">OTP expires in <span className="text-amber-600 font-semibold">{Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}</span></p>
                ) : (
                  <p className="text-red-500 text-sm font-medium">OTP expired</p>
                )}
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-900 transition-colors disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <div className="flex items-center justify-between mt-3">
                <button type="button" onClick={() => { setStep('email'); setOtpTimer(0); setOtp(''); setError(''); }} className="text-gray-600 py-2 font-medium text-sm">Change Email</button>
                <button
                  type="button"
                  disabled={otpTimer > 0}
                  onClick={async () => {
                    setError('');
                    try {
                      await authAPI.sendOTP(email);
                      startOtpTimer();
                      setOtp('');
                    } catch (err) { setError('Failed to resend OTP'); }
                  }}
                  className={`py-2 text-sm font-medium ${otpTimer > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-purple-600 hover:text-purple-800'}`}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Back to User App</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
