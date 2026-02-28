import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getToken, setToken, removeToken } from '../utils/cookies';

const AuthContext = createContext();

// Fallback returned during Vite HMR when provider briefly unmounts
const HMR_FALLBACK = {
  user: null, loading: true, login: () => {}, logout: () => {},
  updateBalance: () => {}, refreshUser: async () => {},
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
      setUser(JSON.parse(savedUser));
      // Verify token in background; only logout on 401 (invalid/expired)
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
          }
        })
        .finally(() => setLoading(false));
    } else {
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

  const updateBalance = (newBalance) => {
    if (user) {
      const updatedUser = { ...user, walletBalance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
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
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || user?.role === 'admin',
      isSubAdmin: user?.isSubAdmin || user?.role === 'manager' || user?.role === 'admin',
      role: (user?.role === 'admin' || user?.isAdmin) ? 'admin'
        : (user?.role === 'manager' || user?.isSubAdmin) ? 'manager'
        : 'user'
    }}>
      {children}
    </AuthContext.Provider>
  );
};
