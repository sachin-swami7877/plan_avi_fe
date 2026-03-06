import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - RushkroLudo</title>
        <meta name="description" content="RushkroLudo Privacy Policy. Learn how we protect your data, handle payments securely, and ensure safe gaming experience." />
        <link rel="canonical" href="https://rushkroludo.com/privacy" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#1a1a2e] to-[#0f0f1e] text-white">
        <header className="border-b border-white/5">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <span className="text-lg font-bold">R</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight">Rushkro<span className="text-violet-400">Ludo</span></span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/login" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 transition-all">Play Now</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <h1 className="text-4xl sm:text-5xl font-black mb-8">
            Privacy <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Policy</span>
          </h1>

          <div className="space-y-8 text-white/80 text-lg leading-relaxed">
            <p>Last updated: March 2026</p>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">Information We Collect</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Mobile numner for account creation and login</li>
                <li>UPI details for deposits and withdrawals</li>
                <li>Game activity and transaction history</li>
                <li>Device information for security purposes</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">How We Use Your Information</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>To provide and maintain our gaming services</li>
                <li>To process deposits and withdrawal requests</li>
                <li>To send important notifications about your account</li>
                <li>To prevent fraud and ensure fair gameplay</li>
                <li>To improve our platform and user experience</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">Data Security</h2>
              <p>We use industry-standard encryption and security measures to protect your personal information and financial data. All transactions are processed through secure payment like PhonePay,Google Pay,Paytm</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
              <p>If you have any questions about our privacy policy, please contact us through our in-app support or visit our <Link to="/contact" className="text-violet-400 hover:underline">Contact page</Link>.</p>
              <p className="mt-2">Instagram: <a href="https://www.instagram.com/rushkroludo/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">@rushkroludo</a></p>
            </div>
          </div>
        </main>

        <footer className="border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-extrabold">Rushkro<span className="text-violet-400">Ludo</span></span>
              <div className="flex items-center gap-6 text-sm text-white/40">
                <Link to="/about" className="hover:text-white/70">About</Link>
                <Link to="/privacy" className="hover:text-white/70">Privacy Policy</Link>
                <Link to="/how-to-play" className="hover:text-white/70">How to Play</Link>
                <Link to="/contact" className="hover:text-white/70">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PrivacyPolicy;
