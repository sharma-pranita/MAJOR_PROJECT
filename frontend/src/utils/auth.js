import { AUTH_CONFIG } from './constants';

export const setAuth = (token, user) => {
  try {
    const authData = {
      token,
      timestamp: new Date().getTime()
    };
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, JSON.stringify(authData));
    localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store auth data:', error);
  }
};

export const getAuth = () => {
  try {
    const authDataStr = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);

    if (!authDataStr || !userStr) {
      return { token: null, user: null };
    }

    const authData = JSON.parse(authDataStr);
    const user = JSON.parse(userStr);

    const expiryTime = AUTH_CONFIG.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const isExpired = new Date().getTime() - authData.timestamp > expiryTime;

    if (isExpired) {
      clearAuth();
      return { token: null, user: null };
    }

    return {
      token: authData.token,
      user
    };
  } catch (error) {
    console.error('Failed to retrieve auth data:', error);
    return { token: null, user: null };
  }
};

export const clearAuth = () => {
  try {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
};

export const isAuthenticated = () => {
  const { token } = getAuth();
  return !!token;
};