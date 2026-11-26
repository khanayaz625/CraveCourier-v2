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
  Compass,
  Sparkles,
  Flame,
  Tag,
  Star,
  Zap,
  Leaf,
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

  const handleFilterChange = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    nextParams.set('page', '1');
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

  const toggleQuickFilter = (key, targetVal) => {
    const current = searchParams.get(key) || '';
    handleFilterChange(key, current === targetVal ? '' : targetVal);
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

  const quickMoods = [
    {
      id: 'bestseller',
      label: 'Bestsellers',
      icon: Flame,
      active: isBestseller === 'true',
      onClick: () => toggleQuickFilter('isBestseller', 'true'),
      activeClass: 'bg-white text-brand-600 shadow-sm',
    },
    {
      id: 'deals',
      label: 'Hot Deals',
      icon: Tag,
      active: hasDiscount === 'true',
      onClick: () => toggleQuickFilter('hasDiscount', 'true'),
      activeClass: 'bg-white text-rose-600 shadow-sm',
    },
    {
      id: 'veg',
      label: 'Pure Veg',
      icon: Leaf,
      active: isVeg === 'true',
      onClick: () => toggleQuickFilter('isVeg', 'true'),
      activeClass: 'bg-emerald-500 text-white shadow-sm',
    },
    {
      id: 'under149',
      label: 'Under ₹149',
      icon: Zap,
      active: maxPrice === '149',
      onClick: () => toggleQuickFilter('maxPrice', '149'),
      activeClass: 'bg-amber-300 text-neutral-900 shadow-sm',
    },
    {
      id: 'toprated',
      label: '4.5+ Rated',
      icon: Star,
      active: rating === '4.5',
      onClick: () => toggleQuickFilter('rating', '4.5'),
      activeClass: 'bg-white text-amber-600 shadow-sm',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-5 overflow-x-hidden">
      {/* Redesigned Gradient Explore Banner */}
      <section className="relative rounded-3xl bg-gradient-to-br from-[#FF541E] via-[#FF6B35] to-amber-500 p-5 sm:p-7 text-white shadow-glow overflow-hidden">
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 left-12 w-56 h-56 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide">
                <Compass className="h-3.5 w-3.5 text-amber-200" />
                <span>Explore CraveCourier Menu</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight leading-tight">
                Discover Fresh Cravings
              </h1>
              <p className="text-xs sm:text-sm text-orange-50/90 max-w-lg">
                Hand-tossed pizzas, crispy burgers, loaded fries &amp; daily essentials delivered in ~20 mins.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-xs font-bold">
              <Sparkles className="h-4 w-4 text-amber-200" />
              <span>{pagination.total} Items Ready</span>
            </div>
          </div>

          {/* Quick Mood Filter Pills inside Banner */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickMoods.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={m.onClick}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    m.active
                      ? m.activeClass
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xs'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search + Filter & Sort Bar */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-neutral-200/80 dark:border-slate-800 shadow-soft flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex-1">
          <SearchBar placeholder="Search pizzas, burgers, sandwiches, fries, groceries..." initialValue={search} />
        </div>

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-[#FF541E] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex-shrink-0 transition-transform active:scale-95"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-white text-[#FF541E] text-[10px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="flex-1 sm:flex-none flex items-center space-x-1.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
            <select
              value={sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full text-xs font-semibold text-neutral-800 dark:text-slate-200 bg-transparent border-none outline-none cursor-pointer pr-1"
              aria-label="Sort products by"
            >
              <option value="popular" className="dark:bg-slate-900">Most Popular</option>
              <option value="bestseller" className="dark:bg-slate-900">Bestsellers First</option>
              <option value="discount" className="dark:bg-slate-900">Highest Discount</option>
              <option value="price-low" className="dark:bg-slate-900">Price: Low to High</option>
              <option value="price-high" className="dark:bg-slate-900">Price: High to Low</option>
              <option value="rating" className="dark:bg-slate-900">Highest Rated</option>
              <option value="newest" className="dark:bg-slate-900">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visual Category Carousel Cards */}
      <div className="relative">
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-0.5">
          <button
            type="button"
            onClick={() => handleFilterChange('category', 'all')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              category === 'all'
                ? 'bg-neutral-900 dark:bg-brand-500 text-white shadow-md scale-[1.02]'
                : 'bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 border border-neutral-200/80 dark:border-slate-800 hover:border-brand-300'
            }`}
          >
            <span className="text-sm">🔥</span>
            <span>All Menu</span>
          </button>

          {categories.map((c) => {
            const isSelected = category === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => handleFilterChange('category', c.slug)}
                className={`flex-shrink-0 flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-2xl text-xs font-black transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#FF541E] to-[#FF7A00] text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 border border-neutral-200/80 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/50'
                }`}
              >
                <img
                  src={c.image || '/images/products/margherita-pizza.jpg'}
                  alt={c.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/products/margherita-pizza.jpg';
                  }}
                  className={`h-7 w-7 rounded-xl object-cover ${
                    isSelected ? 'ring-2 ring-white/80' : 'ring-1 ring-neutral-200 dark:ring-slate-700'
                  }`}
                />
                <span className="whitespace-nowrap">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Chips */}
      {(search || activeFiltersCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-400 font-medium">Active filters:</span>

          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
              Query: &ldquo;{search}&rdquo;
              <button type="button" onClick={() => handleFilterChange('search', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 font-bold border border-neutral-200 dark:border-slate-700">
              Category: {categories.find((c) => c.slug === category)?.name || category}
              <button type="button" onClick={() => handleFilterChange('category', 'all')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {isVeg === 'true' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
              Pure Veg
              <button type="button" onClick={() => handleFilterChange('isVeg', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {isBestseller === 'true' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
              Bestsellers
              <button type="button" onClick={() => handleFilterChange('isBestseller', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hasDiscount === 'true' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
              Hot Deals
              <button type="button" onClick={() => handleFilterChange('hasDiscount', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {maxPrice && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
              Max ₹{maxPrice}
              <button type="button" onClick={() => handleFilterChange('maxPrice', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {rating && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
              {rating}+ ★
              <button type="button" onClick={() => handleFilterChange('rating', '')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-white underline ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid + Desktop Sidebar Layout */}
      <div className="flex items-start gap-6">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <FilterDrawer
            isOpen={true}
            onClose={() => {}}
            categories={categories}
            filters={{ category, type, isVeg, hasDiscount, minPrice, maxPrice, rating }}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </div>

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

        <div className="flex-1 space-y-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-slate-400 font-medium">
            <span>
              Showing <strong className="text-neutral-900 dark:text-slate-100">{products.length}</strong> of{' '}
              <strong className="text-neutral-900 dark:text-slate-100">{pagination.total}</strong> dishes &amp; items
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-4xl border border-neutral-200/80 dark:border-slate-800 p-8 shadow-soft">
              <EmptyState
                type="search"
                title="No menu items found"
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

          {pagination.pages > 1 && (
            <div className="pt-4 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="p-2 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-xs font-bold text-neutral-600 dark:text-slate-300 px-3">
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="p-2 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
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
