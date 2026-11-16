import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Utensils, Carrot, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function SearchBar({ placeholder = 'Search burgers, pizzas, fresh milk, groceries...', initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Debounced autocomplete query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions({ products: [], categories: [] });
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/products/autocomplete?q=${encodeURIComponent(query)}`);
        setSuggestions(res.data || { products: [], categories: [] });
        setIsOpen(true);
      } catch {
        // Silently fail autocomplete
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectProduct = (product) => {
    setIsOpen(false);
    navigate(`/products/${product.slug || product._id}`);
  };

  const handleSelectCategory = (cat) => {
    setIsOpen(false);
    navigate(`/products?category=${cat.slug}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-neutral-400" />
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-neutral-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && (suggestions.products.length > 0 || suggestions.categories.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden z-50 divide-y divide-neutral-100 max-h-96 overflow-y-auto">
          {/* Matching Categories */}
          {suggestions.categories.length > 0 && (
            <div className="p-2 bg-neutral-50/50">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">
                Categories
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {suggestions.categories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-brand-50 hover:text-brand-600 border border-neutral-200 rounded-xl transition-colors"
                  >
                    {cat.type === 'food' ? (
                      <Utensils className="h-3 w-3 text-orange-500" />
                    ) : (
                      <Carrot className="h-3 w-3 text-emerald-500" />
                    )}
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Products */}
          {suggestions.products.length > 0 && (
            <div className="p-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">
                Products
              </span>
              <div className="mt-1 space-y-1">
                {suggestions.products.map((p) => {
                  const price = p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 text-left transition-colors group"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                          alt={p.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100';
                          }}
                          className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div>
                          <p className="text-xs font-bold text-neutral-900 group-hover:text-brand-600 line-clamp-1">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-neutral-400">{p.unit}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-neutral-900">
                        ₹{price % 1 === 0 ? price : price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* View All Search Results Footer */}
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="w-full py-2.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>See all results for "{query}"</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

