/**
 * P-MARKET PH - Shopping Cart Drawer
 * Manages item list, quantity controls, referral code application, subtotal, and checkout entry.
 */

import React, { useState } from 'react';
import {
  X,
  Trash2,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Tag,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useReferral } from '../context/ReferralContext.tsx';
import { formatPHP } from '../services/api.ts';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const { items, itemCount, subtotal, estimatedShipping, total, isCartOpen, setIsCartOpen, updateQuantity, removeItem } =
    useCart();
  const { referralCode, agentName, applyReferralCode, clearReferral } = useReferral();
  const [manualCode, setManualCode] = useState('');
  const [codeFeedback, setCodeFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  if (!isCartOpen) return null;

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setIsValidating(true);
    setCodeFeedback(null);
    const success = await applyReferralCode(manualCode);
    setIsValidating(false);
    if (success) {
      setCodeFeedback({ type: 'success', msg: `Agent referral code "${manualCode.toUpperCase()}" applied!` });
      setManualCode('');
    } else {
      setCodeFeedback({ type: 'error', msg: 'Invalid or expired referral code.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Shopping Cart</h3>
              <p className="text-xs text-slate-500">{itemCount} items selected</p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-700 text-base">Your cart is currently empty</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Explore our Cordillera coffee, Manila tech gadgets, and Cebu artisan goods.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-3.5 p-3 rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                <img
                  src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'}
                  alt={product.title}
                  className="w-18 h-18 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                        {product.title}
                      </h4>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {product.isPlatformOwned ? (
                        <span className="text-blue-600 font-semibold">P-MARKET Flagship</span>
                      ) : (
                        <span>Seller: {product.sellerStoreName}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="font-extrabold text-xs text-slate-900">
                      {formatPHP(product.price * quantity)}
                    </span>

                    {/* Stepper */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-mono font-bold text-slate-900">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= product.stock}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Referral & Summary */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
            {/* Referral Code Application */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              {referralCode ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Agent Partner:</span>
                    <strong className="text-amber-800">{referralCode}</strong>
                    {agentName && <span className="text-slate-500">({agentName})</span>}
                  </div>
                  <button
                    onClick={clearReferral}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCode} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Agent Referral Code (e.g. MARIA2026)"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isValidating}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {isValidating ? '...' : 'Apply'}
                    </button>
                  </div>
                  {codeFeedback && (
                    <p
                      className={`text-[11px] flex items-center gap-1 ${
                        codeFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {codeFeedback.type === 'success' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {codeFeedback.msg}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-semibold text-slate-900">{formatPHP(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Nationwide Shipping</span>
                <span className="font-semibold text-slate-900">
                  {estimatedShipping === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE (Orders ₱2,000+)</span>
                  ) : (
                    formatPHP(estimatedShipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Estimated Total</span>
                <span className="text-blue-700">{formatPHP(total)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => {
                setIsCartOpen(false);
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
