import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import FilesPage from './pages/FilesPage';
import FoldersPage from './pages/FoldersPage';
import FolderDetailPage from './pages/FolderDetailPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected - Any authenticated user */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
          <Route path="/folders" element={<ProtectedRoute><FoldersPage /></ProtectedRoute>} />
          <Route path="/folders/:id" element={<ProtectedRoute><FolderDetailPage /></ProtectedRoute>} />
          
          {/* Admin only */}
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
