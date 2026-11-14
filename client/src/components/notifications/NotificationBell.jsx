import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, CheckCheck, Package, Clock, ExternalLink } from 'lucide-react';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } =
    useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-neutral-700 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        title="Notifications"
        aria-label="View Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-neutral-200/90 shadow-2xl z-50 overflow-hidden animate-fade-in text-neutral-800">
          {/* Header */}
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-xs uppercase tracking-wider text-neutral-800">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-neutral-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="h-8 w-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-semibold text-neutral-400">No notifications yet</p>
                <p className="text-[11px] text-neutral-400">
                  You'll see real-time updates as your food is prepared & delivered!
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.read && markAsRead(n._id)}
                  className={`p-3.5 transition-colors flex items-start space-x-3 ${
                    !n.read ? 'bg-brand-50/30 hover:bg-brand-50/50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      !n.read
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-neutral-900 truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{formatTime(n.createdAt)}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug">
                      {n.message}
                    </p>

                    {n.data?.orderId && (
                      <Link
                        to={`/orders/${n.data.orderId}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 mt-1.5"
                      >
                        <span>View Order Details</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>

                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-1"></span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

