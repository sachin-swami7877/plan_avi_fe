import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const HowToPlay = () => {
  return (
    <>
      <Helmet>
        <title>How to Play - RushkroLudo | Ludo, Aviator & Spinner Guide</title>
        <meta name="description" content="Learn how to play Ludo King, Aviator crash game and Lucky Spinner on RushkroLudo. Step-by-step guide to win real cash. Download and start playing now!" />
        <meta name="keywords" content="how to play RushkroLudo, rushkroludo, Rushkro Ludo, Rush Kro Ludo, RushLudo, rushludo, Rush Ludo, RushKro, rushkro, Ludo Rush, LudoRush, Ludo King guide, Aviator game tips, how to win real cash, online Ludo, crash game guide, rushkroludo kaise khele, ludo kaise khele, aviator game kaise khele" />
        <link rel="canonical" href="https://rushkroludo.com/how-to-play" />
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
            How to <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Play</span>
          </h1>

          <div className="space-y-8 text-white/80 text-lg leading-relaxed">

            {/* Getting Started */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">Getting Started on RushkroLudo</h2>
              <ol className="space-y-3 list-decimal list-inside">
                <li><strong className="text-white">Visit</strong> <a href="https://rushkroludo.com" className="text-violet-400 hover:underline">rushkroludo.com</a> on your mobile or desktop</li>
                <li><strong className="text-white">Sign Up</strong> with your email address</li>
                <li><strong className="text-white">Add Money</strong> to your wallet using UPI (Google Pay, PhonePe, Paytm)</li>
                <li><strong className="text-white">Choose a Game</strong> — Ludo, Aviator, or Spinner</li>
                <li><strong className="text-white">Win & Withdraw</strong> — Cash out instantly to your UPI</li>
              </ol>
            </div>

            {/* Ludo */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">&#x1F3B2; How to Play Ludo King</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Select Ludo from the home screen</li>
                <li>Choose your bet amount (minimum Rs 50)</li>
                <li>Get matched with a real player</li>
                <li>Roll the dice and move your tokens to the finish</li>
                <li>Winner takes the prize pool!</li>
              </ul>
              <p className="mt-4 text-violet-400 font-semibold">Tip: Move all 4 tokens strategically. Don't keep all tokens in one path!</p>
            </div>

            {/* Aviator */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">&#x1F680; How to Play Aviator Crash Game</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Place your bet before the round starts</li>
                <li>Watch the multiplier go up (1.00x, 1.50x, 2.00x...)</li>
                <li>Cash out before the plane crashes!</li>
                <li>The longer you wait, the higher the multiplier — but risk increases</li>
                <li>If the plane crashes before you cash out, you lose your bet</li>
              </ul>
              <p className="mt-4 text-violet-400 font-semibold">Tip: Start with small bets. Cash out at 1.5x-2x for consistent wins!</p>
            </div>

            {/* Spinner */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">&#x1F3AF; How to Play Lucky Spinner</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Go to the Spinner section</li>
                <li>Use your spin tokens or buy spins</li>
                <li>Spin the wheel and win cash prizes</li>
                <li>Prizes are credited instantly to your wallet</li>
              </ul>
            </div>

            {/* Withdrawal */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">How to Withdraw Money</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Go to Wallet section</li>
                <li>Click on "Withdraw"</li>
                <li>Enter your UPI ID and amount</li>
                <li>Money will be sent to your bank within minutes</li>
              </ol>
            </div>

            {/* FAQ */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-white">Is RushkroLudo safe?</h3>
                  <p>Yes! RushkroLudo uses secure payment gateways and encrypted connections to protect your data and money.</p>
                </div>
                <div>
                  <h3 className="font-bold text-white">What is the minimum deposit?</h3>
                  <p>Minimum deposit is Rs 100. Aviator bets start from Rs 10 and Ludo bets start from Rs 50.</p>
                </div>
                <div>
                  <h3 className="font-bold text-white">How fast are withdrawals?</h3>
                  <p>Withdrawals are processed instantly via UPI. You'll receive money within minutes.</p>
                </div>
                <div>
                  <h3 className="font-bold text-white">Can I play on mobile?</h3>
                  <p>Yes! RushkroLudo works perfectly on all mobile browsers. You can also install it as an app from our website.</p>
                </div>
              </div>
            </div>

            <div className="text-center pt-8">
              <Link to="/login" className="inline-block px-10 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 transition-all hover:scale-[1.02]">
                Start Playing Now
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

export default HowToPlay;
