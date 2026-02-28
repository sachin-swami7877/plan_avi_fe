import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const Support = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState({ supportPhone: null, supportWhatsApp: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsAPI.getSupport()
      .then((res) => setInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pb-20 overflow-x-hidden">
      <Header />
      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Support</h1>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-4">
            {info.supportPhone && (
              <a href={`tel:${info.supportPhone}`} className="block bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-lg font-bold text-primary-700">{info.supportPhone}</p>
                <p className="text-xs text-gray-400 mt-1">Tap to call</p>
              </a>
            )}
            {info.supportWhatsApp && (
              <a href={`https://wa.me/${info.supportWhatsApp.replace(/[^0-9]/g, '')}`} rel="noopener noreferrer" className="block bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">WhatsApp</p>
                <p className="text-lg font-bold text-green-600">{info.supportWhatsApp}</p>
                <p className="text-xs text-gray-400 mt-1">Tap to chat on WhatsApp</p>
              </a>
            )}
            {!info.supportPhone && !info.supportWhatsApp && (
              <div className="bg-white rounded-xl p-6 text-center text-gray-400">
                Support contact not available yet. Please check back later.
              </div>
            )}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default Support;
