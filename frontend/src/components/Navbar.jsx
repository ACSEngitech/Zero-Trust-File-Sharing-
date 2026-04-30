import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Upload, FileText, LayoutDashboard, LogOut, Users, FolderOpen } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload File', icon: Upload },
    { to: '/files', label: 'My Files', icon: FileText },
    { to: '/folders', label: 'Folders', icon: FolderOpen },
    ...(isAdmin() ? [{ to: '/admin', label: 'Admin Panel', icon: Users }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="w-6 h-6 text-blue-400" />
            <span className="text-white">ZeroTrust</span>
            <span className="text-blue-400">FileShare</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* User info & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.full_name || user?.username}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role} • {user?.department}</p>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors p-2 rounded-md hover:bg-gray-700"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
