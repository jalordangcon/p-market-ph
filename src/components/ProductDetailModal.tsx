/**
 * P-MARKET PH - Product Detail Modal
 * Full product view with photo gallery, seller provenance, inventory limits,
 * Philippine shipping estimates, and agent quick-share referral link generator.
 */

import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  ShieldCheck,
  Store as StoreIcon,
  Truck,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Product } from '../types/marketplace.ts';
import { formatPHP } from '../services/api.ts';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useReferral } from '../context/ReferralContext.tsx';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addItem, items, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const { referralCode } = useReferral();
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!product) return null;

  const cartItem = items.find((i) => i.product.id === product.id);
  const currentInCart = cartItem?.quantity || 0;
  const remainingStock = Math.max(0, product.stock - currentInCart);
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (qty > 0 && qty <= remainingStock) {
      addItem(product, qty);
      setIsCartOpen(true);
      onClose();
    }
  };

  const handleCopyAgentLink = () => {
    const code = user?.referralCode || referralCode || 'MARIA2026';
    const shareUrl = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            {product.isPlatformOwned ? (
              <span className="inline-flex items-center gap-1.5 bg-slate-900 text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                P-MARKET Official Flagship Retail
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
                <StoreIcon className="w-3.5 h-3.5 text-emerald-700" />
                Sold by Verified Seller: {product.sellerStoreName}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Gallery */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 mb-3 shadow-inner">
              <img
                src={product.images[selectedImgIdx] || product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImgIdx(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImgIdx === idx ? 'border-blue-600 scale-105' : 'border-slate-200 opacity-70'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Delivery Estimates */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Philippine Nationwide Logistics</span>
              </div>
              <p className="text-slate-600 pl-6">
                • <strong>Metro Manila:</strong> 1 - 3 business days via J&T / Lalamove
              </p>
              <p className="text-slate-600 pl-6">
                • <strong>Provincial (Luzon, Visayas, Mindanao):</strong> 3 - 7 business days
              </p>
              <p className="text-emerald-700 font-semibold pl-6">
                ✓ Free shipping nationwide on orders ₱2,000+
              </p>
            </div>
          </div>

          {/* Right: Details & Buying */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {product.category}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1 leading-snug">
                {product.title}
              </h2>

              <div className="flex items-center gap-3 mt-3">
                <span className="text-2xl font-black text-slate-900">
                  {formatPHP(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-slate-400 line-through">
                    {formatPHP(product.originalPrice)}
                  </span>
                )}
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Philippine Pesos (PHP)
                </span>
              </div>

              {/* Stock status */}
              <div className="mt-4 flex items-center gap-2 text-xs">
                {product.stock <= 5 && !isOutOfStock ? (
                  <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Low Stock: Only {product.stock} units available
                  </span>
                ) : isOutOfStock ? (
                  <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                    Currently Out of Stock
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {product.stock} units ready to ship
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Overview
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Agent Referral Promotion Banner */}
              {(user?.role === 'agent' || referralCode) && (
                <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-amber-700" />
                      Earn 3% Agent Commission on this product
                    </span>
                    <button
                      onClick={handleCopyAgentLink}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copied!' : 'Copy Referral Link'}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Promote this item with code <strong>{user?.referralCode || referralCode}</strong>. Commissions are tracked automatically in your Agent Ledger upon payment.
                  </p>
                </div>
              )}
            </div>

            {/* Buying & Quantity */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Quantity</span>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1 || isOutOfStock}
                    className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition-colors font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-bold text-slate-900 font-mono">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(remainingStock, q + 1))}
                    disabled={qty >= remainingStock || isOutOfStock}
                    className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition-colors font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || remainingStock <= 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {isOutOfStock
                  ? 'Out of Stock'
                  : remainingStock <= 0
                  ? 'Maximum In Cart'
                  : `Add to Cart • ${formatPHP(product.price * qty)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
