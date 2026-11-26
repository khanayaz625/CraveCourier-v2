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
  isAuthInitialized: initialAuth.isAuthenticated, // true if restored immediately from localStorage
  isLoading: false,
  error: null,
  authModalOpen: false,
  sessionExpired: false,
  expiredEmail: '',

  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),
  clearSessionExpired: () => set({ sessionExpired: false, expiredEmail: '' }),

  clearError: () => set({ error: null }),

  /**
   * Local state reset for logout or token expiry
   */
  logoutLocally: (isExpired = false) => {
    const prevEmail =
      get().user?.email ||
      (() => {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('crave_auth_user') : null;
          return raw ? JSON.parse(raw)?.email || '' : '';
        } catch {
          return '';
        }
      })();

    setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('crave_auth_token');
      localStorage.removeItem('crave_auth_user');
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAuthInitialized: true,
      error: null,
      sessionExpired: Boolean(isExpired),
      expiredEmail: isExpired ? prevEmail : '',
    });
  },

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
          set({ user, isAuthenticated: true, isAuthInitialized: true, isLoading: false });
        }
        useCartStore.getState().syncGuestCart();
        useCartStore.getState().fetchCart();
      } catch (err) {
        // Only clear session if token is truly invalid/expired (401)
        if (err.statusCode === 401 || err.response?.status === 401) {
          get().logoutLocally(true);
        } else {
          // On transient network error, keep offline session
          set({ isAuthInitialized: true, isLoading: false });
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
        isAuthInitialized: true,
        isLoading: false,
      });
      useCartStore.getState().syncGuestCart();
      useCartStore.getState().fetchCart();
    } catch {
      get().logoutLocally();
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
        isAuthInitialized: true,
        isLoading: false,
      });
      useCartStore.getState().syncGuestCart();
      useCartStore.getState().fetchCart();
      return user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      if (
        (err.statusCode === 403 || err.response?.status === 403) &&
        (err.isEmailVerified === false ||
          err.response?.data?.isEmailVerified === false ||
          err.message?.toLowerCase().includes('verification') ||
          err.message?.toLowerCase().includes('verify'))
      ) {
        err.isEmailVerified = false;
        err.unverifiedEmail = email;
      }
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
        isAuthInitialized: true,
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
   * Register new Customer or Delivery Partner (Requires Email OTP verification before authenticating)
   */
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', userData);
      const user = res.data?.user || res.data?.data?.user || res.data;
      set({
        isLoading: false,
        error: null,
      });
      return { user, requiresVerification: true };
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
      get().logoutLocally();
    }
  },

  /**
   * Account Verification via Email or Mobile SMS OTP
   */
  verifyEmail: async (identifier, otp, optionalPhone) => {
    set({ isLoading: true, error: null });
    try {
      let payload = { otp };
      if (typeof identifier === 'object' && identifier !== null) {
        payload = { ...identifier };
      } else if (typeof identifier === 'string' && identifier.includes('@')) {
        payload.email = identifier;
        if (optionalPhone) payload.phone = optionalPhone;
      } else if (typeof identifier === 'string') {
        payload.phone = identifier;
      }

      const res = await api.post('/auth/verify-email', payload);
      const { user, accessToken } = res.data || {};

      if (accessToken && user) {
        setAccessToken(accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('crave_auth_token', accessToken);
          localStorage.setItem('crave_auth_user', JSON.stringify(user));
        }
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isAuthInitialized: true,
          isLoading: false,
          error: null,
        });
        useCartStore.getState().syncGuestCart();
        useCartStore.getState().fetchCart();
      } else {
        set({ isLoading: false });
      }
      return res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Resend Verification OTP (dispatches to SMS and Email)
   */
  resendOtp: async (identifier, optionalPhone) => {
    set({ isLoading: true, error: null });
    try {
      let payload = {};
      if (typeof identifier === 'object' && identifier !== null) {
        payload = { ...identifier };
      } else if (typeof identifier === 'string' && identifier.includes('@')) {
        payload.email = identifier;
        if (optionalPhone) payload.phone = optionalPhone;
      } else if (typeof identifier === 'string') {
        payload.phone = identifier;
      }

      const res = await api.post('/auth/resend-otp', payload);
      set({ isLoading: false });
      return res.data?.data || res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Request Password Reset OTP (Dispatched via BOTH Email & SMS)
   */
  forgotPassword: async (identifier) => {
    set({ isLoading: true, error: null });
    try {
      const clean = String(identifier || '').trim();
      const payload = clean.includes('@')
        ? { email: clean.toLowerCase(), identifier: clean.toLowerCase() }
        : { phone: clean, identifier: clean };
      const res = await api.post('/auth/forgot-password', payload);
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
  resetPassword: async (identifier, otp, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      const clean = String(identifier || '').trim();
      const payload = clean.includes('@')
        ? { email: clean.toLowerCase(), identifier: clean.toLowerCase(), otp, newPassword }
        : { phone: clean, identifier: clean, otp, newPassword };
      const res = await api.post('/auth/reset-password', payload);
      set({ isLoading: false });
      return res;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * 1-Tap Fast Mobile Phone Login - Dispatch SMS OTP
   */
  sendMobileOtp: async (phone, role = 'customer') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/mobile/send-otp', { phone, role });
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * 1-Tap Fast Mobile Phone Login - Verify Code & Login
   */
  verifyMobileOtp: async (phone, otp, name, role = 'customer') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/mobile/verify-otp', { phone, otp, name, role });
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
        isAuthInitialized: true,
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
   * Email OTP Login - Dispatch 6-digit Login OTP to Email
   */
  sendEmailOtp: async (email, role = 'customer') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/email/send-otp', { email, role });
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Email OTP Login - Verify 6-digit Code & Login
   */
  verifyEmailOtp: async (email, otp, role = 'customer') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/email/verify-otp', { email, otp, role });
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
        isAuthInitialized: true,
        isLoading: false,
        sessionExpired: false,
        expiredEmail: '',
      });
      useCartStore.getState().syncGuestCart();
      useCartStore.getState().fetchCart();
      return user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));

