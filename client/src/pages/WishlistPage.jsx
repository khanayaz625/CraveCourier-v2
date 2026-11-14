import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Trash2, ShoppingBag } from 'lucide-react';
import { useWishlistStore } from '../store/useWishlistStore';
import ProductCard from '../components/ProductCard';

export default function WishlistPage() {
  const items = useWishlistStore((state) => state.items);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-neutral-200 dark:border-slate-800">
        <div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-emerald-600 dark:text-slate-400 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 fill-rose-500" />
            <h1 className="text-xl sm:text-2xl font-black font-heading text-neutral-900 dark:text-slate-100">
              My Saved Wishlist
            </h1>
            <span className="ml-1 sm:ml-2 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearWishlist}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Wishlist
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-8 max-w-md mx-auto shadow-soft">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-400">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold font-heading text-neutral-900 dark:text-slate-100 mb-2">
            Your Wishlist is Empty
          </h2>
          <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6">
            Tap the heart icon on any grocery or food item to save your favorite essentials for later!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            Explore CraveCourier Catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((prod) => (
            <ProductCard key={prod._id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
}
