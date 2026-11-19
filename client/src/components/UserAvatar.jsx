import { User } from 'lucide-react';

/**
 * Modern user avatar component that never defaults to generic third-party stock photos.
 * Uses custom uploaded avatar if present, or initials / user silhouette with sleek gradient.
 */
export default function UserAvatar({ user, size = 'md', className = '' }) {
  const isStockPlaceholder =
    !user?.avatar ||
    user.avatar.includes('photo-1534528741775') ||
    user.avatar.includes('unsplash.com');

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-7 w-7 text-xs',
    md: 'h-8 w-8 text-xs',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-20 w-20 text-xl font-black shadow-lg',
  }[size] || 'h-8 w-8 text-xs';

  const iconSizes = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4',
    md: 'h-4.5 w-4.5',
    lg: 'h-6 w-6',
    xl: 'h-10 w-10',
  }[size] || 'h-4.5 w-4.5';

  if (!isStockPlaceholder && user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || 'User avatar'}
        className={`rounded-full object-cover ring-2 ring-brand-500/30 ${sizeClasses} ${className}`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      aria-label={user?.name || 'User profile'}
      className={`rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-tr from-brand-600 via-rose-500 to-amber-500 shadow-xs select-none flex-shrink-0 ${sizeClasses} ${className}`}
    >
      {initials ? (
        <span className="tracking-tighter">{initials}</span>
      ) : (
        <User className={iconSizes} />
      )}
    </div>
  );
}
