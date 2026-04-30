import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { filesAPI, foldersAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Upload, FileText, FolderOpen, Shield, TrendingUp, Clock } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace(/\d+$/, '100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [filesRes, foldersRes] = await Promise.all([
          filesAPI.list(),
          foldersAPI.list(),
        ]);
        setFiles(filesRes.data.files || []);
        setFolders(foldersRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const recentFiles = files.slice(0, 5);
  const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {user?.full_name || user?.username}! 👋
              </h1>
              <p className="text-blue-200 mt-1">
                {isAdmin() ? 'Administrator' : 'Department User'} •
                <span className="ml-1 capitalize">{user?.department} Department</span>
              </p>
            </div>
            <Shield className="w-16 h-16 text-blue-300 opacity-50" />
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={FileText} label="Total Files" value={files.length} color="text-blue-600" to="/files" />
            <StatCard icon={FolderOpen} label="Folders" value={folders.length} color="text-green-600" to="/folders" />
            <StatCard icon={TrendingUp} label="Storage Used" value={formatSize(totalSize)} color="text-purple-600" />
            <StatCard icon={Shield} label="Encryption" value="AES-256" color="text-emerald-600" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/upload"
            className="bg-white rounded-xl p-6 border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all group flex flex-col items-center justify-center gap-3 text-center"
          >
            <div className="w-14 h-14 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors">
              <Upload className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Upload File</h3>
              <p className="text-sm text-gray-500 mt-1">Files are encrypted automatically</p>
            </div>
          </Link>

          <Link
            to="/files"
            className="bg-white rounded-xl p-6 border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50 transition-all group flex flex-col items-center justify-center gap-3 text-center"
          >
            <div className="w-14 h-14 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center transition-colors">
              <FileText className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Browse Files</h3>
              <p className="text-sm text-gray-500 mt-1">View and download your files</p>
            </div>
          </Link>
        </div>

        {/* Recent Files */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-800">Recent Files</h2>
            </div>
            <Link to="/files" className="text-blue-600 hover:underline text-sm font-medium">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No files yet. Upload your first file!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600 uppercase">
                      {file.file_extension?.replace('.', '') || 'FILE'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{file.original_filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatSize(file.file_size)} • {file.department} •{' '}
                      {new Date(file.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    🔒 Encrypted
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
