import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import StripePaymentForm from '../components/checkout/StripePaymentForm';
import { triggerOrderCelebration } from '../utils/confetti';
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

  // New address form state with default coordinates (Chirgaon Hub vicinity)
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    street: '',
    city: 'Chirgaon',
    state: 'Uttar Pradesh',
    pincode: '284301',
    landmark: '',
    phone: user?.phone || '',
    coordinates: [78.8235, 25.5752], // [lng, lat] ~0.1km from Chirgaon Hub
  });

  // Delivery slot state
  const [selectedSlot, setSelectedSlot] = useState('express');
  const [deliveryNote, setDeliveryNote] = useState('');

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe' | 'razorpay' | 'cod'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

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

  const handleAddNewAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users/addresses', newAddress);
      const updatedList = res.data || [];
      setAddresses(updatedList);
      const added = updatedList[updatedList.length - 1];
      if (added) {
        setSelectedAddressId(added._id);
        const coords =
          added.coordinates?.coordinates &&
          (added.coordinates.coordinates[0] !== 0 || added.coordinates.coordinates[1] !== 0)
            ? added.coordinates.coordinates
            : newAddress.coordinates;
        checkRadius(coords);
      }
      setShowAddAddressModal(false);
    } catch (err) {
      alert(err.message || 'Failed to add address');
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

  // Place / Confirm Order (Shared handler for Step 3 and mobile bar)
  const handlePlaceOrder = () => {
    if (paymentMethod === 'cod') {
      handlePlaceCodOrder();
    } else if (paymentMethod === 'stripe') {
      const form = document.getElementById('stripe-payment-form');
      if (form) {
        form.requestSubmit();
      } else {
        alert('Please complete the card details below.');
      }
    } else if (paymentMethod === 'razorpay') {
      alert('Razorpay test mode: Please select Credit / Debit Card (Stripe) or Cash on Delivery.');
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
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">No Items to Checkout</h2>
        <p className="text-xs text-neutral-500">Your cart is empty.</p>
        <Link to="/products" className="text-xs font-bold text-brand-600 underline">
          Return to Menu
        </Link>
      </div>
    );
  }

  // Order Confirmed State
  if (orderSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-6">
        <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Order Confirmed & Placed
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
            Thank you, {user?.name}!
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Order Reference: <strong className="font-mono text-neutral-800">{orderSuccess.orderNumber}</strong>
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-neutral-200 text-left space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Delivery Address</span>
            <span className="font-bold text-neutral-800 text-right">
              {orderSuccess.address?.street}, {orderSuccess.address?.city}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Delivery Schedule</span>
            <span className="font-bold text-brand-600">
              {orderSuccess.slot === 'express' ? 'Instant Express (20-30m)' : 'Standard Slot'}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Payment Option</span>
            <span className="font-bold text-neutral-800 uppercase">
              {orderSuccess.method}
            </span>
          </div>

          <div className="flex justify-between py-1 pt-2 font-black text-sm text-neutral-900">
            <span>Amount Paid / Due</span>
            <span>₹{orderSuccess.total % 1 === 0 ? orderSuccess.total : orderSuccess.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/"
            className="flex-1 py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs"
          >
            Return to Store
          </Link>
          <Link
            to="/products"
            className="flex-1 py-3 px-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
          >
            Order More Cravings
          </Link>
        </div>
      </div>
    );
  }

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-28 md:pb-12">
      {/* 3-Step Wizard Navigation */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center space-x-2 text-xs font-bold ${
              currentStep === 1
                ? 'text-brand-600'
                : currentStep > 1
                ? 'text-emerald-600'
                : 'text-neutral-400'
            }`}
          >
            <span
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 1
                  ? 'bg-brand-500 text-white'
                  : currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              1
            </span>
            <span className="hidden sm:inline">Address</span>
          </button>

          <div className="flex-1 h-0.5 bg-neutral-200 mx-2 sm:mx-4"></div>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => selectedAddress && setCurrentStep(2)}
            disabled={!selectedAddress}
            className={`flex items-center space-x-2 text-xs font-bold ${
              currentStep === 2
                ? 'text-brand-600'
                : currentStep > 2
                ? 'text-emerald-600'
                : 'text-neutral-400'
            }`}
          >
            <span
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 2
                  ? 'bg-brand-500 text-white'
                  : currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              2
            </span>
            <span className="hidden sm:inline">Delivery Slot</span>
          </button>

          <div className="flex-1 h-0.5 bg-neutral-200 mx-2 sm:mx-4"></div>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => selectedAddress && setCurrentStep(3)}
            disabled={!selectedAddress}
            className={`flex items-center space-x-2 text-xs font-bold ${
              currentStep === 3 ? 'text-brand-600' : 'text-neutral-400'
            }`}
          >
            <span
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 3 ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              3
            </span>
            <span className="hidden sm:inline">Payment</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout: Steps on Left, Sticky Summary on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Multi-step UI */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Address Book & Map Pin Selection */}
          {currentStep === 1 && (
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-brand-500" />
                    <span>Select Delivery Address</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    We deliver from Pizza 65 Chirgaon Hub (Imli Ke Pass, Main Road) &bull; Free within 1km &bull; ₹20 beyond
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 font-bold text-xs hover:bg-brand-100 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New</span>
                </button>
              </div>

              {/* Delivery Radius Verification Card */}
              {deliveryRadiusInfo && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                    deliveryRadiusInfo.deliverable
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {deliveryRadiusInfo.deliverable ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    )}
                    <span>
                      {deliveryRadiusInfo.deliverable
                        ? `Distance: ${deliveryRadiusInfo.distanceKm} km (Est. arrival: ${deliveryRadiusInfo.estimatedMinutes} mins) • ${deliveryRadiusInfo.distanceKm <= 1 ? 'FREE Delivery (₹0)' : 'Flat ₹20 Delivery Charge'}`
                        : `Outside delivery zone (${deliveryRadiusInfo.distanceKm} km from hub). Max radius is 20km.`}
                    </span>
                  </div>
                  <span className="font-bold uppercase text-[10px] tracking-wider">
                    {deliveryRadiusInfo.deliverable ? 'Deliverable' : 'Unavailable'}
                  </span>
                </div>
              )}

              {/* Address List */}
              {addresses.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-3xl space-y-3 bg-neutral-50/50">
                  <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mx-auto">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-800 text-sm">No Saved Delivery Addresses</h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                      Please add a delivery address so we can verify delivery to your area and proceed to checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Delivery Address</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr._id;
                    return (
                      <div
                        key={addr._id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/40 shadow-xs'
                            : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200">
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
                            <span className="h-4 w-4 rounded-full bg-brand-500 text-white flex items-center justify-center">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-xs text-neutral-900">{addr.street}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        {addr.landmark && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">Near: {addr.landmark}</p>
                        )}
                        <p className="text-[11px] text-neutral-600 mt-2 font-mono">{addr.phone}</p>
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
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-brand-500/20 disabled:opacity-50"
                >
                  <span>Continue to Delivery Slot</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Delivery Slot Selection */}
          {currentStep === 2 && (
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-5">
              <div>
                <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand-500" />
                  <span>Choose Delivery Slot</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Deliver to: {selectedAddress?.street}, {selectedAddress?.city}
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'express',
                    title: 'Instant Express Delivery',
                    time: '20 - 30 minutes',
                    badge: '⚡ Recommended',
                    badgeColor: 'bg-amber-100 text-amber-800',
                  },
                  {
                    id: 'evening',
                    title: 'Standard Evening Slot',
                    time: 'Today, 6:00 PM - 7:00 PM',
                    badge: 'Flexible',
                    badgeColor: 'bg-neutral-100 text-neutral-700',
                  },
                  {
                    id: 'morning',
                    title: 'Fresh Morning Slot',
                    time: 'Tomorrow, 8:00 AM - 9:00 AM',
                    badge: 'Scheduled',
                    badgeColor: 'bg-neutral-100 text-neutral-700',
                  },
                ].map((slot) => (
                  <label
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedSlot === slot.id
                        ? 'border-brand-500 bg-brand-50/40 shadow-xs'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="slot"
                        checked={selectedSlot === slot.id}
                        onChange={() => setSelectedSlot(slot.id)}
                        className="text-brand-500 focus:ring-brand-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs sm:text-sm text-neutral-900">
                            {slot.title}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${slot.badgeColor}`}>
                            {slot.badge}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{slot.time}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Delivery Note */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="e.g. Leave at apartment door, gate code #4921, ring doorbell..."
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-neutral-600 font-bold text-xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Address</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center justify-center gap-2 py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-brand-500/20"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method Selection */}
          {currentStep === 3 && (
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-5">
              <div>
                <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-brand-500" />
                  <span>Choose Payment Method</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  All transactions are encrypted with 256-bit SSL security
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'stripe',
                    title: 'Credit / Debit Card (Stripe)',
                    desc: 'Instant and secure payment with Visa, Mastercard, Amex',
                    tag: 'Most Popular',
                  },
                  {
                    id: 'razorpay',
                    title: 'Razorpay / UPI / NetBanking',
                    desc: 'Fast checkout via UPI (Google Pay, PhonePe) or bank cards',
                    tag: 'Zero Fee',
                  },
                  {
                    id: 'cod',
                    title: 'Cash on Delivery (COD)',
                    desc: 'Pay cash or digital scan upon delivery to your rider',
                    tag: 'Pay at Door',
                  },
                ].map((m) => (
                  <label
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-start justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === m.id
                        ? 'border-brand-500 bg-brand-50/40 shadow-xs'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="mt-1 text-brand-500 focus:ring-brand-500"
                      />
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-neutral-900">
                          {m.title}
                        </span>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                      {m.tag}
                    </span>
                  </label>
                ))}
              </div>

              {/* Dynamic Payment Handler Section */}
              <div className="pt-2 border-t border-neutral-100">
                {paymentMethod === 'stripe' && (
                  <div>
                    {isCreatingIntent && (
                      <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs font-bold text-neutral-800">
                          Initializing Stripe Secure Gateway...
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Recalculating live prices and creating encrypted checkout intent
                        </p>
                      </div>
                    )}

                    {intentError && !isCreatingIntent && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                          <span>{intentError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={fetchPaymentIntent}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors"
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
                  <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                          Cash on Delivery (Pay at Door)
                        </h4>
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                          Your order will be prepared immediately. Pay cash or scan a digital UPI QR code directly with your Crave delivery rider upon arrival.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-neutral-200 text-xs flex justify-between items-center font-bold">
                      <span className="text-neutral-600">Total Cash to Hand Over:</span>
                      <span className="text-sm font-black text-neutral-900">
                        ₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handlePlaceCodOrder}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2 transition-all"
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

                {paymentMethod === 'razorpay' && (
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 text-blue-900 space-y-3 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <span>Razorpay UPI & NetBanking Gateway</span>
                    </div>
                    <p className="text-blue-700 leading-relaxed">
                      Razorpay supports Google Pay, PhonePe, Paytm, and Indian NetBanking. For instant testing in USD, select <strong>Credit / Debit Card (Stripe)</strong> or <strong>Cash on Delivery (COD)</strong> above.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 text-neutral-600 font-bold text-xs hover:text-neutral-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Delivery Slot</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Desktop Sticky Order Summary */}
        <div className="hidden lg:block sticky top-20 bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
            Order Review ({items.length} items)
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-neutral-100 text-xs">
            {items.map((it) => (
              <div key={it.product._id} className="pt-2 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-neutral-800">{it.quantity}x</span>
                  <span className="truncate max-w-[140px] text-neutral-700">{it.product.name}</span>
                </div>
                <span className="font-semibold text-neutral-900">
                  ₹{((it.product.discountPrice || it.product.price) * it.quantity) % 1 === 0 ? ((it.product.discountPrice || it.product.price) * it.quantity) : ((it.product.discountPrice || it.product.price) * it.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-3 border-t border-neutral-200 text-xs text-neutral-600">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-semibold text-neutral-900">₹{totals.itemTotal % 1 === 0 ? totals.itemTotal : totals.itemTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span>Delivery Fee</span>
                <span className="text-[10px] text-neutral-400 block">Free &le;1km &bull; ₹20 &gt;1km</span>
              </div>
              <span className={`font-semibold ${effectiveDeliveryFee === 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                {effectiveDeliveryFee === 0 ? 'FREE (₹0)' : `₹${effectiveDeliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Taxes & Platform Fee (0%)</span>
              <span className="font-semibold text-emerald-600">₹0 (Zero Charges)</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Promotional Discount</span>
                <span>-₹{totals.couponDiscount % 1 === 0 ? totals.couponDiscount : totals.couponDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline">
            <span className="text-xs font-bold text-neutral-500">Amount Due</span>
            <span className="text-2xl font-black text-neutral-900">
              ₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-neutral-400 pt-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Guaranteed fresh delivery with live tracking</span>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Summary Bar & Drawer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 shadow-2xl safe-bottom">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileSheetOpen(!mobileSheetOpen)}
            className="flex items-center space-x-1.5 text-left"
          >
            <div>
              <span className="text-[10px] text-neutral-400 block font-bold uppercase">Grand Total</span>
              <span className="text-lg font-black text-neutral-900">
                ₹{effectiveGrandTotal % 1 === 0 ? effectiveGrandTotal : effectiveGrandTotal.toFixed(2)}
              </span>
            </div>
            {mobileSheetOpen ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronUp className="h-4 w-4 text-neutral-400" />}
          </button>

          {currentStep === 3 ? (
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
              {isSubmitting ? 'Placing Order...' : 'Confirm Order'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-5 py-2.5 bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Expandable Drawer Details */}
        {mobileSheetOpen && (
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-xs space-y-2 max-h-48 overflow-y-auto">
            <div className="flex justify-between">
              <span>Items Total</span>
              <span>₹{totals.itemTotal % 1 === 0 ? totals.itemTotal : totals.itemTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{effectiveDeliveryFee === 0 ? 'FREE (₹0)' : `₹${effectiveDeliveryFee}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes & Charges (0%)</span>
              <span className="text-emerald-600 font-bold">₹0</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Coupon Savings</span>
                <span>-₹{totals.couponDiscount % 1 === 0 ? totals.couponDiscount : totals.couponDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Address Modal with Map Pin Coordinate Simulation */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-black text-sm text-neutral-900">Add New Delivery Location</h3>
              <button
                type="button"
                onClick={() => setShowAddAddressModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddNewAddressSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Address Label</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Home', 'Work', 'Other'].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setNewAddress({ ...newAddress, label: l })}
                      className={`py-1.5 rounded-xl font-bold text-center border ${
                        newAddress.label === l
                          ? 'bg-brand-50 border-brand-300 text-brand-700'
                          : 'border-neutral-200 text-neutral-600'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="Apartment, building, and street name"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">ZIP / Pincode</label>
                  <input
                    type="text"
                    required
                    value={newAddress.pincode}
                    onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Near Central Park East Entrance"
                  value={newAddress.landmark}
                  onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              {/* Map Pin Coordinate Selector Simulation */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5 text-brand-500" />
                    GPS Location Pin
                  </span>
                  <span className="font-mono text-neutral-500 text-[10px]">
                    [{newAddress.coordinates[0].toFixed(4)}, {newAddress.coordinates[1].toFixed(4)}]
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">
                  Drag/click on map simulation to set high-precision rider dispatch coordinates.
                </p>
                <div className="h-20 w-full bg-gradient-to-r from-emerald-100 via-brand-50 to-amber-100 rounded-xl flex items-center justify-center border border-dashed border-neutral-300 cursor-pointer">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 bg-white px-3 py-1 rounded-full shadow-xs">
                    <MapPin className="h-3.5 w-3.5" />
                    Pin Set (Chirgaon, Jhansi, UP)
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Save & Select Address
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
