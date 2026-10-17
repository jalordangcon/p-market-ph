/**
 * P-MARKET PH - Customer Orders & Delivery Tracking View
 * Visual shipment progress timeline, itemized receipts, and return/cancellation requests.
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { Order } from '../types/marketplace.ts';
import { api, formatPHP, formatDate } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const CustomerOrdersView: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyOrders();
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForRefund) return;
    setIsSubmittingRefund(true);
    try {
      await api.requestRefund(selectedOrderForRefund.id, refundReason);
      setSelectedOrderForRefund(null);
      setRefundReason('');
      await loadOrders();
    } catch (err: any) {
      alert(err.message || 'Refund request failed.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'paid':
      case 'processing':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Processing</span>;
      case 'shipped':
        return <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Shipped / In Transit</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Delivered</span>;
      case 'cancelled':
        return <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Cancelled</span>;
      case 'refund_requested':
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Refund Requested</span>;
      case 'refunded':
        return <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Refunded</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Pending Payment</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Order History & Tracking</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track real-time shipment status across P-MARKET Flagship and independent merchant dispatches.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse h-48" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Orders Yet</h3>
          <p className="text-xs text-slate-500">
            You haven't placed any orders yet. Visit the storefront to discover authentic Philippine products!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isDelivered = order.status === 'delivered';
            const isShipped = order.status === 'shipped' || isDelivered;
            const isPaid = order.paymentStatus === 'paid';
            const canCancelOrRefund = order.status !== 'cancelled' && order.status !== 'refunded';

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Order Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-mono text-[10px]">ORDER ID</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">DATE PLACED</span>
                    <span className="font-medium text-slate-700">{formatDate(order.createdAt)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL AMOUNT</span>
                    <span className="font-extrabold text-blue-700 text-sm">
                      {formatPHP(order.totalAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">STATUS</span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Tracking Progress Timeline */}
                <div className="p-6 border-b border-slate-100 bg-white">
                  <div className="max-w-xl mx-auto">
                    <div className="flex items-center justify-between relative text-xs">
                      {/* Line background */}
                      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-0" />
                      <div
                        className={`absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-0 transition-all ${
                          isDelivered ? 'right-6' : isShipped ? 'right-1/3' : isPaid ? 'right-2/3' : 'right-full'
                        }`}
                      />

                      {/* Step 1: Placed & Paid */}
                      <div className="flex flex-col items-center bg-white px-2 z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isPaid ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          ✓
                        </div>
                        <span className="font-bold text-[11px] text-slate-800 mt-1">Paid</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {order.paymentMethod}
                        </span>
                      </div>

                      {/* Step 2: Processing */}
                      <div className="flex flex-col items-center bg-white px-2 z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isPaid ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-[11px] text-slate-800 mt-1">Packed</span>
                        <span className="text-[10px] text-slate-400">Warehouse</span>
                      </div>

                      {/* Step 3: Shipped */}
                      <div className="flex flex-col items-center bg-white px-2 z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isShipped ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Truck className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-[11px] text-slate-800 mt-1">Shipped</span>
                        <span className="text-[10px] text-slate-400">In Transit</span>
                      </div>

                      {/* Step 4: Delivered */}
                      <div className="flex flex-col items-center bg-white px-2 z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isDelivered ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-[11px] text-slate-800 mt-1">Delivered</span>
                        <span className="text-[10px] text-slate-400">Received</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List & Details */}
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-14 h-14 rounded-xl object-cover bg-white border border-slate-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 leading-snug">{item.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {item.isPlatformOwned ? (
                                <span className="text-blue-600 font-semibold">P-MARKET Flagship Retail</span>
                              ) : (
                                <span>Seller: {item.sellerStoreName}</span>
                              )}
                            </p>
                            {item.trackingNumber && (
                              <p className="text-[10px] text-purple-700 font-mono mt-0.5">
                                Courier: {item.courierName || 'J&T Express'} • Tracking: {item.trackingNumber}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900">{formatPHP(item.subtotal)}</span>
                          <span className="block text-[10px] text-slate-400">Qty: {item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Details & Actions */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="space-y-0.5">
                      <p>
                        Payment Channel:{' '}
                        <strong className="text-slate-800 uppercase">{order.paymentMethod}</strong>
                      </p>
                      {order.paymentReference && (
                        <p className="font-mono text-[11px] text-blue-700">
                          Ref: {order.paymentReference}
                        </p>
                      )}
                    </div>

                    {canCancelOrRefund && (
                      <button
                        onClick={() => setSelectedOrderForRefund(order)}
                        className="px-4 py-2 rounded-xl border border-slate-300 hover:border-rose-400 hover:text-rose-600 text-slate-700 font-bold transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {order.status === 'delivered' ? 'Request Return & Refund' : 'Cancel Order'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return & Refund Request Modal */}
      {selectedOrderForRefund && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">
                {selectedOrderForRefund.status === 'delivered' ? 'Request Return & Refund' : 'Cancel Order'}
              </h3>
              <button
                onClick={() => setSelectedOrderForRefund(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Order <strong>{selectedOrderForRefund.orderNumber}</strong> • Total:{' '}
              <strong>{formatPHP(selectedOrderForRefund.totalAmount)}</strong>
            </p>

            <form onSubmit={handleRequestRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Cancellation or Refund
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Received incorrect size, damaged package, or changed mind before shipment."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForRefund(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider"
                >
                  {isSubmittingRefund ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
