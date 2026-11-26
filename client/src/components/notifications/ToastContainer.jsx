import { Link } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';
import { X, ArrowRight } from 'lucide-react';
import { getNotificationVisual } from '../../utils/notificationIcon';

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none">
      {toasts.map((toast) => {
        const { Icon, bgClass, iconClass, accentRing } = getNotificationVisual(toast);

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-neutral-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-neutral-900/15 dark:shadow-black/50 flex items-start space-x-3 transition-all transform animate-slide-in"
          >
            <div
              className={`relative h-10 w-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ring-4 ${bgClass} ${iconClass} ${accentRing}`}
            >
              <Icon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900 animate-ping" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-neutral-900 dark:text-slate-100 truncate">
                  {toast.title}
                </h4>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 p-0.5 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Close notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-neutral-600 dark:text-slate-300 mt-0.5 leading-snug line-clamp-2">
                {toast.message}
              </p>

              {toast.orderId && (
                <Link
                  to={`/orders/${toast.orderId}`}
                  onClick={() => removeToast(toast.id)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 mt-2 transition-colors"
                >
                  <span>Track Order</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
