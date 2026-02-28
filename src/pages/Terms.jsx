import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const Terms = () => {
  const [terms, setTerms] = useState({ termsGeneral: '', termsDeposit: '', termsWithdrawal: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsAPI.getTerms()
      .then((res) => setTerms(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pb-20 overflow-x-hidden">
      <Header />
      <div className="max-w-md mx-auto p-4 w-full min-w-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Terms & Conditions</h1>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-4">
            {/* Payment Instructions — same as wallet popup */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-2 text-base">💰 जमा कैसे करें (Deposit)</h4>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                सबसे पहले अपने UPI ऐप में जाकर यहाँ दिए गए QR कोड या UPI नंबर पर कम से कम ₹100 जमा करें। उसके बाद यहाँ वापस आकर जमा वाले भाग में UTR नंबर, स्क्रीनशॉट और कितनी राशि जमा की है — यह सब भरें। यह जानकारी एडमिन तक पहुँचेगी और एडमिन राशि वॉलेट में जोड़ देगा। मदद के लिए दिए गए सपोर्ट नंबर पर भी कॉल कर सकते हैं।
              </p>
         
            </div>

            <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
              <h4 className="font-bold text-rose-800 mb-2 text-base">🏦 निकासी कैसे करें (Withdrawal)</h4>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                जितनी राशि निकालनी है, कम से कम ₹100, उसका अनुरोध भेज दें। एडमिन दिए गए UPI नंबर पर राशि भेज देगा। मदद के लिए सपोर्ट से भी संपर्क कर सकते हैं।
              </p>
       
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-semibold text-sm leading-relaxed">
                ⚠️ एक दिन में अधिकतम 2 बार निकासी का अनुरोध कर सकते हैं।
              </p>
        
            </div>

            {/* General T&C from admin settings (if any) */}
            {terms.termsGeneral && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-3 text-base">📋 General Terms & Conditions</h4>
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {terms.termsGeneral}
                </div>
              </div>
            )}

            {!terms.termsGeneral && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-3 text-base">📋 General Terms & Conditions</h4>
                <p className="text-gray-400 text-sm text-center">Additional terms and conditions will be available soon.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default Terms;
