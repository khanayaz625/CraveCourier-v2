import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  Bell,
  X,
  CheckCheck,
  Volume2,
  VolumeX,
  Clock,
  ExternalLink,
  Package,
  Bike,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  Radio,
  Shield,
  Zap,
  Send,
} from 'lucide-react';

export default function NotificationDrawer() {
  const {
    isDrawerOpen,
    closeDrawer,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading,
    soundEnabled,
    toggleSound,
    permission,
    requestPermission,
    isBgTrackingActive,
    toggleBackgroundTracking,
    sendTestNotification,
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'orders'

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isDrawerOpen]);

  // Filtered notifications based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    if (activeTab === 'orders') {
      return notifications.filter((n) => n.data?.orderId || n.type?.includes('order'));
    }
    return notifications;
  }, [notifications, activeTab]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (n) => {
    const type = n.type || '';
    if (type.includes('delivery') || type.includes('out_for_delivery')) {
      return <Bike className="h-4 w-4 text-amber-500" />;
    }
    if (type.includes('delivered')) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (type.includes('order')) {
      return <ShoppingBag className="h-4 w-4 text-brand-500" />;
    }
    return <Package className="h-4 w-4 text-purple-500" />;
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-neutral-950/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-from-Right Drawer Panel */}
      <aside
        aria-label="Notifications Panel"
        aria-modal="true"
        role="dialog"
        className={`fixed top-0 bottom-0 right-0 z-50 w-full sm:w-[420px] max-w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-neutral-200/80 dark:border-slate-800 transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base font-heading text-neutral-900 dark:text-slate-100">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-500 text-white animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-slate-500">
                Order milestones & delivery updates
              </p>
            </div>
          </div>

          {/* Action Icons (Sound, Mark all read, Close) */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl transition-colors ${
                soundEnabled
                  ? 'text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-400'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Mute notification chimes' : 'Unmute notification chimes'}
              aria-label="Toggle notification sounds"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="p-2 rounded-xl text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={closeDrawer}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              title="Close notifications"
              aria-label="Close notifications panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Filter Row */}
        <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-slate-800/80 bg-neutral-50/50 dark:bg-slate-900/50 flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-neutral-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-slate-800'
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'unread'
                ? 'bg-neutral-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'unread'
                  ? 'bg-white text-neutral-900 dark:bg-slate-900 dark:text-white'
                  : 'bg-brand-500 text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-neutral-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-slate-800'
            }`}
          >
            Orders
          </button>
        </div>

        {/* Real Notification Permission & Background Tracking Status Panel */}
        <div className="p-3 bg-neutral-50 dark:bg-slate-900/80 border-b border-neutral-100 dark:border-slate-800 space-y-2 flex-shrink-0">
          {/* Permission Card */}
          {permission !== 'granted' ? (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
              <span className="p-1.5 rounded-xl bg-amber-500 text-white flex-shrink-0 mt-0.5">
                <Bell className="h-3.5 w-3.5 animate-bounce" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-amber-950 dark:text-amber-200">
                  Allow Real-Time System Notifications
                </p>
                <p className="text-[10px] text-amber-800 dark:text-amber-400 mt-0.5 leading-tight">
                  Get live order milestones and rider arrival alerts directly on your device lock screen.
                </p>
                <button
                  type="button"
                  onClick={requestPermission}
                  className="mt-2 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shadow-xs transition-transform active:scale-95"
                >
                  Enable Device Notifications
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Notifications: Active
              </span>
              <button
                type="button"
                onClick={sendTestNotification}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 underline underline-offset-2"
              >
                Send Test Alert
              </button>
            </div>
          )}

          {/* Background Running Tracking Permission Card */}
          <div className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-neutral-200/80 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`p-1.5 rounded-lg flex-shrink-0 ${
                  isBgTrackingActive
                    ? 'bg-brand-500 text-white animate-pulse'
                    : 'bg-neutral-100 dark:bg-slate-700 text-neutral-500 dark:text-slate-400'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-neutral-900 dark:text-slate-100 truncate">
                  Background Live GPS Tracking
                </p>
                <p className="text-[9px] text-neutral-400 dark:text-slate-400 truncate">
                  {isBgTrackingActive
                    ? 'Screen kept awake & telemetry syncing'
                    : 'Allows persistent live route sync when app is backgrounded'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleBackgroundTracking}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all flex-shrink-0 ${
                isBgTrackingActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-700 dark:text-slate-200'
              }`}
            >
              {isBgTrackingActive ? 'Active 🟢' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Scrollable Notification Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-slate-800/80">
          {loading && notifications.length === 0 ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-start space-x-3">
                  <div className="h-9 w-9 bg-neutral-200 dark:bg-slate-800 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-neutral-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-2.5 bg-neutral-100 dark:bg-slate-800/60 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center space-y-3 my-auto">
              <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-neutral-400 dark:text-slate-500">
                <Sparkles className="h-7 w-7 text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-800 dark:text-slate-200">
                  {activeTab === 'unread' ? 'No unread notifications' : 'All caught up!'}
                </h3>
                <p className="text-xs text-neutral-400 dark:text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Real-time updates will automatically appear here as your order is confirmed, prepared, and dispatched!
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.read && markAsRead(n._id)}
                className={`p-4 transition-all flex items-start space-x-3.5 cursor-pointer ${
                  !n.read
                    ? 'bg-brand-50/40 dark:bg-brand-950/20 hover:bg-brand-50/70 dark:hover:bg-brand-950/30 border-l-4 border-l-brand-500'
                    : 'hover:bg-neutral-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Type Icon Badge */}
                <div className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                  {getNotificationIcon(n)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-slate-100 line-clamp-1 font-heading">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{formatTime(n.createdAt)}</span>
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {n.message}
                  </p>

                  {/* Order Navigation Link */}
                  {n.data?.orderId && (
                    <Link
                      to={`/orders/${n.data.orderId}`}
                      onClick={() => closeDrawer()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mt-2.5 px-3 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 transition-colors"
                    >
                      <span>Track Order</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Unread Indicator Dot */}
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5 shadow-xs animate-pulse"></span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-200/80 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-[11px] font-semibold text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Alerts Active</span>
          </span>

          <Link
            to="/orders"
            onClick={closeDrawer}
            className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 text-xs"
          >
            View All Orders &rarr;
          </Link>
        </div>
      </aside>
    </>
  );
}
