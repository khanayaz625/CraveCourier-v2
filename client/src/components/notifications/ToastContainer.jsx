import { Link } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, X, ArrowRight, Package } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-2xl p-4 shadow-xl shadow-neutral-900/10 flex items-start space-x-3 transition-all transform animate-slide-in"
        >
          <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-brand-100">
            <Package className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-neutral-900 truncate">{toast.title}</h4>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded-lg transition-colors"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug line-clamp-2">
              {toast.message}
            </p>

            {toast.orderId && (
              <Link
                to={`/orders/${toast.orderId}`}
                onClick={() => removeToast(toast.id)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 mt-2 transition-colors"
              >
                <span>Track Order</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

