import {
  Bike,
  CheckCircle2,
  ShoppingBag,
  Package,
  Flame,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  BellRing,
  Radio,
  Award,
} from 'lucide-react';

/**
 * Resolve rich icon component and badge styling for an incoming or stored notification.
 */
export function getNotificationVisual(item = {}) {
  const status = String(item.status || item.data?.status || '').toLowerCase();
  const type = String(item.type || '').toLowerCase();
  const title = String(item.title || '').toLowerCase();

  if (status === 'delivered' || title.includes('delivered')) {
    return {
      Icon: CheckCircle2,
      bgClass: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      accentRing: 'ring-emerald-400/30',
    };
  }

  if (status === 'out_for_delivery' || status === 'picked_up' || title.includes('out for delivery') || title.includes('picked up')) {
    return {
      Icon: Bike,
      bgClass: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      iconClass: 'text-amber-600 dark:text-amber-400',
      accentRing: 'ring-amber-400/30',
    };
  }

  if (status === 'preparing' || title.includes('cooking') || title.includes('preparing')) {
    return {
      Icon: Flame,
      bgClass: 'bg-orange-100 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800',
      iconClass: 'text-orange-600 dark:text-orange-400',
      accentRing: 'ring-orange-400/30',
    };
  }

  if (status === 'ready' || title.includes('ready for pickup')) {
    return {
      Icon: Package,
      bgClass: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      iconClass: 'text-indigo-600 dark:text-indigo-400',
      accentRing: 'ring-indigo-400/30',
    };
  }

  if (status === 'confirmed' || title.includes('confirmed')) {
    return {
      Icon: ShieldCheck,
      bgClass: 'bg-sky-100 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      iconClass: 'text-sky-600 dark:text-sky-400',
      accentRing: 'ring-sky-400/30',
    };
  }

  if (status === 'cancelled' || title.includes('cancelled')) {
    return {
      Icon: AlertTriangle,
      bgClass: 'bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      iconClass: 'text-rose-600 dark:text-rose-400',
      accentRing: 'ring-rose-400/30',
    };
  }

  if (status === 'refunded' || title.includes('refund')) {
    return {
      Icon: RotateCcw,
      bgClass: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      iconClass: 'text-slate-600 dark:text-slate-300',
      accentRing: 'ring-slate-400/30',
    };
  }

  if (type.includes('admin_new_order') || title.includes('new order')) {
    return {
      Icon: BellRing,
      bgClass: 'bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      iconClass: 'text-rose-600 dark:text-rose-400',
      accentRing: 'ring-rose-400/40',
    };
  }

  if (type.includes('kyc')) {
    return {
      Icon: Award,
      bgClass: 'bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
      iconClass: 'text-purple-600 dark:text-purple-400',
      accentRing: 'ring-purple-400/30',
    };
  }

  if (type === 'system' || title.includes('tracking')) {
    return {
      Icon: Radio,
      bgClass: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      accentRing: 'ring-emerald-400/30',
    };
  }

  return {
    Icon: ShoppingBag,
    bgClass: 'bg-brand-50 dark:bg-brand-950/60 border-brand-200 dark:border-brand-800',
    iconClass: 'text-brand-600 dark:text-brand-400',
    accentRing: 'ring-brand-400/30',
  };
}
