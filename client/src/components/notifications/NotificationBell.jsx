import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell } from 'lucide-react';

export default function NotificationBell({ className = '' }) {
  const { unreadCount, openDrawer } = useNotificationStore();

  return (
    <button
      type="button"
      onClick={openDrawer}
      className={`relative p-1.5 sm:p-2 rounded-xl text-neutral-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center ${className}`}
      title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      aria-label="Open notifications panel"
    >
      <Bell className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 sm:h-4.5 min-w-[16px] px-1 rounded-full bg-brand-500 text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-xs animate-pop">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
