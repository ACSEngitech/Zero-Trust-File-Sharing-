import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Redirects to /login if user is not authenticated
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Redirects non-admins to /dashboard
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) return null;
  
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  
  return children;
}
