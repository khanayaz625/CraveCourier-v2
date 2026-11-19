import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Heart,
} from 'lucide-react';
import NotificationBell from './notifications/NotificationBell';
import BrandLogo from './BrandLogo';
import UserAvatar from './UserAvatar';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { items } = useCartStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep Craved Admin portal completely separated with its own dedicated header
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 shadow-soft transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* ============================================================== */}
        {/* MOBILE HEADER LAYOUT (3-Column Grid: Never Overlaps)            */}
        {/* ============================================================== */}
        <div className="grid grid-cols-3 items-center w-full sm:hidden">
          {/* Mobile Col 1 (Left): Theme Toggle Button */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? (
                <Sun className="h-4.5 w-4.5 text-amber-400 animate-pop" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-600 animate-pop" />
              )}
            </button>
          </div>

          {/* Mobile Col 2 (Center): Strictly Centered Brand Logo */}
          <div className="flex items-center justify-center">
            <Link to="/" className="flex items-center justify-center group">
              <BrandLogo size="sm" />
            </Link>
          </div>

          {/* Mobile Col 3 (Right): Notification Bell & User Controls */}
          <div className="flex items-center justify-end space-x-1">
            {isAuthenticated ? (
              <>
                <NotificationBell />

                <Link
                  to="/account"
                  title="My Account"
                  className="flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-brand-500 transition-all"
                >
                  <UserAvatar user={user} size="sm" />
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* DESKTOP / TABLET HEADER LAYOUT (Flex row with full spacing)    */}
        {/* ============================================================== */}
        <div className="hidden sm:flex items-center justify-between">
          {/* Desktop Left: Brand Logo & Navigation */}
          <div className="flex items-center space-x-6 flex-shrink-0">
            <Link to="/" className="flex items-center group flex-shrink-0">
              <BrandLogo size="md" />
            </Link>

            <nav className="flex items-center space-x-1 text-xs font-bold">
              <Link
                to="/products"
                className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                All Menu
              </Link>
              <Link
                to="/products?category=pizzas"
                className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
              >
                Pizzas 🍕
              </Link>
              <Link
                to="/products?category=burgers"
                className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
              >
                Burgers 🍔
              </Link>
              <Link
                to="/products?category=sandwiches"
                className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                Sandwiches 🥪
              </Link>
              <Link
                to="/products?category=fries"
                className="px-3 py-2 rounded-xl text-neutral-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Fries 🍟
              </Link>
            </nav>
          </div>

          {/* Desktop Right: Actions, Badges & User Profile */}
          <div className="flex items-center space-x-2">
            {/* Desktop Theme Toggle */}
            <button
              type="button"
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

            {/* In-App Notifications Drawer Trigger (when authenticated) */}
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

            {/* Shopping Cart Icon */}
            {isAuthenticated && (
              <Link
                to="/cart"
                className="relative p-2 rounded-xl text-neutral-700 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors flex items-center justify-center"
                title="Shopping Cart"
                aria-label="View Shopping Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pop">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Authenticated User Status */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                {/* Role Badges */}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                  >
                    <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Admin
                  </Link>
                )}
                {user.role === 'delivery' && (
                  <Link
                    to="/partner"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <Bike className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Partner
                  </Link>
                )}
                {user.role === 'customer' && (
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-grocery-50 dark:bg-grocery-950/50 text-grocery-700 dark:text-grocery-300 border border-grocery-200 dark:border-grocery-800 hover:bg-grocery-100 transition-colors"
                  >
                    <Package className="h-3.5 w-3.5 text-grocery-600 dark:text-grocery-400" />
                    Orders
                  </Link>
                )}

                {/* User Avatar & Logout */}
                <div className="flex items-center space-x-2 pl-2 border-l border-neutral-200 dark:border-slate-800">
                  <Link to="/account" title="Account" className="flex items-center space-x-2">
                    <UserAvatar user={user} size="md" />
                    <span className="text-xs font-bold text-neutral-800 dark:text-slate-200 hidden md:inline truncate max-w-[120px]">
                      {user.name}
                    </span>
                  </Link>
                  <button
                    type="button"
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
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-xs font-bold text-neutral-700 dark:text-slate-300 hover:text-brand-600 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 px-4 py-1.5 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
