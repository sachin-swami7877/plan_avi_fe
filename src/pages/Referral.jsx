import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { referralAPI, spinnerAPI, settingsAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Referral = () => {
  const { refreshCommission, user } = useAuth();
  const [data, setData] = useState(null);
  const [referralSpins, setReferralSpins] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openUser, setOpenUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [spinnerComingSoon, setSpinnerComingSoon] = useState(false);

  const fetchData = () => {
    referralAPI.getMyReferral()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    spinnerAPI.getReferralStatus()
      .then(res => setReferralSpins(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
    settingsAPI.getAviatorStatus().then(res => {
      if (res.data?.spinnerComingSoon) setSpinnerComingSoon(true);
    }).catch(() => {});
  }, []);

  const handleCopy = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRedeem = async () => {
    if (redeeming || !data?.pendingAmount) return;
    setRedeeming(true);
    try {
      const res = await referralAPI.redeemCommission();
      toast.success(res.data.message || 'Commission redeemed!');
      fetchData();
      refreshCommission();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to redeem');
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-4 pt-4 pb-28">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Refer & Earn</h1>
        <p className="text-sm text-gray-500 mb-4">Earn 3-4% commission when your referred friend wins a Ludo match</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Referral Code Card */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-5 mb-4 text-white shadow-lg">
              <p className="text-primary-200 text-xs font-medium mb-1">YOUR REFERRAL CODE</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-3xl font-black tracking-widest">{data?.referralCode || '—'}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/20 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                >
                  {copied ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                  )}
                </button>
              </div>
              <p className="text-primary-200 text-xs mt-3 mb-3">Share this code with friends. When they register and win, you earn!</p>
              {data?.referralCode && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🎮 RushkroLudo pe khelo aur jeeto!\n\nMera referral code use karke register karo: *${data.referralCode}*\n\n👉 https://rushkroludo.com/login?referral_code=${data.referralCode}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Share on WhatsApp
                </a>
              )}
            </div>

            {/* Free Spins Card */}
            {referralSpins && (referralSpins.remaining > 0 || referralSpins.offered > 0) && (
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 shadow-sm text-white mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-white/80 mb-0.5">Free Spinner Spins</p>
                    <p className="text-3xl font-black">
                      {Math.floor(referralSpins.offered)}
                      {referralSpins.fractional > 0 && <span className="text-lg">.{referralSpins.fractional.split('.')[1]}</span>}
                    </p>
                    <p className="text-[10px] text-white/70 mt-0.5">Earned from referrals • No payment needed</p>
                  </div>
                  <Link
                    to="/spinner"
                    className="px-4 py-2 bg-white text-purple-600 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                  >
                    Use Spins →
                  </Link>
                </div>
                {referralSpins.remaining > 0 && (
                  <div className="pt-2 border-t border-white/30">
                    <p className="text-xs text-white/80">Available: <span className="font-semibold">{referralSpins.remaining} full spin{referralSpins.remaining !== 1 ? 's' : ''}</span></p>
                  </div>
                )}
              </div>
            )}

            {/* Pending Redemption Card */}
            {(data?.pendingAmount > 0 || data?.redeemedAmount > 0) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Pending Commission</p>
                    <p className="text-2xl font-black text-amber-600">₹{data?.pendingAmount ?? 0}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Added to play balance only (non-withdrawable)</p>
                  </div>
                  <button
                    onClick={handleRedeem}
                    disabled={redeeming || !data?.pendingAmount}
                    className="px-5 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    {redeeming ? 'Redeeming...' : 'Redeem'}
                  </button>
                </div>
                {data?.redeemedAmount > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Already Redeemed: <span className="font-semibold text-green-600">₹{data.redeemedAmount}</span></p>
                  </div>
                )}
              </div>
            )}

            {/* Referred Users Accordion — right after commission card */}
            {data?.referredUsers?.length > 0 ? (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Referred Friends ({data.referredUsers.length})</p>
                <div className="space-y-2">
                  {data.referredUsers.map((ru, idx) => {
                    const uid = ru.user?._id?.toString() || idx;
                    const isOpen = openUser === uid;
                    const pendingForUser = ru.commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commissionAmount, 0);
                    return (
                      <div key={uid} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                          onClick={() => setOpenUser(isOpen ? null : uid)}
                          className="w-full flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                              {ru.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-gray-800">{ru.user?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">
                                {ru.commissions.length} win{ru.commissions.length !== 1 ? 's' : ''} • Earned ₹{ru.totalEarned}
                                {pendingForUser > 0 && <span className="text-amber-500 ml-1">(₹{pendingForUser.toFixed(2)} pending)</span>}
                              </p>
                            </div>
                          </div>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
                            {ru.commissions.map((c) => (
                              <div key={c._id} className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-gray-600">Bet ₹{c.betAmount}</span>
                                  <span className="text-gray-400 ml-1.5">• {formatDate(c.createdAt)}</span>
                                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${c.status === 'redeemed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {c.status}
                                  </span>
                                </div>
                                <span className="text-green-600 font-semibold">+₹{c.commissionAmount} ({c.commissionPct}%)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100 mb-4">
                <div className="text-4xl mb-3">🎯</div>
                <p className="font-medium text-gray-600 mb-1">No referrals yet</p>
                <p className="text-xs">Share your code to start earning</p>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold text-gray-800">{data?.referredCount ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Friends Referred</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold text-green-600">₹{data?.totalEarned ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Earned</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">How it works</p>
              <ul className="space-y-1 text-xs list-disc list-inside">
                <li>Friend registers using your code</li>
                <li>Friend wins a Ludo match</li>
                <li>You earn <strong>3-4%</strong> of their entry fee as pending commission</li>
                <li>Tap <strong>Redeem</strong> to add it to your play balance</li>
                <li>Redeemed balance can be used to play </li>
              </ul>
            </div>

            {/* Ad Banner */}
            <div className="rounded-xl overflow-hidden shadow-sm mb-4">
              <img
                src="/ad.jpeg"
                alt="Promotional Banner"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* Spinner CTA */}
            {!spinnerComingSoon && (
              <Link
                to="/spinner"
                className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 mb-4 shadow-md active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                    <img src="/spinner.jpeg" alt="Spinner" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Play Spinner</p>
                    <p className="text-white/70 text-xs">Try your luck and win big!</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            )}
          </>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default Referral;
