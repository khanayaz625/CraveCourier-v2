import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, BellRing } from 'lucide-react';

export default function NotificationBell({ className = '' }) {
  const { unreadCount, openDrawer } = useNotificationStore();
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={openDrawer}
      className={`relative p-1.5 sm:p-2 rounded-xl transition-colors flex items-center justify-center ${
        hasUnread
          ? 'text-brand-600 dark:text-brand-400 bg-brand-50/80 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-950/60'
          : 'text-neutral-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
      } ${className}`}
      title={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
      aria-label="Open notifications panel"
    >
      {hasUnread ? (
        <BellRing className="h-4.5 sm:h-5 w-4.5 sm:w-5 animate-pulse" />
      ) : (
        <Bell className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
      )}
      {hasUnread && (
        <>
          <span className="absolute -top-0.5 -right-0.5 h-4 sm:h-4.5 min-w-[16px] px-1 rounded-full bg-brand-500 text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-xs animate-pop">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-brand-400 animate-ping pointer-events-none" />
        </>
      )}
    </button>
  );
}
