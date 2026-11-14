import { create } from 'zustand';
import api, { setAccessToken } from '../services/api';
import { useCartStore } from './useCartStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  /**
   * Boot-up session check using the httpOnly refresh cookie
   */
  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/refresh-token');
      const token = res.data?.accessToken;
      const user = res.data?.user;

      setAccessToken(token);
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

      setAccessToken(accessToken);
      set({
        user,
        accessToken,
        isAuthenticated: true,
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

