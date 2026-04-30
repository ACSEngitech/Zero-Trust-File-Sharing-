import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { foldersAPI, usersAPI } from '../services/api';
import Navbar from '../components/Navbar';
import {
  FolderPlus, Folder, Trash2, X, Plus, Lock, Building2, Users,
  Search, UserCircle,
} from 'lucide-react';

const DEPARTMENTS = [
  'engineering', 'marketing', 'finance', 'hr', 'operations',
  'sales', 'it', 'legal', 'general',
];

const VISIBILITY_OPTIONS = [
  {
    value: 'personal',
    label: 'Personal',
    description: 'Only visible to you',
    Icon: Lock,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    value: 'department',
    label: 'Department',
    description: 'Everyone in your department',
    Icon: Building2,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'specific_users',
    label: 'Specific Users',
    description: 'Only the people you choose',
    Icon: Users,
    color: 'text-green-500',
    bg: 'bg-green-50',
    badge: 'bg-green-100 text-green-700',
  },
];

function visibilityMeta(type) {
  return VISIBILITY_OPTIONS.find((o) => o.value === type) || VISIBILITY_OPTIONS[1];
}

export default function FoldersPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    department: user?.department || 'general',
    visibility_type: 'department',
    shared_with_user_ids: [],
  });

  // User search for specific_users mode
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchRef = useRef(null);

  const fetchFolders = async () => {
    try {
      const res = await foldersAPI.list();
      setFolders(res.data || []);
    } catch {
      setError('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFolders(); }, []);

  // Fetch users for the selected department whenever it changes (specific_users mode only)
  useEffect(() => {
    if (form.visibility_type !== 'specific_users') return;
    setAllUsers([]);
    setLoadingUsers(true);
    usersAPI.getByDepartment(form.department)
      .then((res) => setAllUsers((res.data || []).filter((u) => u.id !== user?.id)))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [form.visibility_type, form.department]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredUsers = allUsers.filter(
    (u) =>
      !selectedUsers.find((s) => s.id === u.id) &&
      (userQuery === '' ||
        u.username.toLowerCase().includes(userQuery.toLowerCase())),
  );

  const addUser = (u) => {
    const next = [...selectedUsers, u];
    setSelectedUsers(next);
    setForm((p) => ({ ...p, shared_with_user_ids: next.map((x) => x.id) }));
    setUserQuery('');
    setShowUserDropdown(false);
  };

  const removeUser = (id) => {
    const next = selectedUsers.filter((u) => u.id !== id);
    setSelectedUsers(next);
    setForm((p) => ({ ...p, shared_with_user_ids: next.map((x) => x.id) }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      department: user?.department || 'general',
      visibility_type: 'department',
      shared_with_user_ids: [],
    });
    setSelectedUsers([]);
    setUserQuery('');
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Folder name is required'); return; }
    if (form.visibility_type === 'specific_users' && selectedUsers.length === 0) {
      setError('Select at least one user to share with');
      return;
    }
    setCreating(true);
    try {
      await foldersAPI.create(form);
      resetForm();
      fetchFolders();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (folderId, name) => {
    if (!window.confirm(`Delete folder "${name}"?`)) return;
    try {
      await foldersAPI.delete(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete folder');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Folders</h1>
            <p className="text-gray-500 mt-1">Organize your encrypted files</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            New Folder
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
            {error}
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Create Folder Panel */}
        {showCreate && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-5">Create New Folder</h3>

            {/* Name + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <input
                type="text"
                placeholder="Folder name *"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Visibility type selector */}
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Visibility</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {VISIBILITY_OPTIONS.map(({ value, label, description, Icon, color, bg }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, visibility_type: value, shared_with_user_ids: [] }))}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    form.visibility_type === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-md ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Department selector (not shown for personal) */}
            {form.visibility_type !== 'personal' && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Department</p>
                <select
                  value={form.department}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, department: e.target.value, shared_with_user_ids: [] }));
                    setSelectedUsers([]);
                    setUserQuery('');
                  }}
                  className="w-full sm:w-64 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} className="capitalize">{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* User search (specific_users only) */}
            {form.visibility_type === 'specific_users' && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Share With</p>

                {/* Selected user chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-medium"
                      >
                        <UserCircle className="w-3.5 h-3.5" />
                        {u.username}
                        <span className="text-green-400 capitalize">· {u.department}</span>
                        <button onClick={() => removeUser(u.id)} className="ml-0.5 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input with dropdown */}
                <div ref={userSearchRef} className="relative w-full sm:w-80">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <Search className="w-4 h-4 text-gray-400 ml-3 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search users by name or department…"
                      value={userQuery}
                      onChange={(e) => { setUserQuery(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
                    />
                  </div>

                  {showUserDropdown && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {loadingUsers ? (
                        <p className="px-4 py-3 text-sm text-gray-400">Loading users…</p>
                      ) : filteredUsers.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-400">No users found</p>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); addUser(u); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                          >
                            <UserCircle className="w-5 h-5 text-gray-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{u.username}</p>
                              <p className="text-xs text-gray-400 capitalize">{u.department}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
              >
                {creating ? 'Creating…' : 'Create Folder'}
              </button>
            </div>
          </div>
        )}

        {/* Folder Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-16">
            <FolderPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No folders yet</p>
            <p className="text-gray-400 text-sm mt-1">Create a folder to organize your files</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => {
              const meta = visibilityMeta(folder.visibility_type);
              const { Icon: VisIcon } = meta;
              return (
                <div
                  key={folder.id}
                  onClick={() => navigate(`/folders/${folder.id}`, { state: { folder } })}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer"
                >
                  {/* Top row: folder icon + delete */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 ${meta.bg} rounded-xl flex items-center justify-center`}>
                      <Folder className={`w-6 h-6 ${meta.color} fill-current opacity-30`} />
                    </div>
                    {(isAdmin() || folder.owner_id === user?.id) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, folder.name); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Name + description */}
                  <p className="font-medium text-gray-800 truncate">{folder.name}</p>
                  {folder.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{folder.description}</p>
                  )}

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
                      <VisIcon className="w-3 h-3" />
                      {meta.label}
                    </span>

                    {folder.visibility_type === 'department' && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                        {folder.department}
                      </span>
                    )}
                  </div>

                  {/* Shared-with avatars for specific_users */}
                  {folder.visibility_type === 'specific_users' && folder.user_shares?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      {folder.user_shares.slice(0, 3).map((s) => (
                        <span
                          key={s.id}
                          title={s.shared_with_username}
                          className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-semibold uppercase"
                        >
                          {s.shared_with_username?.[0] || '?'}
                        </span>
                      ))}
                      {folder.user_shares.length > 3 && (
                        <span className="text-xs text-gray-400">+{folder.user_shares.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
