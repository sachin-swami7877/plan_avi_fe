import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ── Logo emoji box ── */

/* ── Floating particles ── */
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white/10"
        style={{
          width: 2 + Math.random() * 3,
          height: 2 + Math.random() * 3,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `floatP ${6 + Math.random() * 10}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 5}s`,
        }}
      />
    ))}
  </div>
);

/* ── Game icons for display ── */
const GameIcons = () => (
  <div className="flex items-center gap-4 mb-4">
    <div className="w-14 h-14 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-2xl">🎲</div>
    <div className="w-14 h-14 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl">✈️</div>
    <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/30 overflow-hidden flex items-center justify-center"><img src="/spinner.jpeg" alt="Spinner" className="w-full h-full object-cover" /></div>
  </div>
);

/* ── OTP individual digit input ── */
const OtpInput = ({ value, onChange }) => {
  const inputRefs = useRef([]);
  const digits = Array.from({ length: 4 }, (_, i) => value[i] || '');

  const handleChange = (idx, char) => {
    if (!/^\d?$/.test(char)) return;
    const arr = [...digits];
    arr[idx] = char;
    const joined = arr.join('');
    onChange(joined.replace(/[^0-9]/g, ''));
    if (char && idx < 3) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 3);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-3 sm:gap-4 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoFocus={i === 0}
          className="w-14 h-16 sm:w-16 sm:h-18 text-center text-2xl font-bold rounded-xl bg-white/10 border border-white/[0.15] text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
        />
      ))}
    </div>
  );
};

/* ═══════════════ MAIN LOGIN COMPONENT ═══════════════ */
const Login = () => {
  const [step, setStep] = useState('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingData, setPendingData] = useState(null);
  const [otpTimer, setOtpTimer] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = location.state?.from || '/dashboard';

  // Show logout reason if redirected from another-device force-logout
  const [logoutReason, setLogoutReason] = useState('');
  useEffect(() => {
    const reason = localStorage.getItem('logoutReason');
    if (reason) {
      setLogoutReason(reason);
      localStorage.removeItem('logoutReason');
    }
  }, []);

  // 2-minute countdown timer for OTP expiry
  const startOtpTimer = useCallback(() => setOtpTimer(120), []);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  const isValidPhone = (p) => /^[0-9]{10}$/.test(p.replace(/[^0-9]/g, '').slice(-10));

  /* ── handlers ── */
  const handleSendOTP = async (e) => {
    e.preventDefault();
    const cleanPhone = mobileNumber.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || !isValidPhone(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    setMobileNumber(cleanPhone);
    try {
      await authAPI.sendOTPByPhone(cleanPhone);
      startOtpTimer();
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyOTPByPhone(mobileNumber, otp);
      const data = res.data;
      if (data.needsProfile) {
        setPendingData(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setStep('profile');
      } else if (data.needsUsername) {
        setPendingData(data);
        setName(data.name || '');
        setStep('username');
      } else {
        login(data, data.token);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (pendingData?.needsUsername && !trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (pendingData?.needsUsername && trimmedName.length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }
    if (pendingData?.needsUsername && /^[\.\-\s]+$/.test(trimmedName)) {
      setError('Please enter a valid name');
      return;
    }
    if (pendingData?.needsPhone && !trimmedPhone) {
      setError('Please enter your mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      login(pendingData, pendingData.token);
      await authAPI.updateProfile({
        name: trimmedName || pendingData.name,
        phone: trimmedPhone || pendingData.phone,
        referralCode: referralCode.trim().toUpperCase() || undefined,
      });
      const res = await authAPI.getMe();
      login(res.data, pendingData.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSetUsername = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (trimmedName.length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }
    if (/^[\.\-\s]+$/.test(trimmedName)) {
      setError('Please enter a valid name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      login(pendingData, pendingData.token);
      const res = await authAPI.setUsername(trimmedName, referralCode.trim().toUpperCase() || undefined);
      const updatedUser = { ...pendingData, ...res.data };
      login(updatedUser, pendingData.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set username');
    } finally {
      setLoading(false);
    }
  };

  /* ── step config ── */
  const stepConfig = {
    mobile: {
      title: 'Welcome Back',
      subtitle: 'Enter your mobile number to login or create an account',
      stepNum: 1,
    },
    otp: {
      title: 'Verify OTP',
      subtitle: `We sent a 4-digit code to your mobile number ending ${mobileNumber.slice(-4)}`,
      stepNum: 2,
    },
    username: { title: 'Almost There!', subtitle: 'Choose a display name for your profile', stepNum: 3 },
    profile: { title: 'Complete Profile', subtitle: 'Enter your name', stepNum: 3 },
  };
  const { title, subtitle, stepNum } = stepConfig[step] || stepConfig.mobile;

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col lg:flex-row">
      {/* ═══ LEFT PANEL — Informational (hidden on mobile, shown on lg+) ═══ */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-10 xl:p-14">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e0e1a] to-[#07070d]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,rgba(16,185,129,0.12),transparent)]" />
        <Particles />

        {/* Top — logo */}
        <div className="relative z-10">
          <Link to="/landing" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              🎲
            </div>
            <span className="text-2xl font-extrabold tracking-tight">Rushkro<span className="text-emerald-400">Ludo</span></span>
          </Link>
        </div>

        {/* Middle — Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <GameIcons />
          <h2 className="text-4xl xl:text-5xl font-black leading-[1.1] mb-5">
            Play. Win.
            <span className="block bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent mt-1">
              Earn Real Cash.
            </span>
          </h2>
          <p className="text-white/50 text-lg leading-relaxed max-w-md mb-8">
            Play Ludo, Aviator crash game & Lucky Spinner. Win real money with instant UPI withdrawals.
          </p>

          {/* Game highlights */}
          <div className="mb-8 space-y-3 max-w-sm">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
              <span className="text-2xl">🎲</span>
              <div><p className="text-white font-semibold text-sm">Ludo King</p><p className="text-white/40 text-xs">Bet & play with real players</p></div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
              <span className="text-2xl">✈️</span>
              <div><p className="text-white font-semibold text-sm">Aviator</p><p className="text-white/40 text-xs">Watch the multiplier fly & cash out</p></div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
              <span className="text-2xl">🎡</span>
              <div><p className="text-white font-semibold text-sm">Lucky Spinner</p><p className="text-white/40 text-xs">Spin the wheel & win prizes</p></div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="grid grid-cols-3 gap-4 max-w-sm">
            {[
              { icon: '🎮', val: '3 Games', label: 'To Play' },
              { icon: '🔒', val: '100%', label: 'Secure' },
              { icon: '💰', val: 'Instant', label: 'Payouts' },
            ].map((t, i) => (
              <div key={i} className="text-center">
                <div className="text-xl mb-1">{t.icon}</div>
                <p className="text-white font-bold text-sm">{t.val}</p>
                <p className="text-white/30 text-xs">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — testimonial */}
        <div className="relative z-10 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-sm font-bold">R</div>
            <div>
              <p className="text-sm font-semibold">Rahul K.</p>
              <div className="flex gap-0.5 text-amber-400 text-xs">{'★★★★★'}</div>
            </div>
          </div>
          <p className="text-white/50 text-sm leading-relaxed italic">
            "Amazing platform! Won in Ludo and cashed out at 8.5x in Aviator. Withdrawal was instant to my UPI!"
          </p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Login Form ═══ */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile header */}
        <div className="lg:hidden relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.15),transparent)]" />
          <Particles />
          <div className="relative z-10 flex flex-col items-center pt-8 pb-6 px-4">
            <Link to="/landing" className="mb-4">
              <img src="/logo.jpeg" alt="RushkroLudo" className="w-16 h-16" />
            </Link>
            <p className="text-white/40 text-sm">Ludo, Aviator & Spinner — Win Real Cash!</p>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 lg:py-0">
          <div className="w-full max-w-md">
            {/* Logout reason banner (e.g. logged in from another device) */}
            {logoutReason && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-amber-200 text-sm">{logoutReason}</p>
              </div>
            )}

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    s < stepNum ? 'bg-emerald-500 text-white' :
                    s === stepNum ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                    'bg-white/10 text-white/30'
                  }`}>
                    {s < stepNum ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors duration-300 ${s < stepNum ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Title */}
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-black mb-1.5">{title}</h2>
              <p className="text-white/50 text-sm">{subtitle}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* ── Mobile Number Step ── */}
            {step === 'mobile' && (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <span className="absolute inset-y-0 left-12 flex items-center text-white/40 text-sm font-medium">+91</span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      autoFocus
                      maxLength={10}
                      inputMode="numeric"
                      className="w-full pl-[5.5rem] pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Send OTP
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </>
                    )}
                  </span>
                </button>
                <p className="text-white/30 text-xs text-center leading-relaxed">
                  We'll send a one-time code via SMS to verify your number.
                </p>
              </form>
            )}

            {/* ── OTP Step ── */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-3 text-center">Enter 4-digit code</label>
                  <OtpInput value={otp} onChange={setOtp} />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="group w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Continue
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </>
                    )}
                  </span>
                </button>
                {/* Timer */}
                <div className="text-center">
                  {otpTimer > 0 ? (
                    <p className="text-white/40 text-sm">
                      OTP expires in <span className="text-amber-400 font-semibold">{Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}</span>
                    </p>
                  ) : (
                    <p className="text-red-400 text-sm font-medium">OTP expired</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setStep('mobile'); setError(''); setOtp(''); setOtpTimer(0); }}
                    className="text-white/40 hover:text-white/70 text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Change number
                  </button>
                  <button
                    type="button"
                    disabled={otpTimer > 0}
                    onClick={async () => {
                      setError('');
                      try {
                        await authAPI.sendOTPByPhone(mobileNumber);
                        startOtpTimer();
                        setOtp('');
                      } catch (err) { setError('Failed to resend'); }
                    }}
                    className={`text-sm font-medium transition-colors ${otpTimer > 0 ? 'text-white/20 cursor-not-allowed' : 'text-emerald-400/70 hover:text-emerald-400'}`}
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}

            {/* ── Complete Profile (name + phone) ── */}
            {step === 'profile' && (
              <form onSubmit={handleCompleteProfile} className="space-y-5">
                {pendingData?.needsUsername !== false && (
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        autoFocus
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Referral Code <span className="text-white/30 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                    placeholder="Friend's referral code"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base tracking-widest"
                  />
                </div>
                {pendingData?.needsPhone !== false && (
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base"
                        maxLength={15}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}

            {/* ── Username Step (name only, when phone already exists) ── */}
            {step === 'username' && (
              <form onSubmit={handleSetUsername} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Display Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="How should we call you?"
                      autoFocus
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Referral Code <span className="text-white/30 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                    placeholder="Friend's referral code"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base tracking-widest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Setting up...
                      </>
                    ) : (
                      <>
                        Start Playing
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </>
                    )}
                  </span>
                </button>
                <p className="text-white/30 text-xs text-center">
                  This name will be visible to other players.
                </p>
              </form>
            )}

            {/* ── Divider + info (mobile only) ── */}
            <div className="lg:hidden mt-8 pt-6 border-t border-white/5">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: '🎮', val: '3 Games', label: 'To Play' },
                  { icon: '🔒', val: 'Secure', label: 'Platform' },
                  { icon: '💰', val: 'Instant', label: 'Payouts' },
                ].map((t, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-lg mb-0.5">{t.icon}</div>
                    <p className="text-white text-xs font-bold">{t.val}</p>
                    <p className="text-white/30 text-[10px]">{t.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/20 text-xs text-center mt-4">
                18+ | Play Responsibly
              </p>
            </div>
          </div>
        </div>

        {/* Desktop footer */}
        <div className="hidden lg:block px-10 xl:px-14 py-6 text-white/20 text-xs">
          18+ | Play Responsibly | <Link to="/terms" className="hover:text-white/40 transition-colors">Terms & Conditions</Link>
        </div>
      </div>

      {/* ═══ Static bottom navbar (only Home clickable) ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e] border-t border-white/10 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 relative">
          <div className="flex flex-col items-center py-2 px-3 min-w-[56px]">
            <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>
            <span className="text-[10px] mt-0.5 text-white/30">Money</span>
          </div>
          <div className="flex flex-col items-center py-2 px-3 min-w-[56px]">
            <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            <span className="text-[10px] mt-0.5 text-white/30">Ludo</span>
          </div>
          <Link to="/landing" className="relative -mt-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </div>
            <span className="text-[10px] mt-0.5 font-medium text-white/60">Home</span>
          </Link>
          <div className="flex flex-col items-center py-2 px-3 min-w-[56px]">
            <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            <span className="text-[10px] mt-0.5 text-white/30">Alerts</span>
          </div>
          <div className="flex flex-col items-center py-2 px-3 min-w-[56px]">
            <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            <span className="text-[10px] mt-0.5 text-white/30">Profile</span>
          </div>
        </div>
      </nav>

      {/* ── CSS ── */}
      <style>{`
        @keyframes floatP {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(8px); opacity: 0.6; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-30px) translateX(12px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Login;
