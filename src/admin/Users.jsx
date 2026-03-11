import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePickerModal from '../components/DatePickerModal';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { HiOutlineEllipsisVertical } from 'react-icons/hi2';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import toast from 'react-hot-toast';

const Users = () => {
  const navigate = useNavigate();
  const { role: myRole } = useAuth();
  const { socket } = useSocket();
  const isFullAdmin = myRole === 'admin';
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', walletBalance: 0, role: 'user' });
  const [balanceModal, setBalanceModal] = useState({ open: false, userId: null, operation: null, userName: '' });
  const [balanceAmount, setBalanceAmount] = useState('');

  // 3-dot menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuUser, setMenuUser] = useState(null);

  // Status confirm dialog
  const [statusConfirm, setStatusConfirm] = useState({ open: false, userId: null, userName: '', action: '', newStatus: '' });

  // Delete confirm dialog
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null, userName: '' });
  // Edit user modal
  const [editModal, setEditModal] = useState({ open: false, userId: null, name: '', role: 'user' });
  // Edit earnings modal
  const [earningsModal, setEarningsModal] = useState({ open: false, userId: null, userName: '', currentEarnings: 0, walletBalance: 0 });
  const [earningsAmount, setEarningsAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  // Tabs & pagination
  const [statusTab, setStatusTab] = useState('all');
  const [page, setPage] = useState(1);

  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [balanceMin, setBalanceMin] = useState('');
  const [balanceMax, setBalanceMax] = useState('');
  const [balanceRangeActive, setBalanceRangeActive] = useState(false);

  // Raw fetched users (before online filtering)
  const [rawUsers, setRawUsers] = useState([]);
  const [rawTotalPages, setRawTotalPages] = useState(1);
  const [rawTotalCount, setRawTotalCount] = useState(0);

  // Active user IDs (online tracking)
  const [activeUserIds, setActiveUserIds] = useState(new Set());
  const fetchIdRef = useRef(0);

  // Fetch active user IDs
  useEffect(() => {
    adminAPI.getActiveUsers().then(res => {
      setActiveUserIds(new Set(res.data.ids));
    }).catch(() => {});
  }, []);

  // Listen for real-time active user updates
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => setActiveUserIds(new Set(data.ids));
    socket.on('app:active-user-ids', handler);
    return () => socket.off('app:active-user-ids', handler);
  }, [socket]);

  const fetchUsers = useCallback(async () => {
    const thisId = ++fetchIdRef.current;
    const isOnlineMode = statusTab === 'online' || activeOnly;
    // In online mode, if no active users, show empty list without API call
    if (isOnlineMode && activeUserIds.size === 0) {
      setRawUsers([]);
      setRawTotalPages(1);
      setRawTotalCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;
      if (statusTab === 'deactivated') params.status = 'inactive';
      else if (statusTab === 'blocked') params.status = 'blocked';
      // For online mode, send the actual online user IDs to backend
      if (isOnlineMode) {
        params.userIds = Array.from(activeUserIds).join(',');
      }
      if (roleFilter !== 'all') params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      if (sortBy) params.sortBy = sortBy;
      if (balanceRangeActive) {
        if (balanceMin !== '') params.balanceMin = balanceMin;
        if (balanceMax !== '') params.balanceMax = balanceMax;
      }
      const res = await adminAPI.getUsers(params);
      if (thisId !== fetchIdRef.current) return;
      const data = res.data;
      const userList = data.users || data;
      setRawUsers(userList);
      setRawTotalPages(data.totalPages || 1);
      setRawTotalCount(data.totalCount || userList.length);
    }
    catch (error) { if (thisId === fetchIdRef.current) console.error('Failed to fetch users:', error); }
    finally { if (thisId === fetchIdRef.current) setLoading(false); }
  }, [startDate, endDate, search, statusTab, page, roleFilter, activeOnly, activeUserIds, sortBy, balanceRangeActive, balanceMin, balanceMax]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // In non-online mode, use raw data directly. In online mode, data is already filtered by backend.
  const users = rawUsers;
  const totalPages = rawTotalPages;
  const totalCount = rawTotalCount;

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDateApply = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
    setDatePickerOpen(false);
  };

  const getDateRangeLabel = () => {
    if (!startDate && !endDate) return 'All Time';
    const today = new Date().toISOString().slice(0, 10);
    if (startDate === today && endDate === today) return 'Today';
    if (startDate && endDate && startDate !== endDate) {
      return `${new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(endDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (startDate) {
      return new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'Select date range';
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminAPI.createUser(newUser);
      toast.success('User created!');
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', phone: '', walletBalance: 0, role: 'user' });
      fetchUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to create user'); }
    finally { setActionLoading(false); }
  };

  const handleUpdateBalance = async (userId, amount, operation) => {
    setActionLoading(true);
    try {
      await adminAPI.updateUserBalance(userId, amount, operation);
      toast.success(`Balance ${operation === 'add' ? 'added' : 'subtracted'} successfully`);
      setBalanceModal({ open: false, userId: null, operation: null, userName: '' });
      setBalanceAmount('');
      fetchUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to update balance'); }
    finally { setActionLoading(false); }
  };

  const openBalanceModal = (user, operation) => {
    setBalanceModal({ open: true, userId: user._id, operation, userName: user.name });
    setBalanceAmount('');
  };

  const submitBalanceModal = () => {
    if (!balanceAmount || isNaN(Number(balanceAmount))) return;
    handleUpdateBalance(balanceModal.userId, balanceAmount, balanceModal.operation);
  };

  // 3-dot menu handlers
  const openMenu = (e, user) => { setAnchorEl(e.currentTarget); setMenuUser(user); };
  const closeMenu = () => { setAnchorEl(null); setMenuUser(null); };

  const requestStatusChange = (newStatus) => {
    const actionLabel = newStatus === 'blocked' ? 'Block' : newStatus === 'inactive' ? 'Deactivate' : newStatus === 'active' ? 'Activate' : newStatus;
    setStatusConfirm({ open: true, userId: menuUser._id, userName: menuUser.name, action: actionLabel, newStatus });
    closeMenu();
  };

  const confirmStatusChange = async () => {
    setActionLoading(true);
    try {
      await adminAPI.updateUserStatus(statusConfirm.userId, statusConfirm.newStatus);
      toast.success(`User ${statusConfirm.action}d successfully`);
      fetchUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); setStatusConfirm({ ...statusConfirm, open: false }); }
  };

  const requestDelete = () => {
    setDeleteConfirm({ open: true, userId: menuUser._id, userName: menuUser.name });
    closeMenu();
  };

  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      await adminAPI.deleteUser(deleteConfirm.userId);
      toast.success(`User "${deleteConfirm.userName}" deleted`);
      fetchUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to delete user'); }
    finally { setActionLoading(false); setDeleteConfirm({ open: false, userId: null, userName: '' }); }
  };

  const openEditModal = (user) => {
    setEditModal({ open: true, userId: user._id, name: user.name || '', role: user.role || 'user' });
  };

  const handleEditUser = async () => {
    setActionLoading(true);
    try {
      await adminAPI.updateUser(editModal.userId, { name: editModal.name, role: editModal.role });
      toast.success('User updated');
      setEditModal({ open: false, userId: null, name: '', role: 'user' });
      fetchUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to update user'); }
    finally { setActionLoading(false); }
  };

  const openEarningsModal = (user) => {
    const currentEarnings = user.earningsBalance || 0;
    setEarningsModal({ open: true, userId: user._id, userName: user.name, currentEarnings, walletBalance: user.walletBalance || 0 });
    setEarningsAmount(String(currentEarnings.toFixed(2)));
  };

  const handleEditEarnings = async () => {
    if (!earningsAmount || isNaN(Number(earningsAmount))) return;
    setActionLoading(true);
    try {
      await adminAPI.updateUserEarnings(earningsModal.userId, Number(earningsAmount));
      toast.success('Earnings updated');
      setEarningsModal({ open: false, userId: null, userName: '', currentEarnings: 0, walletBalance: 0 });
      setEarningsAmount('');
      fetchUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to update earnings'); }
    finally { setActionLoading(false); }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'blocked': return <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">Blocked</span>;
      case 'inactive': return <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">Inactive</span>;
      default: return <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Active</span>;
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <span className="bg-primary-100 text-primary-700 text-sm font-bold px-2.5 py-0.5 rounded-full">{totalCount}</span>
        </div>
        {isFullAdmin && <button onClick={() => setShowCreateModal(true)} className="bg-primary-700 text-white px-4 py-2 rounded-lg hover:bg-primary-800">+ Create User</button>}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-3 bg-white rounded-xl p-1 shadow-sm overflow-x-auto">
        {[
          { value: 'all', label: 'All' },
          { value: 'online', label: 'Online', dot: true },
          { value: 'deactivated', label: 'Deactivated' },
          { value: 'blocked', label: 'Blocked' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatusTab(tab.value); setPage(1); if (tab.value === 'online') setActiveOnly(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusTab === tab.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.dot && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
            {tab.label}
            {tab.value === 'online' && <span className="text-xs opacity-75">({activeUserIds.size})</span>}
          </button>
        ))}
      </div>

      {/* Date, Role, Online — single row */}
      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <button
          type="button"
          onClick={() => setDatePickerOpen(true)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {getDateRangeLabel()}
        </button>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(null); setEndDate(null); setPage(1); }} className="px-2 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Clear</button>
        )}
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        {statusTab !== 'online' && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
            <div className="relative">
              <input type="checkbox" checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }} className="sr-only peer" />
              <div className="w-8 h-4 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Online
            </span>
          </label>
        )}
      </div>

      <DatePickerModal
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onApply={handleDateApply}
        initialStartDate={startDate}
        initialEndDate={endDate}
        rangeMode={true}
      />

      {/* Sort & Balance Range — second row */}
      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Sort: Default</option>
          <option value="topBalance">Top Balance</option>
          <option value="topEarnings">Top Earnings</option>
          <option value="topWithdrawable">Top Withdrawable</option>
        </select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">₹</span>
          <input type="number" placeholder="Min" value={balanceMin} onChange={(e) => setBalanceMin(e.target.value)} className="w-16 px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <span className="text-xs text-gray-400">–</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">₹</span>
          <input type="number" placeholder="Max" value={balanceMax} onChange={(e) => setBalanceMax(e.target.value)} className="w-16 px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <button onClick={() => { setBalanceRangeActive(true); setPage(1); }} className="px-2 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium">Go</button>
        {balanceRangeActive && (
          <button onClick={() => { setBalanceMin(''); setBalanceMax(''); setBalanceRangeActive(false); setPage(1); }} className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs">Clear</button>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Clear</button>
        )}
      </form>

      <div className="space-y-3">
        {users.map((user) => {
          const isExpanded = expandedUser === user._id;
          return (
            <div key={user._id} className="bg-white rounded-xl shadow-sm border-l-4 border-primary-500 overflow-hidden">
              {/* Collapsed header — always visible */}
              <button
                type="button"
                onClick={() => setExpandedUser(isExpanded ? null : user._id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-bold">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    </div>
                    {activeUserIds.has(user._id) && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 truncate">{user.name || '(no name)'}</h3>
                      {(user.role === 'admin' || user.isAdmin) && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded-full">Admin</span>}
                      {user.role === 'manager' && !user.isAdmin && <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full">Manager</span>}
                      {getStatusBadge(user.status)}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.phone || user.email}</p>
                  </div>
                  <p className="text-sm font-bold text-green-600 flex-shrink-0 mr-2">₹{user.walletBalance?.toFixed(2)}</p>
                </div>
                <svg className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Total Balance</p>
                      <p className="text-lg font-bold text-green-600">₹{user.walletBalance?.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Remaining Deposit</p>
                      <p className="text-lg font-bold text-blue-600">₹{(user.depositBalance || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Withdrawable Earnings</p>
                      <p className="text-lg font-bold text-emerald-600">₹{(user.earningsBalance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gray-50 rounded-lg p-3 flex-1">
                      <p className="text-xs text-gray-500">Total Deposited</p>
                      <p className="text-sm font-bold text-gray-700">₹{(user.totalDeposited || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 flex-1">
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="text-sm font-medium text-gray-700">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 mb-1">{user.email}</p>
                  {user.phone && (
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-gray-600">Phone: {user.phone}</p>
                      <button onClick={() => { navigator.clipboard.writeText(user.phone); toast.success('Phone copied'); }} className="p-0.5 rounded hover:bg-gray-100" title="Copy">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  )}
                  {user.upiId && (
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-500">UPI: <span className="font-mono">{user.upiId}</span></p>
                      <button onClick={() => { navigator.clipboard.writeText(user.upiId); toast.success('UPI ID copied'); }} className="p-0.5 rounded hover:bg-gray-100" title="Copy">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  )}
                  {user.upiNumber && (
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-500">UPI No: <span className="font-mono">{user.upiNumber}</span></p>
                      <button onClick={() => { navigator.clipboard.writeText(user.upiNumber); toast.success('UPI number copied'); }} className="p-0.5 rounded hover:bg-gray-100" title="Copy">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  )}
                  {(user.bankAccountNumber || user.bankIfscCode) && (
                    <div className="bg-blue-50 rounded-lg p-2 mb-2">
                      <p className="text-[10px] text-gray-500 font-medium mb-1">Bank Account</p>
                      {user.bankAccountHolder && <p className="text-xs text-gray-600 mb-0.5">Holder: <span className="font-medium">{user.bankAccountHolder}</span></p>}
                      {user.bankAccountNumber && (
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-gray-500">Acc: <span className="font-mono">{user.bankAccountNumber}</span></p>
                          <button onClick={() => { navigator.clipboard.writeText(user.bankAccountNumber); toast.success('Account number copied'); }} className="p-0.5 rounded hover:bg-blue-100"><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                        </div>
                      )}
                      {user.bankIfscCode && (
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-gray-500">IFSC: <span className="font-mono">{user.bankIfscCode}</span></p>
                          <button onClick={() => { navigator.clipboard.writeText(user.bankIfscCode); toast.success('IFSC copied'); }} className="p-0.5 rounded hover:bg-blue-100"><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => navigate(`/admin/users/${user._id}`)}
                      className="flex-1 bg-primary-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      View Details
                    </button>
                    <button
                      onClick={() => navigate(`/admin/users/${user._id}/transactions`)}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      Wallet History
                    </button>
                  </div>
                  {isFullAdmin && (
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => openBalanceModal(user, 'add')} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium">+ Add Balance</button>
                      <button onClick={() => openBalanceModal(user, 'subtract')} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium">- Subtract</button>
                    </div>
                  )}
                  {isFullAdmin && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => openEditModal(user)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        Edit Name/Role
                      </button>
                      <button
                        onClick={() => openEarningsModal(user)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
                      >
                        Edit Earnings
                      </button>
                      {!user.isAdmin && user.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => { setDeleteConfirm({ open: true, userId: user._id, userName: user.name }); }}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            Delete User
                          </button>
                          <IconButton size="small" onClick={(e) => openMenu(e, user)}>
                            <HiOutlineEllipsisVertical />
                          </IconButton>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4 mt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm disabled:opacity-40"
          >
            <IoChevronBack /> Prev
          </button>
          <span className="text-sm text-gray-500">{page}/{totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-gray-700 text-sm font-medium shadow-sm disabled:opacity-40"
          >
            Next <IoChevronForward />
          </button>
        </div>
      )}

      {/* 3-dot Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        {menuUser?.status !== 'blocked' && <MenuItem onClick={() => requestStatusChange('blocked')}>Block User</MenuItem>}
        {menuUser?.status === 'blocked' && <MenuItem onClick={() => requestStatusChange('active')}>Unblock User</MenuItem>}
        {menuUser?.status !== 'inactive' && menuUser?.status !== 'blocked' && <MenuItem onClick={() => requestStatusChange('inactive')}>Deactivate</MenuItem>}
        {menuUser?.status === 'inactive' && <MenuItem onClick={() => requestStatusChange('active')}>Activate</MenuItem>}
        <MenuItem onClick={requestDelete} sx={{ color: 'error.main' }}>Delete User</MenuItem>
      </Menu>

      {/* Status Confirmation Dialog */}
      <Dialog open={statusConfirm.open} onClose={() => !actionLoading && setStatusConfirm({ ...statusConfirm, open: false })}>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to <strong>{statusConfirm.action}</strong> user <strong>{statusConfirm.userName}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusConfirm({ ...statusConfirm, open: false })} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" color={statusConfirm.newStatus === 'active' ? 'success' : 'error'} onClick={confirmStatusChange} disabled={actionLoading}>
            {actionLoading ? 'Processing...' : statusConfirm.action}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => !actionLoading && setDeleteConfirm({ ...deleteConfirm, open: false })}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete <strong>{deleteConfirm.userName}</strong>?
            <br /><br />
            This will delete <strong>all</strong> their data including wallet requests, bets, ludo history, spin records, and bonuses. <strong>This cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ ...deleteConfirm, open: false })} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={actionLoading}>
            {actionLoading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Balance Modal */}
      <Modal open={balanceModal.open} onClose={() => setBalanceModal({ ...balanceModal, open: false })}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 400 }, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 24, p: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {balanceModal.operation === 'add' ? 'Add' : 'Subtract'} balance — {balanceModal.userName}
          </Typography>
          <TextField fullWidth label="Amount (₹)" type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} sx={{ mb: 2 }} autoFocus disabled={actionLoading} />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={() => setBalanceModal({ ...balanceModal, open: false })} disabled={actionLoading}>Cancel</Button>
            <Button variant="contained" color={balanceModal.operation === 'add' ? 'success' : 'error'} onClick={submitBalanceModal} disabled={actionLoading} startIcon={actionLoading ? <CircularProgress size={18} color="inherit" /> : null}>
              {actionLoading ? 'Processing...' : balanceModal.operation === 'add' ? 'Add' : 'Subtract'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Earnings Modal */}
      <Dialog open={earningsModal.open} onClose={() => !actionLoading && setEarningsModal({ ...earningsModal, open: false })}>
        <DialogTitle>Edit Earnings — {earningsModal.userName}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Wallet Balance: <strong>₹{earningsModal.walletBalance.toFixed(2)}</strong><br />
            Current Earnings: <strong>₹{earningsModal.currentEarnings.toFixed(2)}</strong>
          </DialogContentText>
          <TextField
            fullWidth
            label="New Earnings (₹)"
            type="number"
            value={earningsAmount}
            onChange={(e) => setEarningsAmount(e.target.value)}
            inputProps={{ min: 0, max: earningsModal.walletBalance, step: '0.01' }}
            helperText={`Max: ₹${earningsModal.walletBalance.toFixed(2)} (cannot exceed balance)`}
            autoFocus
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEarningsModal({ ...earningsModal, open: false })} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleEditEarnings} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Update Earnings'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Modal */}
      {/* Edit User Modal */}
      <Dialog open={editModal.open} onClose={() => !actionLoading && setEditModal({ ...editModal, open: false })}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={editModal.name}
            onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
            disabled={actionLoading}
          />
          <TextField
            fullWidth
            select
            label="Role"
            value={editModal.role}
            onChange={(e) => setEditModal({ ...editModal, role: e.target.value })}
            disabled={actionLoading}
            SelectProps={{ native: true }}
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModal({ ...editModal, open: false })} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" onClick={handleEditUser} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-lg" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-lg" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="e.g. 9876543210" className="w-full px-4 py-3 border border-gray-200 rounded-lg" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-lg">
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Balance</label>
                <input type="number" value={newUser.walletBalance} onChange={(e) => setNewUser({ ...newUser, walletBalance: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-200 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} disabled={actionLoading} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 px-4 py-3 bg-primary-700 text-white rounded-lg hover:bg-primary-800 disabled:opacity-50">
                  {actionLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
