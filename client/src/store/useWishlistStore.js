import { create } from 'zustand';

const WISHLIST_STORAGE_KEY = 'cravecourier_wishlist';

export const useWishlistStore = create((set, get) => ({
  items: (() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),

  addToWishlist: (product) => {
    const current = get().items;
    if (current.some((p) => p._id === product._id)) return;
    const updated = [product, ...current];
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ items: updated });
  },

  removeFromWishlist: (productId) => {
    const updated = get().items.filter((p) => p._id !== productId);
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ items: updated });
  },

  toggleWishlist: (product) => {
    const exists = get().items.some((p) => p._id === product._id);
    if (exists) {
      get().removeFromWishlist(product._id);
      return false;
    } else {
      get().addToWishlist(product);
      return true;
    }
  },

  isInWishlist: (productId) => {
    return get().items.some((p) => p._id === productId);
  },

  clearWishlist: () => {
    try {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    } catch {}
    set({ items: [] });
  },
}));
