import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './useAuthStore';

const GUEST_CART_STORAGE_KEY = 'crave_guest_cart';

// Guest Local Calculations
const calculateGuestTotals = (items, coupon = null) => {
  const safeItems = Array.isArray(items)
    ? items.filter((it) => it && it.product && typeof it.product === 'object')
    : [];

  const itemTotal = Math.round(
    safeItems.reduce((sum, item) => {
      let price = item.selectedVariant?.sellingPrice;
      if (price === undefined || price === null) {
        price =
          item.product?.discountPrice && item.product.discountPrice > 0
            ? item.product.discountPrice
            : (item.product?.price || 0);
      }
      return sum + (Number(price) || 0) * (Number(item.quantity) || 1);
    }, 0) * 100
  ) / 100;

  // Delivery Fee: 0 if empty or within 1km, standard ₹20 beyond 1km
  const deliveryFee = itemTotal === 0 ? 0 : 20;
  // Tax: 0 (No extra tax or hidden fees)
  const tax = 0;

  let couponDiscount = 0;
  if (coupon && itemTotal > 0) {
    if (coupon.code === 'WELCOME50' && itemTotal >= 100) {
      couponDiscount = Math.min(50, Math.round(itemTotal * 0.5 * 100) / 100);
    } else if (coupon.code === 'CRAVE20' && itemTotal >= 150) {
      couponDiscount = 20;
    } else if (coupon.code === 'CRAVE10' && itemTotal >= 100) {
      couponDiscount = 10;
    }
  }

  const grandTotal = Math.max(0, Math.round((itemTotal + tax + deliveryFee - couponDiscount) * 100) / 100);

  return { itemTotal, deliveryFee, tax, couponDiscount, grandTotal };
};

export const useCartStore = create((set, get) => ({
  items: [],
  coupon: null,
  totals: {
    itemTotal: 0,
    deliveryFee: 0,
    tax: 0,
    couponDiscount: 0,
    grandTotal: 0,
  },
  isLoading: false,
  error: null,

  /**
   * Initialize & fetch Cart
   */
  fetchCart: async () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      set({ isLoading: true, error: null });
      try {
        const res = await api.get('/cart');
        const cart = res?.data || res || {};
        const safeItems = Array.isArray(cart.items)
          ? cart.items.filter((it) => it && it.product && typeof it.product === 'object' && it.product.name)
          : [];
        set({
          items: safeItems,
          coupon: cart.couponApplied || null,
          totals: cart.totals || {
            itemTotal: 0,
            deliveryFee: 0,
            tax: 0,
            couponDiscount: 0,
            grandTotal: 0,
          },
          isLoading: false,
        });
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    } else {
      // Load guest cart from localStorage
      try {
        const saved = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        const guestItems = Array.isArray(parsed)
          ? parsed.filter((it) => it && it.product && typeof it.product === 'object' && it.product.name)
          : [];
        const totals = calculateGuestTotals(guestItems, get().coupon);
        set({ items: guestItems, totals, isLoading: false });
      } catch {
        set({ items: [], isLoading: false });
      }
    }
  },

  /**
   * Add Item (supports product variants with instant optimistic update)
   */
  addItem: async (product, quantity = 1, variant = null) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      // 1. Instant Optimistic State Update
      const previousItems = [...get().items];
      const previousTotals = { ...get().totals };

      const currentItems = [...get().items];
      const existingIndex = currentItems.findIndex((it) => {
        const sameProduct = it.product?._id === product._id;
        if (variant && variant.size) {
          return sameProduct && it.selectedVariant?.size === variant.size;
        }
        return sameProduct && (!it.selectedVariant || !it.selectedVariant.size);
      });

      const effectivePrice = variant ? variant.sellingPrice : (product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price);

      if (existingIndex > -1) {
        currentItems[existingIndex] = {
          ...currentItems[existingIndex],
          quantity: currentItems[existingIndex].quantity + quantity,
        };
      } else {
        currentItems.push({
          product,
          quantity,
          selectedVariant: variant,
          priceAtAddition: effectivePrice,
        });
      }

      const optimisticTotals = calculateGuestTotals(currentItems, get().coupon);
      set({ items: currentItems, totals: optimisticTotals, error: null });

      // 2. Synchronize with Backend
      try {
        const payload = {
          productId: product._id,
          quantity,
        };
        if (variant) {
          payload.variant = variant;
        }
        const res = await api.post('/cart/items', payload);
        const cart = res.data;
        if (cart) {
          set({
            items: cart.items || currentItems,
            coupon: cart.couponApplied || null,
            totals: cart.totals || optimisticTotals,
            isLoading: false,
          });
        }
      } catch (err) {
        // Rollback to previous state on failure
        set({ items: previousItems, totals: previousTotals, error: err.message, isLoading: false });
        throw err;
      }
    } else {
      // Local Guest Cart
      const currentItems = [...get().items];
      const existingIndex = currentItems.findIndex((it) => {
        const sameProduct = it.product?._id === product._id;
        if (variant && variant.size) {
          return sameProduct && it.selectedVariant?.size === variant.size;
        }
        return sameProduct && (!it.selectedVariant || !it.selectedVariant.size);
      });

      const effectivePrice = variant ? variant.sellingPrice : (product.discountPrice || product.price);

      if (existingIndex > -1) {
        currentItems[existingIndex].quantity += quantity;
      } else {
        currentItems.push({
          product,
          quantity,
          selectedVariant: variant,
          priceAtAddition: effectivePrice,
        });
      }

      const totals = calculateGuestTotals(currentItems, get().coupon);
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(currentItems));
      set({ items: currentItems, totals });
    }
  },

  /**
   * Update Quantity (with instant optimistic update)
   */
  updateQuantity: async (productId, quantity) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      // 1. Instant Optimistic State Update
      const previousItems = [...get().items];
      const previousTotals = { ...get().totals };

      let currentItems = [...get().items];
      if (quantity <= 0) {
        currentItems = currentItems.filter((it) => (it.product?._id || it.product) !== productId);
      } else {
        const index = currentItems.findIndex((it) => (it.product?._id || it.product) === productId);
        if (index > -1) {
          currentItems[index] = {
            ...currentItems[index],
            quantity,
          };
        }
      }

      const optimisticTotals = calculateGuestTotals(currentItems, get().coupon);
      set({ items: currentItems, totals: optimisticTotals, error: null });

      // 2. Synchronize with Backend
      try {
        const res = await api.put(`/cart/items/${productId}`, { quantity });
        const cart = res.data;
        if (cart) {
          set({
            items: cart.items || currentItems,
            coupon: cart.couponApplied || null,
            totals: cart.totals || optimisticTotals,
            isLoading: false,
          });
        }
      } catch (err) {
        set({ items: previousItems, totals: previousTotals, error: err.message, isLoading: false });
        throw err;
      }
    } else {
      let currentItems = [...get().items];
      if (quantity <= 0) {
        currentItems = currentItems.filter((it) => it.product._id !== productId);
      } else {
        const index = currentItems.findIndex((it) => it.product._id === productId);
        if (index > -1) {
          currentItems[index].quantity = quantity;
        }
      }

      const totals = calculateGuestTotals(currentItems, get().coupon);
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(currentItems));
      set({ items: currentItems, totals });
    }
  },

  /**
   * Remove Item (with instant optimistic update)
   */
  removeItem: async (productId) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      const previousItems = [...get().items];
      const previousTotals = { ...get().totals };

      const currentItems = get().items.filter((it) => (it.product?._id || it.product) !== productId);
      const optimisticTotals = calculateGuestTotals(currentItems, get().coupon);
      set({ items: currentItems, totals: optimisticTotals, error: null });

      try {
        const res = await api.delete(`/cart/items/${productId}`);
        const cart = res.data;
        if (cart) {
          set({
            items: cart.items || currentItems,
            coupon: cart.couponApplied || null,
            totals: cart.totals || optimisticTotals,
            isLoading: false,
          });
        }
      } catch (err) {
        set({ items: previousItems, totals: previousTotals, error: err.message, isLoading: false });
      }
    } else {
      const currentItems = get().items.filter((it) => it.product._id !== productId);
      const totals = calculateGuestTotals(currentItems, get().coupon);
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(currentItems));
      set({ items: currentItems, totals });
    }
  },

  /**
   * Clear Cart
   */
  clearCart: async () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      try {
        const res = await api.delete('/cart');
        set({
          items: [],
          coupon: null,
          totals: res.data?.totals || {
            itemTotal: 0,
            deliveryFee: 0,
            tax: 0,
            couponDiscount: 0,
            grandTotal: 0,
          },
        });
      } catch (err) {
        console.error('Error clearing cart:', err);
      }
    } else {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      set({
        items: [],
        coupon: null,
        totals: {
          itemTotal: 0,
          deliveryFee: 0,
          tax: 0,
          couponDiscount: 0,
          grandTotal: 0,
        },
      });
    }
  },

  /**
   * Apply Coupon Code
   */
  applyCoupon: async (code) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated) {
      throw new Error('Please sign in to apply promotional coupons.');
    }

    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/cart/coupon', { code });
      const cart = res.data;
      set({
        items: cart.items || [],
        coupon: cart.couponApplied,
        totals: cart.totals,
        isLoading: false,
      });
      return res.message;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Remove Coupon Code
   */
  removeCoupon: async () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      set({ isLoading: true });
      try {
        const res = await api.delete('/cart/coupon');
        const cart = res.data;
        set({
          coupon: null,
          totals: cart.totals,
          isLoading: false,
        });
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    } else {
      set({ coupon: null });
      const totals = calculateGuestTotals(get().items, null);
      set({ totals });
    }
  },

  /**
   * Merge Guest cart on Login
   */
  syncGuestCart: async () => {
    try {
      const saved = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      if (!saved) return;

      const guestItems = JSON.parse(saved);
      if (Array.isArray(guestItems) && guestItems.length > 0) {
        const formattedItems = guestItems.map((it) => ({
          productId: it.product._id,
          quantity: it.quantity,
        }));

        const res = await api.post('/cart/sync', { items: formattedItems });
        const cart = res.data;
        set({
          items: cart.items || [],
          coupon: cart.couponApplied || null,
          totals: cart.totals,
        });
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to sync guest cart:', err);
    }
  },
}));
