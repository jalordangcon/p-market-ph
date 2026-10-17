/**
 * P-MARKET PH - Referral Agent Dashboard
 * Referral code & link generator, conversion tracking, multi-state commission ledger,
 * payout withdrawals, and ethical anti-fraud compliance rules.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Share2,
  RefreshCw,
  X,
  CreditCard,
} from 'lucide-react';
import { api, formatPHP, formatDate } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { CommissionEntry, PayoutRequest } from '../types/marketplace.ts';

export const AgentDashboardView: React.FC = () => {
  const { user } = useAuth();

  const [agentData, setAgentData] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<CommissionEntry[]>([]);
  const [summary, setSummary] = useState<any>({
    pending: 0,
    approved: 0,
    payableBalance: 0,
    paid: 0,
    reversed: 0,
  });
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Payout Request Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    method: 'gcash' as 'gcash' | 'maya' | 'bank_transfer',
    accountName: user?.fullName || 'Maria Santos',
    accountNumber: user?.phone || '09195551234',
    bankName: 'BDO Unibank',
  });
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const referralCode = user?.referralCode || 'MARIA2026';
  const referralUrl = `${window.location.origin}?ref=${referralCode}`;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewRes, commRes, payoutsRes] = await Promise.all([
        api.getAgentOverview(),
        api.getAgentCommissions(),
        api.getMyPayouts(),
      ]);
      setAgentData(overviewRes);
      setLedgerEntries(commRes.entries);
      setSummary(commRes.summary);
      setPayouts(payoutsRes.payouts);
    } catch (err) {
      console.error('Failed to load agent metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPayout(true);
    setPayoutError(null);

    const amt = Number(payoutForm.amount);
    if (amt > summary.payableBalance) {
      setPayoutError(`Amount cannot exceed payable balance of ${formatPHP(summary.payableBalance)}.`);
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
      {/* Agent Banner & Referral URL Generator */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-amber-900/40 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
              🤝 Verified Growth Partner
            </span>
            <span className="text-xs text-slate-400">3% Commission on All Referred Orders</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{user?.fullName || 'Maria Santos'}</h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Share your unique Philippine referral link on Facebook, TikTok, Viber, or Telegram. Every
            eligible purchase earns automatic commissions into your immutable financial ledger.
          </p>
        </div>

        {/* Referral Link Copy Box */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-700/80 w-full sm:w-auto min-w-[280px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Your Unique Referral Code
          </span>
          <div className="text-xl font-black text-amber-400 font-mono tracking-wider mb-2">
            {referralCode}
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Referral URL'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Payable / Approved */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Payable Commissions
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatPHP(summary.payableBalance)}
          </div>
          <div className="mt-2">
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              disabled={summary.payableBalance < 500}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold transition-colors"
            >
              Withdraw to GCash / Maya
            </button>
          </div>
        </div>

        {/* Pending */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Pending Commissions
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatPHP(summary.pending)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Awaiting order fulfillment and return hold
          </span>
        </div>

        {/* Paid to Date */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Paid Out
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {formatPHP(summary.paid)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Successfully disbursed to wallet</span>
        </div>

        {/* Reversed / Adjustments */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Reversed Adjustments
          </span>
          <div className="text-2xl font-black text-slate-400 mt-1">
            {formatPHP(summary.reversed)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cancelled or fully refunded orders
          </span>
        </div>
      </div>

      {/* Ethical Rules Callout */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-extrabold">P-MARKET PH Ethical Referral Policy:</strong>
          <p className="leading-relaxed">
            Commissions are awarded exclusively on verified, paid, non-refunded purchases. Agents
            cannot earn commission on self-referrals (buying with your own code). We strictly forbid
            pyramid multi-level recruitment schemes—commissions stem only from actual commerce.
          </p>
        </div>
      </div>

      {/* Commission Ledger Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Immutable Commission Ledger</h3>
            <p className="text-xs text-slate-500">
              Audit-ready record of every attributed conversion and settlement state.
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Transaction Details</th>
                <th className="py-3 px-4">Gross Sale</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Commission</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No commission entries recorded yet. Share your referral link to earn commissions!
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{entry.orderNumber}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">{entry.notes}</td>
                    <td className="py-3 px-4 text-slate-700">{formatPHP(entry.grossOrderAmount)}</td>
                    <td className="py-3 px-4 text-slate-500">{entry.commissionRatePct}%</td>
                    <td className="py-3 px-4 font-extrabold text-emerald-600">
                      {formatPHP(entry.calculatedAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
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
      </div>

      {/* Payout Withdrawal History */}
      <div className="space-y-3 pt-4">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
          Withdrawal Requests & Disbursement Records
        </h3>
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Disbursement Channel</th>
                <th className="py-3 px-4">Account Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Admin Reference Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No withdrawal requests submitted yet.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 text-slate-600">{formatDate(p.createdAt)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatPHP(p.amount)}</td>
                    <td className="py-3 px-4 text-slate-800 uppercase font-semibold">{p.method}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{p.accountNumber}</td>
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
                    <td className="py-3 px-4 font-mono text-blue-700">
                      {p.referenceNumber || 'Pending Disbursement'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: WITHDRAW COMMISSIONS */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Withdraw Agent Commissions</h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              Payable Balance: <strong>{formatPHP(summary.payableBalance)}</strong>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Receive via</label>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder Name</label>
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
                  GCash / Maya Mobile Number (09XXXXXXXXX)
                </label>
                <input
                  type="text"
                  required
                  value={payoutForm.accountNumber}
                  onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 font-mono"
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider"
                >
                  {isSubmittingPayout ? 'Submitting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
