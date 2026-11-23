import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import StripePaymentForm from '../components/checkout/StripePaymentForm';
import { triggerOrderCelebration } from '../utils/confetti';
import LocationPickerModal from '../components/location/LocationPickerModal';
import {
  MapPin,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Building,
  Home,
  Briefcase,
  Zap,
  ShoppingBag,
  Sparkles,
  Truck,
  Check,
  Lock,
} from 'lucide-react';

export default function CheckoutPage() {
  const { items, totals, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // 3-step checkout state (1 = Address, 2 = Slot, 3 = Payment)
  const [currentStep, setCurrentStep] = useState(1);

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [deliveryRadiusInfo, setDeliveryRadiusInfo] = useState(null);

  // Delivery slot state
  const [selectedSlot, setSelectedSlot] = useState('express');
  const [deliveryNote, setDeliveryNote] = useState('');

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'cod' | 'stripe'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Razorpay Payment State
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  const [razorpayError, setRazorpayError] = useState(null);

  // Stripe Payment Intent State
  const [paymentIntentData, setPaymentIntentData] = useState(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState(null);

  // Mobile bottom sheet expand/collapse
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Check delivery radius with backend
  const checkRadius = async (coords) => {
    const validCoords =
      Array.isArray(coords) && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0)
        ? coords
        : [78.8228, 25.5746];
    try {
      const res = await api.post('/users/check-delivery-radius', { coordinates: validCoords });
      setDeliveryRadiusInfo(res.data);
    } catch {
      // Default to deliverable if radius check offline
      setDeliveryRadiusInfo({ deliverable: true, distanceKm: 0.8, deliveryFee: 0, estimatedMinutes: 20 });
    }
  };

  // Fetch Saved Addresses & sync Cart on mount
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

  // Fetch or initialize Stripe PaymentIntent when Step 3 is reached
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
      console.error('Failed to create payment intent:', err);
      setIntentError(err.message || 'Failed to initialize Stripe payment gateway.');
    } finally {
      setIsCreatingIntent(false);
    }
  };

  useEffect(() => {
    if (currentStep === 3 && paymentMethod === 'stripe' && !paymentIntentData && selectedAddressId) {
      fetchPaymentIntent();
    }
  }, [currentStep, paymentMethod, selectedAddressId]);

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr._id);
    setPaymentIntentData(null); // Reset intent so amount / address updates
    const coords =
      addr.coordinates?.coordinates &&
      (addr.coordinates.coordinates[0] !== 0 || addr.coordinates.coordinates[1] !== 0)
        ? addr.coordinates.coordinates
        : [78.8228, 25.5746];
    checkRadius(coords);
  };

  const handleAddNewAddressSubmit = async (addressData) => {
    try {
      const res = await api.post('/users/addresses', addressData);
      const updatedList = res.data || [];
      setAddresses(updatedList);
      const added = updatedList[updatedList.length - 1];
      if (added) {
        setSelectedAddressId(added._id);
        const coords =
          added.coordinates?.coordinates &&
          (added.coordinates.coordinates[0] !== 0 || added.coordinates.coordinates[1] !== 0)
            ? added.coordinates.coordinates
            : addressData.coordinates;
        checkRadius(coords);
      }
      setShowAddAddressModal(false);
    } catch (err) {
      alert(err.message || 'Failed to add address');
    }
  };

  // Quick delivery note chip toggle
  const handleQuickNote = (noteText) => {
    if (!deliveryNote.includes(noteText)) {
      setDeliveryNote((prev) => (prev ? `${prev}, ${noteText}` : noteText));
    }
  };

  // Place Cash on Delivery (COD) Order
  const handlePlaceCodOrder = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/payments/create-cod-order', {
        addressId: selectedAddressId,
        deliverySlot: selectedSlot,
        note: deliveryNote,
      });
      clearCart();
      triggerOrderCelebration();
      const orderId = res.data?.orderId || res.data?.order?._id;
      navigate(`/orders/${orderId}`);
    } catch (err) {
      alert(err.message || 'Failed to place Cash on Delivery order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
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
  };

  const handlePayWithRazorpay = async () => {
    if (!selectedAddressId) {
      alert('Please select or add a delivery address first.');
      setCurrentStep(1);
      return;
    }

    setIsRazorpayLoading(true);
    setRazorpayError(null);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Unable to connect to Razorpay SDK. Please check your internet connection.');
      }

      // 1. Create order on backend
      const res = await api.post('/payments/razorpay/create-order', {
        addressId: selectedAddressId,
        deliverySlot: selectedSlot,
        note: deliveryNote,
      });

      const orderPayload = res?.data?.orderId ? res.data : (res?.data || res);
      const { orderId, amount, currency, keyId, user: prefillUser } = orderPayload;

      // 2. Open Razorpay Checkout modal
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
        theme: {
          color: '#FF6B35',
        },
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

            const verifyPayload = verifyRes?.data?.order ? verifyRes.data : (verifyRes?.data?.data || verifyRes?.data || verifyRes);
            const createdOrder = verifyPayload?.order || verifyPayload;
            setOrderSuccess(createdOrder || true);
            clearCart();
            triggerOrderCelebration();

            const targetOrderId = createdOrder?._id || verifyPayload?.orderId;
            navigate(`/orders/${targetOrderId}`);
          } catch (err) {
            setRazorpayError(err.response?.data?.message || err.message || 'Payment verification failed');
            setIsRazorpayLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsRazorpayLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setRazorpayError(resp.error?.description || 'Payment was unsuccessful or cancelled.');
        setIsRazorpayLoading(false);
      });
      rzp.open();
    } catch (err) {
      setRazorpayError(err.response?.data?.message || err.message || 'Failed to initialize Razorpay checkout');
      setIsRazorpayLoading(false);
    }
  };

  // Place / Confirm Order (Shared handler for Step 3 and mobile bar)
  const handlePlaceOrder = () => {
    if (paymentMethod === 'razorpay') {
      handlePayWithRazorpay();
    } else if (paymentMethod === 'cod') {
      handlePlaceCodOrder();
    } else if (paymentMethod === 'stripe') {
      const form = document.getElementById('stripe-payment-form');
      if (form) {
        form.requestSubmit();
      } else {
        alert('Please complete the card details below.');
      }
    }
  };

  // Effective Delivery Fee & Grand Total Calculation based on distance
  const effectiveDeliveryFee = deliveryRadiusInfo
    ? (deliveryRadiusInfo.distanceKm <= 1.0 ? 0 : 20)
    : (totals.deliveryFee);

  const effectiveGrandTotal = Math.max(0, Math.round((totals.itemTotal + effectiveDeliveryFee - (totals.couponDiscount || 0)) * 100) / 100);

  const effectiveTotals = {
    ...totals,
    deliveryFee: effectiveDeliveryFee,
    tax: 0,
    grandTotal: effectiveGrandTotal,
  };

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="h-20 w-20 rounded-3xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center mx-auto shadow-soft">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading">
            Your Cart is Empty
          </h2>
          <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Looks like you haven't added any delicious food or groceries yet.
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow transition-transform active:scale-95"
        >
          <span>Explore Delicious Menu</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Order Confirmed State
  if (orderSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-pulse"></div>
          <div className="relative h-20 w-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <CheckCircle2 className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800">
            <Sparkles className="h-3 w-3" />
            <span>Order Successfully Placed</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-slate-100 font-heading">
            Your Cravings Are On The Way!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
            Order confirmed. Our kitchen is handcrafting your items for express delivery.
          </p>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/90 rounded-3xl p-5 border border-neutral-200/80 dark:border-slate-800 shadow-soft text-left space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-slate-800 text-xs">
            <span className="text-neutral-500 dark:text-slate-400">Order ID</span>
            <span className="font-mono font-bold text-neutral-900 dark:text-slate-100">
              #{orderSuccess._id ? String(orderSuccess._id).slice(-8).toUpperCase() : 'PENDING'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500 dark:text-slate-400">Estimated Delivery</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">⚡ 20 - 25 Minutes</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-slate-800 font-black text-sm text-neutral-900 dark:text-slate-100">
            <span>Amount Paid / Due</span>
            <span className="text-brand-600 dark:text-brand-400">
              ₹{(orderSuccess.total || effectiveGrandTotal) % 1 === 0 ? (orderSuccess.total || effectiveGrandTotal) : (orderSuccess.total || effectiveGrandTotal).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to={`/orders/${orderSuccess._id || ''}`}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-glow flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <Truck className="h-4 w-4" />
            <span>Track Order Live</span>
          </Link>
          <Link
            to="/products"
            className="flex-1 py-3.5 px-5 rounded-2xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center"
          >
            <span>Explore More Food</span>
          </Link>
        </div>
      </div>
    );
  }

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-6 space-y-6 pb-28 md:pb-12 overflow-x-hidden">
      {/* ============================================================== */}
      {/* 3-STEP MODERN WIZARD STEPPER                                   */}
      {/* ============================================================== */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-3 sm:p-4 border border-neutral-200/80 dark:border-slate-800 shadow-soft">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative px-2">
          {/* Step 1: Address */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 text-xs font-bold transition-all ${
              currentStep === 1
                ? 'text-brand-600 dark:text-brand-400'
                : currentStep > 1
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-neutral-400 dark:text-slate-500'
            }`}
          >
            <span
              className={`h-8 w-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                currentStep === 1
                  ? 'bg-gradient-to-tr from-brand-500 to-amber-500 text-white shadow-md shadow-brand-500/30 scale-105'
                  : currentStep > 1
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-slate-500'
              }`}
            >
              {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
            </span>
            <span className="hidden sm:inline font-heading tracking-tight">Delivery Address</span>
          </button>

          <div
            className={`flex-1 h-0.5 mx-2 sm:mx-4 rounded-full transition-colors ${
              currentStep > 1 ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-slate-800'
            }`}
          />

          {/* Step 2: Slot & Instructions */}
          <button
            type="button"
            onClick={() => selectedAddress && setCurrentStep(2)}
            disabled={!selectedAddress}
            className={`flex items-center gap-2 text-xs font-bold transition-all ${
              currentStep === 2
                ? 'text-brand-600 dark:text-brand-400'
                : currentStep > 2
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-neutral-400 dark:text-slate-500'
            }`}
          >
            <span
              className={`h-8 w-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                currentStep === 2
                  ? 'bg-gradient-to-tr from-brand-500 to-amber-500 text-white shadow-md shadow-brand-500/30 scale-105'
                  : currentStep > 2
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-slate-500'
              }`}
            >
              {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
            </span>
            <span className="hidden sm:inline font-heading tracking-tight">Delivery Slot</span>
          </button>

          <div
            className={`flex-1 h-0.5 mx-2 sm:mx-4 rounded-full transition-colors ${
              currentStep > 2 ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-slate-800'
            }`}
          />

          {/* Step 3: Payment */}
          <button
            type="button"
            onClick={() => selectedAddress && setCurrentStep(3)}
            disabled={!selectedAddress}
            className={`flex items-center gap-2 text-xs font-bold transition-all ${
              currentStep === 3
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-neutral-400 dark:text-slate-500'
            }`}
          >
            <span
              className={`h-8 w-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                currentStep === 3
                  ? 'bg-gradient-to-tr from-brand-500 to-amber-500 text-white shadow-md shadow-brand-500/30 scale-105'
                  : 'bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-slate-500'
              }`}
            >
              3
            </span>
            <span className="hidden sm:inline font-heading tracking-tight">Payment</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN CHECKOUT GRID: Steps on Left, Sticky Summary on Right      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Interactive Wizard Panes */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Address Book & Map Pin Selection */}
          {currentStep === 1 && (
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100 font-heading">
                      Select Delivery Address
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                    Dispatched from Pizza 65 Chirgaon Hub &bull; Free delivery within 1 km &bull; ₹20 beyond
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-300 font-bold text-xs transition-colors self-start sm:self-auto border border-brand-200/80 dark:border-brand-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {/* Delivery Radius Verification Card */}
              {deliveryRadiusInfo && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                    deliveryRadiusInfo.deliverable
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {deliveryRadiusInfo.deliverable ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                    )}
                    <span className="font-medium truncate">
                      {deliveryRadiusInfo.deliverable
                        ? `Distance: ${deliveryRadiusInfo.distanceKm} km (Est. ${deliveryRadiusInfo.estimatedMinutes} mins) • ${
                            deliveryRadiusInfo.distanceKm <= 1 ? 'FREE Delivery (₹0)' : 'Flat ₹20 Delivery'
                          }`
                        : `Outside delivery radius (${deliveryRadiusInfo.distanceKm} km from hub). Max radius is 20km.`}
                    </span>
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 flex-shrink-0">
                    {deliveryRadiusInfo.deliverable ? 'Deliverable' : 'Unavailable'}
                  </span>
                </div>
              )}

              {/* Address List */}
              {addresses.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-3xl space-y-3 bg-neutral-50/50 dark:bg-slate-800/20">
                  <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center mx-auto shadow-xs">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-slate-100 text-sm">
                      No Saved Delivery Addresses
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Add your home or office address to see accurate delivery time and proceed smoothly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs rounded-2xl shadow-glow transition-transform active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Delivery Address</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr._id;
                    return (
                      <div
                        key={addr._id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-2 ring-brand-500/30 shadow-card'
                            : 'border-neutral-200/80 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-800/40 hover:border-brand-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-neutral-200/80 dark:border-slate-700 text-neutral-800 dark:text-slate-200 shadow-xs">
                            {addr.label === 'Home' ? (
                              <Home className="h-3 w-3 text-brand-500" />
                            ) : addr.label === 'Work' ? (
                              <Briefcase className="h-3 w-3 text-purple-500" />
                            ) : (
                              <Building className="h-3 w-3 text-neutral-500" />
                            )}
                            <span>{addr.label}</span>
                          </span>

                          {isSelected && (
                            <span className="h-5 w-5 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-slate-100">
                          {addr.street}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        {addr.landmark && (
                          <p className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5">
                            Landmark: {addr.landmark}
                          </p>
                        )}
                        <p className="text-[11px] text-neutral-600 dark:text-slate-300 mt-2 font-mono font-medium">
                          📞 {addr.phone}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Continue to Step 2 Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedAddress || (deliveryRadiusInfo && !deliveryRadiusInfo.deliverable)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-glow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Continue to Delivery Slot</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Delivery Slot Selection */}
          {currentStep === 2 && (
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100 font-heading">
                    Choose Delivery Timing
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                  Deliver to: <span className="font-bold text-neutral-800 dark:text-slate-200">{selectedAddress?.street}, {selectedAddress?.city}</span>
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'express',
                    title: '⚡ Instant Express Delivery',
                    time: '20 - 30 minutes • Hot & Fresh direct dispatch',
                    badge: 'Recommended',
                    badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
                  },
                  {
                    id: 'evening',
                    title: '🌆 Standard Evening Slot',
                    time: 'Today, 6:00 PM - 7:30 PM • Ideal for Dinner',
                    badge: 'Flexible',
                    badgeColor: 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300',
                  },
                  {
                    id: 'morning',
                    title: '🌅 Morning Breakfast Slot',
                    time: 'Tomorrow, 8:00 AM - 9:30 AM',
                    badge: 'Scheduled',
                    badgeColor: 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300',
                  },
                ].map((slot) => {
                  const isSelected = selectedSlot === slot.id;
                  return (
                    <label
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`flex items-center justify-between p-4 rounded-3xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-2 ring-brand-500/30 shadow-card'
                          : 'border-neutral-200/80 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/40 hover:bg-neutral-100/60 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-neutral-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-slate-100">
                              {slot.title}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${slot.badgeColor}`}>
                              {slot.badge}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">{slot.time}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Delivery Instructions & Quick Chips */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-neutral-800 dark:text-slate-200">
                  Instructions for Delivery Rider (Optional)
                </label>

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    '🚪 Leave at Door',
                    '🔔 Don’t ring bell',
                    '📞 Call upon arrival',
                    '🏢 Leave with security guard',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleQuickNote(chip)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/50 transition-colors border border-neutral-200/60 dark:border-slate-700"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="e.g. Near Shiv Mandir, Gate code #4921, ring doorbell..."
                  className="w-full text-xs p-3.5 border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/50 dark:bg-slate-800/50 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white font-bold text-xs transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Address</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-glow transition-all active:scale-95"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method Selection */}
          {currentStep === 3 && (
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100 font-heading">
                    Select Payment Method
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                  100% Secure Checkout &bull; 256-Bit SSL Encryption &bull; Zero Hidden Fees
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'razorpay',
                    title: 'Razorpay UPI & Cards',
                    desc: 'Google Pay, PhonePe, Paytm, BHIM UPI, RuPay, Visa, Mastercard & NetBanking',
                    tag: '⚡ Instant & Recommended',
                    tagColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
                  },
                  {
                    id: 'cod',
                    title: 'Cash on Delivery (COD)',
                    desc: 'Pay cash or scan a digital UPI QR code with your delivery rider at doorstep',
                    tag: 'Pay at Door',
                    tagColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
                  },
                  {
                    id: 'stripe',
                    title: 'International Credit / Debit Card',
                    desc: 'Powered by Stripe for global credit & debit cards',
                    tag: 'Stripe Gateway',
                    tagColor: 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300',
                  },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  return (
                    <label
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex items-start justify-between p-4 rounded-3xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-2 ring-brand-500/30 shadow-card'
                          : 'border-neutral-200/80 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/40 hover:bg-neutral-100/60 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <div
                          className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-neutral-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-slate-100">
                            {m.title}
                          </span>
                          <p className="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {m.desc}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex-shrink-0 ${m.tagColor}`}>
                        {m.tag}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Dynamic Payment Handler Section */}
              <div className="pt-2 border-t border-neutral-100 dark:border-slate-800">
                {paymentMethod === 'razorpay' && (
                  <div className="bg-gradient-to-br from-brand-50/60 via-amber-50/40 to-brand-50/30 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900/80 rounded-3xl p-5 border border-brand-200/80 dark:border-brand-900/50 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-slate-100">
                              Razorpay Instant UPI & Cards
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              Instant Confirmation
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            Pay directly using Google Pay, PhonePe, Paytm, BHIM, RuPay cards, or NetBanking with instant automated order placement.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-brand-100 dark:border-slate-800 text-xs flex justify-between items-center font-bold shadow-xs">
                      <span className="text-neutral-600 dark:text-slate-400">Total Payable:</span>
                      <span className="text-base font-black text-brand-600 dark:text-brand-400">
                        ₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)}
                      </span>
                    </div>

                    {razorpayError && (
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                        <span>{razorpayError}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isRazorpayLoading}
                      onClick={handlePayWithRazorpay}
                      className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-brand-500 via-brand-600 to-amber-500 hover:from-brand-600 hover:to-amber-600 shadow-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {isRazorpayLoading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Opening Razorpay Secure Gateway...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          <span>Pay ₹{effectiveGrandTotal} via Razorpay (UPI / Cards)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {paymentMethod === 'stripe' && (
                  <div>
                    {isCreatingIntent && (
                      <div className="p-8 text-center bg-neutral-50 dark:bg-slate-800/40 rounded-3xl border border-neutral-200 dark:border-slate-800 space-y-3">
                        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs font-bold text-neutral-800 dark:text-slate-200">
                          Initializing Stripe Secure Gateway...
                        </p>
                        <p className="text-[11px] text-neutral-400 dark:text-slate-500">
                          Creating 256-bit encrypted checkout intent
                        </p>
                      </div>
                    )}

                    {intentError && !isCreatingIntent && (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                          <span>{intentError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={fetchPaymentIntent}
                          className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors"
                        >
                          Retry Gateway
                        </button>
                      </div>
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

                {paymentMethod === 'cod' && (
                  <div className="bg-neutral-50 dark:bg-slate-800/40 rounded-3xl p-5 border border-neutral-200/80 dark:border-slate-800 space-y-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-xs">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-slate-100">
                          Cash on Delivery (Pay at Doorstep)
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Your order will be handcrafted and dispatched immediately. Hand cash or scan a digital UPI QR code directly with your Crave rider.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 text-xs flex justify-between items-center font-bold shadow-xs">
                      <span className="text-neutral-600 dark:text-slate-400">Total Cash to Hand Over:</span>
                      <span className="text-base font-black text-neutral-900 dark:text-slate-100">
                        ₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handlePlaceCodOrder}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2 transition-all active:scale-99"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Confirming Cash on Delivery Order...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Confirm Order (₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white font-bold text-xs transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Delivery Slot</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Desktop Sticky Order Summary Card */}
        <div className="hidden lg:block sticky top-20 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-brand-500" />
              <span>Order Summary</span>
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300">
              {items.length} items
            </span>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
            {items.map((it) => (
              <div key={it.product._id} className="pt-2.5 flex justify-between items-center gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-bold text-brand-600 dark:text-brand-400 text-xs">{it.quantity}x</span>
                  <span className="truncate text-neutral-800 dark:text-slate-200 font-medium">{it.product.name}</span>
                </div>
                <span className="font-bold text-neutral-900 dark:text-slate-100 whitespace-nowrap">
                  ₹{((it.product.discountPrice || it.product.price) * it.quantity) % 1 === 0 ? ((it.product.discountPrice || it.product.price) * it.quantity) : ((it.product.discountPrice || it.product.price) * it.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 pt-3 border-t border-neutral-200/80 dark:border-slate-800 text-xs text-neutral-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-bold text-neutral-900 dark:text-slate-100">
                ₹{totals.itemTotal % 1 === 0 ? totals.itemTotal : totals.itemTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <div>
                <span>Delivery Charge</span>
                <span className="text-[10px] text-neutral-400 dark:text-slate-500 block">Free &le;1km &bull; ₹20 &gt;1km</span>
              </div>
              <span className={`font-bold ${effectiveDeliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-slate-100'}`}>
                {effectiveDeliveryFee === 0 ? 'FREE (₹0)' : `₹${effectiveDeliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Taxes &amp; Surcharge (0%)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">₹0 (Zero Charges)</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Coupon Savings</span>
                <span>-₹{totals.couponDiscount % 1 === 0 ? totals.couponDiscount : totals.couponDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-200/80 dark:border-slate-800 flex justify-between items-baseline">
            <span className="text-xs font-bold text-neutral-500 dark:text-slate-400">Grand Total</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading">
              ₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-neutral-500 dark:text-slate-400 pt-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Guaranteed fresh delivery with live GPS telemetry</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE STICKY BOTTOM SUMMARY BAR & DRAWER                       */}
      {/* ============================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-slate-800 shadow-2xl safe-bottom">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileSheetOpen(!mobileSheetOpen)}
            className="flex items-center space-x-2 text-left"
          >
            <div>
              <span className="text-[10px] text-neutral-400 dark:text-slate-500 block font-bold uppercase tracking-wider">Grand Total</span>
              <span className="text-lg font-black text-neutral-900 dark:text-slate-100 font-heading">
                ₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)}
              </span>
            </div>
            {mobileSheetOpen ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronUp className="h-4 w-4 text-neutral-400" />}
          </button>

          {currentStep === 3 ? (
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || isRazorpayLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs rounded-2xl shadow-glow disabled:opacity-50 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>
                {isRazorpayLoading
                  ? 'Opening Gateway...'
                  : isSubmitting
                  ? 'Placing Order...'
                  : paymentMethod === 'razorpay'
                  ? `Pay ₹${effectiveGrandTotal}`
                  : 'Confirm Order'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs rounded-2xl shadow-glow flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Expandable Drawer Details */}
        {mobileSheetOpen && (
          <div className="p-4 bg-neutral-50/90 dark:bg-slate-800/90 border-t border-neutral-200/80 dark:border-slate-800 text-xs space-y-2 max-h-48 overflow-y-auto">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-slate-400">Items Total</span>
              <span className="font-bold text-neutral-900 dark:text-slate-100">
                ₹{totals.itemTotal % 1 === 0 ? totals.itemTotal : totals.itemTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-slate-400">Delivery Fee</span>
              <span className={`font-bold ${effectiveDeliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-slate-100'}`}>
                {effectiveDeliveryFee === 0 ? 'FREE (₹0)' : `₹${effectiveDeliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-slate-400">Taxes & Charges (0%)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹0</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Coupon Savings</span>
                <span>-₹{totals.couponDiscount % 1 === 0 ? totals.couponDiscount : totals.couponDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Google Maps & GPS Auto-Detect Location Picker Modal */}
      <LocationPickerModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onSaveAddress={handleAddNewAddressSubmit}
        userPhone={user?.phone || ''}
      />
    </div>
  );
}
