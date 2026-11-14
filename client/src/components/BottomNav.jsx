import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingBag, Package, User, Shield, Bike } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

export default function BottomNav() {
  const location = useLocation();
  const { items } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Determine user account / clearance destination
  let profileRoute = '/login';
  let profileLabel = 'Sign In';
  let ProfileIcon = User;

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      profileRoute = '/admin';
      profileLabel = 'Admin';
      ProfileIcon = Shield;
    } else if (user.role === 'delivery') {
      profileRoute = '/partner';
      profileLabel = 'Partner';
      ProfileIcon = Bike;
    } else {
      profileRoute = '/orders';
      profileLabel = 'Account';
      ProfileIcon = User;
    }
  }

  const navLinks = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/products', label: 'Explore', icon: Compass },
    { to: '/cart', label: 'Cart', icon: ShoppingBag, badge: cartCount },
    { to: '/orders', label: 'Orders', icon: Package },
    { to: profileRoute, label: profileLabel, icon: ProfileIcon },
  ];

  // Don't show bottom nav inside full screen map or delivery dashboard on small screens if already full height
  const isDeliveryActive = location.pathname.startsWith('/partner');

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-neutral-200/80 dark:border-slate-800 safe-bottom shadow-lg transition-colors duration-200"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`touch-target flex flex-col items-center justify-center relative transition-colors ${
                isActive
                  ? 'text-brand-500 font-black'
                  : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-brand-500' : ''
                  }`}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-brand-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pop">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-brand-500"></span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

