/**
 * P-MARKET PH - Super Admin Master Control Console
 * Multi-vendor catalog review, seller onboarding, dispute resolution, commission rules,
 * disbursement approvals, payment gateway diagnostics, and immutable audit logs.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Store as StoreIcon,
  Package,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  RefreshCw,
  FileText,
  Key,
  Users,
  CreditCard,
} from 'lucide-react';
import { api, formatPHP, formatDate } from '../services/api.ts';
import { Product, Store, Order, CommissionEntry, PayoutRequest, AuditLog, MarketplaceSettings } from '../types/marketplace.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AdminDashboardView: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'sellers' | 'catalog' | 'orders' | 'ledger' | 'payouts' | 'settings' | 'gateways' | 'audit'
  >('overview');

  // Admin Data State
  const [metrics, setMetrics] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CommissionEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<MarketplaceSettings | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Commission Settings Form
  const [settingsForm, setSettingsForm] = useState({
    platformCommissionPct: 5.0,
    agentCommissionPct: 3.0,
    minPayoutAmount: 500,
    sandboxMode: true,
  });
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Payout Process Modal State
  const [processingPayout, setProcessingPayout] = useState<PayoutRequest | null>(null);
  const [disbursementRef, setDisbursementRef] = useState('');
  const [payoutAdminNotes, setPayoutAdminNotes] = useState('');

  // Refund Dispute Modal State
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);
  const [refundNotes, setRefundNotes] = useState('');

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [overviewRes, sellersRes, prodsRes, ordersRes, ledgerRes, payoutsRes, logsRes, gateRes] =
        await Promise.all([
          api.getAdminOverview(),
          api.getAdminSellers(),
          api.getProducts({ type: 'all' }),
          api.getAllOrders(),
          api.getMasterLedger(),
          api.getAllPayouts(),
          api.getAuditLogs(),
          api.getPaymentConfig(),
        ]);

      setMetrics(overviewRes.metrics);
      setSettings(overviewRes.settings);
      setSettingsForm({
        platformCommissionPct: overviewRes.settings.platformCommissionPct,
        agentCommissionPct: overviewRes.settings.agentCommissionPct,
        minPayoutAmount: overviewRes.settings.minPayoutAmount,
        sandboxMode: overviewRes.settings.sandboxMode,
      });
      setSellers(sellersRes.sellers);
      setProducts(prodsRes.products);
      setOrders(ordersRes.orders);
      setLedgerEntries(ledgerRes.entries);
      setPayouts(payoutsRes.payouts);
      setAuditLogs(logsRes.logs);
      setGatewayConfig(gateRes);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Seller Approval Handler
  const handleReviewSeller = async (storeId: string, action: 'approve' | 'reject' | 'suspend' | 'activate') => {
    try {
      await api.reviewSeller(storeId, action);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update seller status.');
    }
  };

  // Product Approval Handler
  const handleReviewProduct = async (productId: string, action: 'approve' | 'reject') => {
    try {
      await api.reviewProduct(productId, action);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to review product.');
    }
  };

  // Commission Settings Save Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateSettings(settingsForm);
      setSettings(res.settings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update commission settings.');
    }
  };

  // Process Payout Disbursement Handler
  const handleCompletePayout = async (action: 'complete' | 'reject') => {
    if (!processingPayout) return;
    try {
      await api.processPayout(
        processingPayout.id,
        action,
        disbursementRef || `DISB-REF-${Date.now()}`,
        payoutAdminNotes
      );
      setProcessingPayout(null);
      setDisbursementRef('');
      setPayoutAdminNotes('');
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to process payout.');
    }
  };

  // Process Refund Dispute Handler
  const handleProcessRefund = async (approve: boolean) => {
    if (!refundingOrder) return;
    try {
      await api.processRefund(refundingOrder.id, approve, refundingOrder.totalAmount, refundNotes);
      setRefundingOrder(null);
      setRefundNotes('');
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to process refund dispute.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Super Admin Executive Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-indigo-900/50 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-lg">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Super Admin Master Console</h2>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-500/40 uppercase tracking-wider">
                Protected Authority
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Complete oversight of P-MARKET PH: seller KYC, product moderation, multi-vendor order fulfillment,
              BSP payment gateways, and commission ledger reconciliation.
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Gross Merchandise Value (GMV)
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatPHP(metrics?.totalGMV || 0)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Across direct retail & marketplace
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Platform Net Revenue (Take Fees)
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {formatPHP(metrics?.platformNetFees || 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Configured 5.0% take rate on seller sales
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Pending Merchant Approvals
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {metrics?.pendingSellerApprovals || 0}
          </div>
          <button
            onClick={() => setActiveTab('sellers')}
            className="text-[11px] text-blue-600 hover:underline font-bold mt-1 block"
          >
            Review applications →
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Payout Disbursements Due
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {metrics?.pendingPayouts || 0}
          </div>
          <button
            onClick={() => setActiveTab('payouts')}
            className="text-[11px] text-blue-600 hover:underline font-bold mt-1 block"
          >
            Disburse with Ref # →
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl shadow-xs overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Overview
        </button>

        <button
          onClick={() => setActiveTab('sellers')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'sellers' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <StoreIcon className="w-3.5 h-3.5" /> Sellers ({sellers.length})
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'catalog' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Catalog Approvals
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'orders' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Orders & Disputes ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'ledger' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> Master Ledger ({ledgerEntries.length})
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'payouts' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Payouts ({payouts.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Commission Rates
        </button>

        <button
          onClick={() => setActiveTab('gateways')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'gateways' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-3.5 h-3.5" /> Gateways & Live Deploy
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">Network Entities</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Registered Sellers:</span>
                  <span className="font-bold text-slate-800">{sellers.length} Merchants</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Growth Agents:</span>
                  <span className="font-bold text-slate-800">{metrics?.totalAgents || 1} Partners</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Shopper Accounts:</span>
                  <span className="font-bold text-slate-800">{metrics?.totalCustomers || 1} Customers</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Total Products in Database:</span>
                  <span className="font-bold text-slate-800">{products.length} Items</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">Commission Engine Settings</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Marketplace Take Fee:</span>
                  <span className="font-bold text-indigo-700">{settings?.platformCommissionPct}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Agent Referral Rate:</span>
                  <span className="font-bold text-amber-700">{settings?.agentCommissionPct}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Min Payout Threshold:</span>
                  <span className="font-bold text-slate-800">{formatPHP(settings?.minPayoutAmount || 500)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Payment Environment:</span>
                  <span className="font-bold text-emerald-700">Official GCash/Maya Sandbox</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">Recent Audit Events</h3>
              <div className="space-y-2 text-xs">
                {auditLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{log.action}</span>
                      <span>{formatDate(log.createdAt).split(',')[0]}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium mt-0.5 line-clamp-1">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SELLER APPLICATIONS & STORES */}
      {activeTab === 'sellers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Merchant Verification & Store Applications</h3>
            <span className="text-xs text-slate-500">DTI/BIR business compliance verification</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Merchant Name & Slug</th>
                  <th className="py-3 px-4">Owner Profile</th>
                  <th className="py-3 px-4">DTI/BIR Permit</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map(({ store, user: sellerUser }) => (
                  <tr key={store.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{store.storeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">/{store.storeSlug}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{sellerUser?.fullName}</div>
                      <div className="text-[10px] text-slate-400">{sellerUser?.email}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                      {store.dtiBirNumber || 'Pending'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">{store.locationCity}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          store.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : store.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {store.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {store.status === 'pending_approval' ? (
                          <>
                            <button
                              onClick={() => handleReviewSeller(store.id, 'approve')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                            >
                              Approve Store
                            </button>
                            <button
                              onClick={() => handleReviewSeller(store.id, 'reject')}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold"
                            >
                              Reject
                            </button>
                          </>
                        ) : store.status === 'approved' ? (
                          <button
                            onClick={() => handleReviewSeller(store.id, 'suspend')}
                            className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold"
                          >
                            Suspend Store
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReviewSeller(store.id, 'activate')}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT CATALOG REVIEW QUEUE */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Product Catalog Queue & Oversight</h3>
            <span className="text-xs text-slate-500">Moderating platform and independent seller listings</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Seller Source</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Catalog Status</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
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

                    <td className="py-3.5 px-4">
                      {prod.isPlatformOwned ? (
                        <span className="text-blue-700 font-bold">P-MARKET Flagship Retail</span>
                      ) : (
                        <span className="text-slate-700">{prod.sellerStoreName}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(prod.price)}</td>

                    <td className="py-3.5 px-4 font-mono">{prod.stock} units</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : prod.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {prod.status === 'pending_approval' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReviewProduct(prod.id, 'approve')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewProduct(prod.id, 'reject')}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ORDERS & DISPUTE CENTER */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Global Orders & Refund Dispute Center</h3>
            <span className="text-xs text-slate-500">Oversee all marketplace transactions</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items / Sellers</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{ord.orderNumber}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(ord.createdAt)}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{ord.customerName}</div>
                      <div className="text-[10px] text-slate-400">{ord.customerPhone}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {ord.items.length} items (
                      {Array.from(new Set(ord.items.map((i) => i.sellerStoreName || 'Flagship'))).join(', ')}
                      )
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(ord.totalAmount)}</td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-blue-700">
                      {ord.paymentReference || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'refund_requested'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : ord.status === 'refunded'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {ord.status === 'refund_requested' ? (
                        <button
                          onClick={() => setRefundingOrder(ord)}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                        >
                          Resolve Refund
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: MASTER FINANCIAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Master Financial Commission Ledger</h3>
            <span className="text-xs text-slate-500">Immutable double-entry audit records</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">Gross Sale</th>
                  <th className="py-3 px-4">Calculated Cut</th>
                  <th className="py-3 px-4">Ledger Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{entry.orderNumber}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{entry.recipientName}</td>
                    <td className="py-3 px-4 text-slate-700">{formatPHP(entry.grossOrderAmount)}</td>
                    <td className="py-3 px-4 font-black text-indigo-700">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: PAYOUT DISBURSEMENTS */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Disbursement Payout Approvals</h3>
            <span className="text-xs text-slate-500">Process seller & agent withdrawals</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Channel & Account</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reference Number</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No payout requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 text-slate-600">{formatDate(p.createdAt)}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.userName}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">{p.userRole}</div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{formatPHP(p.amount)}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 uppercase">{p.method}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.accountNumber} ({p.accountName})
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 font-mono text-[11px] text-blue-700">
                        {p.referenceNumber || 'Pending'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'requested' ? (
                          <button
                            onClick={() => {
                              setProcessingPayout(p);
                              setDisbursementRef(`GCASH-DISB-${Date.now().toString().slice(-6)}`);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            Approve & Disburse
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: COMMISSION RATES & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Marketplace Commission Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust marketplace take rate and referral commission rates. Calculations apply to future paid orders.
            </p>
          </div>

          {settingsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings updated and saved to persistent database!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Platform Marketplace Take Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={settingsForm.platformCommissionPct}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, platformCommissionPct: Number(e.target.value) })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Percentage deducted from third-party merchant sales as marketplace service fee.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Agent Referral Commission (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="25"
                value={settingsForm.agentCommissionPct}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, agentCommissionPct: Number(e.target.value) })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Percentage granted to registered referral agents on eligible referred orders.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minimum Withdrawal Threshold (PHP ₱)
              </label>
              <input
                type="number"
                step="50"
                min="100"
                value={settingsForm.minPayoutAmount}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, minPayoutAmount: Number(e.target.value) })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
            >
              Save Commission Settings
            </button>
          </form>
        </div>
      )}

      {/* TAB 8: GATEWAYS & LIVE DEPLOYMENT */}
      {activeTab === 'gateways' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Payment Gateway Health & Diagnostics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Gateway Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <strong className="text-slate-900 text-sm">Official Philippine Test Sandbox</strong>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Simulates complete GCash and Maya e-wallet prompts with authentic server verification.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Webhook Listener</span>
                <div className="font-mono text-blue-700 font-bold">/api/payments/webhook</div>
                <p className="text-slate-600 text-[11px]">
                  Protected with HMAC-SHA256 signature verification & idempotency cache.
                </p>
              </div>
            </div>

            {/* Production Checklist */}
            <div className="mt-4 p-5 rounded-2xl bg-slate-900 text-white space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-400">
                Live Production Switch Checklist (PayMongo / Maya)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                To switch from Sandbox to Live production transactions with Bangko Sentral ng Pilipinas
                registered merchants, configure these environment variables in your server:
              </p>
              <ul className="text-xs text-slate-300 font-mono space-y-1 pl-4 list-disc">
                <li><code>PAYMENT_GATEWAY_SECRET_KEY=sk_live_...</code> (From PayMongo / Maya dashboard)</li>
                <li><code>PAYMENT_PUBLIC_KEY=pk_live_...</code></li>
                <li><code>PAYMENT_WEBHOOK_SECRET=whsec_...</code> (Configured in gateway webhooks)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">System Audit Trail</h3>
            <span className="text-xs text-slate-500">Last 1,000 security & transaction events</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-500">{formatDate(log.createdAt)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.action}</td>
                    <td className="py-3 px-4 text-indigo-700 uppercase">{log.performedByRole}</td>
                    <td className="py-3 px-4 text-slate-600">{log.targetType}:{log.targetId}</td>
                    <td className="py-3 px-4 text-slate-700 font-sans max-w-sm truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE PAYOUT */}
      {processingPayout && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Disburse Payout</h3>
              <button
                onClick={() => setProcessingPayout(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="font-bold text-slate-900">{processingPayout.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-extrabold text-emerald-700">{formatPHP(processingPayout.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-mono text-slate-800">
                  {processingPayout.method.toUpperCase()} • {processingPayout.accountNumber}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Disbursement Reference Number
                </label>
                <input
                  type="text"
                  required
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  placeholder="e.g. GCASH-REF-884218"
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Audit Notes</label>
                <textarea
                  rows={2}
                  value={payoutAdminNotes}
                  onChange={(e) => setPayoutAdminNotes(e.target.value)}
                  placeholder="e.g. Disbursed via Instapay/GCash Corporate."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCompletePayout('reject')}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => handleCompletePayout('complete')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider"
                >
                  Confirm Disbursement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE REFUND DISPUTE */}
      {refundingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Resolve Refund Request</h3>
              <button
                onClick={() => setRefundingOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1 text-amber-900">
              <p>
                Order: <strong>{refundingOrder.orderNumber}</strong> • Total:{' '}
                <strong>{formatPHP(refundingOrder.totalAmount)}</strong>
              </p>
              <p>
                Customer Reason: <em>"{refundingOrder.refundReason}"</em>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resolution Decision Notes
                </label>
                <textarea
                  rows={2}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Return inspection passed, refunding via GCash."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleProcessRefund(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Deny Refund
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessRefund(true)}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider"
                >
                  Approve Refund & Reverse Commissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
