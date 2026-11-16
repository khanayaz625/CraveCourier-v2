import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { useAuthStore } from '../store/useAuthStore';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { ProductDetailSkeleton } from '../components/SkeletonLoader';
import {
  Star,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  ShieldCheck,
  Clock,
  Heart,
  Sparkles,
  Flame,
  Truck,
  Layers,
} from 'lucide-react';

export default function ProductDetailPage() {
  const { identifier } = useParams();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [frequentProducts, setFrequentProducts] = useState([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isInWishlist = useWishlistStore((state) => (product ? state.isInWishlist(product._id) : false));
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/products/${identifier}`);
        const prod = res.data?.product || res?.product || (res?.data && !res?.data?.product ? res.data : null);
        setProduct(prod);
        setRelatedProducts(res.data?.relatedProducts || res?.relatedProducts || []);

        // Pick default variant index if variants exist
        if (prod?.variants && prod.variants.length > 0) {
          const defIdx = prod.variants.findIndex((v) => v.isDefault);
          setSelectedVariantIndex(defIdx > -1 ? defIdx : 0);
        }

        // Fetch frequently bought together suggestions (from popular items)
        try {
          const freqRes = await api.get('/products?limit=4&sort=popular');
          const filtered = (freqRes.data?.products || []).filter(
            (p) => p._id !== prod?._id
          );
          setFrequentProducts(filtered.slice(0, 3));
        } catch {}
      } catch (err) {
        setError(err.message || 'Product not found');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [identifier]);

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="py-12">
        <EmptyState
          type="generic"
          title="Product Not Found"
          description={error || "The grocery item you requested doesn't seem to be available in our current catalog."}
          actionText="Back to Catalog"
          actionLink="/products"
        />
      </div>
    );
  }

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const activeVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  // Active pricing calculations
  const mrp = activeVariant ? activeVariant.mrp : (product.mrp || product.price);
  const sellingPrice = activeVariant
    ? activeVariant.sellingPrice
    : (product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price);

  const hasDiscount = mrp > sellingPrice;
  const savings = hasDiscount ? mrp - sellingPrice : 0;
  const discountPercent = activeVariant
    ? activeVariant.discountPercent
    : (hasDiscount ? Math.round((savings / mrp) * 100) : 0);

  const { isAuthenticated, openAuthModal } = useAuthStore();

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    try {
      await useCartStore.getState().addItem(product, quantity, activeVariant);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch (err) {
      alert(err.message || 'Failed to add item to cart');
    }
  };

  const handleWishlistClick = () => {
    toggleWishlist(product);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-neutral-400">
        <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-emerald-600 transition-colors">CraveCourier</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              to={`/products?category=${product.category?.slug || product.category}`}
              className="hover:text-emerald-600 transition-colors"
            >
              {product.category?.name || product.category || 'Category'}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-neutral-800 dark:text-slate-200 font-medium truncate max-w-[150px] sm:max-w-xs">
          {product.name}
        </span>
      </nav>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left: 1:1 Square High-Res Product Photography */}
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-neutral-50 dark:bg-slate-900 shadow-sm border border-neutral-200/80 dark:border-slate-800 p-6 flex items-center justify-center">
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
            }}
            className="w-full h-full object-contain"
          />

          {hasDiscount && discountPercent > 0 && (
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-md">
              {discountPercent}% OFF
            </span>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlistClick}
            className={`absolute top-4 right-4 p-2.5 rounded-2xl backdrop-blur-md shadow-md transition-all active:scale-90 ${
              isInWishlist
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500'
                : 'bg-white/80 dark:bg-slate-800/80 text-neutral-400 hover:text-rose-500'
            }`}
            title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="space-y-6">
          <div>
            {/* Brand & Subcategory Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {product.brand && (
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  {product.brand}
                </span>
              )}
              {product.subcategory && (
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300">
                  {product.subcategory}
                </span>
              )}
              {product.productId && (
                <span className="text-[11px] font-mono text-neutral-400">
                  ID: {product.productId}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-heading text-neutral-900 dark:text-slate-100 leading-tight">
              {product.name}
            </h1>

            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
              Package Size: {activeVariant ? activeVariant.size : product.unit}
            </p>
          </div>

          {/* Rating & Stock Badges */}
          <div className="flex items-center space-x-3 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating?.average || 4.5}</span>
              <span className="text-neutral-400 font-normal">({product.rating?.count || 48} reviews)</span>
            </span>

            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
              <Check className="h-3 w-3 text-emerald-600" />
              <span>{product.stock > 0 ? 'In Stock (Ready to Dispatch)' : 'Out of Stock'}</span>
            </span>
          </div>

          {/* Interactive Pack Size / Variant Picker */}
          {hasVariants && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> Select Pack Size:
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {product.variants[selectedVariantIndex]?.size || 'Standard'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {product.variants.map((v, idx) => (
                  <button
                    key={v.size}
                    type="button"
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      selectedVariantIndex === idx
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 shadow-xs ring-1 ring-emerald-500'
                        : 'border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-neutral-900 dark:text-slate-100">{v.size}</div>
                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                      ₹{v.sellingPrice}
                    </div>
                    {v.mrp > v.sellingPrice && (
                      <div className="text-[10px] text-neutral-400 line-through">MRP ₹{v.mrp}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price & Savings Display */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black font-heading text-neutral-900 dark:text-slate-100">
                ₹{sellingPrice % 1 === 0 ? sellingPrice : sellingPrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-base text-neutral-400 line-through">
                  ₹{mrp % 1 === 0 ? mrp : mrp.toFixed(2)}
                </span>
              )}
            </div>

            {hasDiscount && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                You save ₹{savings % 1 === 0 ? savings : savings.toFixed(2)} ({discountPercent}% OFF) &bull; Inclusive of all taxes
              </p>
            )}
          </div>

          {/* Quantity Stepper & Add to Cart (Only for authenticated users) */}
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="flex items-center justify-between sm:justify-center border border-neutral-300 dark:border-slate-700 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xs">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-bold text-sm text-neutral-900 dark:text-slate-100">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-98 ${
                  added
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Added {quantity} to Cart (₹{(sellingPrice * quantity) % 1 === 0 ? (sellingPrice * quantity) : (sellingPrice * quantity).toFixed(2)})</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Add to Cart &bull; ₹{(sellingPrice * quantity) % 1 === 0 ? (sellingPrice * quantity) : (sellingPrice * quantity).toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-glow transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Sign In to Order &bull; ₹{sellingPrice % 1 === 0 ? sellingPrice : sellingPrice.toFixed(2)}</span>
              </Link>
            </div>
          )}

          {/* Description & Details */}
          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400">
              Product Overview
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
              {product.description || 'Authentic quality kirana grocery item, hand-packed for maximum freshness and aroma.'}
            </p>
          </div>

          {/* Delivery & Assurance Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-neutral-600 dark:text-slate-400">
            <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-neutral-50 dark:bg-slate-900 border border-neutral-100 dark:border-slate-800">
              <Truck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Free Delivery within 1km &bull; Express Dispatch</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-neutral-50 dark:bg-slate-900 border border-neutral-100 dark:border-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>100% Genuine Sealed Quality Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Purchased Together */}
      {frequentProducts.length > 0 && (
        <section className="pt-8 border-t border-neutral-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-black font-heading text-neutral-900 dark:text-slate-100">
              Frequently Purchased Together
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 justify-items-center sm:justify-items-stretch">
            {frequentProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-neutral-200 dark:border-slate-800 space-y-4">
          <h2 className="text-lg font-black font-heading text-neutral-900 dark:text-slate-100">
            More in {product.category?.name || product.category || 'This Collection'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 justify-items-center sm:justify-items-stretch">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel._id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
