import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Plus, Minus, Heart, Flame, Sparkles } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';

export default function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartItems = useCartStore((state) => state.items);

  const isInWishlist = useWishlistStore((state) => (product ? state.isInWishlist(product._id) : false));
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const navigate = useNavigate();

  // Clean English name (guarantees no Hindi words/scripts appear on cards)
  const cleanName = (product?.name || '')
    .replace(/\s*\([\u0900-\u097F\s\-&,.]+\)/g, '')
    .replace(/[\u0900-\u097F]/g, '')
    .trim();

  // Variant Selection
  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
  const defaultIndex = hasVariants
    ? Math.max(0, product.variants.findIndex((v) => v.isDefault))
    : 0;
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(defaultIndex);

  const activeVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  // Pricing calculations
  const mrp = activeVariant ? activeVariant.mrp : (product?.mrp || product?.price || 0);
  const sellingPrice = activeVariant
    ? activeVariant.sellingPrice
    : (product?.discountPrice && product.discountPrice > 0 ? product.discountPrice : (product?.price || 0));

  const hasDiscount = mrp > sellingPrice;
  const discountPercent = activeVariant
    ? activeVariant.discountPercent
    : (hasDiscount && mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);

  // Check if this item + variant is currently in the cart
  const existingCartItem = cartItems.find((it) => {
    const sameProd = (it.product?._id || it.product) === product?._id;
    if (activeVariant && activeVariant.size) {
      return sameProd && it.selectedVariant?.size === activeVariant.size;
    }
    return sameProd && (!it.selectedVariant || !it.selectedVariant.size);
  });

  const cartQuantity = existingCartItem ? existingCartItem.quantity : 0;

  // Instant Add to Cart (converts directly to counter stepper)
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem(product, 1, activeVariant);
    } catch (err) {
      console.error('Failed to add item to cart:', err);
    }
  };

  const handleIncrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem(product, 1, activeVariant);
    } catch (err) {
      console.error('Failed to increase quantity:', err);
    }
  };

  const handleDecrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateQuantity(product._id, cartQuantity - 1, activeVariant);
    } catch (err) {
      console.error('Failed to decrease quantity:', err);
    }
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) {
      return;
    }
    navigate(`/products/${product.slug || product._id}`);
  };

  if (!product) return null;

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/70 dark:border-slate-800 p-3 sm:p-4 flex flex-col justify-between shadow-soft hover:shadow-xl hover:shadow-neutral-200/60 dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300 w-full text-left overflow-hidden cursor-pointer"
    >
      <div>
        {/* Top Badges & Food Image Container */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-50/80 dark:bg-slate-800/50 flex items-center justify-center p-2.5">
          <Link
            to={`/products/${product.slug || product._id}`}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={product.images?.[0] || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'}
              alt={cleanName}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400';
              }}
              className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300 ease-out drop-shadow-sm"
            />
          </Link>

          {/* Discount Pill */}
          {hasDiscount && discountPercent > 0 && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-xs">
              {discountPercent}% OFF
            </span>
          )}

          {/* Bestseller / Featured Tag */}
          {product.isBestseller ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
              <Flame className="h-3 w-3 fill-white" />
              Bestseller
            </span>
          ) : product.isFeatured ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white shadow-xs">
              <Sparkles className="h-3 w-3" />
              Featured
            </span>
          ) : null}

          {/* Wishlist Heart Button */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md shadow-sm transition-transform active:scale-85 ${
              isInWishlist
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500'
                : 'bg-white/90 dark:bg-slate-900/90 text-neutral-400 hover:text-rose-500'
            }`}
            title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-label="Wishlist"
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Content Info */}
        <div className="mt-3 flex flex-col items-start w-full">
          {/* Subtitle / Category & Rating */}
          <div className="w-full flex items-center justify-between text-[11px] mb-1">
            <span className="font-bold text-neutral-400 dark:text-slate-400 truncate max-w-[120px]">
              {product.subcategory || product.category?.name || product.brand || 'Fast Food'}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-neutral-700 dark:text-slate-200">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {product.rating?.average || 4.8}
            </span>
          </div>

          {/* Product Title (Clean English, No Hindi Words) */}
          <Link to={`/products/${product.slug || product._id}`} className="w-full text-left">
            <h3 className="font-extrabold text-xs sm:text-sm text-neutral-900 dark:text-slate-100 font-heading line-clamp-1 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors leading-snug">
              {cleanName}
            </h3>
          </Link>

          {/* Size / Variant Selector Pills */}
          {hasVariants ? (
            <div className="mt-2 flex flex-wrap gap-1 justify-start w-full">
              {product.variants.map((v, idx) => (
                <button
                  key={v.size}
                  type="button"
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`whitespace-nowrap px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    selectedVariantIndex === idx
                      ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500 text-brand-600 dark:text-brand-300 shadow-xs'
                      : 'bg-neutral-50 dark:bg-slate-800/80 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:border-neutral-300'
                  }`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-neutral-400 dark:text-slate-400 mt-1 font-medium text-left w-full">
              {product.unit || 'Standard'}
            </p>
          )}
        </div>
      </div>

      {/* Price & Add to Cart / Counter Stepper */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-slate-800/80 flex items-center justify-between gap-2 w-full">
        <div className="flex flex-col items-start min-w-0">
          <div className="flex items-baseline space-x-1">
            <span className="text-sm sm:text-base font-black text-neutral-900 dark:text-slate-100 font-heading">
              ₹{sellingPrice % 1 === 0 ? sellingPrice : sellingPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-neutral-400 dark:text-slate-500 line-through truncate">
                ₹{mrp % 1 === 0 ? mrp : mrp.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Action: Add Button directly converts into Stepper Counter */}
        {cartQuantity > 0 ? (
          <div className="flex items-center bg-brand-500 text-white rounded-2xl p-0.5 shadow-md shadow-brand-500/20 flex-shrink-0 animate-pop">
            <button
              type="button"
              onClick={handleDecrement}
              className="p-1 sm:p-1.5 hover:bg-black/15 active:scale-85 rounded-xl transition-all"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <span className="px-2 text-xs sm:text-sm font-black min-w-[20px] text-center select-none">
              {cartQuantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              className="p-1 sm:p-1.5 hover:bg-black/15 active:scale-85 rounded-xl transition-all"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleQuickAdd}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs font-black transition-all duration-200 shadow-sm shadow-brand-500/20 flex-shrink-0 flex items-center justify-center gap-1 active:scale-95 bg-brand-500 hover:bg-brand-600 text-white"
            aria-label={`Add ${cleanName} to cart`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
