import { useState, useEffect } from 'react';
import { usersAPI, filesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Users, FileText, Plus, Trash2, X } from 'lucide-react';

const DEPARTMENTS = ['engineering', 'marketing', 'finance', 'hr', 'operations', 'sales', 'it', 'legal', 'general'];
const ROLES = ['admin', 'user'];

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', full_name: '',
    role: 'user', department: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validateUsername = (val) => {
    if (val && !/^[a-z0-9_]+$/.test(val))
      return 'Only lowercase letters, digits, and underscores are allowed';
    return '';
  };

  const handleSubmit = async () => {
    const usernameErr = validateUsername(form.username);
    if (!form.username || !form.email || !form.password) {
      setError('Username, email, and password are required');
      return;
    }
    if (usernameErr) {
      setFieldErrors(prev => ({ ...prev, username: usernameErr }));
      return;
    }
    setFieldErrors({});
    setError('');
    setLoading(true);
    try {
      await usersAPI.create(form);
      onCreated();
      onClose();
    } catch (e) {
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg.replace(/^Value error,\s*/i, '')).join(' ')
        : (detail || 'Failed to create user');
      const lower = msg.toLowerCase();
      if (lower.includes('password') || lower.includes('special character')) {
        setFieldErrors(prev => ({ ...prev, password: msg }));
      } else if (lower.includes('username')) {
        setFieldErrors(prev => ({ ...prev, username: msg }));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => {
          const val = e.target.value;
          setForm(prev => ({ ...prev, [key]: val }));
          if (key === 'username')
            setFieldErrors(prev => ({ ...prev, username: validateUsername(val) }));
          if (key === 'password')
            setFieldErrors(prev => ({ ...prev, password: '' }));
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
          fieldErrors[key] ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {fieldErrors[key] && <p className="text-red-600 text-sm mt-1">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Create New User</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          {field('Username *', 'username', 'text', 'john_doe')}
          {field('Email *', 'email', 'email', 'john@company.com')}
          {field('Password *', 'password', 'password', 'Min 8 characters')}
          {field('Full Name', 'full_name', 'text', 'John Doe')}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {DEPARTMENTS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [usersRes, filesRes] = await Promise.all([
        usersAPI.list(),
        filesAPI.list(),
      ]);
      setUsers(usersRes.data);
      setFiles(filesRes.data.files || []);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await usersAPI.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file permanently?')) return;
    try {
      await filesAPI.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete file');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-500 mt-1">Manage users and files</p>
          </div>
          {tab === 'users' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: users.length, color: 'text-blue-600' },
            { label: 'Admin Users', value: users.filter(u => u.role === 'admin').length, color: 'text-purple-600' },
            { label: 'Total Files', value: files.length, color: 'text-green-600' },
            { label: 'Departments', value: [...new Set(users.map(u => u.department))].length, color: 'text-orange-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
            {error}
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'files', label: 'All Files', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === id ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Users Table */}
        {tab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['User', 'Email', 'Role', 'Department', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-6 py-4">
                          <div className="animate-pulse h-4 bg-gray-200 rounded w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{u.full_name || u.username}</p>
                            <p className="text-xs text-gray-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full capitalize">{u.department}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Files Table */}
        {tab === 'files' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Filename', 'Size', 'Department', 'Uploaded By', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
                  ) : files.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-gray-400">No files uploaded yet</td></tr>
                  ) : files.map(file => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">
                            {file.file_extension?.replace('.', '') || 'F'}
                          </span>
                          <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{file.original_filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatSize(file.file_size)}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full capitalize">{file.department}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{file.uploader_name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(file.upload_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}
