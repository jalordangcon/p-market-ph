/**
 * P-MARKET PH - Product Card Component
 * Displays product image, seller origin badge (Flagship vs Independent Merchant),
 * Philippine Peso pricing, stock indicators, and instant add-to-cart.
 */

import React from 'react';
import { ShoppingCart, Check, AlertCircle, ShieldCheck, Store as StoreIcon } from 'lucide-react';
import { Product } from '../types/marketplace.ts';
import { formatPHP } from '../services/api.ts';
import { useCart } from '../context/CartContext.tsx';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addItem, items } = useCart();
  const cartItem = items.find((i) => i.product.id === product.id);
  const currentInCart = cartItem?.quantity || 0;
  const isOutOfStock = product.stock <= 0;
  const isMaxInCart = currentInCart >= product.stock;

  const discountPct = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOutOfStock && !isMaxInCart) {
      addItem(product, 1);
    }
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative hover:-translate-y-1"
    >
      {/* Top Badges */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Origin Badge */}
        {product.isPlatformOwned ? (
          <span className="inline-flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-amber-400/30">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>P-MARKET Flagship</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-emerald-950/80 backdrop-blur-xs text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-emerald-500/30">
            <StoreIcon className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[110px]">{product.sellerStoreName || 'Verified Seller'}</span>
          </span>
        )}

        {/* Discount Badge */}
        {discountPct > 0 && (
          <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
            -{discountPct}%
          </span>
        )}
      </div>

      {/* Image Thumbnail */}
      <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'}
          alt={product.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-rose-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-md tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Category */}
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block mb-1">
            {product.category}
          </span>

          {/* Title */}
          <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
            {product.title}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div>
          {/* Stock & Origin Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              {product.stock <= 5 && !isOutOfStock ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Only {product.stock} left
                </span>
              ) : isOutOfStock ? (
                <span className="text-rose-500">Out of Stock</span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {product.stock} in stock
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">SKU: {product.sku}</span>
          </div>

          {/* Price & Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">
                {formatPHP(product.price)}
              </div>
              {product.originalPrice && (
                <div className="text-xs text-slate-400 line-through">
                  {formatPHP(product.originalPrice)}
                </div>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isMaxInCart}
              className={`p-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                isOutOfStock || isMaxInCart
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : currentInCart > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
              }`}
              title={
                isOutOfStock
                  ? 'Item is out of stock'
                  : isMaxInCart
                  ? 'Maximum stock already added'
                  : 'Add item to shopping cart'
              }
            >
              <ShoppingCart className="w-4 h-4" />
              {currentInCart > 0 && <span className="font-bold">({currentInCart})</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
