/**
 * P-MARKET PH - Independent Seller Store Dashboard
 * Catalog management, product approval submissions, fulfillment tracking, and net earnings ledger.
 * Strictly scoped: NEVER exposes other merchants' private data.
 */

import React, { useState, useEffect } from 'react';
import {
  Store as StoreIcon,
  Plus,
  Package,
  Truck,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
  Upload,
  X,
} from 'lucide-react';
import { Product, Order, CommissionEntry, PayoutRequest } from '../types/marketplace.ts';
import { api, formatPHP, formatDate } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

const CATEGORIES = [
  'Electronics & Gadgets',
  'Philippine Artisanal & Food',
  'Home & Living',
  'Fashion & Apparel',
];

export const SellerDashboardView: React.FC = () => {
  const { user, store } = useAuth();

  const [activeTab, setActiveTab] = useState<'products' | 'fulfillment' | 'financials'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CommissionEntry[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>({
    pending: 0,
    approved: 0,
    availableBalance: 0,
    paid: 0,
  });
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Product Modal State
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [newProd, setNewProd] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    stock: '',
    category: CATEGORIES[0],
    imageUrl: '',
    tags: '',
  });
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productFeedback, setProductFeedback] = useState<string | null>(null);

  // Fulfillment Modal State
  const [fulfillmentTarget, setFulfillmentTarget] = useState<{
    orderId: string;
    itemId?: string;
  } | null>(null);
  const [courierName, setCourierName] = useState('J&T Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);

  // Payout Request Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    method: 'gcash' as 'gcash' | 'maya' | 'bank_transfer',
    accountName: user?.fullName || '',
    accountNumber: user?.phone || '',
    bankName: 'BDO Unibank',
  });
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, ordersRes, commRes, payoutsRes] = await Promise.all([
        api.getSellerProducts(),
        api.getSellerOrders(),
        api.getSellerCommissions(),
        api.getMyPayouts(),
      ]);
      setProducts(prodsRes.products);
      setOrders(ordersRes.orders);
      setLedgerEntries(commRes.entries);
      setFinancialSummary(commRes.summary);
      setPayouts(payoutsRes.payouts);
    } catch (err) {
      console.error('Failed to load seller data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create Product Handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProduct(true);
    setProductFeedback(null);

    try {
      await api.createProduct({
        title: newProd.title,
        description: newProd.description,
        price: Number(newProd.price),
        originalPrice: newProd.originalPrice ? Number(newProd.originalPrice) : undefined,
        stock: Number(newProd.stock),
        category: newProd.category,
        images: newProd.imageUrl ? [newProd.imageUrl] : [
          'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
        ],
        tags: newProd.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      setProductFeedback('Product submitted successfully for Super Admin catalog approval!');
      setIsNewProductOpen(false);
      setNewProd({
        title: '',
        description: '',
        price: '',
        originalPrice: '',
        stock: '',
        category: CATEGORIES[0],
        imageUrl: '',
        tags: '',
      });
      await loadData();
    } catch (err: any) {
      setProductFeedback(err.message || 'Failed to submit product.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Update Shipment Tracking Handler
  const handleUpdateShipping = async (status: 'shipped' | 'delivered') => {
    if (!fulfillmentTarget) return;
    setIsUpdatingShipping(true);
    try {
      await api.updateOrderStatus(fulfillmentTarget.orderId, {
        status,
        courierName,
        trackingNumber: trackingNumber || `PH-${Date.now().toString().slice(-8)}`,
        itemId: fulfillmentTarget.itemId,
      });
      setFulfillmentTarget(null);
      setTrackingNumber('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update shipment status.');
    } finally {
      setIsUpdatingShipping(false);
    }
  };

  // Submit Payout Request Handler
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPayout(true);
    setPayoutError(null);

    const amt = Number(payoutForm.amount);
    if (amt > financialSummary.availableBalance) {
      setPayoutError(`Amount cannot exceed available balance of ${formatPHP(financialSummary.availableBalance)}.`);
      setIsSubmittingPayout(false);
      return;
    }

    try {
      await api.requestPayout({
        amount: amt,
        method: payoutForm.method,
        accountName: payoutForm.accountName,
        accountNumber: payoutForm.accountNumber,
        bankName: payoutForm.method === 'bank_transfer' ? payoutForm.bankName : undefined,
      });
      setIsPayoutModalOpen(false);
      setPayoutForm({ ...payoutForm, amount: '' });
      await loadData();
    } catch (err: any) {
      setPayoutError(err.message || 'Payout request failed.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Store Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-emerald-900/40 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-2xl text-white shadow-lg">
            <StoreIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {store?.storeName || 'Manila Tech Hub'}
              </h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  store?.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {store?.status === 'approved' ? '✓ Verified Merchant' : '⏳ Pending Approval'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-lg">
              {store?.description || 'Independent Philippine Merchant on P-MARKET PH'}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
              <span>📍 {store?.locationCity || 'Quezon City, Metro Manila'}</span>
              <span>•</span>
              <span>DTI/BIR: {store?.dtiBirNumber || 'DTI-NCR-2024-984210'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Storefront
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Net Earnings (Available)
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatPHP(financialSummary.availableBalance)}
          </div>
          <div className="mt-2">
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              disabled={financialSummary.availableBalance < 500}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold transition-colors"
            >
              Request Payout (Min ₱500)
            </button>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Pending Sales (In Transit)
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatPHP(financialSummary.pending)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Moves to available upon delivery
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Orders to Fulfill
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {orders.filter((o) => o.status === 'paid' || o.status === 'processing').length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Requires dispatch & courier tracking</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Active Catalog Items
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {products.filter((p) => p.status === 'approved').length} live on marketplace
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'products' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" /> Products Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('fulfillment')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'fulfillment' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" /> Fulfillment & Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'financials' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Earnings & Payout Ledger
        </button>
      </div>

      {/* TAB 1: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">My Product Catalog</h3>
            <button
              onClick={() => setIsNewProductOpen(true)}
              className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Submit New Product
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price (PHP)</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No products submitted yet. Click "Submit New Product" to begin selling!
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.images[0]}
                            alt={prod.title}
                            className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 max-w-xs truncate">{prod.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">{prod.category}</td>

                      <td className="py-3 px-4 font-bold text-slate-900">{formatPHP(prod.price)}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-bold ${
                            prod.stock <= 5 ? 'text-amber-600' : 'text-slate-800'
                          }`}
                        >
                          {prod.stock} units
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {prod.status === 'approved' ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✓ Live (Approved)
                          </span>
                        ) : prod.status === 'pending_approval' ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ⏳ Pending Admin Review
                          </span>
                        ) : prod.status === 'rejected' ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✕ Rejected
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            const newStock = prompt(`Update inventory count for ${prod.title}:`, String(prod.stock));
                            if (newStock !== null && !isNaN(Number(newStock))) {
                              api.updateProduct(prod.id, { stock: Number(newStock) }).then(loadData);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-[11px] font-bold hover:bg-slate-100 text-slate-700"
                        >
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER FULFILLMENT */}
      {activeTab === 'fulfillment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Authorized Orders for My Products</h3>
            <span className="text-xs text-slate-500">
              Protected: Scoped exclusively to items from your store.
            </span>
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400">
                No orders have been placed for your store items yet.
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">ORDER NUMBER</span>
                      <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">CUSTOMER</span>
                      <span className="font-medium text-slate-800">{ord.customerName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">DESTINATION</span>
                      <span className="font-medium text-slate-800">
                        {ord.shippingAddress.city}, {ord.shippingAddress.region}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">MY ITEMS VALUE</span>
                      <span className="font-extrabold text-emerald-700">
                        {formatPHP(ord.sellerSpecificSubtotal || ord.subtotal)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {ord.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-xs p-3 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-12 h-12 rounded-xl object-cover bg-white border border-slate-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900">{item.title}</h4>
                            <p className="text-[10px] text-slate-500">
                              Qty: {item.quantity} • Subtotal: {formatPHP(item.subtotal)}
                            </p>
                            {item.trackingNumber && (
                              <p className="text-[10px] text-purple-700 font-mono">
                                {item.courierName} • Ref: {item.trackingNumber}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.fulfillmentStatus === 'delivered' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ✓ Delivered
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                setFulfillmentTarget({ orderId: ord.id, itemId: item.id })
                              }
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Update Tracking</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIALS & LEDGER */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Seller Net Earnings & Ledger</h3>
              <p className="text-xs text-slate-500">
                Transparent breakdown of gross sales, 5% platform marketplace fee, and net payouts.
              </p>
            </div>
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              disabled={financialSummary.availableBalance < 500}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-xs font-bold shadow-sm"
            >
              Withdraw to GCash / Maya
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Gross Sale</th>
                  <th className="py-3 px-4">Take Rate</th>
                  <th className="py-3 px-4">My Net Accrual</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No ledger records yet.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{entry.orderNumber}</td>
                      <td className="py-3 px-4 text-slate-700">{formatPHP(entry.grossOrderAmount)}</td>
                      <td className="py-3 px-4 text-slate-500">5% Platform Fee</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {formatPHP(entry.calculatedAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            entry.status === 'approved' || entry.status === 'payable'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.status === 'paid'
                              ? 'bg-blue-100 text-blue-800'
                              : entry.status === 'reversed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payout History */}
          <div className="pt-4 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Disbursement Requests History
            </h4>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Requested At</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method & Account</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Disbursement Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No payouts requested yet.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4 text-slate-600">{formatDate(p.createdAt)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{formatPHP(p.amount)}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {p.method.toUpperCase()} • {p.accountNumber} ({p.accountName})
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-blue-700">
                          {p.referenceNumber || 'Pending Admin Disbursement'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT NEW PRODUCT */}
      {isNewProductOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Submit Product to Catalog</h3>
              <button
                onClick={() => setIsNewProductOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={newProd.title}
                  onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                  placeholder="e.g. Ergonomic Bluetooth Vertical Mouse"
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₱ PHP)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                    placeholder="1250"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Units</label>
                  <input
                    type="number"
                    required
                    value={newProd.stock}
                    onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                    placeholder="50"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newProd.category}
                  onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={newProd.imageUrl}
                  onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  placeholder="Describe features, warranty, materials, and specifications..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProductOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider"
                >
                  {isSubmittingProduct ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE SHIPMENT TRACKING */}
      {fulfillmentTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base">Update Shipment Status</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Courier Service</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="J&T Express">J&T Express Philippines</option>
                  <option value="Lalamove">Lalamove Same-Day</option>
                  <option value="Ninja Van">Ninja Van PH</option>
                  <option value="Flash Express">Flash Express</option>
                  <option value="Gogo Xpress">Gogo Xpress</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Waybill / Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. JT998241284PH"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => handleUpdateShipping('shipped')}
                  disabled={isUpdatingShipping}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Mark as Shipped (In Transit)
                </button>

                <button
                  onClick={() => handleUpdateShipping('delivered')}
                  disabled={isUpdatingShipping}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Mark as Successfully Delivered
                </button>

                <button
                  onClick={() => setFulfillmentTarget(null)}
                  className="w-full py-1 text-xs text-slate-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST PAYOUT */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Request Seller Payout</h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              Available Balance: <strong>{formatPHP(financialSummary.availableBalance)}</strong>
            </div>

            {payoutError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {payoutError}
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Withdrawal Amount (Min ₱500)
                </label>
                <input
                  type="number"
                  required
                  min={500}
                  step="0.01"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                  placeholder="500.00"
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payout Channel</label>
                <select
                  value={payoutForm.method}
                  onChange={(e: any) => setPayoutForm({ ...payoutForm, method: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="gcash">GCash E-Wallet</option>
                  <option value="maya">Maya E-Wallet</option>
                  <option value="bank_transfer">Philippine Bank Transfer</option>
                </select>
              </div>

              {payoutForm.method === 'bank_transfer' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                  <select
                    value={payoutForm.bankName}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="BDO Unibank">BDO Unibank</option>
                    <option value="BPI (Bank of the Philippine Islands)">BPI</option>
                    <option value="UnionBank of the Philippines">UnionBank</option>
                    <option value="Metrobank">Metrobank</option>
                    <option value="Security Bank">Security Bank</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  value={payoutForm.accountName}
                  onChange={(e) => setPayoutForm({ ...payoutForm, accountName: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number / Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={payoutForm.accountNumber}
                  onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 font-mono"
                  placeholder="0917-XXX-XXXX or 0012-XXXX-XXXX"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider"
                >
                  {isSubmittingPayout ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
