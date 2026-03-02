import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuthAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const [view, setView] = useState('login');
  const [activeTab, setActiveTab] = useState('otp');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const startOtpTimer = useCallback(() => setOtpTimer(120), []);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  const isValidPhone = (p) => /^[0-9]{10}$/.test((p || '').replace(/[^0-9]/g, '').slice(-10));

  // Send OTP for login
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!isValidPhone(phone)) { setError('Please enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    try {
      await adminAuthAPI.sendOTP(phone);
      startOtpTimer();
      setView('otp-sent');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // Verify OTP for login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 4) { setError('Please enter the 4-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await adminAuthAPI.verifyOTP(phone, otp);
      login(res.data, res.data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  // Password login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!isValidPhone(phone)) { setError('Please enter a valid 10-digit mobile number'); return; }
    if (!password) { setError('Password is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await adminAuthAPI.passwordLogin(phone, password);
      login(res.data, res.data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  // Forgot password - send OTP
  const handleForgotSendOTP = async (e) => {
    e.preventDefault();
    if (!isValidPhone(phone)) { setError('Please enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    try {
      await adminAuthAPI.forgotPasswordSendOTP(phone);
      startOtpTimer();
      setView('forgot-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // Forgot password - verify OTP
  const handleForgotVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 4) { setError('Please enter the 4-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await adminAuthAPI.forgotPasswordVerifyOTP(phone, otp);
      setResetToken(res.data.resetToken);
      setView('forgot-reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await adminAuthAPI.resetPassword(resetToken, newPassword, confirmPassword);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        setView('login'); setActiveTab('password');
        setSuccess(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); setResetToken('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed');
    } finally { setLoading(false); }
  };

  const goToLogin = () => {
    setView('login'); setError(''); setSuccess(''); setOtp(''); setOtpTimer(0);
    setPassword(''); setNewPassword(''); setConfirmPassword(''); setResetToken('');
  };

  const phoneInputJSX = (
    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
      <span className="px-3 text-gray-400 text-sm bg-gray-50">+91</span>
      <input type="tel" value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
        placeholder="Enter 10-digit number" maxLength={10} inputMode="numeric"
        className="flex-1 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800" />
    </div>
  );

  const OtpTimerDisplay = () => (
    <div className="text-center mb-4">
      {otpTimer > 0 ? (
        <p className="text-gray-500 text-sm">
          OTP expires in <span className="text-amber-600 font-semibold">
            {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}
          </span>
        </p>
      ) : (
        <p className="text-red-500 text-sm font-medium">OTP expired</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          {success && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <>
              <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => { setActiveTab('otp'); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === 'otp' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >Login with OTP</button>
                <button
                  onClick={() => { setActiveTab('password'); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === 'password' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >Login with Password</button>
              </div>

              {activeTab === 'otp' && (
                <form onSubmit={handleSendOTP}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    {phoneInputJSX}
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handlePasswordLogin}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    {phoneInputJSX}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                        {showPassword ? '\u{1F648}' : '\u{1F441}\uFE0F'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                  <div className="text-center mt-3">
                    <button type="button" onClick={() => { setView('forgot-phone'); setError(''); }}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      Forgot Password?
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* OTP SENT VIEW (login) */}
          {view === 'otp-sent' && (
            <form onSubmit={handleVerifyOTP}>
              <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Verify OTP</h2>
              <p className="text-gray-500 text-sm text-center mb-6">Enter the 4-digit code sent to +91 {phone}</p>
              <div className="mb-4">
                <input type="text" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter OTP" maxLength={4} inputMode="numeric" autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest text-gray-800" />
              </div>
              <OtpTimerDisplay />
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <div className="flex items-center justify-between mt-3">
                <button type="button" onClick={goToLogin} className="text-gray-600 py-2 font-medium text-sm">Change Number</button>
                <button type="button" disabled={otpTimer > 0}
                  onClick={async () => {
                    setError('');
                    try { await adminAuthAPI.sendOTP(phone); startOtpTimer(); setOtp(''); }
                    catch (err) { setError('Failed to resend OTP'); }
                  }}
                  className={`py-2 text-sm font-medium ${otpTimer > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                >Resend OTP</button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD - PHONE */}
          {view === 'forgot-phone' && (
            <form onSubmit={handleForgotSendOTP}>
              <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Forgot Password</h2>
              <p className="text-gray-500 text-sm text-center mb-6">Enter your registered mobile number to receive an OTP</p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                {phoneInputJSX}
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
              <div className="text-center mt-3">
                <button type="button" onClick={goToLogin} className="text-gray-600 hover:text-gray-800 text-sm font-medium">Back to Login</button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD - VERIFY OTP */}
          {view === 'forgot-otp' && (
            <form onSubmit={handleForgotVerifyOTP}>
              <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Verify OTP</h2>
              <p className="text-gray-500 text-sm text-center mb-6">Enter the 4-digit code sent to +91 {phone}</p>
              <div className="mb-4">
                <input type="text" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter OTP" maxLength={4} inputMode="numeric" autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest text-gray-800" />
              </div>
              <OtpTimerDisplay />
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div className="flex items-center justify-between mt-3">
                <button type="button" onClick={goToLogin} className="text-gray-600 py-2 font-medium text-sm">Back to Login</button>
                <button type="button" disabled={otpTimer > 0}
                  onClick={async () => {
                    setError('');
                    try { await adminAuthAPI.forgotPasswordSendOTP(phone); startOtpTimer(); setOtp(''); }
                    catch (err) { setError('Failed to resend OTP'); }
                  }}
                  className={`py-2 text-sm font-medium ${otpTimer > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                >Resend OTP</button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD - RESET */}
          {view === 'forgot-reset' && (
            <form onSubmit={handleResetPassword}>
              <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Set New Password</h2>
              <p className="text-gray-500 text-sm text-center mb-6">Create a new password for your account</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" autoFocus
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 pr-12" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                    {showNewPassword ? '\u{1F648}' : '\u{1F441}\uFE0F'}
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 pr-12" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                    {showConfirmPassword ? '\u{1F648}' : '\u{1F441}\uFE0F'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="text-center mt-3">
                <button type="button" onClick={goToLogin} className="text-gray-600 hover:text-gray-800 text-sm font-medium">Back to Login</button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-gray-400 text-xs">&copy; 2026 All rights reserved.</p>
      </div>
    </div>
  );
};

export default AdminLogin;
