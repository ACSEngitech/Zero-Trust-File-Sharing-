import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { filesAPI, foldersAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Upload, Shield, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';
import { useEffect } from 'react';

const DEPARTMENTS = ['engineering', 'marketing', 'finance', 'hr', 'operations', 'sales', 'it', 'legal', 'general'];

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [folders, setFolders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    foldersAPI.list().then(res => setFolders(res.data || [])).catch(() => {});
  }, []);

  const BLOCKED = ['.exe', '.bat', '.cmd', '.com', '.sh', '.ps1', '.vbs', '.js', '.php'];
  
  const handleFileSelect = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (BLOCKED.includes(ext)) {
      setError(`File type "${ext}" is not allowed for security reasons.`);
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError('');
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (description) formData.append('description', description);
    if (folderId) formData.append('folder_id', folderId);
    
    try {
      await filesAPI.upload(formData, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });
      
      setSuccess(true);
      setTimeout(() => navigate('/files'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">File Uploaded Successfully!</h2>
            <p className="text-gray-500 mt-2">Your file has been encrypted and stored securely.</p>
            <p className="text-gray-400 text-sm mt-1">Redirecting to files...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Upload File</h1>
          <p className="text-gray-500 mt-1">Files are encrypted with AES-256 before storage</p>
        </div>

        {/* Encryption Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Zero Trust Encryption</p>
            <p className="text-blue-600 mt-0.5">
              Your file will be encrypted using AES-256-GCM before being stored.
              Only authorized users can decrypt and download it.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />
              
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatSize(selectedFile.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Drop your file here, or click to browse</p>
                  <p className="text-gray-400 text-sm mt-1">Max 50MB • No .exe, .bat, .sh files</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Folder selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Save to Folder <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No folder (root)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.department})</option>
              ))}
            </select>
          </div>

          {/* Upload to department info */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p>📁 This file will be uploaded to: <strong className="capitalize">{user?.department}</strong> department</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Progress bar */}
          {uploading && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Encrypting & uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Encrypting & Uploading...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Encrypt & Upload
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
