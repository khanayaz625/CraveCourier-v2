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
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { getSocket, joinOrderRoom, leaveOrderRoom } from '../services/socket';
import LiveOrderMap from '../components/order/LiveOrderMap';
import ReviewModal from '../components/order/ReviewModal';
import { triggerOrderCelebration } from '../utils/confetti';

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-neutral-200 rounded-md"></div>
        <div className="h-40 bg-white rounded-3xl border border-neutral-200"></div>
        <div className="h-72 bg-white rounded-3xl border border-neutral-200"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Order Not Found</h2>
        <p className="text-xs text-neutral-500">
          {error || 'This order does not exist or has been removed.'}
        </p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Orders</span>
        </Link>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded' || order.paymentStatus === 'refunded';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6 pb-28 md:pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Orders</span>
        </Link>

        {/* Reorder Button */}
        <button
          onClick={handleReorder}
          disabled={reorderLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs transition-colors shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reorderLoading ? 'animate-spin' : ''}`} />
          <span>{reorderLoading ? 'Adding to Cart...' : 'Reorder Items'}</span>
        </button>
      </div>

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Order Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              Order {order.orderNumber}
            </h1>
            {isCancelled ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Refunded / Cancelled
              </span>
            ) : order.status === 'delivered' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Delivered
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                <span>Live Active Tracking</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
            {new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Rate & Review Button (Delivered Orders) */}
          {order.status === 'delivered' && (
            <div>
              {order.hasReviewed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>Review Submitted</span>
                </span>
              ) : (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>Rate & Review Order</span>
                </button>
              )}
            </div>
          )}

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
              Payment Status
            </span>
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                order.paymentStatus === 'paid'
                  ? 'text-emerald-600'
                  : order.paymentStatus === 'refunded'
                  ? 'text-rose-600'
                  : 'text-amber-600'
              }`}
            >
              {order.paymentStatus} ({order.paymentMethod === 'stripe' ? 'Stripe Card' : 'Cash on Delivery'})
            </span>
          </div>
        </div>
      </div>

      {/* Customer Delivery Verification OTP Card */}
      {order.deliveryOtp && order.status !== 'delivered' && !isCancelled && (
        <div className="bg-amber-50/90 rounded-3xl p-5 border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
              <span>Delivery Verification OTP</span>
            </span>
            <p className="text-xs text-amber-700">
              Please share this 4-digit security PIN with your Crave rider upon arrival
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">PIN:</span>
            <span className="text-2xl font-mono font-black text-amber-900 bg-white px-4 py-1.5 rounded-2xl border border-amber-300 shadow-xs tracking-widest">
              {order.deliveryOtp}
            </span>
          </div>
        </div>
      )}

      {/* Visual Live Order Tracking Timeline (7 Stages) */}
      {!isCancelled && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-brand-500" />
              <span>Real-Time Status Flow</span>
            </h2>
            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
              {order.status === 'delivered' ? 'Completed' : 'Socket.io Connected'}
            </span>
          </div>

          {/* Stepper Bar (7 Stages) */}
          <div className="relative pt-2">
            <div className="hidden sm:block absolute top-7 left-6 right-6 h-1 bg-neutral-200 -z-0">
              <div
                className="h-1 bg-emerald-500 transition-all duration-700"
                style={{
                  width: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%`,
                }}
              ></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 relative z-10">
              {steps.map((st, idx) => {
                const IconComponent = st.icon;
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div
                    key={st.key}
                    className={`flex sm:flex-col items-center sm:text-center space-x-2.5 sm:space-x-0 sm:space-y-1.5 p-2 rounded-2xl ${
                      isCurrent
                        ? 'bg-brand-50/80 border border-brand-200'
                        : isCompleted
                        ? 'bg-emerald-50/40'
                        : 'opacity-40'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform ${
                        isCurrent
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30 scale-105 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-neutral-900 block truncate">
                        {st.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Timeline History Log */}
          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Event Log
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {order.statusTimeline?.map((t, idx) => (
                <div key={idx} className="flex items-start justify-between text-xs text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                    <span className="font-semibold capitalize">{t.status.replace(/_/g, ' ')}</span>
                    <span className="text-neutral-500 font-normal">&bull; {t.note}</span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono whitespace-nowrap">
                    {new Date(t.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Vector Delivery Map with Real-Time Rider Telemetry */}
      {!isCancelled && <LiveOrderMap order={order} liveLocation={liveLocation} />}

      {/* Cancelled / Refunded Banner */}
      {isCancelled && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-black text-base text-rose-700">
            <RotateCcw className="h-5 w-5" />
            <span>Order Cancelled & Refund Processed</span>
          </div>
          <p className="text-xs text-rose-700">
            Reason: <strong>{order.cancellationReason || 'Requested by customer'}</strong>
          </p>
          <p className="text-[11px] text-rose-600">
            The full amount was returned to your payment source and product stock was automatically restocked.
          </p>
        </div>
      )}

      {/* Role Management Toolbar (Admin Testing & Status Simulator) */}
      {user?.role === 'admin' && (
        <div className="bg-purple-50 rounded-3xl p-5 border border-purple-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-700" />
              <span className="font-black text-xs text-purple-900 uppercase tracking-wider">
                Admin Real-Time Status Dispatcher
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
              Admin Portal
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-purple-900">Push Status:</span>
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
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 disabled:opacity-40 transition-all capitalize"
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

      {/* Delivery Partner Toolbar */}
      {user?.role === 'delivery' && (
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <Bike className="h-5 w-5 text-amber-700" />
            <span className="font-black text-xs text-amber-900 uppercase tracking-wider">
              Delivery Partner Dispatch Controls
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleUpdateStatus('picked_up')}
              disabled={actionLoading || order.status === 'picked_up'}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs disabled:opacity-40"
            >
              Mark Picked Up from Store
            </button>
            <button
              onClick={() => handleUpdateStatus('out_for_delivery')}
              disabled={actionLoading || order.status === 'out_for_delivery'}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-40"
            >
              Mark Out for Delivery
            </button>
            <button
              onClick={() => handleUpdateStatus('delivered')}
              disabled={actionLoading || order.status === 'delivered'}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-40"
            >
              Mark Delivered
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Grid: Delivery Address & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Items Snapshot */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-500" />
              <span>Ordered Items ({order.items?.length})</span>
            </h2>

            <button
              onClick={handleReorder}
              disabled={reorderLoading}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${reorderLoading ? 'animate-spin' : ''}`} />
              <span>Reorder</span>
            </button>
          </div>

          <div className="divide-y divide-neutral-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="h-14 w-14 rounded-2xl bg-neutral-50 border border-neutral-200 overflow-hidden flex-shrink-0">
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
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900">{item.name}</h4>
                    <span className="text-[11px] text-neutral-400">
                      Unit: {item.unit} &bull; ₹{item.price % 1 === 0 ? item.price : item.price.toFixed(2)} each
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-500 block">
                    Qty: {item.quantity}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-neutral-900">
                    ₹{item.subtotal % 1 === 0 ? item.subtotal : item.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Address & Bill */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-3 text-xs">
            <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-500" />
              <span>Delivery Address</span>
            </h3>

            <div className="text-neutral-700 leading-relaxed">
              <p className="font-bold text-neutral-900">{order.deliveryAddress?.street}</p>
              <p>
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state}{' '}
                {order.deliveryAddress?.pincode}
              </p>
              {order.deliveryAddress?.landmark && (
                <p className="text-neutral-500 text-[11px]">
                  Near: {order.deliveryAddress.landmark}
                </p>
              )}
              <p className="pt-2 text-neutral-500 font-mono text-[11px]">
                Phone: {order.deliveryAddress?.phone}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-3 text-xs">
            <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-500" />
              <span>Bill Receipt</span>
            </h3>

            <div className="space-y-2 pt-1 border-b border-neutral-100 pb-3">
              <div className="flex justify-between text-neutral-600">
                <span>Items Subtotal</span>
                <span className="font-bold">₹{order.totals?.itemTotal % 1 === 0 ? order.totals?.itemTotal : order.totals?.itemTotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Taxes & Charges (0%)</span>
                <span className="font-bold text-emerald-600">₹0</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Delivery Charge</span>
                <span className="font-bold">
                  {order.totals?.deliveryFee === 0
                    ? 'FREE (₹0)'
                    : `₹${order.totals?.deliveryFee % 1 === 0 ? order.totals?.deliveryFee : order.totals?.deliveryFee?.toFixed(2)}`}
                </span>
              </div>
              {order.totals?.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{order.totals?.couponDiscount % 1 === 0 ? order.totals?.couponDiscount : order.totals?.couponDiscount?.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-base font-black text-neutral-900 pt-1">
              <span>Grand Total</span>
              <span>₹{order.totals?.grandTotal % 1 === 0 ? order.totals?.grandTotal : order.totals?.grandTotal?.toFixed(2)}</span>
            </div>

            <div className="pt-2 text-[11px] text-neutral-400 font-mono">
              Transaction: {order.paymentId || 'N/A'}
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-black text-base">
              <RotateCcw className="h-5 w-5" />
              <span>Confirm Full Order Refund</span>
            </div>

            <p className="text-xs text-neutral-600">
              You are about to issue a full refund of{' '}
              <strong className="text-neutral-900 font-bold">
                ₹{order.totals?.grandTotal % 1 === 0 ? order.totals?.grandTotal : order.totals?.grandTotal?.toFixed(2)}
              </strong>{' '}
              via Stripe for Order <strong>{order.orderNumber}</strong>. The stock of all{' '}
              {order.items?.length} items will be restored.
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Reason for Refund
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-neutral-300 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 rounded-xl text-neutral-600 font-bold text-xs hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
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
