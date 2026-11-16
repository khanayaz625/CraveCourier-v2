import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingBag, Package, User } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

export default function BottomNav() {
  const location = useLocation();
  const { items } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Streamlined, shorter navigation tabs
  // "Orders" is strictly hidden for unauthenticated visitors
  const navLinks = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/products', label: 'Explore', icon: Compass },
    ...(isAuthenticated ? [{ to: '/orders', label: 'Orders', icon: Package }] : []),
    { to: '/cart', label: 'Cart', icon: ShoppingBag, badge: cartCount },
    { to: '/account', label: 'Account', icon: User },
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
      <div className={`grid ${isAuthenticated ? 'grid-cols-5' : 'grid-cols-4'} h-12 sm:h-13 items-center px-1 max-w-md mx-auto`}>
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

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
