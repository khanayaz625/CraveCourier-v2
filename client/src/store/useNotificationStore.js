import { create } from 'zustand';
import api from '../services/api';

// Web Audio API Gentle Notification Chime
const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Pleasant 2-tone melodic chime (E5 -> G#5)
    playTone(659.25, 0, 0.15);
    playTone(830.61, 0.12, 0.25);
  } catch {
    // Audio autoplay restrictions or muted
  }
};

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  toasts: [], // Active floating push toasts

  // Fetch from server
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/notifications');
      set({
        notifications: res.data?.notifications || [],
        unreadCount: res.data?.unreadCount || 0,
      });
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      set({ loading: false });
    }
  },

  // Mark single as read
  markAsRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  },

  // Receive a real-time incoming push notification (from Socket.io)
  handleIncomingNotification: (notification) => {
    playChime();

    set((state) => {
      // Avoid duplicate notifications
      const exists = state.notifications.some((n) => n._id === notification._id);
      const updatedList = exists
        ? state.notifications
        : [notification, ...state.notifications];

      return {
        notifications: updatedList,
        unreadCount: state.unreadCount + 1,
      };
    });

    // Add to floating toasts list
    get().addToast({
      id: notification._id || Date.now().toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type || 'order_update',
      orderId: notification.data?.orderId,
      orderNumber: notification.data?.orderNumber,
    });
  },

  // Floating Toast Manager
  addToast: (toast) => {
    const toastId = toast.id || Date.now().toString();
    const newToast = { ...toast, id: toastId };

    set((state) => ({
      toasts: [newToast, ...state.toasts.slice(0, 3)], // keep max 4 toasts simultaneously
    }));

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      get().removeToast(toastId);
    }, 6000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

