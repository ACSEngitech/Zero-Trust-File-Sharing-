import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

// Create context
const AuthContext = createContext(null);

// Auth Provider - wraps the entire app
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, restore user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await authAPI.login(username, password);
    const { access_token, user: userData } = res.data;
    
    // Persist token and user
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // Continue logout even if API call fails
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';
  
  const isAuthenticated = () => !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy access
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
