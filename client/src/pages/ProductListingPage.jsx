import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import FilterDrawer from '../components/FilterDrawer';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { ProductCardSkeleton } from '../components/SkeletonLoader';
import {
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Sparkles,
  Flame,
  CheckCircle,
} from 'lucide-react';

export default function ProductListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Extract filter parameters from URL
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const type = searchParams.get('type') || 'all';
  const isVeg = searchParams.get('isVeg') || '';
  const hasDiscount = searchParams.get('hasDiscount') || '';
  const isBestseller = searchParams.get('isBestseller') || '';
  const isFeatured = searchParams.get('isFeatured') || '';
  const inStock = searchParams.get('inStock') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const rating = searchParams.get('rating') || '';
  const sort = searchParams.get('sort') || 'popular';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Fetch Categories for Filter Options
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Products on Param Changes
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams(searchParams);
        queryParams.set('limit', '16');
        const res = await api.get(`/products?${queryParams.toString()}`);
        setProducts(res.data?.products || []);
        setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  // Update query params helper
  const handleFilterChange = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    nextParams.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', newPage.toString());
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFiltersCount = [
    category !== 'all',
    type !== 'all',
    Boolean(isVeg),
    Boolean(hasDiscount),
    Boolean(isBestseller),
    Boolean(isFeatured),
    Boolean(inStock),
    Boolean(minPrice),
    Boolean(maxPrice),
    Boolean(rating),
  ].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-6 space-y-6 overflow-x-hidden">
      {/* Search Header Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="w-full sm:max-w-md">
          <SearchBar placeholder="Search Indian groceries, pulses, spices..." initialValue={search} />
        </div>

        {/* Mobile Filter Toggle & Sort Dropdown */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-neutral-800 dark:text-slate-200 shadow-xs flex-shrink-0"
          >
            <Filter className="h-4 w-4 text-emerald-600" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Quick Preset Buttons */}
          <div className="hidden md:flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => handleFilterChange('isBestseller', isBestseller === 'true' ? '' : 'true')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${isBestseller === 'true'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-slate-300 hover:border-amber-300'
                }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Bestsellers
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('hasDiscount', hasDiscount === 'true' ? '' : 'true')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${hasDiscount === 'true'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-slate-300 hover:border-emerald-300'
                }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Special Deals
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex-1 sm:flex-none flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl px-3 py-2 sm:py-1.5 shadow-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
            <select
              value={sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full text-xs font-semibold text-neutral-800 dark:text-slate-200 bg-transparent border-none outline-none cursor-pointer pr-1"
              aria-label="Sort products by"
            >
              <option value="popular">Most Popular</option>
              <option value="bestseller">Bestsellers First</option>
              <option value="discount">Highest Discount</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Category Bar (All 19 Categories) */}
      <div className="relative">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-0.5">
          <button
            type="button"
            onClick={() => handleFilterChange('category', 'all')}
            className={`flex-shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all ${category === 'all'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-800 hover:border-emerald-300'
              }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => handleFilterChange('category', c.slug)}
              className={`flex-shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all ${category === c.slug
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-800 hover:border-emerald-300'
                }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Chips */}
      {(search || activeFiltersCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-neutral-400 font-medium">Active filters:</span>

          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
              Query: "{search}"
              <button onClick={() => handleFilterChange('search', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 font-bold border border-neutral-200 dark:border-slate-700">
              Category: {categories.find((c) => c.slug === category)?.name || category}
              <button onClick={() => handleFilterChange('category', 'all')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {isBestseller === 'true' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
              Bestsellers Only
              <button onClick={() => handleFilterChange('isBestseller', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hasDiscount === 'true' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
              On Discount Only
              <button onClick={() => handleFilterChange('hasDiscount', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-white underline ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid + Desktop Sidebar Layout */}
      <div className="flex items-start gap-6">
        {/* Desktop Sidebar Filter (Embedded) */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <FilterDrawer
            isOpen={true}
            onClose={() => { }}
            categories={categories}
            filters={{ category, type, isVeg, hasDiscount, minPrice, maxPrice, rating }}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </div>

        {/* Mobile Slide-Out Filter Drawer */}
        <div className="lg:hidden">
          <FilterDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            categories={categories}
            filters={{ category, type, isVeg, hasDiscount, minPrice, maxPrice, rating }}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </div>

        {/* Products Grid Container */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>
              Showing <strong className="text-neutral-900 dark:text-slate-100">{products.length}</strong> of{' '}
              <strong className="text-neutral-900 dark:text-slate-100">{pagination.total}</strong> products
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            /* Empty State */
            <div className="bg-white dark:bg-slate-900 rounded-4xl border border-neutral-200/80 dark:border-slate-800 p-8 shadow-soft">
              <EmptyState
                type="search"
                title="No grocery items found"
                description="Try tweaking your search keywords or switching category filters."
                actionText="Reset All Filters"
                onAction={handleResetFilters}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination Bar */}
          {pagination.pages > 1 && (
            <div className="pt-4 flex items-center justify-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="p-2 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-xs font-bold text-neutral-600 dark:text-slate-300 px-3">
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="p-2 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
