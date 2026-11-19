import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingBag, Package, User } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';

export default function BottomNav() {
  const location = useLocation();
  const { items } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const cartCount = Array.isArray(items)
    ? items
        .filter((it) => it && it.product && typeof it.product === 'object')
        .reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
    : 0;

  // Account is prominently centered in the bottom navigation bar
  const navLinks = isAuthenticated
    ? [
        { to: '/', label: 'Home', icon: Home, exact: true },
        { to: '/products', label: 'Explore', icon: Compass },
        { to: '/account', label: 'Account', icon: User, badge: unreadCount, isCenter: true },
        { to: '/orders', label: 'Orders', icon: Package },
        { to: '/cart', label: 'Cart', icon: ShoppingBag, badge: cartCount },
      ]
    : [
        { to: '/', label: 'Home', icon: Home, exact: true },
        { to: '/account', label: 'Account', icon: User, badge: unreadCount, isCenter: true },
        { to: '/products', label: 'Explore', icon: Compass },
      ];

  // Separate app experience: Hide mobile bottom nav inside Craved Admin and Courier portal
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/partner')) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-slate-800 safe-bottom shadow-lg transition-colors duration-200"
    >
      <div className={`grid ${isAuthenticated ? 'grid-cols-5' : 'grid-cols-3'} h-12 sm:h-13 items-center px-1 max-w-md mx-auto`}>
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          if (item.isCenter) {
            return (
              <Link
                key={item.label}
                to={item.to}
                className="flex flex-col items-center justify-center relative -top-2 py-0.5 transition-transform active:scale-95 group"
              >
                <div
                  className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shadow-md transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-brand-500/40 ring-3 ring-brand-100 dark:ring-brand-950/60'
                      : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border-2 border-neutral-200 dark:border-slate-700 hover:border-brand-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.badge > 0 && (
                    <span className="absolute top-0 right-0 h-3.5 min-w-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] mt-0.5 tracking-tight font-bold ${
                    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center relative py-1 transition-colors ${
                isActive
                  ? 'text-brand-500 font-black'
                  : 'text-neutral-400 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-4.5 w-4.5 transition-transform duration-150 ${
                    isActive ? 'scale-110 text-brand-500' : ''
                  }`}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 h-3.5 min-w-[14px] px-0.5 rounded-full bg-brand-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 h-0.5 w-4 rounded-full bg-brand-500"></span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
