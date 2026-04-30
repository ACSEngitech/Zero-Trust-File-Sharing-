import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { filesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import {
  ArrowLeft, Download, Trash2, Search, Lock, AlertCircle, X, Folder,
  Lock as LockIcon, Building2, Users,
} from 'lucide-react';

const VISIBILITY_META = {
  personal: { label: 'Personal', Icon: LockIcon, badge: 'bg-purple-100 text-purple-700', color: 'text-purple-500', bg: 'bg-purple-50' },
  department: { label: 'Department', Icon: Building2, badge: 'bg-blue-100 text-blue-700', color: 'text-blue-500', bg: 'bg-blue-50' },
  specific_users: { label: 'Specific Users', Icon: Users, badge: 'bg-green-100 text-green-700', color: 'text-green-500', bg: 'bg-green-50' },
};

export default function FolderDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const folder = state?.folder;
  const meta = VISIBILITY_META[folder?.visibility_type] || VISIBILITY_META.department;
  const { Icon: VisIcon } = meta;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    try {
      const res = await filesAPI.list({ folder_id: id });
      setFiles(res.data.files || []);
    } catch {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, [id]);

  const handleDownload = async (file) => {
    setDownloading(file.id);
    try {
      await filesAPI.download(file.id, file.original_filename);
    } catch {
      setError('Download failed. You may not have access to this file.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file? This cannot be undone.')) return;
    try {
      await filesAPI.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (e) {
      setError(e.response?.data?.detail || 'Delete failed');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter((f) =>
    f.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/folders')}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className={`w-12 h-12 ${meta.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Folder className={`w-6 h-6 ${meta.color} fill-current opacity-40`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800 truncate">
                {folder?.name || `Folder #${id}`}
              </h1>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
                <VisIcon className="w-3 h-3" />
                {meta.label}
              </span>
              {folder?.department && folder?.visibility_type !== 'personal' && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                  {folder.department}
                </span>
              )}
            </div>
            {folder?.description && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{folder.description}</p>
            )}
          </div>

          <p className="text-sm text-gray-400 flex-shrink-0">
            {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Files table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-16 text-center">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No files in this folder</p>
              <p className="text-gray-400 text-sm mt-1">Upload files and assign them to this folder</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">File</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Size</th>
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
                      <td className="px-6 py-4 text-sm text-gray-600">{file.uploader_name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(file.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(file)}
                            disabled={downloading === file.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Download"
                          >
                            {downloading === file.id ? (
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          {(isAdmin() || file.uploaded_by_id === user?.id) && (
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
    </div>
  );
}
