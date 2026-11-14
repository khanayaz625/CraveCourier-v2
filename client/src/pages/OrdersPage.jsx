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

  const getStatusBadge = (status, paymentStatus) => {
    if (paymentStatus === 'refunded' || status === 'cancelled' || status === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <RotateCcw className="h-3 w-3" />
          <span>{paymentStatus === 'refunded' ? 'Refunded' : 'Cancelled'}</span>
        </span>
      );
    }

    switch (status) {
      case 'placed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            <span>Order Placed</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <UtensilsCrossed className="h-3 w-3" />
            <span>Cooking</span>
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <ShoppingBag className="h-3 w-3" />
            <span>Ready for Pickup</span>
          </span>
        );
      case 'picked_up':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Bike className="h-3 w-3" />
            <span>Rider Picked Up</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
            <Truck className="h-3 w-3" />
            <span>Out for Delivery</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>Delivered</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Order History
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Track real-time delivery status, view invoices, and reorder with one click
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-neutral-200 shadow-xs self-start">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
          description="You haven't placed any orders in this category yet. Discover chef specialties and fresh groceries ready for delivery!"
          actionText="Browse Hot Food & Groceries"
          actionLink="/products"
        />
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 hover:border-brand-200 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              {/* Order Card Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                      {order.paymentMethod === 'stripe' ? 'Stripe Card' : 'Cash on Delivery'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>{getStatusBadge(order.status, order.paymentStatus)}</div>
              </div>

              {/* Order Items Preview */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2 overflow-x-auto py-1">
                  {order.items?.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="h-12 w-12 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0"
                      title={`${item.name} (${item.quantity}x)`}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>
                  ))}

                  {order.items?.length > 4 && (
                    <div className="h-12 w-12 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 flex-shrink-0">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] text-neutral-400 block">Total Amount</span>
                  <span className="text-sm sm:text-base font-black text-neutral-900">
                    ₹{order.totals?.grandTotal ? (order.totals.grandTotal % 1 === 0 ? order.totals.grandTotal : order.totals.grandTotal.toFixed(2)) : '0'}
                  </span>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100">
                <span className="text-xs text-neutral-500">
                  {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} &bull; Deliver to{' '}
                  <strong className="text-neutral-700">
                    {order.deliveryAddress?.city || 'Address'}
                  </strong>
                </span>

                <div className="flex items-center space-x-2">
                  {/* Reorder Button */}
                  <button
                    onClick={() => handleReorder(order._id)}
                    disabled={reorderingId === order._id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${reorderingId === order._id ? 'animate-spin' : ''}`}
                    />
                    <span>Reorder</span>
                  </button>

                  {/* Rate Order Shortcut */}
                  {order.status === 'delivered' && !order.hasReviewed && (
                    <Link
                      to={`/orders/${order._id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors"
                    >
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>Rate</span>
                    </Link>
                  )}

                  {/* Track / Details Button */}
                  <Link
                    to={`/orders/${order._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition-colors"
                  >
                    <span>Track Order</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
