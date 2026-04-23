import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { spinnerAPI } from '../services/api';

export default function ReferralSpinner() {
  const navigate = useNavigate();
  const [referralStatus, setReferralStatus] = useState({ offered: 0, remaining: 0 });

  useEffect(() => {
    spinnerAPI.getReferralStatus().then(res => {
      setReferralStatus(res.data || { offered: 0, remaining: 0 });
    }).catch(() => {});
  }, []);

  const canPlayFreeSpins = referralStatus.remaining >= 1;

  return (
    <button
      onClick={() => {
        if (canPlayFreeSpins) {
          navigate('/spinner');
        }
      }}
      disabled={!canPlayFreeSpins}
      className={`w-full flex items-center justify-between rounded-2xl p-4 shadow-md active:scale-95 transition-all ${
        canPlayFreeSpins
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 cursor-pointer'
          : 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden text-xl">
          🎡
        </div>
        <div className="text-left">
          <p className="text-white font-bold text-sm">Free Spinner Spins</p>
          <p className="text-white/70 text-xs">
            {canPlayFreeSpins ? (
              <>
                {Math.floor(referralStatus.offered)}
                {referralStatus.fractional > 0 && <span>.{referralStatus.fractional.split('.')[1]}</span>}
                {' '}spins earned
              </>
            ) : (
              'Earn spins by referring friends'
            )}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-bold text-sm">{referralStatus.remaining}</p>
        <p className="text-white/70 text-xs">{canPlayFreeSpins ? 'available' : 'no spins'}</p>
      </div>
    </button>
  );
}
