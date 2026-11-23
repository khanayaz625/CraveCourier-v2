import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  RotateCcw,
  AlertCircle,
  MapPin,
  CreditCard,
  ArrowLeft,
  ShieldAlert,
  Bike,
  Check,
  Star,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  UtensilsCrossed,
  Copy,
  CheckCheck,
  Phone,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { getSocket, joinOrderRoom, leaveOrderRoom } from '../services/socket';
import LiveOrderMap from '../components/order/LiveOrderMap';
import ReviewModal from '../components/order/ReviewModal';
import { triggerOrderCelebration } from '../utils/confetti';
import { playStatusUpdateSound } from '../services/soundEffects';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchCart } = useCartStore();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Live real-time telemetry from Socket.io
  const [liveLocation, setLiveLocation] = useState(null);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Refund dialog state (Admin only)
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('Customer requested refund / order cancellation');

  // Fetch initial order details
  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
      if (res.data?.status === 'placed' || res.data?.status === 'confirmed') {
        triggerOrderCelebration();
      }
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      setError(err.message || 'Could not load order details');
    } finally {
      setLoading(false);
    }
  };

  // Real-Time Socket.io Connection & Order Room Subscription
  useEffect(() => {
    if (!order?._id) return;

    const socket = getSocket();
    joinOrderRoom(order._id);

    // 1. Listen for real-time order status transitions
    const handleStatusUpdate = (payload) => {
      console.log('[SOCKET] Real-time order status update received:', payload);
      if (payload?.status) {
        playStatusUpdateSound(payload.status);
      }
      if (payload?.order) {
        setOrder(payload.order);
      } else if (payload?.status) {
        setOrder((prev) => ({
          ...prev,
          status: payload.status,
          statusTimeline: [
            ...(prev.statusTimeline || []),
            {
              status: payload.status,
              timestamp: payload.timestamp || new Date(),
              note: payload.note || `Status updated to ${payload.status}`,
            },
          ],
        }));
      }
      setActionSuccess(`Order updated to ${payload.status?.replace(/_/g, ' ')}!`);
    };

    // 2. Listen for live rider GPS location updates
    const handleLocationUpdate = (payload) => {
      setLiveLocation(payload);
    };

    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('order:location_update', handleLocationUpdate);

    return () => {
      leaveOrderRoom(order._id);
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('order:location_update', handleLocationUpdate);
    };
  }, [order?._id]);

  // Complete 7-stage status workflow:
  // Placed -> Confirmed -> Preparing -> Ready -> Picked Up -> Out for Delivery -> Delivered
  const steps = [
    { key: 'placed', label: 'Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'preparing', label: 'Cooking', icon: UtensilsCrossed },
    { key: 'ready', label: 'Ready', icon: ShoppingBag },
    { key: 'picked_up', label: 'Picked Up', icon: Bike },
    { key: 'out_for_delivery', label: 'On The Way', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Check },
  ];

  const getStepIndex = (status) => {
    const map = {
      placed: 0,
      confirmed: 1,
      preparing: 2,
      ready: 3,
      picked_up: 4,
      out_for_delivery: 5,
      delivered: 6,
      cancelled: -1,
      refunded: -1,
    };
    return map[status] ?? 0;
  };

  const handleUpdateStatus = async (newStatus) => {
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await api.patch(`/orders/${order._id}/status`, {
        status: newStatus,
        note: `Order updated to ${newStatus.replace(/_/g, ' ')} via portal`,
      });
      setOrder(res.data);
      setActionSuccess(`Order status successfully updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await api.post(`/payments/refund/${order._id}`, {
        reason: refundReason,
      });
      setOrder(res.data.order);
      setShowRefundModal(false);
      setActionSuccess('Order successfully refunded via Stripe and inventory restocked.');
    } catch (err) {
      alert(err.message || 'Refund failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Reorder Order Items: calls reorder endpoint & syncs cart
  const handleReorder = async () => {
    setReorderLoading(true);
    try {
      await api.post(`/orders/${order._id}/reorder`);
      await fetchCart();
      navigate('/cart');
    } catch (err) {
      alert(err.message || 'Failed to reorder items');
      setReorderLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'otp') {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-6 w-36 bg-neutral-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="h-44 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-neutral-200 dark:border-slate-800"></div>
        <div className="h-72 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-neutral-200 dark:border-slate-800"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-soft">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading">
            Order Not Found
          </h2>
          <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {error || 'This order does not exist or has been removed from your history.'}
          </p>
        </div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-neutral-900 dark:bg-brand-500 text-white font-bold text-xs shadow-soft transition-transform active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Orders</span>
        </Link>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded' || order.paymentStatus === 'refunded';

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-4 py-6 sm:py-8 space-y-6 pb-28 md:pb-12 overflow-x-hidden">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-1.5 px-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All Orders</span>
        </Link>

        {/* Reorder Button */}
        <button
          onClick={handleReorder}
          disabled={reorderLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow transition-transform active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reorderLoading ? 'animate-spin' : ''}`} />
          <span>{reorderLoading ? 'Adding to Cart...' : 'Reorder Items'}</span>
        </button>
      </div>

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ORDER HEADER CARD                                              */}
      {/* ============================================================== */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-slate-800 shadow-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading tracking-tight flex items-center gap-2">
              <span>Order</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">
                #{order.orderNumber || String(order._id).slice(-8).toUpperCase()}
              </span>
            </h1>

            <button
              type="button"
              onClick={() => copyToClipboard(order.orderNumber || String(order._id), 'id')}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              title="Copy Order ID"
            >
              {copiedId ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {isCancelled ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                Refunded / Cancelled
              </span>
            ) : order.status === 'delivered' ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>Delivered</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 flex items-center gap-1.5 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping"></span>
                <span>Live Active Tracking</span>
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at{' '}
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Rate & Review Button (Delivered Orders) */}
          {order.status === 'delivered' && (
            <div>
              {order.hasReviewed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>Review Submitted</span>
                </span>
              ) : (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-102"
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>Rate &amp; Review</span>
                </button>
              )}
            </div>
          )}

          <div className="text-left sm:text-right bg-neutral-50 dark:bg-slate-800/50 px-3.5 py-1.5 rounded-2xl border border-neutral-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-slate-500 tracking-wider block">
              Payment Status
            </span>
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                order.paymentStatus === 'paid'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : order.paymentStatus === 'refunded'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {order.paymentStatus} ({order.paymentMethod === 'stripe' ? 'Stripe Card' : order.paymentMethod === 'razorpay' ? 'Razorpay UPI' : 'Cash on Delivery'})
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DELIVERY VERIFICATION OTP CARD (High-Visibility Security PIN)  */}
      {/* ============================================================== */}
      {order.deliveryOtp && order.status !== 'delivered' && !isCancelled && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-brand-500/10 to-orange-500/5 dark:from-amber-950/40 dark:via-brand-950/40 dark:to-slate-900 rounded-3xl p-5 sm:p-6 border border-amber-300/80 dark:border-amber-800/80 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider font-heading">
                  Delivery Verification PIN
                </span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Share this 4-digit security code with your Crave rider upon delivery to confirm receipt.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 self-start sm:self-auto">
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-950 dark:text-amber-100 bg-white/90 dark:bg-slate-900/90 px-5 py-2 rounded-2xl border border-amber-300 dark:border-amber-700 shadow-sm tracking-widest">
                {order.deliveryOtp}
              </span>

              <button
                type="button"
                onClick={() => copyToClipboard(order.deliveryOtp, 'otp')}
                className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors shadow-xs"
                title="Copy PIN"
              >
                {copiedOtp ? <CheckCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7-STAGE REAL-TIME ORDER STATUS TIMELINE                        */}
      {/* ============================================================== */}
      {!isCancelled && (
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 font-heading">
              <Truck className="h-4 w-4 text-brand-500" />
              <span>Real-Time Status Flow</span>
            </h2>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-3 py-1 rounded-full border border-brand-200/60 dark:border-brand-900/60">
              {order.status === 'delivered' ? 'Completed' : '⚡ Live Socket Connected'}
            </span>
          </div>

          {/* Stepper Bar (7 Stages) */}
          <div className="relative pt-2">
            <div className="hidden sm:block absolute top-7 left-6 right-6 h-1 bg-neutral-200 dark:bg-slate-800 -z-0">
              <div
                className="h-1 bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-700 rounded-full"
                style={{
                  width: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%`,
                }}
              ></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 relative z-10">
              {steps.map((st, idx) => {
                const IconComponent = st.icon;
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div
                    key={st.key}
                    className={`flex sm:flex-col items-center sm:text-center space-x-2.5 sm:space-x-0 sm:space-y-1.5 p-2 rounded-2xl transition-all ${
                      isCurrent
                        ? 'bg-brand-50/90 dark:bg-brand-950/40 border border-brand-300 dark:border-brand-800 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'opacity-40'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-2xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform ${
                        isCurrent
                          ? 'bg-gradient-to-tr from-brand-500 to-amber-500 text-white shadow-md shadow-brand-500/30 scale-105 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-neutral-200 dark:bg-slate-800 text-neutral-500 dark:text-slate-400'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-neutral-900 dark:text-slate-100 block truncate">
                        {st.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Timeline History Event Log */}
          {order.statusTimeline && order.statusTimeline.length > 0 && (
            <div className="bg-neutral-50/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-neutral-200/80 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-black text-neutral-400 dark:text-slate-500 uppercase tracking-wider block">
                Live Event Log
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {order.statusTimeline.map((t, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs text-neutral-700 dark:text-slate-300 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0"></span>
                      <span className="font-bold capitalize truncate">{t.status.replace(/_/g, ' ')}</span>
                      <span className="text-neutral-500 dark:text-slate-400 font-normal truncate">&bull; {t.note}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 dark:text-slate-500 font-mono whitespace-nowrap flex-shrink-0">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* LIVE MAP WITH GPS TELEMETRY                                    */}
      {/* ============================================================== */}
      {!isCancelled && (
        <div className="rounded-3xl overflow-hidden border border-neutral-200/80 dark:border-slate-800 shadow-soft">
          <LiveOrderMap order={order} liveLocation={liveLocation} />
        </div>
      )}

      {/* Cancelled / Refunded Banner */}
      {isCancelled && (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-2 shadow-soft">
          <div className="flex items-center gap-2 font-black text-base text-rose-700 dark:text-rose-400">
            <RotateCcw className="h-5 w-5" />
            <span>Order Cancelled &amp; Refund Processed</span>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300">
            Reason: <strong>{order.cancellationReason || 'Requested by customer'}</strong>
          </p>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
            The full amount was returned to your payment source and product stock was automatically restored.
          </p>
        </div>
      )}

      {/* ============================================================== */}
      {/* ROLE CONTROLS (Admin & Partner Dispatchers)                     */}
      {/* ============================================================== */}
      {user?.role === 'admin' && (
        <div className="bg-purple-50/80 dark:bg-purple-950/40 rounded-3xl p-5 border border-purple-200 dark:border-purple-900 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-700 dark:text-purple-400" />
              <span className="font-black text-xs text-purple-900 dark:text-purple-300 uppercase tracking-wider font-heading">
                Admin Real-Time Status Dispatcher
              </span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300">
              Admin Ops
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Push Status:</span>
            {[
              'placed',
              'confirmed',
              'preparing',
              'ready',
              'picked_up',
              'out_for_delivery',
              'delivered',
            ].map((st) => (
              <button
                key={st}
                onClick={() => handleUpdateStatus(st)}
                disabled={actionLoading || order.status === st}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-40 transition-all capitalize shadow-xs"
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}

            {!isCancelled && order.paymentStatus === 'paid' && (
              <button
                onClick={() => setShowRefundModal(true)}
                disabled={actionLoading}
                className="text-[11px] font-bold px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white ml-auto shadow-xs transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Issue Refund (Stripe)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {user?.role === 'delivery' && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 rounded-3xl p-5 border border-amber-200 dark:border-amber-900 space-y-3 shadow-soft">
          <div className="flex items-center gap-2">
            <Bike className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            <span className="font-black text-xs text-amber-900 dark:text-amber-300 uppercase tracking-wider font-heading">
              Delivery Partner Dispatch Controls
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleUpdateStatus('picked_up')}
              disabled={actionLoading || order.status === 'picked_up'}
              className="text-xs font-bold px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs disabled:opacity-40 transition-all active:scale-95"
            >
              Mark Picked Up from Store
            </button>
            <button
              onClick={() => handleUpdateStatus('out_for_delivery')}
              disabled={actionLoading || order.status === 'out_for_delivery'}
              className="text-xs font-bold px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-40 transition-all active:scale-95"
            >
              Mark Out for Delivery
            </button>
            <button
              onClick={() => handleUpdateStatus('delivered')}
              disabled={actionLoading || order.status === 'delivered'}
              className="text-xs font-bold px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-40 transition-all active:scale-95"
            >
              Mark Delivered
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2-COLUMN GRID: Items List on Left, Delivery & Bill on Right    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Ordered Items Details */}
        <div className="md:col-span-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-slate-800">
            <h2 className="text-sm font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 font-heading">
              <Package className="h-4 w-4 text-brand-500" />
              <span>Ordered Items ({order.items?.length})</span>
            </h2>

            <button
              onClick={handleReorder}
              disabled={reorderLoading}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${reorderLoading ? 'animate-spin' : ''}`} />
              <span>Reorder</span>
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-slate-800">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200/80 dark:border-slate-700 overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-400">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-slate-100 truncate">
                      {item.name}
                    </h4>
                    <span className="text-[11px] text-neutral-400 dark:text-slate-500 block">
                      Unit: {item.unit || '1 Item'} &bull; ₹{item.price % 1 === 0 ? item.price : item.price.toFixed(2)} each
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-neutral-500 dark:text-slate-400 block">
                    Qty: {item.quantity}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100 font-heading">
                    ₹{item.subtotal % 1 === 0 ? item.subtotal : item.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Destination & Bill */}
        <div className="space-y-6">
          {/* Destination Card */}
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-3 text-xs">
            <h3 className="text-xs font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 font-heading">
              <MapPin className="h-4 w-4 text-brand-500" />
              <span>Delivery Address</span>
            </h3>

            <div className="text-neutral-700 dark:text-slate-300 leading-relaxed space-y-0.5">
              <p className="font-bold text-neutral-900 dark:text-slate-100 text-sm">
                {order.deliveryAddress?.street}
              </p>
              <p>
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state}{' '}
                {order.deliveryAddress?.pincode}
              </p>
              {order.deliveryAddress?.landmark && (
                <p className="text-neutral-400 dark:text-slate-500 text-[11px]">
                  Landmark: {order.deliveryAddress.landmark}
                </p>
              )}
              {order.deliveryAddress?.phone && (
                <p className="pt-2 text-neutral-600 dark:text-slate-300 font-mono text-[11px] font-bold flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-brand-500" />
                  <span>{order.deliveryAddress.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* Bill Receipt Card */}
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-3.5 text-xs">
            <h3 className="text-xs font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 font-heading">
              <CreditCard className="h-4 w-4 text-brand-500" />
              <span>Bill Breakdown</span>
            </h3>

            <div className="space-y-2 pt-1 border-b border-neutral-100 dark:border-slate-800 pb-3 text-neutral-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-neutral-900 dark:text-slate-100">
                  ₹{order.totals?.itemTotal % 1 === 0 ? order.totals?.itemTotal : order.totals?.itemTotal?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className={`font-bold ${order.totals?.deliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-slate-100'}`}>
                  {order.totals?.deliveryFee === 0
                    ? 'FREE (₹0)'
                    : `₹${order.totals?.deliveryFee % 1 === 0 ? order.totals?.deliveryFee : order.totals?.deliveryFee?.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Charges (0%)</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹0 (Zero Charges)</span>
              </div>
              {order.totals?.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{order.totals?.couponDiscount % 1 === 0 ? order.totals?.couponDiscount : order.totals?.couponDiscount?.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-base font-black text-neutral-900 dark:text-slate-100 pt-1 font-heading">
              <span>Grand Total</span>
              <span className="text-brand-600 dark:text-brand-400">
                ₹{order.totals?.grandTotal % 1 === 0 ? order.totals?.grandTotal : order.totals?.grandTotal?.toFixed(2)}
              </span>
            </div>

            <div className="pt-2 text-[10px] text-neutral-400 dark:text-slate-500 font-mono flex items-center justify-between">
              <span>Txn: {order.paymentId ? String(order.paymentId).slice(0, 16) + '...' : 'N/A'}</span>
              <span className="capitalize">{order.paymentMethod || 'COD'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        order={order}
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onReviewSubmitted={() => {
          setOrder((prev) => ({ ...prev, hasReviewed: true }));
          setActionSuccess('Review submitted! Product ratings have been updated.');
        }}
      />

      {/* Admin Refund Confirmation Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-neutral-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-base font-heading">
              <RotateCcw className="h-5 w-5" />
              <span>Confirm Full Order Refund</span>
            </div>

            <p className="text-xs text-neutral-600 dark:text-slate-300">
              You are about to issue a full refund of{' '}
              <strong className="text-neutral-900 dark:text-slate-100 font-bold">
                ₹{order.totals?.grandTotal % 1 === 0 ? order.totals?.grandTotal : order.totals?.grandTotal?.toFixed(2)}
              </strong>{' '}
              via Stripe for Order <strong>{order.orderNumber}</strong>. The stock of all{' '}
              {order.items?.length} items will be restored.
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-slate-200 mb-1">
                Reason for Refund
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 rounded-2xl text-neutral-600 dark:text-slate-400 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                disabled={actionLoading}
                className="px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                {actionLoading ? 'Processing Refund...' : 'Confirm & Refund via Stripe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
