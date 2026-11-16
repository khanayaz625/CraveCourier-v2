export default function BrandLogo({
  variant = 'full', // 'full' | 'pin' | 'squircle' | 'rider'
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  showText = true,
}) {
  const iconSizes = {
    xs: 'h-6 w-auto',
    sm: 'h-7 sm:h-8 w-auto',
    md: 'h-8 sm:h-10 w-auto',
    lg: 'h-10 sm:h-12 w-auto',
    xl: 'h-12 sm:h-16 w-auto',
  };

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl',
  };

  if (variant === 'squircle') {
    return (
      <img
        src="/app-icon-squircle.png"
        alt="Cravecourier App Icon"
        className={`${iconSizes[size] || iconSizes.md} rounded-2xl shadow-sm object-contain mx-auto ${className}`}
      />
    );
  }

  if (variant === 'rider') {
    return (
      <img
        src="/crave-courier-rider.png"
        alt="Cravecourier Rider"
        className={`${iconSizes[size] || iconSizes.md} object-contain mx-auto ${className}`}
      />
    );
  }

  if (variant === 'pin') {
    return (
      <img
        src="/crave-courier-pin.png"
        alt="Cravecourier Badge"
        className={`${iconSizes[size] || iconSizes.md} object-contain mx-auto ${className}`}
      />
    );
  }

  // Default 'full' variant: Icon + "Cravecourier" typography matching the brand sheet
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <img
        src="/crave-courier-pin.png"
        alt="Cravecourier"
        className={`${iconSizes[size] || iconSizes.md} object-contain flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}
      />
      {showText && (
        <span
          className={`font-black tracking-tight font-heading leading-none whitespace-nowrap self-center ${
            textSizes[size] || textSizes.md
          }`}
        >
          <span className="text-[#FF541E]">Crave</span>
          <span className="text-neutral-900 dark:text-slate-100 hidden sm:inline">courier</span>
        </span>
      )}
    </div>
  );
}
