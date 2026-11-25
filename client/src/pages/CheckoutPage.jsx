import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import StripePaymentForm from '../components/checkout/StripePaymentForm';
import { triggerOrderCelebration } from '../utils/confetti';
import LocationPickerModal from '../components/location/LocationPickerModal';
import {
  ChevronLeft,
  Pencil,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  CreditCard,
  Banknote,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';

export default function CheckoutPage() {
  const { items, totals, clearCart, updateQuantity } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingAddressData, setEditingAddressData] = useState(null);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [deliveryRadiusInfo, setDeliveryRadiusInfo] = useState(null);

  // Delivery slot state
  const [selectedSlot, setSelectedSlot] = useState('express');
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');

  // Payment method state ('razorpay' | 'cod' | 'stripe')
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Razorpay Payment State
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  const [razorpayError, setRazorpayError] = useState(null);

  // Stripe Payment Intent State
  const [paymentIntentData, setPaymentIntentData] = useState(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState(null);

  const checkRadius = async (coords) => {
    const validCoords =
      Array.isArray(coords) && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0)
        ? coords
        : [78.8228, 25.5746];
    try {
      const res = await api.post('/users/check-delivery-radius', { coordinates: validCoords });
      setDeliveryRadiusInfo(res.data);
    } catch {
      setDeliveryRadiusInfo({ deliverable: true, distanceKm: 0.8, deliveryFee: 0, estimatedMinutes: 20 });
    }
  };

  useEffect(() => {
    useCartStore.getState().fetchCart();
    const fetchAddresses = async () => {
      try {
        const res = await api.get('/users/addresses');
        const list = res.data || [];
        setAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(defaultAddr._id);
          const coords =
            defaultAddr.coordinates?.coordinates &&
            (defaultAddr.coordinates.coordinates[0] !== 0 || defaultAddr.coordinates.coordinates[1] !== 0)
              ? defaultAddr.coordinates.coordinates
              : [78.8228, 25.5746];
          checkRadius(coords);
        }
      } catch (err) {
        console.error('Failed to load saved addresses:', err);
      }
    };
    fetchAddresses();
  }, []);

  const fetchPaymentIntent = async () => {
    if (!selectedAddressId) return;
    setIsCreatingIntent(true);
    setIntentError(null);
    try {
      await useCartStore.getState().syncGuestCart();
      const res = await api.post('/payments/create-intent', {
        addressId: selectedAddressId,
        deliverySlot: selectedSlot,
        note: deliveryNote,
      });
      setPaymentIntentData(res.data);
    } catch (err) {
      setIntentError(err.message || 'Failed to initialize Stripe payment gateway.');
    } finally {
      setIsCreatingIntent(false);
    }
  };

  useEffect(() => {
    if (paymentMethod === 'stripe' && !paymentIntentData && selectedAddressId) {
      fetchPaymentIntent();
    }
  }, [paymentMethod, selectedAddressId]);

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr._id);
    setPaymentIntentData(null);
    setEditingAddress(false);
    const coords =
      addr.coordinates?.coordinates &&
      (addr.coordinates.coordinates[0] !== 0 || addr.coordinates.coordinates[1] !== 0)
        ? addr.coordinates.coordinates
        : [78.8228, 25.5746];
    checkRadius(coords);
  };

  const handleAddNewAddressSubmit = async (addressData, addressId = null) => {
    try {
      const res = addressId
        ? await api.put(`/users/addresses/${addressId}`, addressData)
        : await api.post('/users/addresses', addressData);
      const updatedList = res.data || [];
      setAddresses(updatedList);
      const target = addressId
        ? updatedList.find((a) => a._id === addressId) || updatedList[updatedList.length - 1]
        : updatedList[updatedList.length - 1];
      if (target) {
        setSelectedAddressId(target._id);
        const coords =
          target.coordinates?.coordinates &&
          (target.coordinates.coordinates[0] !== 0 || target.coordinates.coordinates[1] !== 0)
            ? target.coordinates.coordinates
            : addressData.coordinates;
        checkRadius(coords);
      }
      setShowAddAddressModal(false);
      setEditingAddressData(null);
      setEditingAddress(false);
    } catch (err) {
      alert(err.message || 'Failed to save address');
    }
  };

  const handlePlaceCodOrder = async () => {
    if (!selectedAddressId) {
      setEditingAddress(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/payments/create-cod-order', {
        addressId: selectedAddressId,
        deliverySlot: selectedSlot,
        note: deliveryNote,
      });
      clearCart();
      triggerOrderCelebration();
      const created = res.data?.order || { _id: res.data?.orderId, total: effectiveGrandTotal };
      setOrderSuccess(created);
    } catch (err) {
      alert(err.message || 'Failed to place Cash on Delivery order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayWithRazorpay = async () => {
    if (!selectedAddressId) {
      setEditingAddress(true);
      return;
    }
    setIsRazorpayLoading(true);
    setRazorpayError(null);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Unable to connect to Razorpay SDK. Please check your internet connection.');
      }

      const res = await api.post('/payments/razorpay/create-order', {
        addressId: selectedAddressId,
        deliverySlot: selectedSlot,
        note: deliveryNote,
      });

      const orderPayload = res?.data?.orderId ? res.data : res?.data || res;
      const { orderId, amount, currency, keyId, user: prefillUser } = orderPayload;

      const options = {
        key: keyId || 'rzp_test_U0kEbnHVgIfK1G',
        amount,
        currency: currency || 'INR',
        name: 'CraveCourier',
        description: `Order Checkout - ${items.length} item(s)`,
        image: '/crave-courier-pin.png',
        order_id: orderId,
        prefill: {
          name: prefillUser?.name || user?.name || '',
          email: prefillUser?.email || user?.email || '',
          contact: prefillUser?.phone || user?.phone || '',
        },
        theme: { color: '#FF6B35' },
        handler: async (response) => {
          try {
            setIsRazorpayLoading(true);
            const verifyRes = await api.post('/payments/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              addressId: selectedAddressId,
              deliverySlot: selectedSlot,
              note: deliveryNote,
            });
            const verifyPayload = verifyRes?.data?.order ? verifyRes.data : verifyRes?.data?.data || verifyRes?.data || verifyRes;
            const createdOrder = verifyPayload?.order || verifyPayload;
            clearCart();
            triggerOrderCelebration();
            setOrderSuccess(createdOrder || { _id: verifyPayload?.orderId, total: effectiveGrandTotal });
          } catch (err) {
            setRazorpayError(err.response?.data?.message || err.message || 'Payment verification failed');
            setIsRazorpayLoading(false);
          }
        },
        modal: { ondismiss: () => setIsRazorpayLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setRazorpayError(resp.error?.description || 'Payment was unsuccessful or cancelled.');
        setIsRazorpayLoading(false);
      });
      rzp.open();
    } catch (err) {
      setRazorpayError(err.response?.data?.message || err.message || 'Failed to initialize Razorpay checkout');
      setIsRazorpayLoading(false);
    }
  };

  const handlePlaceOrder = () => {
    if (paymentMethod === 'razorpay') {
      handlePayWithRazorpay();
    } else if (paymentMethod === 'cod') {
      handlePlaceCodOrder();
    } else if (paymentMethod === 'stripe') {
      const form = document.getElementById('stripe-payment-form');
      if (form) form.requestSubmit();
      else alert('Please complete the card details below.');
    }
  };

  const effectiveDeliveryFee = deliveryRadiusInfo
    ? deliveryRadiusInfo.distanceKm <= 1.0
      ? 0
      : 20
    : totals.deliveryFee;

  const effectiveGrandTotal = Math.max(
    0,
    Math.round((totals.itemTotal + effectiveDeliveryFee - (totals.couponDiscount || 0)) * 100) / 100
  );

  const effectiveTotals = {
    ...totals,
    deliveryFee: effectiveDeliveryFee,
    tax: 0,
    grandTotal: effectiveGrandTotal,
  };

  const formatMoney = (val) => {
    const num = Number(val || 0);
    return num % 1 === 0 ? num : num.toFixed(2);
  };

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);
  const totalQty = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const slotLabels = {
    express: { title: 'Free - Express', sub: 'Delivery in 20 - 30 mins' },
    evening: { title: 'Evening Slot', sub: 'Today, 6:00 PM - 7:30 PM' },
    morning: { title: 'Morning Slot', sub: 'Tomorrow, 8:00 AM - 9:30 AM' },
  };

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-5">
        <div className="h-16 w-16 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center mx-auto">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-slate-100">Your Cart is Empty</h2>
          <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
            Add delicious items from our menu to start checkout.
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-gradient-to-r from-[#FF541E] to-[#FF7A00] text-white font-bold text-xs shadow-md"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  // Screen 3 Style: Clean "Purchase Complete!" Card
  if (orderSuccess) {
    const orderId = orderSuccess._id || '';
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-6 relative">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pt-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100">
              Order Complete!
            </h1>
            <p className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your order #{orderId ? String(orderId).slice(-6).toUpperCase() : 'NEW'} has been confirmed. Our kitchen is preparing your food now.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {orderId && (
              <Link
                to={`/orders/${orderId}`}
                className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#FF541E] to-[#FF7A00] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Truck className="h-4 w-4" />
                <span>Track Live Order</span>
              </Link>
            )}
            <Link
              to="/"
              className="w-full py-3 px-6 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-60px)] bg-white dark:bg-slate-950 pb-28">
      <div className="max-w-3xl mx-auto">
        {/* Minimalist Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-neutral-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="h-9 w-9 rounded-full bg-neutral-100/80 dark:bg-slate-900 border border-neutral-200/70 dark:border-slate-800 flex items-center justify-center text-neutral-700 dark:text-slate-200 hover:bg-neutral-200/70 dark:hover:bg-slate-800 transition-colors"
            aria-label="Back to cart"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <h1 className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100 tracking-tight">
            Checkout
          </h1>

          <div className="w-9" />
        </div>

        {/* Full-Width Seamless Stacked Checkout Sections */}
        <div className="divide-y divide-neutral-100 dark:divide-slate-800/80">
          {/* 1. ADDRESS SECTION */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100">
              Address
            </span>
            <button
              type="button"
              onClick={() => setEditingAddress(!editingAddress)}
              className="p-1.5 rounded-full text-neutral-500 dark:text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Edit delivery address"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedAddress ? (
            <div className="text-xs text-neutral-600 dark:text-slate-300 space-y-0.5 leading-relaxed">
              {selectedAddress.recipientName && (
                <p className="font-bold text-neutral-900 dark:text-slate-100">
                  {selectedAddress.recipientName} ({selectedAddress.label || 'Home'})
                </p>
              )}
              <p className="font-semibold text-neutral-800 dark:text-slate-200">
                {[selectedAddress.houseFloor, selectedAddress.apartmentArea, selectedAddress.street]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p>
                {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}
              </p>
              {selectedAddress.landmark && (
                <p className="text-[11px] text-neutral-400 dark:text-slate-500">
                  Landmark: {selectedAddress.landmark}
                </p>
              )}
              {selectedAddress.phone && (
                <p className="pt-0.5 text-neutral-500 dark:text-slate-400">
                  Phone : {selectedAddress.phone}
                  {selectedAddress.alternatePhone ? ` / ${selectedAddress.alternatePhone}` : ''}
                </p>
              )}
              {deliveryRadiusInfo && (
                <p
                  className={`pt-1 text-[11px] font-bold ${
                    deliveryRadiusInfo.deliverable
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {deliveryRadiusInfo.deliverable
                    ? `• ${deliveryRadiusInfo.distanceKm} km away (${
                        deliveryRadiusInfo.distanceKm <= 1 ? 'Free Delivery' : '₹20 Delivery'
                      })`
                    : `• Outside 20km delivery zone (${deliveryRadiusInfo.distanceKm} km)`}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingAddressData(null);
                setShowAddAddressModal(true);
              }}
              className="w-full py-3 rounded-2xl border border-dashed border-brand-300 dark:border-brand-800 text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center justify-center gap-1.5 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Delivery Address</span>
            </button>
          )}

          {/* Expandable Address Picker Drawer */}
          {editingAddress && (
            <div className="pt-2 space-y-2">
              {addresses.map((addr) => {
                const isSelected = addr._id === selectedAddressId;
                return (
                  <div
                    key={addr._id}
                    className={`w-full p-3 rounded-2xl border text-xs transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                        : 'border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectAddress(addr)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="font-bold text-neutral-900 dark:text-slate-100 block">
                        {addr.label} &bull; {[addr.houseFloor, addr.apartmentArea, addr.street].filter(Boolean).join(', ')}
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-slate-400 truncate block">
                        {addr.city}, {addr.pincode}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddressData(addr);
                          setShowAddAddressModal(true);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title="Update this address"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-brand-500" />}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setEditingAddressData(null);
                  setShowAddAddressModal(true);
                }}
                className="w-full py-2.5 rounded-2xl bg-neutral-100 dark:bg-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center justify-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add New Address</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. ITEMS PREVIEW & QUANTITY STEPPER */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-3.5">
            {items.map((it) => {
              const unitPrice = it.product.discountPrice || it.product.price || 0;
              const lineTotal = unitPrice * (it.quantity || 1);
              return (
                <div key={it.product._id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        it.product.images?.[0] ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'
                      }
                      alt={it.product.name}
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover bg-neutral-100 dark:bg-slate-800 flex-shrink-0 border border-neutral-100 dark:border-slate-800"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] text-neutral-400 dark:text-slate-500 block">
                        CraveCourier Hub
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100 truncate">
                        {it.product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="inline-flex items-center border border-neutral-200 dark:border-slate-700 rounded-lg bg-neutral-50 dark:bg-slate-800/60">
                          <button
                            type="button"
                            onClick={() => updateQuantity(it.product._id, Math.max(0, it.quantity - 1))}
                            className="px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-[11px] font-bold text-neutral-900 dark:text-slate-100">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(it.product._id, it.quantity + 1)}
                            className="px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <span className="text-sm sm:text-base font-black text-neutral-900 dark:text-slate-100 whitespace-nowrap">
                    ₹{formatMoney(lineTotal)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-900 dark:text-slate-100">Quantity</span>
            <span className="font-bold text-neutral-700 dark:text-slate-300">
              {totalQty} {totalQty === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* 3. DELIVERY / SHIPPING SECTION */}
        <div className="p-4 sm:p-6 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100">
              Delivery
            </span>
            <button
              type="button"
              onClick={() => setEditingDelivery(!editingDelivery)}
              className="p-1.5 rounded-full text-neutral-500 dark:text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Edit delivery slot"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-xs">
            <p className="font-semibold text-neutral-800 dark:text-slate-200">
              {selectedSlot === 'express' && effectiveDeliveryFee === 0
                ? 'Free - Express'
                : selectedSlot === 'express'
                ? `₹${effectiveDeliveryFee} - Express`
                : slotLabels[selectedSlot]?.title}
            </p>
            <p className="text-neutral-400 dark:text-slate-500 text-[11px] mt-0.5">
              {slotLabels[selectedSlot]?.sub}
            </p>
          </div>

          {editingDelivery && (
            <div className="pt-2 space-y-2">
              {[
                { id: 'express', label: 'Instant Express (20 - 30 mins)' },
                { id: 'evening', label: 'Standard Evening (6:00 PM - 7:30 PM)' },
                { id: 'morning', label: 'Morning Slot (8:00 AM - 9:30 AM)' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSlot(s.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                    selectedSlot === s.id
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                      : 'border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  <span>{s.label}</span>
                  {selectedSlot === s.id && <Check className="h-3.5 w-3.5 text-brand-500" />}
                </button>
              ))}
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Optional note for rider (e.g. Ring bell, Leave at door)"
                className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          )}
        </div>

        {/* 4. PAYMENT METHOD RADIO LIST */}
        <div className="p-4 sm:p-6 space-y-3">
          <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100 block">
            Payment Method
          </span>

          <div className="space-y-2">
            {[
              {
                id: 'razorpay',
                label: 'Pay with Razorpay (UPI / Cards)',
                icon: Zap,
                iconBg: 'bg-brand-50 dark:bg-brand-950/60 text-brand-500',
              },
              {
                id: 'cod',
                label: 'Pay with Cash on Delivery (COD)',
                icon: Banknote,
                iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600',
              },
              {
                id: 'stripe',
                label: 'Pay with Debit / Credit Card (Stripe)',
                icon: CreditCard,
                iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600',
              },
            ].map((m) => {
              const IconComp = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <span
                    className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'border-brand-500'
                        : 'border-neutral-300 dark:border-slate-600 group-hover:border-brand-400'
                    }`}
                  >
                    {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
                  </span>

                  <span className={`h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0 ${m.iconBg}`}>
                    <IconComp className="h-3.5 w-3.5" />
                  </span>

                  <span
                    className={`text-xs sm:text-sm transition-colors ${
                      isSelected
                        ? 'font-bold text-neutral-900 dark:text-slate-100'
                        : 'font-medium text-neutral-600 dark:text-slate-400'
                    }`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {razorpayError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{razorpayError}</span>
            </div>
          )}

          {paymentMethod === 'stripe' && (
            <div className="pt-2">
              {isCreatingIntent && (
                <p className="text-xs text-neutral-500 py-2">Initializing Stripe card form...</p>
              )}
              {intentError && !isCreatingIntent && (
                <p className="text-xs text-rose-600 py-2">{intentError}</p>
              )}
              {paymentIntentData && !isCreatingIntent && (
                <StripePaymentForm
                  clientSecret={paymentIntentData.clientSecret}
                  paymentIntentId={paymentIntentData.paymentIntentId}
                  addressId={selectedAddressId}
                  deliverySlot={selectedSlot}
                  deliveryNote={deliveryNote}
                  totals={paymentIntentData.totals || effectiveTotals}
                />
              )}
            </div>
          )}
        </div>

        {/* 5. PRODUCT SUMMARY KEY-VALUE BREAKDOWN (Dribbble Screen 2 Style) */}
        <div className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100">
              Order Summary
            </span>
            <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100">
              ₹{formatMoney(effectiveGrandTotal)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400 dark:text-slate-500">Store</span>
              <span className="font-semibold text-neutral-800 dark:text-slate-200">Pizza 65 &amp; Crave</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 dark:text-slate-500">Quantity</span>
              <span className="font-semibold text-neutral-800 dark:text-slate-200">
                {totalQty} {totalQty === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 dark:text-slate-500">Items Subtotal</span>
              <span className="font-semibold text-neutral-800 dark:text-slate-200">
                ₹{formatMoney(totals.itemTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 dark:text-slate-500">Delivery</span>
              <span className={`font-semibold ${effectiveDeliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-800 dark:text-slate-200'}`}>
                {effectiveDeliveryFee === 0 ? 'Free' : `₹${effectiveDeliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 dark:text-slate-500">Taxes &amp; Charges</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Discount</span>
                <span>-₹{formatMoney(totals.couponDiscount)}</span>
              </div>
            )}
          </div>

          {/* Stepper Pill Row (Dribbble Screen 2 Bottom Progress Indicator) */}
          <div className="pt-3 flex items-center justify-between text-[11px] text-neutral-400 dark:text-slate-500">
            {[
              { num: 1, label: 'Address', done: Boolean(selectedAddress) },
              { num: 2, label: 'Summary', done: true },
              { num: 3, label: 'Payment', done: Boolean(paymentMethod) },
            ].map((step, i) => (
              <div key={step.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      step.done
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-slate-800 text-neutral-400'
                    }`}
                  >
                    {step.num}
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-600 dark:text-slate-400">
                    {step.label}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-neutral-200 dark:bg-slate-800 mx-3 -mt-4" />}
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-slate-800">
            <span className="text-xs font-bold text-neutral-500 dark:text-slate-400">Total Payable</span>
            <span className="text-lg font-black text-neutral-900 dark:text-slate-100">
              ₹{formatMoney(effectiveGrandTotal)}
            </span>
          </div>
        </div>
        </div>

        {/* Trust Note */}
        <div className="py-4 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 dark:text-slate-500 border-t border-neutral-100 dark:border-slate-800/80">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>256-Bit SSL Encrypted &bull; 100% Secure Checkout</span>
        </div>
      </div>

      {/* Fixed Bottom Full-Width Pill Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-slate-800 px-4 py-3 safe-bottom">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || isRazorpayLoading || (deliveryRadiusInfo && !deliveryRadiusInfo.deliverable)}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isSubmitting || isRazorpayLoading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>
                {paymentMethod === 'cod'
                  ? `Place Order • ₹${formatMoney(effectiveGrandTotal)}`
                  : `Checkout • ₹${formatMoney(effectiveGrandTotal)}`}
              </span>
            )}
          </button>
        </div>
      </div>

      <LocationPickerModal
        isOpen={showAddAddressModal}
        onClose={() => {
          setShowAddAddressModal(false);
          setEditingAddressData(null);
        }}
        onSaveAddress={handleAddNewAddressSubmit}
        userPhone={user?.phone || ''}
        userName={user?.name || ''}
        initialAddress={editingAddressData}
      />
    </div>
  );
}
