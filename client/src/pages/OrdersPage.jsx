import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  ShoppingBag,
  RotateCcw,
  RefreshCw,
  Star,
  Bike,
  UtensilsCrossed,
  ChevronLeft,
} from 'lucide-react';
import api from '../services/api';
import { useCartStore } from '../store/useCartStore';
import EmptyState from '../components/EmptyState';
import { OrderCardSkeleton } from '../components/SkeletonLoader';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { fetchCart } = useCartStore();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'delivered' | 'cancelled'
  const [error, setError] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryStatus = activeTab;
      if (activeTab === 'all' || activeTab === 'active') {
        queryStatus = undefined;
      }
      const res = await api.get('/orders/my-orders', {
        params: queryStatus ? { status: queryStatus } : {},
      });
      let list = res.data?.orders || [];

      if (activeTab === 'active') {
        list = list.filter((o) =>
          ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery'].includes(
            o.status
          )
        );
      }

      setOrders(list);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Could not load your orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (orderId) => {
    setReorderingId(orderId);
    try {
      await api.post(`/orders/${orderId}/reorder`);
      await fetchCart();
      navigate('/cart');
    } catch (err) {
      alert(err.message || 'Failed to reorder items');
      setReorderingId(null);
    }
  };

  const formatMoney = (val) => {
    const num = Number(val || 0);
    return num % 1 === 0 ? num : num.toFixed(2);
  };

  const getStatusBadge = (status, paymentStatus) => {
    if (paymentStatus === 'refunded' || status === 'cancelled' || status === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
          <RotateCcw className="h-3 w-3" />
          <span>{paymentStatus === 'refunded' ? 'Refunded' : 'Cancelled'}</span>
        </span>
      );
    }

    switch (status) {
      case 'placed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="h-3 w-3" />
            <span>Placed</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            <UtensilsCrossed className="h-3 w-3" />
            <span>Cooking</span>
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            <ShoppingBag className="h-3 w-3" />
            <span>Ready</span>
          </span>
        );
      case 'picked_up':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Bike className="h-3 w-3" />
            <span>Picked Up</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 animate-pulse">
            <Truck className="h-3 w-3" />
            <span>On The Way</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>Delivered</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-60px)] bg-white dark:bg-slate-950 pb-28 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Minimalist Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-9 w-9 rounded-full bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 flex items-center justify-center text-neutral-700 dark:text-slate-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Back to home"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h1 className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100 tracking-tight">
          My Orders
        </h1>

        <div className="w-9" />
      </div>

      {/* Clean Segmented Filter Tabs */}
      <div className="grid grid-cols-4 bg-white dark:bg-slate-900 p-1 rounded-full border border-neutral-200/80 dark:border-slate-800 shadow-xs">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-2 rounded-full text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#FF541E] to-[#FF7A00] text-white shadow-xs'
                : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <OrderCardSkeleton key={n} />
          ))}
        </div>
      )}

      {/* Error Feedback */}
      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <EmptyState
          type="orders"
          title="No orders found"
          description="You haven't placed any orders in this category yet."
          actionText="Browse Menu"
          actionLink="/products"
        />
      )}

      {/* Clean Dribbble-Style Hairline-Divided Order Cards */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const firstItem = order.items?.[0];
            const extraCount = Math.max(0, (order.items?.length || 0) - 1);

            return (
              <div
                key={order._id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-soft divide-y divide-neutral-100 dark:divide-slate-800 overflow-hidden"
              >
                {/* Top Row: Order Number + Status Badge */}
                <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-slate-100 block">
                      {order.orderNumber}
                    </span>
                    <span className="text-[11px] text-neutral-400 dark:text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      &bull;{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div>{getStatusBadge(order.status, order.paymentStatus)}</div>
                </div>

                {/* Middle Row: Product Thumbnail + Title + Price */}
                <div className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200/60 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {firstItem?.image ? (
                        <img
                          src={firstItem.image}
                          alt={firstItem.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="text-[11px] text-neutral-400 dark:text-slate-500 block">
                        Pizza 65 &amp; Crave Hub
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100 truncate">
                        {firstItem?.name || 'Food Order'}
                        {extraCount > 0 ? ` +${extraCount} more` : ''}
                      </h3>
                      <span className="text-[11px] text-neutral-500 dark:text-slate-400 block">
                        {order.items?.reduce((s, i) => s + (i.quantity || 1), 0)} items &bull;{' '}
                        {order.paymentMethod === 'stripe'
                          ? 'Card'
                          : order.paymentMethod === 'razorpay'
                          ? 'Razorpay'
                          : 'Cash on Delivery'}
                      </span>
                    </div>
                  </div>

                  <span className="text-sm sm:text-base font-black text-neutral-900 dark:text-slate-100 whitespace-nowrap">
                    ₹{formatMoney(order.totals?.grandTotal)}
                  </span>
                </div>

                {/* Summary Key-Value Snippet */}
                <div className="px-4 sm:px-5 py-3 text-xs space-y-1 bg-neutral-50/50 dark:bg-slate-800/30">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 dark:text-slate-500">Deliver to</span>
                    <span className="font-semibold text-neutral-700 dark:text-slate-300 truncate max-w-[200px]">
                      {order.deliveryAddress?.street || order.deliveryAddress?.city || 'Saved Address'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReorder(order._id)}
                      disabled={reorderingId === order._id}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition-colors"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${reorderingId === order._id ? 'animate-spin' : ''}`}
                      />
                      <span>Reorder</span>
                    </button>

                    {order.status === 'delivered' && !order.hasReviewed && (
                      <Link
                        to={`/orders/${order._id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-xs"
                      >
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>Rate</span>
                      </Link>
                    )}
                  </div>

                  <Link
                    to={`/orders/${order._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF541E] to-[#FF7A00] hover:opacity-95 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <span>Track Order</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
