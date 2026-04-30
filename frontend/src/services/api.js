import axios from 'axios';

// Base URL for the FastAPI backend
// Empty string = use Vite proxy (avoids CORS issues in development)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Automatically attach the JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// Handle token expiry globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getMe: () =>
    api.get('/auth/me'),
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersAPI = {
  create: (userData) =>
    api.post('/users/', userData),

  list: () =>
    api.get('/users/'),

  getByDepartment: (department) =>
    api.get(`/users/by-department/${department}`),

  getById: (id) =>
    api.get(`/users/${id}`),

  update: (id, data) =>
    api.put(`/users/${id}`, data),

  delete: (id) =>
    api.delete(`/users/${id}`),
};

// ─── Files API ────────────────────────────────────────────────────────────────

export const filesAPI = {
  upload: (formData, onUploadProgress) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  
  list: (params = {}) =>
    api.get('/files/', { params }),
  
  download: (fileId, filename) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/files/download/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  },

  fetchBlob: (fileId) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/files/download/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      return { url: window.URL.createObjectURL(blob), type: blob.type };
    });
  },
  
  delete: (fileId) =>
    api.delete(`/files/${fileId}`),
  
  share: (fileId, department) =>
    api.post(`/files/${fileId}/share`, { department }),

  shareWithUsers: (fileId, userIds) =>
    api.post(`/files/${fileId}/share/users`, { user_ids: userIds }),
};

// ─── Folders API ──────────────────────────────────────────────────────────────

export const foldersAPI = {
  create: (data) =>
    api.post('/folders/', data),

  list: () =>
    api.get('/folders/'),

  delete: (id) =>
    api.delete(`/folders/${id}`),

  shareWithUsers: (folderId, userIds) =>
    api.post(`/folders/${folderId}/share`, { user_ids: userIds }),

  removeShare: (folderId, userId) =>
    api.delete(`/folders/${folderId}/share/${userId}`),
};

export default api;
