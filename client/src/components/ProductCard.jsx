import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Plus, Minus, Check, Heart, Flame, Sparkles } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';

export default function ProductCard({ product }) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartItems = useCartStore((state) => state.items);

  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product._id));
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);

  // Variant Selection
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const defaultIndex = hasVariants
    ? Math.max(0, product.variants.findIndex((v) => v.isDefault))
    : 0;
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(defaultIndex);

  const activeVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  // Pricing calculations based on selected variant or base product
  const mrp = activeVariant ? activeVariant.mrp : (product.mrp || product.price);
  const sellingPrice = activeVariant
    ? activeVariant.sellingPrice
    : (product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price);

  const hasDiscount = mrp > sellingPrice;
  const discountPercent = activeVariant
    ? activeVariant.discountPercent
    : (hasDiscount ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);

  const isGrocery = product.type === 'grocery';

  // Check if this specific product + variant is already in cart
  const existingCartItem = cartItems.find((it) => {
    const sameProd = it.product?._id === product._id;
    if (activeVariant && activeVariant.size) {
      return sameProd && it.selectedVariant?.size === activeVariant.size;
    }
    return sameProd && (!it.selectedVariant || !it.selectedVariant.size);
  });

  const cartQuantity = existingCartItem ? existingCartItem.quantity : 0;

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem(product, 1, activeVariant);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (err) {
      alert(err.message || 'Failed to add item to cart');
    }
  };

  const handleIncrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem(product, 1, activeVariant);
    } catch (err) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const handleDecrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (existingCartItem) {
        await updateQuantity(product._id, cartQuantity - 1);
      }
    } catch (err) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800/80 hover:border-emerald-400 dark:hover:border-emerald-500/60 p-3.5 flex flex-col justify-between shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300">
      <div>
        {/* Top Badges & Thumbnail Container (1:1 Square) */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-50 dark:bg-slate-800/60 flex items-center justify-center p-2">
          <Link to={`/products/${product.slug || product._id}`} className="w-full h-full block">
            <img
              src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-108 transition-transform duration-500 ease-out"
            />
          </Link>

          {/* Discount Pill */}
          {hasDiscount && discountPercent > 0 && (
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs">
              {discountPercent}% OFF
            </span>
          )}

          {/* Bestseller / Featured Tag */}
          {product.isBestseller ? (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
              <Flame className="h-3 w-3 fill-white" />
              Bestseller
            </span>
          ) : product.isFeatured ? (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white shadow-xs">
              <Sparkles className="h-3 w-3" />
              Featured
            </span>
          ) : null}

          {/* Wishlist Heart Button */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md shadow-xs transition-transform active:scale-90 ${
              isInWishlist
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500'
                : 'bg-white/80 dark:bg-slate-900/80 text-neutral-400 hover:text-rose-500'
            }`}
            title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-label="Wishlist"
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Content Info */}
        <div className="mt-3">
          {/* Brand & Rating Header */}
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[130px]">
              {product.brand || product.category?.name || (isGrocery ? 'Kirana' : 'Food')}
            </span>
            <span className="inline-flex items-center gap-0.5 font-bold text-neutral-800 dark:text-slate-200">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {product.rating?.average || 4.5}
            </span>
          </div>

          {/* Title */}
          <Link to={`/products/${product.slug || product._id}`}>
            <h3 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-slate-100 font-heading line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Subcategory */}
          {product.subcategory && (
            <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-medium truncate mt-0.5">
              {product.subcategory}
            </p>
          )}

          {/* Pack Size / Variant Selector Pills */}
          {hasVariants && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.variants.map((v, idx) => (
                <button
                  key={v.size}
                  type="button"
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    selectedVariantIndex === idx
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-neutral-50 dark:bg-slate-800/80 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:border-neutral-300'
                  }`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          )}

          {!hasVariants && (
            <p className="text-[11px] text-neutral-400 dark:text-slate-400 mt-1 font-medium">
              {product.unit}
            </p>
          )}
        </div>
      </div>

      {/* Price & Cart Stepper / Add Button */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-sm sm:text-base font-black text-neutral-900 dark:text-slate-100 font-heading">
              ₹{sellingPrice % 1 === 0 ? sellingPrice : sellingPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-[11px] text-neutral-400 dark:text-slate-500 line-through">
                ₹{mrp % 1 === 0 ? mrp : mrp.toFixed(2)}
              </span>
            )}
          </div>
          {activeVariant && (
            <span className="text-[9px] text-neutral-400 dark:text-slate-500">
              {activeVariant.size}
            </span>
          )}
        </div>

        {cartQuantity > 0 ? (
          <div className="flex items-center bg-emerald-600 text-white rounded-2xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handleDecrement}
              className="p-1 hover:bg-emerald-700 rounded-xl transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs font-black min-w-[20px] text-center">
              {cartQuantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              className="p-1 hover:bg-emerald-700 rounded-xl transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleQuickAdd}
            className={`touch-target px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all duration-300 shadow-xs hover:scale-105 active:scale-95 ${
              added
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-200 dark:border-emerald-800/50'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {added ? (
              <span className="flex items-center gap-1 animate-pop">
                <Check className="h-4 w-4" />
                <span>Added</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
