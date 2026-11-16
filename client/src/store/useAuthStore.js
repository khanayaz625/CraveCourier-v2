import { create } from 'zustand';
import api, { setAccessToken, getAccessToken } from '../services/api';
import { useCartStore } from './useCartStore';

const getInitialAuthState = () => {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, isAuthenticated: false };
  }
  try {
    const token = localStorage.getItem('crave_auth_token');
    const storedUser = localStorage.getItem('crave_auth_user');
    if (token && storedUser) {
      const user = JSON.parse(storedUser);
      setAccessToken(token);
      return { user, accessToken: token, isAuthenticated: true };
    }
  } catch (err) {
    console.error('Failed to parse auth state from localStorage:', err);
  }
  return { user: null, accessToken: null, isAuthenticated: false };
};

const initialAuth = getInitialAuthState();

export const useAuthStore = create((set, get) => ({
  user: initialAuth.user,
  accessToken: initialAuth.accessToken,
  isAuthenticated: initialAuth.isAuthenticated,
  isLoading: false,
  error: null,
  authModalOpen: false,

  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  clearError: () => set({ error: null }),

  /**
   * Boot-up session check: retains persisted session on refresh and validates in background
   */
  checkAuth: async () => {
    const currentToken = getAccessToken();
    const storedUser =
      typeof window !== 'undefined' ? localStorage.getItem('crave_auth_user') : null;

    if (currentToken && storedUser) {
      // User is already signed in via persistent storage.
      // Validate session in the background without blocking the UI.
      try {
        const res = await api.get('/auth/me');
        const user = res.data?.user;
        if (user) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('crave_auth_user', JSON.stringify(user));
          }
          set({ user, isAuthenticated: true, isLoading: false });
        }
        useCartStore.getState().syncGuestCart();
        useCartStore.getState().fetchCart();
      } catch (err) {
        // Only clear session if token is truly invalid/expired (401)
        if (err.statusCode === 401 || err.response?.status === 401) {
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('crave_auth_token');
            localStorage.removeItem('crave_auth_user');
          }
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
      return;
    }

    // No localStorage session: check for httpOnly refresh cookie
    try {
      const res = await api.post('/auth/refresh-token');
      const token = res.data?.accessToken;
      const user = res.data?.user;

      setAccessToken(token);
      if (typeof window !== 'undefined' && token && user) {
        localStorage.setItem('crave_auth_token', token);
        localStorage.setItem('crave_auth_user', JSON.stringify(user));
      }
      set({
        user,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
      useCartStore.getState().syncGuestCart();
      useCartStore.getState().fetchCart();
    } catch {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crave_auth_token');
        localStorage.removeItem('crave_auth_user');
      }
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  /**
   * Login as Customer or Delivery Partner
   */
  login: async (email, password, role) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password, role });
      const { user, accessToken } = res.data;

      setAccessToken(accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('crave_auth_token', accessToken);
        localStorage.setItem('crave_auth_user', JSON.stringify(user));
      }
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      useCartStore.getState().syncGuestCart();
      useCartStore.getState().fetchCart();
      return user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Dedicated Admin Portal Login
   */
  adminLogin: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/admin-login', { email, password });
      const { user, accessToken } = res.data;

      setAccessToken(accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('crave_auth_token', accessToken);
        localStorage.setItem('crave_auth_user', JSON.stringify(user));
      }
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      useCartStore.getState().syncGuestCart();
      useCartStore.getState().fetchCart();
      return user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Register new Customer or Delivery Partner
   */
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', userData);
      const { user, accessToken, devOtp } = res.data;

      if (accessToken) {
        setAccessToken(accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('crave_auth_token', accessToken);
          localStorage.setItem('crave_auth_user', JSON.stringify(user));
        }
      }
      set({
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading: false,
      });
      return { user, devOtp };
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Logout user and clear tokens
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Proceed with local logout regardless of network error
    } finally {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crave_auth_token');
        localStorage.removeItem('crave_auth_user');
      }
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  /**
   * Email Verification
   */
  verifyEmail: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/verify-email', { email, otp });
      const currentUser = get().user;
      if (currentUser && currentUser.email === email) {
        set({ user: { ...currentUser, isEmailVerified: true } });
      }
      set({ isLoading: false });
      return res;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Resend Verification OTP
   */
  resendOtp: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/resend-otp', { email });
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Request Password Reset OTP
   */
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/forgot-password', { email });
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Submit New Password with Reset OTP
   */
  resetPassword: async (email, otp, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword });
      set({ isLoading: false });
      return res;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));

