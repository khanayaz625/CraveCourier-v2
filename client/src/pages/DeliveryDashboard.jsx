import { useState, useEffect, useRef } from 'react';
import {
  Bike,
  DollarSign,
  Award,
  MapPin,
  Power,
  CheckCircle2,
  PackageCheck,
  Clock,
  Navigation,
  Phone,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
  Sparkles,
  Car,
  FileText,
  Upload,
  ChevronRight,
  TrendingUp,
  Truck,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { getSocket, emitRiderLocation } from '../services/socket';

export default function DeliveryDashboard() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch' | 'earnings' | 'kyc'
  const [profile, setProfile] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  // Incoming Order Modal with 30-Second Countdown
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const countdownTimerRef = useRef(null);

  // OTP Verification Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [deliverySuccessCelebration, setDeliverySuccessCelebration] = useState(false);

  // Earnings data
  const [earningsData, setEarningsData] = useState(null);

  // Vehicle & KYC form
  const [kycForm, setKycForm] = useState({
    vehicleType: 'scooter',
    model: 'Vespa Elettrica 2024',
    plateNumber: 'CRV-8941',
    licenseNumber: 'IL-DL-9842104',
  });
  const [kycSavedSuccess, setKycSavedSuccess] = useState(false);

  // GPS Telemetry State (Chirgaon Hub default)
  const [currentGps, setCurrentGps] = useState([78.8228, 25.5746]); // [lng, lat]
  const [gpsBroadcasting, setGpsBroadcasting] = useState(true);

  // 1. Fetch Profile & Active Order
  useEffect(() => {
    fetchPartnerData();
  }, []);

  const fetchPartnerData = async () => {
    setLoading(true);
    try {
      const [profRes, earnRes, queueRes] = await Promise.all([
        api.get('/delivery/profile'),
        api.get('/delivery/earnings'),
        api.get('/delivery/available-orders'),
      ]);

      const prof = profRes.data?.profile;
      setProfile(prof);
      setActiveOrder(profRes.data?.activeOrder || null);
      setIsOnline(Boolean(prof?.isOnline));

      if (prof?.vehicle) {
        setKycForm({
          vehicleType: prof.vehicle.type || 'scooter',
          model: prof.vehicle.model || 'Vespa Elettrica 2024',
          plateNumber: prof.vehicle.plateNumber || 'CRV-8941',
          licenseNumber: prof.documents?.licenseNumber || 'IL-DL-9842104',
        });
      }

      setEarningsData(earnRes.data);
      setAvailableOrders(queueRes.data || []);
    } catch (err) {
      console.error('Failed to load partner data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Real-Time Socket Connection & Incoming Order Alert Listener
  useEffect(() => {
    const socket = getSocket();

    // Listen for incoming order dispatch with 30s timer
    const handleIncomingDispatch = (data) => {
      console.log('[SOCKET] Incoming order dispatch request received:', data);
      setIncomingRequest(data);
      setCountdown(data.countdownSeconds || 30);

      // Play chime
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          g.gain.setValueAtTime(0.1, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch {}
    };

    // Listen for queue updates
    const handleReadyPickup = () => {
      api.get('/delivery/available-orders').then((res) => {
        setAvailableOrders(res.data || []);
      });
    };

    socket.on('order:incoming_request', handleIncomingDispatch);
    socket.on('order:ready_for_pickup', handleReadyPickup);

    return () => {
      socket.off('order:incoming_request', handleIncomingDispatch);
      socket.off('order:ready_for_pickup', handleReadyPickup);
    };
  }, []);

  // 3. Countdown Timer for Incoming Request (30s)
  useEffect(() => {
    if (incomingRequest) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            handleDeclineOrder(incomingRequest.orderId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      };
    }
  }, [incomingRequest]);

  // 4. Background GPS Broadcast Loop (Every 10 Seconds)
  useEffect(() => {
    if (!isOnline) return;

    const gpsInterval = setInterval(() => {
      // Simulate micro-movement along Springfield corridor or read geolocation
      setCurrentGps((prev) => {
        const deltaLng = (Math.random() - 0.48) * 0.0006;
        const deltaLat = (Math.random() - 0.48) * 0.0006;
        const newCoords = [
          parseFloat((prev[0] + deltaLng).toFixed(5)),
          parseFloat((prev[1] + deltaLat).toFixed(5)),
        ];

        // 1. Emit real-time over Socket.io
        emitRiderLocation({
          orderId: activeOrder?._id,
          coordinates: newCoords,
          heading: 45,
          speed: 26,
        });

        // 2. Persist in DB
        api.patch('/delivery/location', {
          coordinates: newCoords,
          heading: 45,
          speed: 26,
        }).catch(() => {});

        return newCoords;
      });
    }, 10000); // 10 seconds

    return () => clearInterval(gpsInterval);
  }, [isOnline, activeOrder?._id]);

  // Toggle Online/Offline Duty Status
  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      const res = await api.patch('/delivery/status', { isOnline: nextStatus });
      setProfile(res.data);
    } catch (err) {
      alert(err.message || 'Failed to update duty status');
      setIsOnline(!nextStatus);
    }
  };

  // Accept Order Action
  const handleAcceptOrder = async (orderId) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIncomingRequest(null);

    try {
      const res = await api.post(`/delivery/orders/${orderId}/accept`);
      setActiveOrder(res.data.order);
      setProfile(res.data.profile);
      setAvailableOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      alert(err.message || 'Could not accept order');
    }
  };

  // Decline Order Action
  const handleDeclineOrder = async (orderId) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIncomingRequest(null);
    try {
      await api.post(`/delivery/orders/${orderId}/reject`);
    } catch {}
  };

  // Mark Picked Up
  const handlePickupOrder = async () => {
    try {
      const res = await api.patch(`/delivery/orders/${activeOrder._id}/pickup`);
      setActiveOrder(res.data);
    } catch (err) {
      alert(err.message || 'Failed to update order to picked up');
    }
  };

  // Mark Out for Delivery
  const handleStartOutForDelivery = async () => {
    try {
      const res = await api.patch(`/delivery/orders/${activeOrder._id}/out-for-delivery`);
      setActiveOrder(res.data);
    } catch (err) {
      alert(err.message || 'Failed to update order to out for delivery');
    }
  };

  // Complete Delivery with OTP Verification
  const handleVerifyOtpAndComplete = async (e) => {
    e.preventDefault();
    setIsSubmittingOtp(true);
    setOtpError(null);

    try {
      const res = await api.post(`/delivery/orders/${activeOrder._id}/complete`, {
        otp: otpInput.trim(),
      });

      setProfile(res.data.profile);
      setActiveOrder(null);
      setShowOtpModal(false);
      setOtpInput('');
      setDeliverySuccessCelebration(true);

      // Refresh earnings
      const earnRes = await api.get('/delivery/earnings');
      setEarningsData(earnRes.data);

      setTimeout(() => {
        setDeliverySuccessCelebration(false);
      }, 4000);
    } catch (err) {
      setOtpError(err.message || 'Invalid delivery OTP code');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  // Save KYC Form
  const handleSaveKyc = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch('/delivery/kyc', kycForm);
      setProfile(res.data);
      setKycSavedSuccess(true);
      setTimeout(() => setKycSavedSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save vehicle details');
    }
  };

  // Simulate Triggering an Incoming Auto-Dispatch Request (Testing helper)
  const handleSimulateIncomingOrder = () => {
    setIncomingRequest({
      orderId: activeOrder?._id || 'mock_order_9824',
      orderNumber: `CRV-${Date.now().toString().slice(-6)}`,
      itemCount: 3,
      estimatedPayout: 50,
      pickup: {
        name: 'Pizza 65 & Crave Hub - Chirgaon',
        address: 'Imli Ke Pass, Main Road, Chirgaon, Jhansi, UP',
      },
      drop: {
        address: 'Near Bus Stand, Chirgaon, UP',
      },
      countdownSeconds: 30,
    });
    setCountdown(30);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-5 text-neutral-800">
      {/* Top Mobile Header & Duty Switch */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
              alt={user?.name}
              className="h-14 w-14 rounded-2xl object-cover ring-2 ring-amber-500/30 shadow-md"
            />
            <span
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
              }`}
            ></span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black text-neutral-900">{user?.name}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                <Bike className="h-3 w-3" />
                <span>Partner</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-amber-500 fill-current" />
              <span>4.9 Rating &bull; {profile?.vehicle?.model || 'Vespa Elettrica'}</span>
            </p>
          </div>
        </div>

        {/* Big Touch-Friendly Online / Offline Toggle */}
        <button
          onClick={handleToggleOnline}
          className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all ${
            isOnline
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-neutral-900/20'
          }`}
        >
          <Power className="h-4 w-4" />
          <span>{isOnline ? 'Active On Duty (Online)' : 'Go On Duty (Offline)'}</span>
        </button>
      </div>

      {/* Live GPS Telemetry Status Strip */}
      <div className="bg-neutral-900 rounded-2xl p-3.5 text-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold">Live GPS Telemetry:</span>
          <span className="font-mono text-neutral-300 text-[11px]">
            [{currentGps[0]}, {currentGps[1]}]
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>Broadcasting via Socket.io every 10s</span>
        </div>
      </div>

      {/* Delivery Success Celebration Banner */}
      {deliverySuccessCelebration && (
        <div className="bg-emerald-500 text-white rounded-3xl p-5 shadow-lg shadow-emerald-500/20 flex items-center justify-between gap-4 animate-slide-in">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black">
              ✓
            </div>
            <div>
              <h4 className="font-black text-sm">Delivery Completed & Verified!</h4>
              <p className="text-xs text-emerald-100">
                Customer OTP verified. <strong>+₹40 payout</strong> credited to your daily balance.
              </p>
            </div>
          </div>
          <span className="font-mono font-black text-lg bg-emerald-600 px-3 py-1 rounded-xl">
            +₹40
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center bg-white p-1 rounded-2xl border border-neutral-200 shadow-xs">
        {[
          { id: 'dispatch', label: 'Active Delivery & Queue', icon: Bike },
          { id: 'earnings', label: 'Earnings & Trips', icon: DollarSign },
          { id: 'kyc', label: 'Vehicle & KYC Profile', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ACTIVE DELIVERY & DISPATCH QUEUE                  */}
      {/* ======================================================== */}
      {activeTab === 'dispatch' && (
        <div className="space-y-5">
          {/* Active Order Card (If assigned / in-progress) */}
          {activeOrder ? (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-brand-500 shadow-md space-y-5 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                <div>
                  <span className="text-[10px] uppercase font-black text-brand-600 tracking-wider bg-brand-50 px-2.5 py-1 rounded-full">
                    Active Delivery in Progress
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-neutral-900 mt-1">
                    Order #{activeOrder.orderNumber}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">
                    Trip Payout
                  </span>
                  <span className="text-base font-black text-emerald-600">+₹40</span>
                </div>
              </div>

              {/* Status Milestones Bar */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-2">
                  Trip Progress
                </span>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span
                    className={`flex items-center gap-1 ${
                      activeOrder.status === 'ready' ? 'text-brand-600' : 'text-emerald-600'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Store Ready</span>
                  </span>
                  <span className="text-neutral-300">&rarr;</span>
                  <span
                    className={`flex items-center gap-1 ${
                      activeOrder.status === 'picked_up'
                        ? 'text-brand-600'
                        : activeOrder.status === 'out_for_delivery' || activeOrder.status === 'delivered'
                        ? 'text-emerald-600'
                        : 'text-neutral-400'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Picked Up</span>
                  </span>
                  <span className="text-neutral-300">&rarr;</span>
                  <span
                    className={`flex items-center gap-1 ${
                      activeOrder.status === 'out_for_delivery'
                        ? 'text-brand-600 animate-pulse'
                        : activeOrder.status === 'delivered'
                        ? 'text-emerald-600'
                        : 'text-neutral-400'
                    }`}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>En Route</span>
                  </span>
                </div>
              </div>

              {/* 2-Step Addresses: Pickup from Hub & Drop at Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Pickup: Store Hub */}
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1 text-orange-600">
                      <MapPin className="h-4 w-4" />
                      <span>PICKUP LOCATION</span>
                    </span>
                    <a
                      href="https://www.google.com/maps/dir/?api=1&destination=39.7817,-89.6504"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 hover:underline font-bold text-[11px]"
                    >
                      <span>Navigate</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="font-bold text-neutral-900 text-sm">Pizza 65 & Crave Hub - Chirgaon</p>
                  <p className="text-neutral-500">Imli Ke Pass, Main Road, Chirgaon, Jhansi, UP</p>
                </div>

                {/* 2. Drop: Customer Delivery Address */}
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <MapPin className="h-4 w-4" />
                      <span>DROP-OFF LOCATION</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      {activeOrder.customer?.phone && (
                        <a
                          href={`tel:${activeOrder.customer.phone}`}
                          className="p-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          <span>Call</span>
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.deliveryAddress?.street},${activeOrder.deliveryAddress?.city}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:underline font-bold text-[11px]"
                      >
                        <span>Navigate</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <p className="font-bold text-neutral-900 text-sm">
                    {activeOrder.deliveryAddress?.street}
                  </p>
                  <p className="text-neutral-500">
                    {activeOrder.deliveryAddress?.city}, {activeOrder.deliveryAddress?.pincode}
                  </p>
                </div>
              </div>

              {/* Order Items Checklist */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 text-xs space-y-2">
                <span className="font-bold text-neutral-700 block uppercase tracking-wider text-[10px]">
                  Package Item Verification ({activeOrder.items?.length} items)
                </span>
                <div className="space-y-1.5 divide-y divide-neutral-200/60">
                  {activeOrder.items?.map((it, idx) => (
                    <div key={idx} className="pt-1.5 flex items-center justify-between">
                      <span className="font-semibold text-neutral-800">
                        {it.quantity}x {it.name} ({it.unit})
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        ₹{it.subtotal % 1 === 0 ? it.subtotal : it.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons based on delivery phase */}
              <div className="pt-2 flex flex-wrap gap-3">
                {activeOrder.status === 'ready' && (
                  <button
                    onClick={handlePickupOrder}
                    className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all"
                  >
                    <PackageCheck className="h-4 w-4" />
                    <span>Confirm Picked Up from Store</span>
                  </button>
                )}

                {activeOrder.status === 'picked_up' && (
                  <button
                    onClick={handleStartOutForDelivery}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all"
                  >
                    <Truck className="h-4 w-4" />
                    <span>Start Delivery (Out for Delivery)</span>
                  </button>
                )}

                {activeOrder.status === 'out_for_delivery' && (
                  <button
                    onClick={() => setShowOtpModal(true)}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Complete Delivery (Enter Customer OTP)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Idle Dispatch Board */
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-neutral-900">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span>Available Delivery Orders</span>
                </div>
                <button
                  onClick={handleSimulateIncomingOrder}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Test Incoming Dispatch (30s Timer)</span>
                </button>
              </div>

              {availableOrders.length === 0 ? (
                <div className="p-10 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 space-y-2">
                  <Bike className="h-8 w-8 text-neutral-400 mx-auto animate-bounce" />
                  <p className="text-xs font-bold text-neutral-700">Looking for nearby deliveries...</p>
                  <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                    You are online. When restaurants mark orders ready, dispatch alerts will appear here with a 30-second accept timer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableOrders.map((ord) => (
                    <div
                      key={ord._id}
                      className="p-4 rounded-2xl border border-neutral-200 hover:border-brand-300 bg-neutral-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-neutral-900">
                            #{ord.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            +₹40 Payout
                          </span>
                        </div>
                        <p className="text-neutral-500">
                          {ord.items?.length} items &bull; Drop: {ord.deliveryAddress?.street},{' '}
                          {ord.deliveryAddress?.city}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAcceptOrder(ord._id)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-xs"
                      >
                        Accept Delivery
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EARNINGS & TRIP HISTORY                          */}
      {/* ======================================================== */}
      {activeTab === 'earnings' && (
        <div className="space-y-5">
          {/* Metrics Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Today's Payout
              </span>
              <span className="text-2xl font-black text-neutral-900">
                ₹{profile?.earnings?.today % 1 === 0 ? profile?.earnings?.today : profile?.earnings?.today?.toFixed(2) || '0'}
              </span>
              <span className="block text-[11px] text-emerald-600 font-bold mt-1">
                +{profile?.earnings?.deliveriesCompleted || 0} completed
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Weekly Earnings
              </span>
              <span className="text-2xl font-black text-neutral-900">
                ₹{profile?.earnings?.thisWeek % 1 === 0 ? profile?.earnings?.thisWeek : profile?.earnings?.thisWeek?.toFixed(2) || '0'}
              </span>
              <span className="block text-[11px] text-neutral-500 font-semibold mt-1">Mon &ndash; Sun</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Total Lifetime
              </span>
              <span className="text-2xl font-black text-neutral-900">
                ₹{profile?.earnings?.total % 1 === 0 ? profile?.earnings?.total : profile?.earnings?.total?.toFixed(2) || '0'}
              </span>
              <span className="block text-[11px] text-brand-600 font-bold mt-1">Verified partner</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Rating
              </span>
              <span className="text-2xl font-black text-neutral-900">4.9 ★</span>
              <span className="block text-[11px] text-amber-600 font-bold mt-1">Top tier courier</span>
            </div>
          </div>

          {/* Weekly Daily Bar Chart Visualization */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-500" />
              <span>Weekly Daily Breakdown</span>
            </h3>

            <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4">
              {earningsData?.weeklyBreakdown?.map((day, idx) => {
                const maxVal = 80;
                const heightPercent = Math.min(100, Math.round((day.earnings / maxVal) * 100));
                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end space-y-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-600">
                      ₹{day.earnings.toFixed(0)}
                    </span>
                    <div className="w-full max-w-[32px] bg-neutral-100 rounded-xl overflow-hidden h-28 flex items-end">
                      <div
                        className="w-full bg-brand-500 hover:bg-brand-600 rounded-xl transition-all"
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Trips History */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4 text-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
              Completed Delivery Trips
            </h3>

            <div className="divide-y divide-neutral-100">
              {earningsData?.recentTrips?.length === 0 ? (
                <p className="text-neutral-400 py-4 text-center">No completed trips logged yet</p>
              ) : (
                earningsData?.recentTrips?.map((trip, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-neutral-900 block">
                        #{trip.orderNumber}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(trip.deliveredAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        &bull; {trip.street}, {trip.city}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-600 block">
                        +₹{trip.payout % 1 === 0 ? trip.payout : trip.payout.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        +₹{trip.tip % 1 === 0 ? trip.tip : trip.tip.toFixed(2)} tip
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: VEHICLE & KYC PROFILE                             */}
      {/* ======================================================== */}
      {activeTab === 'kyc' && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-black text-neutral-900">Vehicle & KYC Compliance</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Manage your delivery vehicle details, driving license, and identity verification
            </p>
          </div>

          {kycSavedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Vehicle profile details successfully updated!</span>
            </div>
          )}

          <form onSubmit={handleSaveKyc} className="space-y-4">
            <div>
              <label className="block font-bold text-neutral-700 mb-1.5">Vehicle Type</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'scooter', label: 'Scooter / Moped', icon: Bike },
                  { id: 'bike', label: 'Motorcycle', icon: Bike },
                  { id: 'bicycle', label: 'Bicycle', icon: Bike },
                  { id: 'car', label: 'Car / Van', icon: Car },
                ].map((v) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setKycForm({ ...kycForm, vehicleType: v.id })}
                      className={`p-3 rounded-2xl border text-center space-y-1 transition-all ${
                        kycForm.vehicleType === v.id
                          ? 'border-brand-500 bg-brand-50/50 text-brand-700 font-bold'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 mx-auto" />
                      <span className="text-[11px] block">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Vehicle Model</label>
                <input
                  type="text"
                  value={kycForm.model}
                  onChange={(e) => setKycForm({ ...kycForm, model: e.target.value })}
                  placeholder="e.g. Vespa Elettrica / Honda CB125"
                  className="w-full p-3 rounded-xl border border-neutral-200 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">License Plate Number</label>
                <input
                  type="text"
                  value={kycForm.plateNumber}
                  onChange={(e) => setKycForm({ ...kycForm, plateNumber: e.target.value })}
                  placeholder="e.g. CRV-8941"
                  className="w-full p-3 rounded-xl border border-neutral-200 focus:border-brand-500 outline-none font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Driving License Number
              </label>
              <input
                type="text"
                value={kycForm.licenseNumber}
                onChange={(e) => setKycForm({ ...kycForm, licenseNumber: e.target.value })}
                placeholder="e.g. IL-DL-9842104"
                className="w-full p-3 rounded-xl border border-neutral-200 focus:border-brand-500 outline-none font-mono uppercase"
              />
            </div>

            {/* KYC Verification Badges */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
              <span className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] block">
                Verification Badges
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/70 text-emerald-800 font-bold text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Driver License Verified</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/70 text-emerald-800 font-bold text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Vehicle Insurance Active</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/70 text-emerald-800 font-bold text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Background Check Passed</span>
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              Save Profile Updates
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* INCOMING ORDER REQUEST MODAL WITH 30-SECOND COUNTDOWN    */}
      {/* ======================================================== */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-neutral-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 border-2 border-brand-500">
            {/* Header with Circular Countdown */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  New Order Request
                </span>
                <h3 className="text-base font-black text-neutral-900 mt-1">
                  #{incomingRequest.orderNumber}
                </h3>
              </div>

              {/* Countdown Badge */}
              <div className="relative h-12 w-12 rounded-full border-4 border-brand-500 flex items-center justify-center font-mono font-black text-sm text-brand-600 shadow-sm animate-pulse">
                {countdown}s
              </div>
            </div>

            {/* Estimated Payout Banner */}
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Estimated Earnings</span>
              <span className="text-lg font-black text-emerald-600">
                +₹{incomingRequest.estimatedPayout ? (incomingRequest.estimatedPayout % 1 === 0 ? incomingRequest.estimatedPayout : incomingRequest.estimatedPayout.toFixed(2)) : '40'}
              </span>
            </div>

            {/* Pickup & Drop Details */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[10px]">
                  1
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    Pickup (1.2 km)
                  </span>
                  <p className="font-bold text-neutral-900">{incomingRequest.pickup?.name}</p>
                  <p className="text-neutral-500 text-[11px]">{incomingRequest.pickup?.address}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[10px]">
                  2
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    Drop-off (2.8 km)
                  </span>
                  <p className="font-bold text-neutral-900">{incomingRequest.drop?.address}</p>
                </div>
              </div>
            </div>

            {/* Touch Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleDeclineOrder(incomingRequest.orderId)}
                className="py-3 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs transition-colors"
              >
                Decline
              </button>

              <button
                onClick={() => handleAcceptOrder(incomingRequest.orderId)}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>ACCEPT ({countdown}s)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* OTP CONFIRMATION MODAL TO MARK DELIVERED                 */}
      {/* ======================================================== */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-neutral-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Verify Customer OTP</h3>
                  <p className="text-[11px] text-neutral-400">Order #{activeOrder?.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Ask the customer for the <strong>4-digit security PIN</strong> displayed on their Crave live tracking screen.
            </p>

            {otpError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndComplete} className="space-y-4">
              <input
                type="text"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full text-center tracking-widest font-mono text-2xl font-black p-3 rounded-2xl border-2 border-neutral-200 focus:border-brand-500 outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpInput.length < 4 || isSubmittingOtp}
                  className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
                >
                  {isSubmittingOtp ? 'Verifying...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
