import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { useThemeStore } from '../store/useThemeStore';
import {
  LogOut,
  Shield,
  Bike,
  ShoppingBag,
  Package,
  Sun,
  Moon,
  Sparkles,
  Heart,
} from 'lucide-react';
import NotificationBell from './notifications/NotificationBell';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { items } = useCartStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800 px-4 py-2.5 shadow-soft transition-colors duration-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Storefront Navigation */}
        <div className="flex items-center space-x-6 flex-shrink-0">
          <Link to="/" className="flex items-center group flex-shrink-0">
            <BrandLogo size="md" />
          </Link>

          <nav className="hidden sm:flex items-center space-x-1 text-xs font-bold">
            <Link
              to="/products"
              className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
            >
              All Menu
            </Link>
            <Link
              to="/products?type=food"
              className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
            >
              Hot Food 🍕
            </Link>
            <Link
              to="/products?type=grocery"
              className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-grocery-600 hover:bg-grocery-50 dark:hover:bg-grocery-950/40 transition-colors"
            >
              Fresh Groceries 🥦
            </Link>
          </nav>
        </div>

        {/* Dynamic Role Navigation, Theme Toggle, & Auth Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-amber-400 animate-pop" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600 animate-pop" />
            )}
          </button>

          {/* In-App Notifications Bell (when authenticated) */}
          {isAuthenticated && <NotificationBell />}

          {/* Wishlist Shortcut */}
          <Link
            to="/wishlist"
            className="relative p-2 rounded-xl text-neutral-700 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center"
            title="My Wishlist"
            aria-label="View Wishlist"
          >
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pop">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon Shortcut (Desktop & Mobile) */}
          <Link
            to="/cart"
            className="relative p-2 rounded-xl text-neutral-700 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors flex items-center justify-center"
            title="Shopping Cart"
            aria-label="View Shopping Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pop">
                {cartItemCount}
              </span>
            )}
          </Link>

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              {/* Role Badges */}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  Admin
                </Link>
              )}
              {user.role === 'delivery' && (
                <Link
                  to="/partner"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <Bike className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Partner
                </Link>
              )}
              {user.role === 'customer' && (
                <Link
                  to="/orders"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-grocery-50 dark:bg-grocery-950/50 text-grocery-700 dark:text-grocery-300 border border-grocery-200 dark:border-grocery-800 hover:bg-grocery-100 transition-colors"
                >
                  <Package className="h-3.5 w-3.5 text-grocery-600 dark:text-grocery-400" />
                  Orders
                </Link>
              )}

              {/* User Avatar & Logout */}
              <div className="flex items-center space-x-2 pl-2 border-l border-neutral-200 dark:border-slate-800">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-500/30"
                />
                <span className="text-xs font-bold text-neutral-800 dark:text-slate-200 hidden md:inline truncate max-w-[120px]">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Link
                to="/login"
                className="text-xs font-bold text-neutral-700 dark:text-slate-300 hover:text-brand-600 px-3 py-2 rounded-xl transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 px-4 py-2 rounded-xl shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
