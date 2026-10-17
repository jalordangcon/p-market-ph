/**
 * P-MARKET PH - Storefront View
 * Public marketplace showcasing Flagship direct retail and independent merchants.
 * Features search, category filtering, origin filters, and referral banner.
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Store as StoreIcon,
  Filter,
  Sparkles,
  Search,
  Check,
  Users,
} from 'lucide-react';
import { Product } from '../types/marketplace.ts';
import { api } from '../services/api.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { useReferral } from '../context/ReferralContext.tsx';

const CATEGORIES = [
  'All',
  'Philippine Artisanal & Food',
  'Electronics & Gadgets',
  'Home & Living',
  'Fashion & Apparel',
];

interface StorefrontViewProps {
  searchQuery: string;
  onSelectProduct: (product: Product) => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({ searchQuery, onSelectProduct }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [originFilter, setOriginFilter] = useState<'all' | 'platform' | 'seller'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');

  const { referralCode, agentName } = useReferral();

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getProducts({
        q: searchQuery,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        type: originFilter === 'all' ? undefined : originFilter,
      });
      let prods = res.products;

      if (sortBy === 'price_asc') {
        prods = [...prods].sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price_desc') {
        prods = [...prods].sort((a, b) => b.price - a.price);
      }

      setProducts(prods);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory, originFilter, sortBy]);

  return (
    <div className="space-y-8 pb-16">
      {/* Referral Partner Notification Banner if Attributed */}
      {referralCode && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-sm border border-amber-400 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <Users className="w-4 h-4 shrink-0 text-slate-950" />
            <span>
              Shopping through Partner Ambassador Referral: <strong>{referralCode}</strong>
              {agentName && ` (${agentName})`}
            </span>
          </div>
          <span className="bg-slate-950 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Eligible for Agent Rewards
          </span>
        </div>
      )}

      {/* Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl border border-slate-800">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Official Philippine National Commerce Network</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            P-MARKET <span className="text-blue-400">PH</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            The authentic Philippine marketplace connecting direct platform flagship retail,
            verified independent merchants, and a nationwide referral network.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Flagship Retail Direct</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <StoreIcon className="w-4 h-4 text-emerald-400" />
              <span>Verified Independent Sellers</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-sky-400 font-bold">₱</span>
              <span>GCash & Maya Supported</span>
            </div>
          </div>
        </div>

        {/* Subtle Decorative Elements */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-600/20 to-transparent pointer-events-none" />
      </section>

      {/* Categories & Filter Bar */}
      <section className="space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Origin Toggle & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          {/* Origin Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setOriginFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                originFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setOriginFilter('platform')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                originFilter === 'platform'
                  ? 'bg-slate-900 text-amber-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Flagship Direct
            </button>
            <button
              onClick={() => setOriginFilter('seller')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                originFilter === 'seller'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <StoreIcon className="w-3.5 h-3.5" />
              Marketplace Sellers
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-none"
            >
              <option value="popular">Popular & Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-3"
              >
                <div className="w-full aspect-square bg-slate-200 rounded-xl"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                <div className="h-5 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No Products Found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your category selection, search terms, or origin filters.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setOriginFilter('all');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
