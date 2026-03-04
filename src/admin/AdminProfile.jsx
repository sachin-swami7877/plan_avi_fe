import { useAuth } from '../context/AuthContext';

const fieldRow = (label, value) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-gray-100 last:border-0">
    <span className="sm:w-40 text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-gray-800 font-medium">{value ?? '—'}</span>
  </div>
);

const roleBadge = (role) => {
  const map = {
    admin: { label: 'Admin', cls: 'bg-red-100 text-red-700' },
    manager: { label: 'Manager', cls: 'bg-yellow-100 text-yellow-700' },
    user: { label: 'User', cls: 'bg-gray-100 text-gray-600' },
  };
  const { label, cls } = map[role] || { label: role, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const AdminProfile = () => {
  const { user, role } = useAuth();

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Your personal account details</p>
      </div>

      {/* Avatar + name card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none">
          {(user?.name || 'A').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{user?.name || '—'}</p>
          <p className="text-gray-500 text-sm">{user?.email || '—'}</p>
          <div className="mt-2">{roleBadge(role)}</div>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Details</h2>
        {fieldRow('Full Name', user?.name)}
        {fieldRow('Email', user?.email)}
        {fieldRow('Phone', user?.phone)}
        {fieldRow('Role', roleBadge(role))}
        {fieldRow('User ID', user?._id)}
        {fieldRow('Member Since', formatDate(user?.createdAt))}
        {typeof user?.wallet?.balance === 'number' && fieldRow('Wallet Balance', `₹${user.wallet.balance.toFixed(2)}`)}
      </div>
    </div>
  );
};

export default AdminProfile;
