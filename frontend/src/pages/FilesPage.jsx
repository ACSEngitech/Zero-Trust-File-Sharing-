import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { filesAPI, usersAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Download, Trash2, Share2, Search, Filter, Lock, AlertCircle, X, ChevronRight, Users, Building2, Eye } from 'lucide-react';

const DEPARTMENTS = ['engineering', 'marketing', 'finance', 'hr', 'operations', 'sales', 'it', 'legal', 'general'];

function ShareModal({ file, onClose, onShare }) {
  // step: 'dept' | 'users'
  const [step, setStep] = useState('dept');
  const [dept, setDept] = useState('');
  // 'department' = share entire dept, 'users' = share with specific users
  const [mode, setMode] = useState('department');
  const [deptUsers, setDeptUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectDept = async (selectedDept) => {
    setDept(selectedDept);
    setMode('department');
    setSelectedUserIds([]);
    setError('');
    setLoadingUsers(true);
    try {
      const res = await usersAPI.getByDepartment(selectedDept);
      setDeptUsers(res.data);
    } catch {
      setDeptUsers([]);
    } finally {
      setLoadingUsers(false);
    }
    setStep('users');
  };

  const toggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.length === deptUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(deptUsers.map(u => u.id));
    }
  };

  const handleShare = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'department') {
        await filesAPI.share(file.id, dept);
      } else {
        if (selectedUserIds.length === 0) {
          setError('Select at least one user');
          setLoading(false);
          return;
        }
        await filesAPI.shareWithUsers(file.id, selectedUserIds);
      }
      onShare();
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Share failed');
    } finally {
      setLoading(false);
    }
  };

  const availableDepts = DEPARTMENTS.filter(d => d !== file.department);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold">Share File</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{file.original_filename}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Step 1: Department list */}
        {step === 'dept' && (
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">Select a department to share with:</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {availableDepts.map(d => (
                <button
                  key={d}
                  onClick={() => handleSelectDept(d)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="capitalize font-medium text-gray-700">{d}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
              Cancel
            </button>
          </div>
        )}

        {/* Step 2: Mode selector + user list */}
        {step === 'users' && (
          <div className="p-6">
            {/* Back + dept label */}
            <button
              onClick={() => { setStep('dept'); setError(''); }}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4"
            >
              ← <span className="capitalize">{dept}</span>
            </button>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode('department')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'department'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Entire Department
              </button>
              <button
                onClick={() => setMode('users')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'users'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Specific Users
              </button>
            </div>

            {mode === 'department' && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mb-4">
                All active members of <strong className="capitalize">{dept}</strong> will gain access to this file.
              </p>
            )}

            {mode === 'users' && (
              <div className="mb-4">
                {loadingUsers ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : deptUsers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No users found in this department.</p>
                ) : (
                  <>
                    {/* Select all */}
                    <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === deptUsers.length && deptUsers.length > 0}
                        onChange={toggleAllUsers}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Select all ({deptUsers.length})</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {deptUsers.map(u => (
                        <label key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => toggleUser(u.id)}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{u.full_name || u.username}</p>
                            <p className="text-xs text-gray-400">@{u.username}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={loading || (mode === 'users' && selectedUserIds.length === 0)}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
              >
                {loading ? 'Sharing...' : mode === 'department' ? 'Share with Department' : `Share with ${selectedUserIds.length} User${selectedUserIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PREVIEWABLE_TYPES = ['application/pdf', 'image/'];

function FilePreviewModal({ file, onClose }) {
  const [src, setSrc] = useState(null);
  const [mimeType, setMimeType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const objectUrlRef = useRef(null);

  useEffect(() => {
    filesAPI.fetchBlob(file.id)
      .then(({ url, type }) => {
        objectUrlRef.current = url;
        setSrc(url);
        setMimeType(type);
      })
      .catch(() => setError('Could not load preview.'))
      .finally(() => setLoading(false));
    return () => {
      if (objectUrlRef.current) window.URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [file.id]);

  const isPreviewable = PREVIEWABLE_TYPES.some(t => mimeType.startsWith(t));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <p className="font-semibold text-gray-800 truncate max-w-lg">{file.original_filename}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex items-center justify-center p-4" style={{ minHeight: 0 }}>
          {loading && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading preview…</span>
            </div>
          )}
          {!loading && error && (
            <div className="text-center text-red-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && !isPreviewable && (
            <div className="text-center text-gray-400">
              <Lock className="w-10 h-10 mx-auto mb-2" />
              <p className="font-medium">Preview not available for this file type</p>
              <p className="text-sm mt-1">{file.file_extension?.toUpperCase().replace('.', '') || 'Unknown'} files cannot be previewed in the browser.</p>
            </div>
          )}
          {!loading && !error && isPreviewable && mimeType.startsWith('image/') && (
            <img src={src} alt={file.original_filename} className="max-w-full max-h-full object-contain rounded" />
          )}
          {!loading && !error && isPreviewable && mimeType === 'application/pdf' && (
            <iframe src={src} title={file.original_filename} className="w-full h-full rounded border-0" style={{ minHeight: '60vh' }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FilesPage() {
  const { user, isAdmin } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [shareFile, setShareFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    try {
      const params = filterDept ? { department: filterDept } : {};
      const res = await filesAPI.list(params);
      setFiles(res.data.files || []);
    } catch (e) {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [filterDept]);

  const handleDownload = async (file) => {
    setDownloading(file.id);
    try {
      await filesAPI.download(file.id, file.original_filename);
    } catch (e) {
      setError('Download failed. You may not have access to this file.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file? This cannot be undone.')) return;
    try {
      await filesAPI.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (e) {
      setError(e.response?.data?.detail || 'Delete failed');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter(f =>
    f.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  const canDelete = (file) => isAdmin() || file.uploaded_by_id === user?.id;
  const canShare = (file) => isAdmin() || file.uploaded_by_id === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Files</h1>
            <p className="text-gray-500 mt-1">{filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d} className="capitalize">{d}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Files Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-16 text-center">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No files found</p>
              <p className="text-gray-400 text-sm mt-1">Upload a file to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">File</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Size</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploaded By</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600 uppercase">
                              {file.file_extension?.replace('.', '') || 'F'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 truncate max-w-xs">{file.original_filename}</p>
                            {file.description && (
                              <p className="text-xs text-gray-400 truncate max-w-xs">{file.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatSize(file.file_size)}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full capitalize font-medium">
                          {file.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{file.uploader_name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(file.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Preview file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            disabled={downloading === file.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Download (decrypts automatically)"
                          >
                            {downloading === file.id ? (
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          {canShare(file) && (
                            <button
                              onClick={() => setShareFile(file)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Share with department"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete(file) && (
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete file"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onShare={fetchFiles}
        />
      )}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
