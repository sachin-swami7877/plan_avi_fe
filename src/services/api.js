import axios from 'axios';
import { getToken, removeToken } from '../utils/cookies';

const BASE = import.meta.env.VITE_APP_ENVIRONMENT === 'production'
  ? import.meta.env.VITE_APP_PRODUCTION_API_URL
  : import.meta.env.VITE_APP_LOCAL_API_URL;
const API_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token from cookie (90-day session)
api.interceptors.request.use((config) => {
  const token = getToken() || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors: clear cookie/session only on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const isAdmin = window.location.pathname.startsWith('/admin');
      window.location.href = isAdmin ? '/admin/login' : '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendOTP: (email) => api.post('/auth/send-otp', { email: String(email || '').trim() }),
  sendOTPByPhone: (phone) => api.post('/auth/send-otp', {
    phone: String(phone || '').trim(),
    loginMode: 'mobile',
  }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', {
    email: String(email || '').trim(),
    otp: String(otp || '').trim(),
  }),
  verifyOTPByPhone: (phone, otp) => api.post('/auth/verify-otp', {
    phone: String(phone || '').trim(),
    otp: String(otp || '').trim(),
    loginMode: 'mobile',
  }),
  setUsername: (name) => api.put('/auth/set-username', { name }),
  updateProfile: (data) => api.put('/auth/profile', data),
  getMe: () => api.get('/auth/me'),
  findEmail: (phone) => api.post('/auth/find-email', { phone: String(phone || '').trim() }),
};

// Wallet API
export const walletAPI = {
  getPaymentInfo: () => api.get('/wallet/payment-info'),
  getBalance: () => api.get('/wallet/balance'),
  deposit: (formData) => api.post('/wallet/deposit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  withdraw: (amount) => api.post('/wallet/withdraw', { amount }),
  getWithdrawalInfo: () => api.get('/wallet/withdrawal-info'),
  getHistory: (params) => api.get('/wallet/history', { params }),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
};

// Game API
export const gameAPI = {
  getState: () => api.get('/game/state'),
  placeBet: (amount) => api.post('/game/bet', { amount }),
  cashOut: () => api.post('/game/cashout'),
  getHistory: (params) => api.get('/game/history', { params }),
  getRounds: () => api.get('/game/rounds'),
  getCurrentBets: () => api.get('/game/current-bets'),
};

// Spinner API
export const spinnerAPI = {
  play: () => api.post('/spinner/play'),
  getHistory: (params) => api.get('/spinner/history', { params }),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Bonus API
export const bonusAPI = {
  getStatus: () => api.get('/bonus/status'),
  claim: () => api.post('/bonus/claim'),
};

// Public settings API (no auth)
export const settingsAPI = {
  getSupport: () => api.get('/settings/support'),
  getTerms: () => api.get('/settings/terms'),
  getLayout: () => api.get('/settings/layout'),
  getUserWarning: () => api.get('/settings/user-warning'),
};

// Ludo API (user)
export const ludoAPI = {
  createMatch: (entryAmount) => api.post('/ludo/create', { entryAmount }),
  submitRoomCode: (matchId, roomCode) => api.post('/ludo/submit-room-code', { matchId, roomCode }),
  joinMatch: (matchId) => api.post('/ludo/join', { matchId }),
  cancelMatch: (matchId) => api.post('/ludo/cancel', { matchId }),
  checkMatchWaiting: (id) => api.get(`/ludo/match/${id}/check`),
  getMyMatches: (params) => api.get('/ludo/my-matches', { params }),
  getMatchDetail: (id) => api.get(`/ludo/match/${id}`),
  submitResult: (matchId, formData) =>
    api.post('/ludo/submit-result', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  submitLoss: (matchId) => api.post('/ludo/submit-loss', { matchId }),
  cancelAsLoss: (matchId) => api.post('/ludo/cancel-as-loss', { matchId }),
  checkExpiry: (matchId) => api.post('/ludo/check-expiry', { matchId }),
  getWaitingList: () => api.get('/ludo/waiting-list'),
  getRunningBattles: () => api.get('/ludo/running-battles'),
  getSettings: () => api.get('/ludo/settings'),
};

// Admin API
export const adminAPI = {
  getDashboard: (params) => api.get('/admin/dashboard', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateUserBalance: (id, amount, operation) =>
    api.put(`/admin/users/${id}/balance`, { amount, operation }),
  updateUserEarnings: (id, earnings) =>
    api.put(`/admin/users/${id}/earnings`, { earnings }),
  updateUserStatus: (id, status) =>
    api.put(`/admin/users/${id}/status`, { status }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getUserDetail: (id) => api.get(`/admin/users/${id}/detail`),
  getWalletRequests: (params) => api.get('/admin/wallet-requests', { params }),
  processWalletRequest: (id, action, editedAmount) =>
    api.put(`/admin/wallet-requests/${id}`, { action, ...(editedAmount !== undefined && { editedAmount }) }),
  getBets: (params) => api.get('/admin/bets', { params }),
  deleteBets: (ids) => api.post('/admin/bets/delete', { ids }),
  getLiveBets: () => api.get('/admin/bets/live'),
  forceCrashBet: (id) => api.post(`/admin/bets/${id}/force-crash`),
  getCurrentRoundWithBets: () => api.get('/admin/game/current-round'),
  forceCrashRound: () => api.post('/admin/game/force-crash-round'),
  setNextCrash: (crashAt) => api.post('/admin/game/set-next-crash', { crashAt }),
  clearNextCrash: () => api.post('/admin/game/clear-next-crash'),
  setBulkCrash: (data) => api.post('/admin/game/set-bulk-crash', data),
  clearBulkCrash: () => api.post('/admin/game/clear-bulk-crash'),
  setSequentialCrashes: (values) => api.post('/admin/game/set-sequential-crashes', { values }),
  clearSequentialCrashes: () => api.post('/admin/game/clear-sequential-crashes'),
  getCrashQueue: () => api.get('/admin/game/crash-queue'),
  getWinningBets: (params) => api.get('/admin/wins-bets', { params }),
  getNotifications: () => api.get('/admin/notifications'),
  getSpinnerRecords: (params) => api.get('/admin/spinner-records', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  uploadQrCode: (formData) => api.post('/admin/settings/qr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getBonusRecords: (params) => api.get('/admin/bonus-records', { params }),
  getUserTransactions: (id, params) => api.get(`/admin/users/${id}/transactions`, { params }),
  // Ludo admin
  getLudoMatches: (params) => api.get('/admin/ludo/matches', { params }),
  getLudoMatchDetail: (id) => api.get(`/admin/ludo/matches/${id}`),
  updateLudoMatchStatus: (id, data) => api.put(`/admin/ludo/matches/${id}/status`, data),
  getLudoResultRequests: (params) => api.get('/admin/ludo/result-requests', { params }),
  approveLudoResultRequest: (id, winnerId, note) => api.put(`/admin/ludo/result-requests/${id}/approve`, { winnerId, note }),
  rejectLudoResultRequest: (id, note) => api.put(`/admin/ludo/result-requests/${id}/reject`, { note }),
  deleteLudoMatches: (ids) => api.post('/admin/ludo/matches/bulk-delete', { ids }),
};

export default api;
