import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ContactUs = () => {
  return (
    <>
      <Helmet>
        <title>Contact Us - RushkroLudo | Customer Support</title>
        <meta name="description" content="Contact RushkroLudo for any queries, payment issues, or game support. Reach us via Instagram, Telegram, or in-app support. We're here to help 24/7." />
        <meta name="keywords" content="RushkroLudo contact, customer support, help, payment issue, game support" />
        <link rel="canonical" href="https://rushkroludo.com/contact" />
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
            Contact <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Us</span>
          </h1>

          <div className="space-y-8 text-white/80 text-lg leading-relaxed">
            <p>Have questions or need help? We're here for you! Reach out to the RushkroLudo team through any of the following channels.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <a href="https://www.instagram.com/rushkroludo/" target="_blank" rel="noopener noreferrer" className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/30 transition-all block">
                <div className="text-4xl mb-3">&#x1F4F7;</div>
                <h2 className="text-xl font-bold text-white mb-2">Instagram</h2>
                <p className="text-white/60">@rushkroludo</p>
                <p className="text-pink-400 mt-2 text-sm font-semibold">Follow us for updates & offers</p>
              </a>

              <a href="https://t.me/rushkroludo" target="_blank" rel="noopener noreferrer" className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-500/30 transition-all block">
                <div className="text-4xl mb-3">&#x2708;</div>
                <h2 className="text-xl font-bold text-white mb-2">Telegram</h2>
                <p className="text-white/60">@rushkroludo</p>
                <p className="text-blue-400 mt-2 text-sm font-semibold">Join our community</p>
              </a>

              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-4xl mb-3">&#x1F4AC;</div>
                <h2 className="text-xl font-bold text-white mb-2">In-App Support</h2>
                <p className="text-white/60">Login to RushkroLudo and go to Support section</p>
                <p className="text-violet-400 mt-2 text-sm font-semibold">24/7 available</p>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-4xl mb-3">&#x1F310;</div>
                <h2 className="text-xl font-bold text-white mb-2">Website</h2>
                <p className="text-white/60">rushkroludo.com</p>
                <p className="text-violet-400 mt-2 text-sm font-semibold">Play games & win real cash</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">Common Queries</h2>
              <div className="space-y-3">
                <p><strong className="text-white">Payment not received?</strong> — Contact us on Instagram or Telegram with your transaction ID</p>
                <p><strong className="text-white">Withdrawal pending?</strong> — Withdrawals are usually instant. If delayed, reach out via support</p>
                <p><strong className="text-white">Account issues?</strong> — DM us on Instagram with your registered email</p>
                <p><strong className="text-white">Game bug?</strong> — Screenshot the issue and send it to us via Telegram</p>
              </div>
            </div>

            <div className="text-center pt-8">
              <Link to="/login" className="inline-block px-10 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 transition-all hover:scale-[1.02]">
                Join RushkroLudo Now
              </Link>
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

export default ContactUs;
