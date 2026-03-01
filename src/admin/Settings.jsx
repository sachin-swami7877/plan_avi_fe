import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { socket } = useSocket();
  const [betsEnabled, setBetsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Extended settings
  const [upiId, setUpiId] = useState('');
  const [upiNumber, setUpiNumber] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportWhatsApp, setSupportWhatsApp] = useState('');
  const [bonusMinBet, setBonusMinBet] = useState(1000);
  const [bonusCashback, setBonusCashback] = useState(100);
  const [termsGeneral, setTermsGeneral] = useState('');
  const [dummyUserCount, setDummyUserCount] = useState(10);
  const [layout, setLayout] = useState(false);
  const [ludoGameDurationMinutes, setLudoGameDurationMinutes] = useState(30);
  const [ludoDummyRunningBattles, setLudoDummyRunningBattles] = useState(15);
  // Ludo tiered commission
  const [ludoCommTier1Max, setLudoCommTier1Max] = useState(250);
  const [ludoCommTier1Pct, setLudoCommTier1Pct] = useState(10);
  const [ludoCommTier2Max, setLudoCommTier2Max] = useState(600);
  const [ludoCommTier2Pct, setLudoCommTier2Pct] = useState(8);
  const [ludoCommTier3Pct, setLudoCommTier3Pct] = useState(5);
  const [userWarning, setUserWarning] = useState('');
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);
  const [withdrawalDisableReason, setWithdrawalDisableReason] = useState('');
  // Ludo toggle & warning
  const [ludoEnabled, setLudoEnabled] = useState(true);
  const [ludoDisableReason, setLudoDisableReason] = useState('');
  const [ludoWarning, setLudoWarning] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (socket) {
      socket.on('settings:bets-enabled', (data) => setBetsEnabled(data.enabled));
      return () => { socket.off('settings:bets-enabled'); };
    }
  }, [socket]);

  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getSettings();
      const d = res.data;
      setBetsEnabled(d.betsEnabled);
      setUpiId(d.upiId || '');
      setUpiNumber(d.upiNumber || '');
      setSupportPhone(d.supportPhone || '');
      setSupportWhatsApp(d.supportWhatsApp || '');
      setBonusMinBet(d.bonusMinBet || 1000);
      setBonusCashback(d.bonusCashback || 100);
      setTermsGeneral(d.termsGeneral || '');
      setDummyUserCount(d.dummyUserCount || 10);
      setLayout(d.layout ?? false);
      setLudoGameDurationMinutes(d.ludoGameDurationMinutes ?? 30);
      setLudoDummyRunningBattles(d.ludoDummyRunningBattles ?? 15);
      setLudoCommTier1Max(d.ludoCommTier1Max ?? 250);
      setLudoCommTier1Pct(d.ludoCommTier1Pct ?? 10);
      setLudoCommTier2Max(d.ludoCommTier2Max ?? 600);
      setLudoCommTier2Pct(d.ludoCommTier2Pct ?? 8);
      setLudoCommTier3Pct(d.ludoCommTier3Pct ?? 5);
      setUserWarning(d.userWarning || '');
      setWithdrawalsEnabled(d.withdrawalsEnabled ?? true);
      setWithdrawalDisableReason(d.withdrawalDisableReason || '');
      setLudoEnabled(d.ludoEnabled ?? true);
      setLudoDisableReason(d.ludoDisableReason || '');
      setLudoWarning(d.ludoWarning || '');
      setQrCodeUrl(d.qrCodeUrl || null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally { setLoading(false); }
  };

  const handleToggleBets = async () => {
    const newValue = !betsEnabled;
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      await adminAPI.updateSettings({ betsEnabled: newValue });
      setBetsEnabled(newValue);
      toast.success(`Bets ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update bets setting');
    } finally { setSaving(false); }
  };

  const handleSavePayment = async () => {
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      await adminAPI.updateSettings({ upiId, upiNumber });
      toast.success('Payment settings saved successfully');
    } catch (error) { 
      toast.error('Failed to save payment settings');
    }
    finally { setSaving(false); }
  };

  const handleSaveSupport = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings({ supportPhone, supportWhatsApp });
      toast.success('Support settings saved successfully');
    } catch { 
      toast.error('Failed to save support settings');
    }
    finally { setSaving(false); }
  };

  const handleSaveBonus = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings({ bonusMinBet: Number(bonusMinBet), bonusCashback: Number(bonusCashback) });
      toast.success('Bonus settings saved successfully');
    } catch { 
      toast.error('Failed to save bonus settings');
    }
    finally { setSaving(false); }
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings({ termsGeneral });
      toast.success('Terms & Conditions saved successfully');
    } catch { 
      toast.error('Failed to save terms & conditions');
    }
    finally { setSaving(false); }
  };

  const handleSaveDummyUsers = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings({ dummyUserCount: Number(dummyUserCount) });
      toast.success('Dummy user count saved successfully');
    } catch { 
      toast.error('Failed to save dummy user count');
    }
    finally { setSaving(false); }
  };

  const handleSaveLudo = async () => {
    const duration = Number(ludoGameDurationMinutes);
    const dummy = Number(ludoDummyRunningBattles);
    if (duration < 5 || duration > 120) {
      toast.error('Duration: enter between 5 and 120 minutes');
      return;
    }
    if (dummy < 0 || dummy > 50) {
      toast.error('Dummy battles: enter between 0 and 50');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.updateSettings({
        ludoGameDurationMinutes: duration,
        ludoDummyRunningBattles: dummy,
        ludoCommTier1Max: Number(ludoCommTier1Max),
        ludoCommTier1Pct: Number(ludoCommTier1Pct),
        ludoCommTier2Max: Number(ludoCommTier2Max),
        ludoCommTier2Pct: Number(ludoCommTier2Pct),
        ludoCommTier3Pct: Number(ludoCommTier3Pct),
      });
      toast.success('Ludo settings saved');
    } catch {
      toast.error('Failed to save');
    }
    finally { setSaving(false); }
  };

  const handleUploadQr = async () => {
    if (!qrFile) return;
    setQrUploading(true);
    try {
      const fd = new FormData();
      fd.append('qrCode', qrFile);
      const res = await adminAPI.uploadQrCode(fd);
      setQrCodeUrl(res.data.qrCodeUrl);
      setQrFile(null);
      toast.success('QR code uploaded successfully');
    } catch { 
      toast.error('Failed to upload QR code');
    }
    finally { setQrUploading(false); }
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      {/* Bets Toggle */}
      <Section title="Run the Bets" desc={betsEnabled ? 'Bets are currently enabled.' : 'Bets are disabled.'}>
        <button onClick={handleToggleBets} disabled={saving}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${betsEnabled ? 'bg-emerald-600' : 'bg-gray-300'} ${saving ? 'opacity-50' : ''}`}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${betsEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
        </button>
      </Section>

      {/* Withdrawals Toggle */}
      <Section title="Withdrawals" desc={withdrawalsEnabled ? 'Users can submit withdrawal requests.' : 'Withdrawals are disabled — users cannot request withdrawals.'}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Allow Withdrawals</p>
          <button
            onClick={async () => {
              const newValue = !withdrawalsEnabled;
              const oldValue = withdrawalsEnabled;
              setWithdrawalsEnabled(newValue);
              setSaving(true);
              try {
                await adminAPI.updateSettings({ withdrawalsEnabled: newValue });
                toast.success(`Withdrawals ${newValue ? 'enabled' : 'disabled'} successfully`);
              } catch {
                toast.error('Failed to update withdrawal setting');
                setWithdrawalsEnabled(oldValue);
              }
              finally { setSaving(false); }
            }}
            disabled={saving}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${withdrawalsEnabled ? 'bg-emerald-600' : 'bg-gray-300'} ${saving ? 'opacity-50' : ''}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${withdrawalsEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
        {!withdrawalsEnabled && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Reason shown to users</label>
            <textarea
              rows={2}
              value={withdrawalDisableReason}
              onChange={(e) => setWithdrawalDisableReason(e.target.value)}
              placeholder="e.g. Withdrawals are temporarily paused for maintenance"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  await adminAPI.updateSettings({ withdrawalDisableReason });
                  toast.success('Reason saved');
                } catch { toast.error('Failed to save reason'); }
                finally { setSaving(false); }
              }}
              disabled={saving}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Save Reason
            </button>
          </div>
        )}
      </Section>

      {/* Payment QR & UPI */}
      <Section title="Payment QR & UPI" desc="QR code and UPI details shown on user deposit page.">
        <div className="space-y-3">
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR" className="w-40 h-40 object-contain rounded-lg border" />}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files[0])} className="text-sm w-full sm:w-auto" />
            <button onClick={handleUploadQr} disabled={!qrFile || qrUploading} className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 w-full sm:w-auto">
              {qrUploading ? 'Uploading...' : 'Upload QR'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
              <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI Number</label>
              <input type="text" value={upiNumber} onChange={(e) => setUpiNumber(e.target.value)} placeholder="9876543210" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <button onClick={handleSavePayment} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save Payment Settings</button>
        </div>
      </Section>

      {/* Support */}
      <Section title="Support Contact" desc="Phone and WhatsApp number shown on user profile.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
            <input type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} placeholder="Phone number" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input type="text" value={supportWhatsApp} onChange={(e) => setSupportWhatsApp(e.target.value)} placeholder="WhatsApp number" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <button onClick={handleSaveSupport} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save Support</button>
      </Section>

      {/* User Warning */}
      <Section title="User Warning" desc="Warning message shown on user dashboard above games.">
        <textarea rows={3} value={userWarning} onChange={(e) => setUserWarning(e.target.value)} placeholder="Enter warning message (leave empty to hide)" className="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
        <button onClick={async () => {
          setSaving(true);
          try {
            await adminAPI.updateSettings({ userWarning });
            toast.success('User warning saved');
          } catch { toast.error('Failed to save user warning'); }
          finally { setSaving(false); }
        }} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save Warning</button>
      </Section>

      {/* Bonus */}
      <Section title="Bonus / Cashback" desc="Set cumulative bet threshold and cashback amount.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bet Threshold (₹)</label>
            <input type="number" value={bonusMinBet} onChange={(e) => setBonusMinBet(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cashback Amount (₹)</label>
            <input type="number" value={bonusCashback} onChange={(e) => setBonusCashback(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <button onClick={handleSaveBonus} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save Bonus Settings</button>
      </Section>

      {/* Ludo */}
      <Section title="Ludo Game" desc="Game duration and dummy running battles shown on user app.">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration time (minutes)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={ludoGameDurationMinutes}
                onChange={(e) => setLudoGameDurationMinutes(e.target.value)}
                className="w-28 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dummy Ludo live battles (running battles)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={ludoDummyRunningBattles}
                onChange={(e) => setLudoDummyRunningBattles(e.target.value)}
                className="w-28 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <button onClick={handleSaveLudo} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save</button>
          </div>
        </div>
        {/* Commission Tiers */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">Commission Tiers (Ludo)</p>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-2">Tier 1: Entry up to ₹</p>
              <div className="flex gap-2 items-center">
                <input type="number" value={ludoCommTier1Max} onChange={(e) => setLudoCommTier1Max(e.target.value)} className="w-24 px-2 py-1.5 border rounded text-sm" />
                <span className="text-sm text-gray-600">→</span>
                <input type="number" value={ludoCommTier1Pct} onChange={(e) => setLudoCommTier1Pct(e.target.value)} className="w-20 px-2 py-1.5 border rounded text-sm" />
                <span className="text-sm text-gray-600">% commission</span>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs font-medium text-purple-700 mb-2">Tier 2: Entry ₹{Number(ludoCommTier1Max)+1} to ₹</p>
              <div className="flex gap-2 items-center">
                <input type="number" value={ludoCommTier2Max} onChange={(e) => setLudoCommTier2Max(e.target.value)} className="w-24 px-2 py-1.5 border rounded text-sm" />
                <span className="text-sm text-gray-600">→</span>
                <input type="number" value={ludoCommTier2Pct} onChange={(e) => setLudoCommTier2Pct(e.target.value)} className="w-20 px-2 py-1.5 border rounded text-sm" />
                <span className="text-sm text-gray-600">% commission</span>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 mb-2">Tier 3: Entry above ₹{ludoCommTier2Max}</p>
              <div className="flex gap-2 items-center">
                <input type="number" value={ludoCommTier3Pct} onChange={(e) => setLudoCommTier3Pct(e.target.value)} className="w-20 px-2 py-1.5 border rounded text-sm" />
                <span className="text-sm text-gray-600">% commission</span>
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await adminAPI.updateSettings({
                  ludoCommTier1Max: Number(ludoCommTier1Max),
                  ludoCommTier1Pct: Number(ludoCommTier1Pct),
                  ludoCommTier2Max: Number(ludoCommTier2Max),
                  ludoCommTier2Pct: Number(ludoCommTier2Pct),
                  ludoCommTier3Pct: Number(ludoCommTier3Pct),
                });
                toast.success('Commission tiers saved');
              } catch { toast.error('Failed to save commission tiers'); }
              finally { setSaving(false); }
            }}
            disabled={saving}
            className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Save Commission
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Duration: minutes from game start to expiry. Dummy battles: user app shows this many fake running battles (random 10–N). Names/amounts refresh every 15 min.</p>
      </Section>

      {/* Ludo Toggle */}
      <Section title="Ludo Matches" desc={ludoEnabled ? 'Users can create & join Ludo matches.' : 'Ludo matches are disabled — users cannot create or join.'}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Allow Ludo Matches</p>
          <button
            onClick={async () => {
              const newValue = !ludoEnabled;
              const oldValue = ludoEnabled;
              setLudoEnabled(newValue);
              setSaving(true);
              try {
                await adminAPI.updateSettings({ ludoEnabled: newValue });
                toast.success(`Ludo ${newValue ? 'enabled' : 'disabled'} successfully`);
              } catch {
                toast.error('Failed to update Ludo setting');
                setLudoEnabled(oldValue);
              }
              finally { setSaving(false); }
            }}
            disabled={saving}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${ludoEnabled ? 'bg-emerald-600' : 'bg-gray-300'} ${saving ? 'opacity-50' : ''}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${ludoEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
        {!ludoEnabled && (
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-gray-700">Reason shown to users</label>
            <textarea
              rows={2}
              value={ludoDisableReason}
              onChange={(e) => setLudoDisableReason(e.target.value)}
              placeholder="e.g. Ludo matches are temporarily paused for maintenance"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  await adminAPI.updateSettings({ ludoDisableReason });
                  toast.success('Reason saved');
                } catch { toast.error('Failed to save reason'); }
                finally { setSaving(false); }
              }}
              disabled={saving}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Save Reason
            </button>
          </div>
        )}
        <div className="border-t border-gray-200 pt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ludo Warning (shown on Ludo page)</label>
          <textarea
            rows={2}
            value={ludoWarning}
            onChange={(e) => setLudoWarning(e.target.value)}
            placeholder="Enter warning message (leave empty to hide)"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await adminAPI.updateSettings({ ludoWarning });
                toast.success('Ludo warning saved');
              } catch { toast.error('Failed to save warning'); }
              finally { setSaving(false); }
            }}
            disabled={saving}
            className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Save Warning
          </button>
        </div>
      </Section>

      {/* Terms & Conditions */}
      <Section title="Terms & Conditions" desc="General T&C shown on the user-facing Terms page.">
        <textarea rows={6} value={termsGeneral} onChange={(e) => setTermsGeneral(e.target.value)} placeholder="Enter terms and conditions..." className="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
        <button onClick={handleSaveTerms} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save Terms</button>
      </Section>

      {/* Dummy Users */}
      <Section title="Dummy Users" desc="Number of dummy users shown in the Aviator game. Only 33% will show cashout.">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Dummy User Count</label>
          <input 
            type="number" 
            value={dummyUserCount} 
            onChange={(e) => setDummyUserCount(e.target.value)} 
            min="0"
            max="100"
            className="w-full px-3 py-2 border rounded-lg text-sm" 
          />
          <p className="text-xs text-gray-500 mt-1">Current: {dummyUserCount} dummy users (33% will cashout)</p>
        </div>
        <button onClick={handleSaveDummyUsers} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save Dummy User Count</button>
      </Section>

      {/* Landing Page Layout */}
      <Section title="Landing Page Layout" desc="Enable motivational layout instead of game layout on landing page.">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Motivational Layout</p>
              <p className="text-xs text-gray-500 mt-0.5">Show motivational content instead of game features</p>
            </div>
            <button 
              onClick={async () => {
                const newLayout = !layout;
                const oldLayout = layout;
                setLayout(newLayout);
                setSaving(true);
                try {
                  await adminAPI.updateSettings({ layout: Boolean(newLayout) });
                  toast.success(`Landing page layout ${newLayout ? 'enabled' : 'disabled'} successfully`);
                } catch { 
                  toast.error('Failed to save layout setting');
                  setLayout(oldLayout); // Revert on error
                }
                finally { setSaving(false); }
              }}
              disabled={saving}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${layout ? 'bg-emerald-600' : 'bg-gray-300'} ${saving ? 'opacity-50' : ''}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${layout ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
};

const Section = ({ title, desc, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
      </div>
    </div>
    {children}
  </div>
);

export default Settings;
