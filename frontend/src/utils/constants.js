// File size calculation constants
export const FILE_SIZE_UNITS = {
  BYTES_PER_KB: 1024,
  BYTES_PER_MB: 1024 * 1024,
  BYTES_PER_GB: 1024 * 1024 * 1024,
  SIZE_NAMES: ['Bytes', 'KB', 'MB', 'GB', 'TB']
};

// Format bytes to human-readable size
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = FILE_SIZE_UNITS.BYTES_PER_KB;
  const sizes = FILE_SIZE_UNITS.SIZE_NAMES;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Storage limits
export const STORAGE_LIMITS = {
  DEFAULT_LIMIT: 5 * FILE_SIZE_UNITS.BYTES_PER_GB, // 5 GB
  WARNING_THRESHOLD: 0.8, // 80%
  CRITICAL_THRESHOLD: 0.95 // 95%
};

// Authentication
export const AUTH_CONFIG = {
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  TOKEN_EXPIRY_DAYS: 7
};