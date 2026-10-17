/**
 * P-MARKET PH - Checkout & Payment Gateway Modal
 * Full-featured Philippine checkout supporting GCash, Maya, and Card payments.
 * Connects to server-side payment intents, atomic stock reservation, and test sandbox simulation.
 */

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  Smartphone,
  Lock,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useReferral } from '../context/ReferralContext.tsx';
import { api, formatPHP } from '../services/api.ts';
import { Order, PaymentMethod } from '../types/marketplace.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

const PH_REGIONS = [
  'National Capital Region (NCR)',
  'Region III - Central Luzon',
  'Region IV-A - CALABARZON',
  'Region VII - Central Visayas',
  'Region VI - Western Visayas',
  'Region XI - Davao Region',
  'Region X - Northern Mindanao',
  'Cordillera Administrative Region (CAR)',
  'Other Provincial Regions',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { items, subtotal, estimatedShipping, total, clearCart } = useCart();
  const { user } = useAuth();
  const { referralCode } = useReferral();

  // Multi-step: 'address' -> 'payment' -> 'gateway_prompt' -> 'confirmed'
  const [step, setStep] = useState<'address' | 'payment' | 'gateway_prompt' | 'confirmed'>('address');

  // Address Form State
  const [address, setAddress] = useState({
    fullName: user?.fullName || 'Juan Dela Cruz',
    phoneNumber: user?.phone || '09175558888',
    region: 'National Capital Region (NCR)',
    province: 'Metro Manila',
    city: 'Quezon City',
    barangay: 'Barangay Central',
    streetAddress: 'Unit 4B, Pinecrest Residences, Aurora Blvd',
    postalCode: '1100',
    deliveryNotes: '',
  });

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');

  // Loading & Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Order State once created
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  // Sandbox E-Wallet simulation state
  const [sandboxPhone, setSandboxPhone] = useState(address.phoneNumber || '09175558888');
  const [sandboxOtp, setSandboxOtp] = useState('123456');
  const [isAuthorizingPayment, setIsAuthorizingPayment] = useState(false);

  if (!isOpen) return null;

  // Handle Order Placement & Server-Side Inventory Reservation
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phoneNumber || !address.city || !address.streetAddress) {
      setErrorMessage('Please complete all required shipping fields.');
      return;
    }

    // Phone validation
    const cleanPhone = address.phoneNumber.replace(/[\s-]/g, '');
    if (!/^(09|\+639)\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please provide a valid 11-digit Philippine mobile number (09XXXXXXXXX).');
      return;
    }

    setErrorMessage(null);
    setStep('payment');
  };

  const handleCreateOrderAndOpenGateway = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        shippingAddress: address,
        paymentMethod,
        referralCode: referralCode || undefined,
      };

      const res = await api.createOrder(orderPayload);
      setCreatedOrder(res.order);
      setPaymentIntent(res.paymentIntent);
      setSandboxPhone(address.phoneNumber);

      // Transition to gateway authentication step
      setStep('gateway_prompt');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order. Please review your cart.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Simulated Sandbox Payment
  const handleAuthorizeSandboxPayment = async () => {
    if (!createdOrder) return;
    setIsAuthorizingPayment(true);
    setErrorMessage(null);

    try {
      const res = await api.simulateSandboxPay(
        createdOrder.id,
        sandboxPhone,
        paymentMethod === 'gcash' ? 'gcash' : 'maya'
      );

      if (res.success) {
        clearCart();
        setCreatedOrder(res.order);
        setStep('confirmed');
        onOrderSuccess(res.order);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment authorization failed.');
    } finally {
      setIsAuthorizingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Steps */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span
                className={`px-2.5 py-1 rounded-full ${
                  step === 'address' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                1. Delivery
              </span>
              <span className="text-slate-300">→</span>
              <span
                className={`px-2.5 py-1 rounded-full ${
                  step === 'payment' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                2. Method
              </span>
              <span className="text-slate-300">→</span>
              <span
                className={`px-2.5 py-1 rounded-full ${
                  step === 'gateway_prompt' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                3. Payment
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Delivery Address Form */}
        {step === 'address' && (
          <form onSubmit={handleProceedToPayment} className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">
                Philippine Shipping Destination
              </h3>
              <span className="text-xs text-slate-500">All fields required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (SMS Updates)
                </label>
                <input
                  type="tel"
                  required
                  value={address.phoneNumber}
                  onChange={(e) => setAddress({ ...address, phoneNumber: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="0917-123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Region</label>
                <select
                  value={address.region}
                  onChange={(e) => setAddress({ ...address, region: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PH_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City / Municipality</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Quezon City"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Barangay</label>
                <input
                  type="text"
                  required
                  value={address.barangay}
                  onChange={(e) => setAddress({ ...address, barangay: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Barangay Central"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  required
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g. 1100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Street Address, House/Unit No., Building
              </label>
              <input
                type="text"
                required
                value={address.streetAddress}
                onChange={(e) => setAddress({ ...address, streetAddress: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Unit / Floor, Building Name, Street Name"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Order Total: <strong className="text-slate-900">{formatPHP(total)}</strong>
              </span>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Payment Method Selection */}
        {step === 'payment' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Select Payment Gateway</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Processed via secure BSP-regulated gateway architecture (PayMongo & Maya).
              </p>
            </div>

            {/* Gateway Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* GCash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('gcash')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'gcash'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    G
                  </div>
                  {paymentMethod === 'gcash' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">GCash E-Wallet</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Instant mobile checkout</p>
                </div>
              </button>

              {/* Maya */}
              <button
                type="button"
                onClick={() => setPaymentMethod('maya')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'maya'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                    M
                  </div>
                  {paymentMethod === 'maya' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Maya (PayMaya)</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Wallet & Maya Bank</p>
                </div>
              </button>

              {/* Card */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  paymentMethod === 'card'
                    ? 'border-slate-800 bg-slate-100 ring-2 ring-slate-700/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  {paymentMethod === 'card' && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Credit / Debit Card</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Visa & Mastercard</p>
                </div>
              </button>
            </div>

            {/* Security Guarantee Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <strong className="text-slate-800">Security Architecture:</strong> No PINs, OTPs, or
                wallet passwords are ever stored. Payments are verified server-side via HMAC-signed
                webhooks with idempotency controls and automated commission calculation.
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({items.length} unique items)</span>
                <span className="font-semibold text-slate-900">{formatPHP(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping Fee to {address.city}</span>
                <span className="font-semibold text-slate-900">
                  {estimatedShipping === 0 ? 'FREE (₱2,000+ promo)' : formatPHP(estimatedShipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Amount to Pay</span>
                <span className="text-blue-700">{formatPHP(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('address')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                ← Back to Delivery
              </button>

              <button
                type="button"
                onClick={handleCreateOrderAndOpenGateway}
                disabled={isSubmitting}
                className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reserving Stock & Generating Intent...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to {paymentMethod.toUpperCase()} Gateway</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Interactive Payment Gateway Simulator (GCash & Maya) */}
        {step === 'gateway_prompt' && createdOrder && (
          <div className="p-6 space-y-6">
            {/* Gateway Brand Header */}
            <div
              className={`p-4 rounded-2xl text-white ${
                paymentMethod === 'gcash'
                  ? 'bg-gradient-to-r from-blue-700 to-sky-600'
                  : paymentMethod === 'maya'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-600'
                  : 'bg-gradient-to-r from-slate-900 to-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
                    Official Sandbox Gateway
                  </span>
                  <h3 className="text-lg font-black mt-1">
                    {paymentMethod === 'gcash'
                      ? 'GCash Mobile Checkout'
                      : paymentMethod === 'maya'
                      ? 'Maya Checkout'
                      : 'Card Processing'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs opacity-80 block">Merchant: P-MARKET PH</span>
                  <span className="text-lg font-black">{formatPHP(createdOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Smartphone className="w-4 h-4 text-amber-700" />
                <span>Sandbox Mode (Official Philippine Test Simulation)</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                This triggers the authentic server-side payment execution pipeline: validates amount,
                generates HMAC signature, fires the idempotent settlement webhook, records transaction
                reference <code>{paymentIntent?.referenceNumber}</code>, decrements inventory, and
                calculates seller/agent commissions.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered {paymentMethod.toUpperCase()} Mobile Number
                </label>
                <input
                  type="tel"
                  value={sandboxPhone}
                  onChange={(e) => setSandboxPhone(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0917-123-4567"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  One-Time Password (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={sandboxOtp}
                  onChange={(e) => setSandboxOtp(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono tracking-widest text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456"
                />
                <span className="text-[11px] text-slate-400 mt-1 block text-center">
                  Sandbox test OTP: Any 6 digits (e.g. 123456)
                </span>
              </div>
            </div>

            {/* Authorization Action */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleAuthorizeSandboxPayment}
                disabled={isAuthorizingPayment}
                className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  paymentMethod === 'gcash'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : paymentMethod === 'maya'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {isAuthorizingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with Server & Signing Webhook...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authorize & Pay {formatPHP(createdOrder.totalAmount)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Cancel and Pay Later
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Order Confirmed Receipt */}
        {step === 'confirmed' && createdOrder && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Payment Verified & Received
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                Maraming Salamat! Order Confirmed.
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your order has been recorded in the database and forwarded to sellers for dispatch.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Number:</span>
                <span className="font-bold text-slate-900 font-mono">{createdOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Reference:</span>
                <span className="font-bold text-blue-700 font-mono">
                  {createdOrder.paymentReference || 'GCASH-REF-VERIFIED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Paid:</span>
                <span className="font-extrabold text-slate-900">
                  {formatPHP(createdOrder.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="font-medium text-slate-800 text-right max-w-[200px] truncate">
                  {createdOrder.shippingAddress.streetAddress}, {createdOrder.shippingAddress.city}
                </span>
              </div>
              {createdOrder.referralCode && (
                <div className="flex justify-between pt-1 border-t border-slate-200 text-amber-800">
                  <span>Attributed Agent:</span>
                  <span className="font-bold font-mono">{createdOrder.referralCode}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
