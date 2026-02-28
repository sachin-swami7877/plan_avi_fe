import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

/* ── Plane SVG ── */
const PlaneSvg = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M58 12L6 30l16 4 4 18 10-12 14 4z" fill="currentColor" opacity="0.9" />
    <path d="M58 12L22 34m0 0l4 18m-4-18L6 30" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
  </svg>
);

/* ── Particles ── */
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 10 }).map((_, i) => (
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

const FindEmail = () => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    setAccounts(null);
    setCopiedIdx(null);
    try {
      const res = await authAPI.findEmail(cleaned);
      setAccounts(res.data.accounts || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (email, idx) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(220,38,38,0.12),transparent)]" />
        <Particles />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <PlaneSvg className="w-4 h-4 text-white -rotate-12" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">Lean<span className="text-red-500">Aviator</span></span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm font-medium mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mb-2">Find Your Email</h1>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Forgot which email you used to sign up? Enter your mobile number and we'll find your registered account.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4 mb-6">
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
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ''));
                    setAccounts(null);
                    setError('');
                  }}
                  placeholder="Enter your 10-digit mobile number"
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find My Email
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Results */}
          {accounts && accounts.length > 0 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-sm text-emerald-400 font-semibold">
                  {accounts.length === 1 ? '1 account found' : `${accounts.length} accounts found`}
                </p>
              </div>

              {accounts.map((acc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white/70">
                          {acc.name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{acc.name || 'User'}</p>
                        <p className="text-white/60 text-sm font-mono truncate">{acc.fullEmail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(acc.fullEmail, idx)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        copiedIdx === idx
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {copiedIdx === idx ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Use this email button */}
              <Link
                to="/login"
                className="mt-4 block w-full py-3.5 rounded-xl font-bold text-sm text-center bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-600/20 hover:shadow-red-500/30 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  Go to Login
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </div>
          )}

          {/* Info tip */}
          {!accounts && (
            <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-400/60 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-white/40 text-xs leading-relaxed space-y-1.5">
                  <p>Make sure to enter the same mobile number you saved in your profile or UPI details.</p>
                  <p>If you still can't find your email, please contact support for help.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-white/20 text-xs">
        18+ | Play Responsibly
      </footer>

      <style>{`
        @keyframes floatP {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(8px); opacity: 0.6; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-30px) translateX(12px); opacity: 0.5; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FindEmail;
