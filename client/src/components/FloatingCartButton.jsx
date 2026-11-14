import { useLocation, Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

export default function FloatingCartButton() {
  const location = useLocation();
  const { items, totals } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Hide before sign in, on empty cart, or on cart and checkout pages
  const isHidden =
    !isAuthenticated ||
    totalQuantity === 0 ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout';

  if (isHidden) return null;

  return (
    <aside
      aria-label="Floating Cart Summary"
      className="fixed z-40 bottom-20 md:bottom-8 right-3 md:right-8 transition-transform duration-300 animate-pop"
    >
      <Link
        to="/cart"
        className="touch-target group flex items-center space-x-2.5 sm:space-x-3 bg-gradient-to-r from-brand-500 via-brand-600 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white pl-3.5 pr-4 sm:pl-4 sm:pr-5 py-2.5 sm:py-3 rounded-full shadow-float hover:shadow-glow transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
      >
        {/* Quantity Badge */}
        <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-white/20 backdrop-blur-md">
          <ShoppingBag className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white text-brand-600 text-[10px] font-black flex items-center justify-center shadow-xs">
            {totalQuantity}
          </span>
        </div>

        {/* Price & Action */}
        <div className="flex flex-col text-left">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-100">
            View Basket
          </span>
          <span className="text-xs sm:text-sm font-black tracking-tight">
            ₹{(totals?.grandTotal || 0) % 1 === 0 ? (totals?.grandTotal || 0) : (totals?.grandTotal || 0).toFixed(2)}
          </span>
        </div>

        <ArrowRight className="h-4 w-4 text-white/80 group-hover:translate-x-1 transition-transform" />
      </Link>
    </aside>
  );
}

