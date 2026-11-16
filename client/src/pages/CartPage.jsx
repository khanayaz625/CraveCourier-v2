import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import EmptyState from '../components/EmptyState';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
} from 'lucide-react';

export default function CartPage() {
  const {
    items,
    totals,
    coupon,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    fetchCart,
    isLoading,
  } = useCartStore();

  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;

    setCouponError('');
    setCouponSuccess('');
    setApplying(true);

    try {
      const msg = await applyCoupon(code);
      setCouponSuccess(msg || `Coupon ${code} applied!`);
      setCouponCode('');
    } catch (err) {
      setCouponError(err.message || 'Failed to apply coupon');
    } finally {
      setApplying(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/register', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          type="cart"
          title="Your basket is craving something delicious!"
          description="Explore our chef specialties and supermarket essentials ready for 20-min delivery."
          actionText="Explore Hot Food & Groceries"
          actionLink="/products"
        />
      </div>
    );
  }

  // Free delivery threshold ($35)
  const freeDeliveryThreshold = 35;
  const amountNeededForFree = Math.max(0, freeDeliveryThreshold - totals.itemTotal);
  const freeDeliveryProgress = Math.min(100, Math.round((totals.itemTotal / freeDeliveryThreshold) * 100));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading">
            Your Order Basket
          </h1>
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            {items.reduce((sum, it) => sum + it.quantity, 0)} items selected
          </p>
        </div>
        <button
          onClick={clearCart}
          className="touch-target text-xs font-bold text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Delivery Rule Banner (1km Free, >1km ₹20, 0% Tax) */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-emerald-50 via-brand-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 border border-emerald-200/80 dark:border-slate-700 shadow-soft">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs">
          <span className="font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              <strong className="text-emerald-700 dark:text-emerald-300">FREE Delivery</strong> within 1 km &bull; Flat <strong className="text-neutral-900 dark:text-white">₹20</strong> beyond 1 km &bull; <strong className="text-brand-600">0% Tax</strong> (No hidden fees)
            </span>
          </span>
          <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
            Transparent Pricing
          </span>
        </div>
      </div>

      {/* Main Cart Items + Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-3.5">
          {items.map((item) => {
            const product = item.product;
            const price = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;
            const subtotal = price * item.quantity;
            const isGrocery = product.type === 'grocery';

            return (
              <div
                key={product._id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-soft hover:shadow-card transition-all"
              >
                {/* Product Thumbnail & Names */}
                <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0">
                  <img
                    src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                    alt={product.name}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover bg-neutral-100 dark:bg-slate-800 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                          product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                        title={product.isVeg ? 'Veg' : 'Non-Veg'}
                      />
                      <h3 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-slate-100 font-heading truncate">
                        {product.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-neutral-400 dark:text-slate-400">
                        {item.selectedVariant?.size || product.unit}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded ${
                          isGrocery ? 'bg-grocery-100 dark:bg-grocery-950/60 text-grocery-700 dark:text-grocery-300' : 'bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300'
                        }`}
                      >
                        {isGrocery ? 'Mart' : 'Dish'}
                      </span>
                    </div>
                    <p className="text-xs font-black text-neutral-900 dark:text-slate-100 mt-1">
                      ₹{price % 1 === 0 ? price : price.toFixed(2)}
                      {product.discountPrice > 0 && (
                        <span className="text-[10px] text-neutral-400 dark:text-slate-500 line-through ml-1.5 font-normal">
                          ₹{product.price % 1 === 0 ? product.price : product.price.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Mobile Trash Icon on top-right */}
                  <button
                    type="button"
                    onClick={() => removeItem(product._id)}
                    className="sm:hidden p-1.5 text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Quantity Controls & Item Subtotal */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-slate-800 flex-shrink-0">
                  <div className="flex items-center border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50 dark:bg-slate-800/80 p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product._id, item.quantity - 1)}
                      className="touch-target h-8 w-8 rounded-xl flex items-center justify-center text-neutral-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-neutral-900 dark:text-slate-100">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product._id, item.quantity + 1)}
                      className="touch-target h-8 w-8 rounded-xl flex items-center justify-center text-neutral-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100 min-w-[50px] text-right">
                      ₹{subtotal % 1 === 0 ? subtotal : subtotal.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(product._id)}
                      className="hidden sm:inline-flex touch-target p-1.5 text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Coupon & Order Summary Card */}
        <div className="space-y-4">
          {/* Promo Coupon Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-5 shadow-soft space-y-3.5">
            <h2 className="font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-500" />
              <span>Apply Coupons & Promos</span>
            </h2>

            {coupon ? (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    {coupon.code}
                  </span>
                  <span className="block text-[10px] text-emerald-700 dark:text-emerald-400">
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}% Discount Applied`
                      : `₹${coupon.discountValue} Flat Discount Applied`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="touch-target text-xs text-emerald-800 dark:text-emerald-300 hover:text-rose-600 font-bold"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE (e.g. WELCOME50)"
                    className="flex-1 uppercase font-mono text-xs px-3.5 py-2.5 border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 rounded-2xl focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={applying || !couponCode.trim()}
                    className="touch-target px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-2xl shadow-xs disabled:opacity-50 transition-colors"
                  >
                    Apply
                  </button>
                </div>

                {couponError && <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>}
                {couponSuccess && <p className="text-[11px] text-emerald-600 font-medium">{couponSuccess}</p>}

                {/* Available Quick Coupon Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon('WELCOME50')}
                    className="touch-target text-[10px] font-bold px-3 py-1.5 bg-neutral-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:text-brand-600 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-300 transition-colors"
                  >
                    WELCOME50 (50% off up to ₹50)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon('CRAVE20')}
                    className="touch-target text-[10px] font-bold px-3 py-1.5 bg-neutral-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:text-brand-600 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-300 transition-colors"
                  >
                    CRAVE20 (₹20 off)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bill Details Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-5 shadow-soft space-y-4">
            <h2 className="font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-slate-400">
              Bill Summary
            </h2>

            <div className="space-y-2.5 text-xs text-neutral-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Item Total</span>
                <span className="font-bold text-neutral-900 dark:text-slate-100">
                  ₹{totals.itemTotal % 1 === 0 ? totals.itemTotal : totals.itemTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <div>
                  <span>Delivery Fee</span>
                  <span className="text-[10px] text-neutral-400 block">Free within 1km &bull; ₹20 beyond</span>
                </div>
                <span className={`font-bold ${totals.deliveryFee === 0 ? 'text-emerald-600' : 'text-neutral-900 dark:text-slate-100'}`}>
                  {totals.deliveryFee === 0 ? 'FREE (₹0)' : `₹${totals.deliveryFee}`}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Taxes & Service Fee (0%)</span>
                <span className="font-bold text-emerald-600">₹0 (Zero Charges)</span>
              </div>

              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Savings</span>
                  <span>-₹{totals.couponDiscount % 1 === 0 ? totals.couponDiscount : totals.couponDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-3.5 border-t border-neutral-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
              <div className="flex items-baseline justify-between sm:block">
                <span className="text-xs font-bold text-neutral-500 dark:text-slate-400 block sm:mb-0.5">Grand Total</span>
                <span className="text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading">
                  ₹{totals.grandTotal % 1 === 0 ? totals.grandTotal : totals.grandTotal.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="touch-target w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-sm shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
