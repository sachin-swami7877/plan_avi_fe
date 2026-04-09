import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getToken, setToken, removeToken } from '../utils/cookies';

const AuthContext = createContext();

// Fallback returned during Vite HMR when provider briefly unmounts
const HMR_FALLBACK = {
  user: null, loading: true, login: () => {}, logout: () => {},
  updateBalance: () => {}, refreshUser: async () => {}, patchUser: () => {},
  isAuthenticated: false, isAdmin: false, isSubAdmin: false,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // During Vite HMR, context may briefly be unavailable — return safe defaults
    // instead of crashing the whole app
    if (import.meta.hot) return HMR_FALLBACK;
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken() || localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      // Set cached user immediately so balance/UI shows instantly.
      // But keep loading=true until getMe() confirms token is valid (for routing).
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
      authAPI.getMe()
        .then(res => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            removeToken();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            if (err.response?.data?.forceLogout) {
              localStorage.setItem('logoutReason', 'You have been logged out because your account was logged in from another device.');
            }
          } else {
            // Network error or server down — trust cached data so user isn't logged out
            try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
          }
        })
        .finally(() => setLoading(false));
    } else {
      // No token — clean up any leftover data
      if (token && !savedUser) { removeToken(); localStorage.removeItem('token'); }
      if (!token && savedUser) { localStorage.removeItem('user'); }
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    setToken(token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Listen for forced logout from API interceptor (401 on any API call)
  useEffect(() => {
    const handleForceLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const updateBalance = (data) => {
    if (user) {
      const patch = typeof data === 'object' ? data : { walletBalance: data };
      const updatedUser = { ...user, ...patch };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Instantly merge partial fields into user state (e.g. kycStatus from socket)
  const patchUser = (fields) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return res.data;
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      updateBalance,
      refreshUser,
      patchUser,
      isAuthenticated: !!user,
      isSuperAdmin: user?.isSuperAdmin || user?.role === 'superadmin',
      isAdmin: user?.isAdmin || user?.isSuperAdmin || user?.role === 'admin' || user?.role === 'superadmin',
      isSubAdmin: user?.isSubAdmin || user?.isSuperAdmin || user?.role === 'manager' || user?.role === 'admin' || user?.role === 'superadmin',
      role: (user?.role === 'superadmin' || user?.isSuperAdmin) ? 'superadmin'
        : (user?.role === 'admin' || user?.isAdmin) ? 'admin'
        : (user?.role === 'manager' || user?.isSubAdmin) ? 'manager'
        : 'user'
    }}>
      {children}
    </AuthContext.Provider>
  );
};
