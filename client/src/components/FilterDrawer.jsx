import { X, RotateCcw, Check, Sparkles, Filter } from 'lucide-react';

export default function FilterDrawer({
  isOpen,
  onClose,
  categories = [],
  filters,
  onFilterChange,
  onReset,
}) {
  const activeCount = [
    filters.category && filters.category !== 'all',
    filters.type && filters.type !== 'all',
    filters.isVeg === 'true',
    filters.hasDiscount === 'true',
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    Boolean(filters.rating),
  ].filter(Boolean).length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-[85vw] sm:max-w-xs bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:shadow-none lg:border lg:border-neutral-200/80 dark:lg:border-slate-800 lg:rounded-2xl lg:transform-none lg:z-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-brand-600" />
            <h3 className="font-bold text-sm text-neutral-900">Filters</h3>
            {activeCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-semibold"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Options */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1 divide-y divide-neutral-100 text-xs">
          {/* 1. Type Selector (All / Food / Grocery) */}
          <div>
            <label className="block font-bold text-neutral-800 mb-2 uppercase tracking-wider text-[10px]">
              Platform Section
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 p-1 rounded-xl">
              {[
                { label: 'All', value: 'all' },
                { label: 'Food', value: 'food' },
                { label: 'Grocery', value: 'grocery' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFilterChange('type', opt.value)}
                  className={`py-1.5 rounded-lg font-bold text-center transition-all ${
                    (filters.type || 'all') === opt.value
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Dietary Preferences (Veg Only / Discounted) */}
          <div className="pt-4 space-y-2">
            <label className="block font-bold text-neutral-800 uppercase tracking-wider text-[10px]">
              Preferences & Deals
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100/70 cursor-pointer">
              <span className="flex items-center space-x-2 font-semibold text-neutral-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <span>Vegetarian Only</span>
              </span>
              <input
                type="checkbox"
                checked={filters.isVeg === 'true'}
                onChange={(e) => onFilterChange('isVeg', e.target.checked ? 'true' : '')}
                className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 border-neutral-300"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100/70 cursor-pointer">
              <span className="flex items-center space-x-2 font-semibold text-neutral-700">
                <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                <span>On Sale / Deals Only</span>
              </span>
              <input
                type="checkbox"
                checked={filters.hasDiscount === 'true'}
                onChange={(e) => onFilterChange('hasDiscount', e.target.checked ? 'true' : '')}
                className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 border-neutral-300"
              />
            </label>
          </div>

          {/* 3. Category Selector */}
          <div className="pt-4">
            <label className="block font-bold text-neutral-800 mb-2 uppercase tracking-wider text-[10px]">
              Categories
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => onFilterChange('category', 'all')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                  !filters.category || filters.category === 'all'
                    ? 'bg-brand-50 text-brand-700 font-bold'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <span>All Categories</span>
                {(!filters.category || filters.category === 'all') && <Check className="h-3.5 w-3.5" />}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => onFilterChange('category', cat.slug)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    filters.category === cat.slug
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {filters.category === cat.slug && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Price Filter */}
          <div className="pt-4">
            <label className="block font-bold text-neutral-800 mb-2 uppercase tracking-wider text-[10px]">
              Price Range (₹)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Min Price</span>
                <input
                  type="number"
                  min="0"
                  placeholder="₹0"
                  value={filters.minPrice || ''}
                  onChange={(e) => onFilterChange('minPrice', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Max Price</span>
                <input
                  type="number"
                  min="0"
                  placeholder="₹500"
                  value={filters.maxPrice || ''}
                  onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* 5. Rating Filter */}
          <div className="pt-4">
            <label className="block font-bold text-neutral-800 mb-2 uppercase tracking-wider text-[10px]">
              Minimum Rating
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Any', value: '' },
                { label: '4.0+ ★', value: '4.0' },
                { label: '4.7+ ★', value: '4.7' },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => onFilterChange('rating', r.value)}
                  className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all ${
                    (filters.rating || '') === r.value
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer on Mobile */}
        <div className="p-4 border-t border-neutral-100 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-brand-500 text-white font-bold rounded-xl shadow-md text-xs"
          >
            Show Results
          </button>
        </div>
      </div>
    </>
  );
}

