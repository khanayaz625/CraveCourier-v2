import { Link } from 'react-router-dom';
import { ShoppingBag, PackageOpen, SearchX, BellOff, ArrowRight } from 'lucide-react';

export default function EmptyState({
  type = 'generic',
  title,
  description,
  actionText,
  actionLink,
  onAction,
}) {
  const configs = {
    cart: {
      icon: ShoppingBag,
      defaultTitle: 'Your cart is craving something delicious!',
      defaultDesc: 'Explore our restaurant specialties and fresh supermarket essentials ready for 20-min delivery.',
      defaultActionText: 'Start Browsing Menu',
      defaultActionLink: '/products',
      colorClass: 'text-brand-500 bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-900',
    },
    orders: {
      icon: PackageOpen,
      defaultTitle: 'No orders placed yet',
      defaultDesc: 'When you place food or grocery orders, their live tracking status and delivery pins will appear right here.',
      defaultActionText: 'Order Your First Meal',
      defaultActionLink: '/products',
      colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    },
    search: {
      icon: SearchX,
      defaultTitle: 'No dishes or groceries found',
      defaultDesc: 'Try checking for typos or searching for general categories like Pizza, Burger, Fresh Milk, or Produce.',
      defaultActionText: 'Clear Search Filters',
      defaultActionLink: '/products',
      colorClass: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
    },
    notifications: {
      icon: BellOff,
      defaultTitle: "You're all caught up!",
      defaultDesc: 'Live courier dispatches and order updates will notify you here in real time.',
      defaultActionText: 'Return to Storefront',
      defaultActionLink: '/',
      colorClass: 'text-grocery-500 bg-grocery-50 dark:bg-grocery-950/40 border-grocery-200 dark:border-grocery-900',
    },
    generic: {
      icon: ShoppingBag,
      defaultTitle: 'Nothing to display here',
      defaultDesc: 'Check back shortly or explore our featured catalog items.',
      defaultActionText: 'Browse Catalog',
      defaultActionLink: '/products',
      colorClass: 'text-neutral-500 bg-neutral-100 dark:bg-slate-800 border-neutral-200 dark:border-slate-700',
    },
  };

  const config = configs[type] || configs.generic;
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayDesc = description || config.defaultDesc;
  const displayBtnText = actionText || config.defaultActionText;
  const displayBtnLink = actionLink || config.defaultActionLink;

  return (
    <div className="py-12 px-4 max-w-md mx-auto text-center flex flex-col items-center justify-center animate-pop">
      {/* Friendly Illustration Badge */}
      <div
        className={`h-24 w-24 rounded-3xl flex items-center justify-center border-2 mb-6 shadow-soft ${config.colorClass}`}
      >
        <Icon className="h-12 w-12" />
      </div>

      <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-slate-100 font-heading mb-2">
        {displayTitle}
      </h2>

      <p className="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 mb-6 leading-relaxed">
        {displayDesc}
      </p>

      {onAction ? (
        <button
          onClick={onAction}
          className="touch-target px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <span>{displayBtnText}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <Link
          to={displayBtnLink}
          className="touch-target px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <span>{displayBtnText}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

