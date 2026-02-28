import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

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
    return <Navigate to={adminOnly ? "/admin/login" : "/login"} replace />;
  }

  if (adminOnly && !isAdmin && !isSubAdmin) {
    return <Navigate to="/admin/login" replace />;
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

// Public Route (redirect if authenticated, but allow landing page)
const PublicRoute = ({ children, allowLanding = false }) => {
  const { isAuthenticated, loading, isAdmin, isSubAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  // For login/find-email pages, redirect if authenticated (don't allow access)
  if (isAuthenticated && !allowLanding) {
    return <Navigate to={(isAdmin || isSubAdmin) ? "/admin" : "/dashboard"} replace />;
  }

  // Allow landing page even if authenticated (user can still view it)
  if (allowLanding && isAuthenticated) {
    return children;
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

// Component to block subadmin from accessing settings
const SubAdminBlock = ({ children }) => {
  const { isSubAdmin, isAdmin } = useAuth();
  
  if (isSubAdmin && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <LandingRoute><Landing /></LandingRoute>
      } />
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/find-email" element={
        <PublicRoute><FindEmail /></PublicRoute>
      } />

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
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={
          <SubAdminBlock>
            <AdminSettings />
          </SubAdminBlock>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
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
