import { create } from 'zustand';
import api from '../services/api';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THREE_MINUTES_MS = 3 * 60 * 1000;

export const useCatalogStore = create((set, get) => ({
  categories: [],
  categoriesLoading: false,
  categoriesLastFetched: 0,

  banners: [],
  bannersLoading: false,
  bannersLastFetched: 0,

  featuredSections: { deals: [], popular: [], groceries: [] },
  featuredLoading: false,
  featuredLastFetched: 0,

  /**
   * Fetch categories with 5-minute client-side caching
   */
  fetchCategories: async (force = false) => {
    const { categories, categoriesLastFetched, categoriesLoading } = get();
    const isFresh = Date.now() - categoriesLastFetched < FIVE_MINUTES_MS;

    if (!force && categories.length > 0 && isFresh) {
      return categories;
    }

    if (categoriesLoading) return categories;

    set({ categoriesLoading: true });
    try {
      const res = await api.get('/categories');
      const data = res.data || [];
      set({
        categories: data,
        categoriesLastFetched: Date.now(),
        categoriesLoading: false,
      });
      return data;
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
      set({ categoriesLoading: false });
      return categories;
    }
  },

  /**
   * Fetch promotional banners with 5-minute client-side caching
   */
  fetchBanners: async (force = false) => {
    const { banners, bannersLastFetched, bannersLoading } = get();
    const isFresh = Date.now() - bannersLastFetched < FIVE_MINUTES_MS;

    if (!force && banners.length > 0 && isFresh) {
      return banners;
    }

    if (bannersLoading) return banners;

    set({ bannersLoading: true });
    try {
      const res = await api.get('/banners').catch(() => ({ data: [] }));
      const data = res.data || [];
      set({
        banners: data,
        bannersLastFetched: Date.now(),
        bannersLoading: false,
      });
      return data;
    } catch (err) {
      console.warn('Failed to fetch banners:', err);
      set({ bannersLoading: false });
      return banners;
    }
  },

  /**
   * Fetch homepage featured product sections with 3-minute client-side caching
   */
  fetchFeaturedSections: async (force = false) => {
    const { featuredSections, featuredLastFetched, featuredLoading } = get();
    const isFresh = Date.now() - featuredLastFetched < THREE_MINUTES_MS;

    if (!force && (featuredSections.popular.length > 0 || featuredSections.deals.length > 0) && isFresh) {
      return featuredSections;
    }

    if (featuredLoading) return featuredSections;

    set({ featuredLoading: true });
    try {
      const res = await api.get('/products/sections/featured');
      const data = res.data || { deals: [], popular: [], groceries: [] };
      set({
        featuredSections: data,
        featuredLastFetched: Date.now(),
        featuredLoading: false,
      });
      return data;
    } catch (err) {
      console.warn('Failed to fetch featured sections:', err);
      set({ featuredLoading: false });
      return featuredSections;
    }
  },

  /**
   * Batch prefetch homepage assets in one go
   */
  prefetchHomeCatalog: async (force = false) => {
    return Promise.all([
      get().fetchCategories(force),
      get().fetchFeaturedSections(force),
      get().fetchBanners(force),
    ]);
  },
}));
