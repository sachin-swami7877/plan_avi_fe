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
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <svg className="w-7 h-7" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="8" width="24" height="24" rx="5" fill="white" opacity="0.95"/>
                  <circle cx="9" cy="15" r="2.5" fill="#ef4444"/><circle cx="19" cy="15" r="2.5" fill="#ef4444"/>
                  <circle cx="14" cy="20" r="2.5" fill="#ef4444"/><circle cx="9" cy="25" r="2.5" fill="#ef4444"/>
                  <circle cx="19" cy="25" r="2.5" fill="#ef4444"/>
                  <path d="M30 4l8 5-14 9 6-14z" fill="white" opacity="0.85"/>
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight">Rushkro<span className="text-red-500">Ludo</span></span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/login" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 transition-all">Play Now</Link>
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
                <p><strong className="text-white">Payment not received?</strong> — Send your transaction ID on <a href="https://wa.me/919166821247" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">WhatsApp</a> or <a href="https://www.instagram.com/rushkroludo/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">Instagram @rushkroludo</a></p>
                <p><strong className="text-white">Withdrawal pending?</strong> — Withdrawals are usually instant. If delayed, call us at <a href="tel:+919166821247" className="text-violet-400 hover:underline">+91 9166821247</a> or message on <a href="https://wa.me/919166821247" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">WhatsApp</a></p>
                <p><strong className="text-white">Account issues?</strong> — DM us on <a href="https://www.instagram.com/rushkroludo/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">Instagram @rushkroludo</a> with your registered mobile number</p>
                <p><strong className="text-white">Game bug?</strong> — Screenshot the issue and send it via <a href="https://t.me/rushkroludo" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Telegram</a> or <a href="https://wa.me/919166821247" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">WhatsApp</a></p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">Direct Support</h2>
              <div className="grid grid-cols-3 gap-3">
                <a href="tel:+919166821247" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.05] border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <p className="font-bold text-white text-sm">Call Us</p>
                  <p className="text-white/50 text-xs">+91 9166821247</p>
                </a>
                <a href="https://wa.me/919166821247" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.05] border border-white/10 hover:border-green-500/40 hover:bg-green-500/10 transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <p className="font-bold text-white text-sm">WhatsApp</p>
                  <p className="text-white/50 text-xs">+91 9166821247</p>
                </a>
                <a href="https://www.instagram.com/rushkroludo/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.05] border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </div>
                  <p className="font-bold text-white text-sm">Instagram</p>
                  <p className="text-white/50 text-xs">@rushkroludo</p>
                </a>
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
              <span className="font-extrabold">Rushkro<span className="text-red-500">Ludo</span></span>
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
