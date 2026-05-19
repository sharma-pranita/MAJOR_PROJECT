import axios from 'axios';
import { clearAuth, getAuth } from './auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const { token } = getAuth();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config && error.config.url && (
      error.config.url.includes('/auth/login') ||
      error.config.url.includes('/auth/register')
    );

    if (error.response && error.response.status === 401 && !isAuthRequest) {
      clearAuth();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email, password) => api.post('/auth/register', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const filesAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  list: () => api.get('/files'),
  getVersions: (fileId) => api.get(`/files/${fileId}/versions`),
  download: (fileId, versionId = null) => {
    const url = versionId
      ? `/files/${fileId}/download?version_id=${versionId}`
      : `/files/${fileId}/download`;
    return api.get(url, { responseType: 'blob' });
  },
  restore: (fileId, versionId) => api.post(`/files/${fileId}/restore?version_id=${versionId}`),
  delete: (fileId) => api.delete(`/files/${fileId}`),
};

export default api;