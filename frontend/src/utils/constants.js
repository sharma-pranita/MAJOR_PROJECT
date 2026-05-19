export const FILE_SIZE_UNITS = {
  BYTES_PER_KB: 1024,
  BYTES_PER_MB: 1024 * 1024,
  BYTES_PER_GB: 1024 * 1024 * 1024,
  SIZE_NAMES: ['Bytes', 'KB', 'MB', 'GB', 'TB']
};

export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = FILE_SIZE_UNITS.BYTES_PER_KB;
  const sizes = FILE_SIZE_UNITS.SIZE_NAMES;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const STORAGE_LIMITS = {
  DEFAULT_LIMIT: 5 * FILE_SIZE_UNITS.BYTES_PER_GB,
  WARNING_THRESHOLD: 0.8,
  CRITICAL_THRESHOLD: 0.95
};

export const AUTH_CONFIG = {
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  TOKEN_EXPIRY_DAYS: 7
};