import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';
import AppUpdateModal from '../components/AppUpdateModal';
import { ProductCardSkeleton, CategoryChipSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useAuthStore } from '../store/useAuthStore';
import {
  Zap,
  ArrowRight,
  Flame,
  Award,
  Carrot,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Truck,
  Download,
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [sections, setSections] = useState({ deals: [], popular: [], groceries: [] });
  const [loading, setLoading] = useState(true);
  const [hasPriorOrders, setHasPriorOrders] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/orders/my-orders?limit=1')
        .then((res) => {
          const count = res.data?.pagination?.total ?? (res.data?.orders?.length || 0);
          if (count > 0) setHasPriorOrders(true);
        })
        .catch(() => { });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [catRes, featRes, bannerRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products/sections/featured'),
          api.get('/banners').catch(() => ({ data: [] })),
        ]);
        setCategories(catRes.data || []);
        setSections(featRes.data || { deals: [], popular: [], groceries: [] });
        setBanners(bannerRes.data || []);
      } catch (err) {
        console.error('Failed to load home catalog:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-4 space-y-8 sm:space-y-12 pb-24 md:pb-12 overflow-x-hidden">
      {/* 0. In-App Update Banner for Mobile Users */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-orange-500/10 via-brand-500/10 to-amber-500/10 border border-brand-200/80 dark:border-brand-900/60 shadow-xs">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-neutral-900 dark:text-slate-100 truncate">
                CraveCourier v1.0.1 APK Update Ready
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Live Cloud DB &bull; App Logo
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-slate-400 truncate">
              Tap here to update your phone's app without losing data
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowUpdateModal(true)}
          className="ml-2 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition-transform active:scale-95 flex items-center gap-1 flex-shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Update</span>
        </button>
      </div>

      <AppUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
      />

      {/* 1. Gradient Hero Section */}
      <section className="relative rounded-3xl sm:rounded-4xl bg-gradient-to-br from-brand-500 via-brand-600 to-amber-500 p-5 sm:p-12 text-white shadow-glow overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-white/20 backdrop-blur-md shadow-xs">
            <Zap className="h-3.5 w-3.5 text-amber-200 animate-bounce" />
            <span>20-Minute Express Hyperlocal Delivery</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight font-heading">
            Pizza 65 &bull; Pizzas, Burgers, Sandwiches & Fries.
          </h1>

          <p className="text-xs sm:text-sm text-brand-100 max-w-md font-medium leading-relaxed">
            Freshly baked hand-tossed crusts, trending kulhad pizzas, crispy burgers & loaded fries delivered hot to your door.
          </p>

          <div className="pt-1 sm:pt-2 max-w-md">
            <SearchBar placeholder="Search pizzas, burgers, sandwiches, fries..." />
          </div>

          {/* Quick Platform Guarantees */}
          <div className="pt-2 sm:pt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold text-brand-100">
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-amber-200" /> Live GPS Tracking
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" /> 100% Quality Verified
            </span>
          </div>
        </div>

        {/* Ambient glow backgrounds & Brand Hero Illustration */}
        <div className="absolute right-[-40px] bottom-[-40px] w-80 h-80 rounded-full bg-white/15 blur-3xl pointer-events-none"></div>
        <div className="absolute right-20 top-[-20px] w-64 h-64 rounded-full bg-amber-400/20 blur-2xl pointer-events-none"></div>
        <div className="hidden lg:flex absolute right-10 bottom-4 items-center justify-center pointer-events-none drop-shadow-2xl">
          <img
            src="/crave-courier-rider.png"
            alt="Cravecourier Express Delivery"
            className="h-40 w-auto object-contain"
          />
        </div>
      </section>

      {/* 2. Interactive Storefront Banners (if any active) */}
      {banners.length > 0 && (
        <section aria-label="Promotional Specials" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((b) => (
              <Link
                key={b._id}
                to={b.linkUrl || '/products'}
                className="group relative rounded-3xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 h-40 border border-neutral-200/80 dark:border-slate-800"
              >
                <img
                  src={b.imageUrl}
                  alt={b.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end text-white">
                  <span className="self-start px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-500 mb-1">
                    {b.badge || 'PROMO'}
                  </span>
                  <h3 className="font-heading font-black text-sm line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-[11px] text-neutral-200 line-clamp-1">{b.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Category Chips (Horizontal Scrollable) */}
      <section aria-labelledby="categories-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 id="categories-heading" className="text-base sm:text-xl font-black text-neutral-900 dark:text-slate-100 font-heading truncate">
              Explore by Category
            </h2>
            <p className="text-xs text-neutral-400 hidden xs:block">Discover handpicked food and grocery selections</p>
          </div>
          <Link
            to="/products"
            className="whitespace-nowrap flex-shrink-0 text-xs font-bold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1 group py-1"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-0.5">
          <Link
            to="/products"
            className="flex-shrink-0 flex items-center space-x-2 bg-brand-500 text-white rounded-full px-4 sm:px-5 py-2 font-bold text-xs shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-all hover:scale-105"
          >
            <span>🔥 All Catalog</span>
          </Link>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <CategoryChipSkeleton key={i} />)
          ) : (
            (categories.length > 0 ? categories : [
              { slug: 'burgers', name: 'Burgers 🍔', image: '/images/products/veg-aloo-tikki-cheese-burger.jpg' },
              { slug: 'pizzas', name: 'Pizzas 🍕', image: '/images/products/margherita-pizza.jpg' },
              { slug: 'sandwiches', name: 'Sandwiches 🥪', image: '/images/products/cheese-corn-grilled-paneer-sandwich.jpg' },
              { slug: 'fries-sides', name: 'Fries & Sides 🍟', image: '/images/products/peri-peri-fries.jpg' },
            ]).map((cat) => (
              <Link
                key={cat.slug || cat._id}
                to={`/products?category=${cat.slug}`}
                className="flex-shrink-0 flex items-center space-x-2 bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 border border-neutral-200/80 dark:border-slate-800 rounded-full pl-2 pr-3.5 py-1.5 font-bold text-xs text-neutral-800 dark:text-slate-200 shadow-soft hover:border-brand-300 dark:hover:border-brand-500/50 transition-all hover:scale-105"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/products/margherita-pizza.jpg';
                  }}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-slate-700"
                />
                <span className="whitespace-nowrap">{cat.name}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* 4. "Today's Best Deals" Section */}
      <section aria-labelledby="deals-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <span className="p-2 sm:p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-soft flex-shrink-0">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0">
              <h2 id="deals-heading" className="text-base sm:text-xl font-black text-neutral-900 dark:text-slate-100 font-heading truncate">
                Today's Best Deals
              </h2>
              <p className="text-xs text-neutral-500 dark:text-slate-400 hidden xs:block">Save big with instant limited-time discounts</p>
            </div>
          </div>
          <Link
            to="/products?hasDiscount=true"
            className="whitespace-nowrap flex-shrink-0 text-xs font-bold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1 group py-1"
          >
            <span>See Deals</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : sections.deals.map((product) => <ProductCard key={product._id} product={product} />)}
        </div>
      </section>

      {/* 5. "Popular & Top Rated" Section */}
      <section aria-labelledby="popular-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <span className="p-2 sm:p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shadow-soft flex-shrink-0">
              <Award className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0">
              <h2 id="popular-heading" className="text-base sm:text-xl font-black text-neutral-900 dark:text-slate-100 font-heading truncate">
                Popular & Top Rated
              </h2>
              <p className="text-xs text-neutral-500 dark:text-slate-400 hidden xs:block">Customer favorites with 4.5+ star reviews</p>
            </div>
          </div>
          <Link
            to="/products?sort=rating"
            className="whitespace-nowrap flex-shrink-0 text-xs font-bold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1 group py-1"
          >
            <span>Top Rated</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : sections.popular.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
        </div>
      </section>

      {/* 6. "Fresh Farm Groceries" Section (Only if groceries exist in catalog) */}
      {sections.groceries && sections.groceries.length > 0 && (
        <section aria-labelledby="groceries-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <span className="p-2 sm:p-2.5 rounded-2xl bg-grocery-100 dark:bg-grocery-950/60 text-grocery-600 dark:text-grocery-400 shadow-soft flex-shrink-0">
                <Carrot className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div className="min-w-0">
                <h2 id="groceries-heading" className="text-base sm:text-xl font-black text-neutral-900 dark:text-slate-100 font-heading truncate">
                  Fresh Farm Groceries
                </h2>
                <p className="text-xs text-neutral-500 dark:text-slate-400 hidden xs:block">Organic produce, farm dairy & pantry staples</p>
              </div>
            </div>
            <Link
              to="/products?type=grocery"
              className="whitespace-nowrap flex-shrink-0 text-xs font-bold text-grocery-600 hover:text-grocery-700 dark:text-grocery-400 flex items-center gap-1 group py-1"
            >
              <span>Explore Mart</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : sections.groceries.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
          </div>
        </section>
      )}

      {/* 7. Bottom Coupon CTA Card (First Order Only) */}
      {!hasPriorOrders && (
        <section className="bg-neutral-900 dark:bg-slate-900 rounded-4xl p-6 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-card border border-neutral-800 dark:border-slate-800">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Welcome Promo
            </span>
            <h3 className="text-xl sm:text-3xl font-black font-heading">
              Use code <code className="text-brand-400 font-mono">WELCOME50</code> at checkout
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-lg">
              Enjoy 50% discount on your first order up to ₹50. Free delivery within 1 km, flat ₹20 beyond, zero hidden fees!
            </p>
          </div>
          <Link
            to="/products"
            className="touch-target whitespace-nowrap px-8 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-glow transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Start Ordering Now</span>
          </Link>
        </section>
      )}
    </div>
  );
}
