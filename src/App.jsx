import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import usePushNotifications from './hooks/usePushNotifications';
import NotificationPermissionPrompt from './components/NotificationPermissionPrompt';

// User Pages
import Login from './pages/Login';
import FindEmail from './pages/FindEmail';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Aviator from './pages/Aviator';
import Wallet from './pages/Wallet';
import History from './pages/History';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Spinner from './pages/Spinner';
import SpinnerRecords from './pages/SpinnerRecords';
import Ludo from './pages/Ludo';
import LudoMatchDetail from './pages/LudoMatchDetail';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Bonus from './pages/Bonus';
import PaymentInfo from './pages/PaymentInfo';
import WalletRecords from './pages/WalletRecords';
import Referral from './pages/Referral';
import AviatorPublic from './pages/AviatorPublic';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import HowToPlay from './pages/HowToPlay';
import ContactUs from './pages/ContactUs';

// Admin Pages
import AdminLogin from './admin/Login';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/Dashboard';
import AdminUsers from './admin/Users';
import AdminMoneyRequests from './admin/MoneyRequests';
import AdminBets from './admin/Bets';
import AdminWinsBets from './admin/WinsBets';
import AdminNotifications from './admin/Notifications';
import AdminSpinnerRecords from './admin/SpinnerRecords';
import AdminSettings from './admin/Settings';
import AdminBonusRecords from './admin/BonusRecords';
import AdminLudo from './admin/AdminLudo';
import AdminUserDetail from './admin/AdminUserDetail';
import AdminUserTransactions from './admin/AdminUserTransactions';
import AdminProfile from './admin/AdminProfile';
import AdminProfit from './admin/AdminProfit';
import AdminDatabase from './admin/AdminDatabase';
import AdminKyc from './admin/AdminKyc';
import AdminCreditLog from './admin/AdminCreditLog';
import AdminReferral from './admin/AdminReferral';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAuthenticated, isAdmin, isSubAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin && !isSubAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Admin Public Route (for admin login page)
const AdminPublicRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin, isSubAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (isAuthenticated && (isAdmin || isSubAdmin)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin, isSubAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  // Redirect logged-in users to dashboard
  if (isAuthenticated) {
    return <Navigate to={(isAdmin || isSubAdmin) ? "/admin" : "/dashboard"} replace />;
  }

  return children;
};

// Landing Route - accessible by everyone (authenticated or not)
const LandingRoute = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return children;
};

// Public Game Route — redirect authenticated users to the real game page
const PublicGameRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/aviator" replace />;
  }

  return children;
};

// Component to block subadmin from accessing settings
const SubAdminBlock = ({ children }) => {
  const { isSubAdmin, isAdmin } = useAuth();
  
  if (isSubAdmin && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// Global toast for broadcast notifications — works on any page
function BroadcastToastListener() {
  const { newNotification, clearNotification } = useSocket();

  useEffect(() => {
    if (newNotification?.type === 'broadcast') {
      toast.custom((t) => (
        <div
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-sm cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            if (newNotification.websiteUrl) {
              window.open(newNotification.websiteUrl, '_blank', 'noopener,noreferrer');
            }
            toast.dismiss(t.id);
          }}
        >
          {newNotification.imageUrl && (
            <img src={newNotification.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
          )}
          <h3 className="font-bold text-gray-800">{newNotification.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{newNotification.message}</p>
          {newNotification.websiteUrl && <p className="text-xs text-blue-500 mt-2">Tap to open →</p>}
        </div>
      ), { duration: 8000, position: 'top-center' });
      clearNotification();
    }
  }, [newNotification, clearNotification]);

  return null;
}

function AppRoutes() {
  const { user } = useAuth();
  usePushNotifications(user);

  return (
    <>
    <BroadcastToastListener />
    <NotificationPermissionPrompt user={user} />
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/landing" element={
        <LandingRoute><Landing /></LandingRoute>
      } />
      <Route path="/find-email" element={
        <PublicRoute><FindEmail /></PublicRoute>
      } />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/how-to-play" element={<HowToPlay />} />
      <Route path="/contact" element={<ContactUs />} />

      {/* Protected User Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute><SocketProvider><Home /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/aviator" element={
        <ProtectedRoute><SocketProvider><Aviator /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute><SocketProvider><Wallet /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute><SocketProvider><History /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><SocketProvider><Notifications /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><SocketProvider><Profile /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/spinner" element={
        <ProtectedRoute><SocketProvider><Spinner /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/spinner-records" element={
        <ProtectedRoute><SocketProvider><SpinnerRecords /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/ludo" element={
        <ProtectedRoute><SocketProvider><Ludo /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/ludo/match/:id" element={
        <ProtectedRoute><SocketProvider><LudoMatchDetail /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/support" element={
        <ProtectedRoute><SocketProvider><Support /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/terms" element={
        <ProtectedRoute><SocketProvider><Terms /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/bonus" element={
        <ProtectedRoute><SocketProvider><Bonus /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/payment-info" element={
        <ProtectedRoute><SocketProvider><PaymentInfo /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/wallet-records" element={
        <ProtectedRoute><SocketProvider><WalletRecords /></SocketProvider></ProtectedRoute>
      } />
      <Route path="/referral" element={
        <ProtectedRoute><SocketProvider><Referral /></SocketProvider></ProtectedRoute>
      } />

      {/* Admin Login */}
      <Route path="/admin/login" element={
        <AdminPublicRoute><AdminLogin /></AdminPublicRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><SocketProvider><AdminLayout /></SocketProvider></ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="users/:id/transactions" element={<AdminUserTransactions />} />
        <Route path="money" element={<AdminMoneyRequests />} />
        <Route path="wallet-balance-request" element={<Navigate to="/admin/money" replace />} />
        <Route path="withdrawal-request" element={<Navigate to="/admin/money" replace />} />
        <Route path="bets" element={<AdminBets />} />
        <Route path="wins-bets" element={<AdminWinsBets />} />
        <Route path="spinner-records" element={<AdminSpinnerRecords />} />
        <Route path="bonus-records" element={<AdminBonusRecords />} />
        <Route path="ludo" element={<AdminLudo />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="profit" element={<SubAdminBlock><AdminProfit /></SubAdminBlock>} />
        <Route path="kyc" element={<SubAdminBlock><AdminKyc /></SubAdminBlock>} />
        <Route path="database" element={<SubAdminBlock><AdminDatabase /></SubAdminBlock>} />
        <Route path="credit-log" element={<SubAdminBlock><AdminCreditLog /></SubAdminBlock>} />
        <Route path="referrals" element={<SubAdminBlock><AdminReferral /></SubAdminBlock>} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={
          <SubAdminBlock>
            <AdminSettings />
          </SubAdminBlock>
        } />
      </Route>

      {/* Public Aviator (view-only for unauthenticated users) */}
      <Route path="/aviator-public" element={
        <PublicGameRoute><AviatorPublic /></PublicGameRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 3000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
