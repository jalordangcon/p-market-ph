/**
 * P-MARKET PH - Platform Footer
 * Philippine multi-vendor marketplace trust badges, payment gateways, and regulatory notices.
 */

import React from 'react';
import { ShieldCheck, Truck, RefreshCw, PhoneCall, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 text-sm mt-16">
      {/* Trust Badges */}
      <div className="bg-slate-950 border-b border-slate-800/80 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">100% Buyer Protection</h4>
              <p className="text-[11px] text-slate-400">Escrow payments & authentic seller guarantees</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Nationwide Logistics</h4>
              <p className="text-[11px] text-slate-400">Metro Manila (1-3 days), Provincial (3-7 days)</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">7-Day Free Returns</h4>
              <p className="text-[11px] text-slate-400">DTI compliant return & refund dispute center</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Partner Commissions</h4>
              <p className="text-[11px] text-slate-400">Transparent referral ledger & verified payouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-base">
                P
              </div>
              <span className="font-extrabold text-base text-white tracking-tight">P-MARKET PH</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The premier Philippine digital marketplace unifying direct platform flagship retail, verified independent merchants, and ethical referral partner networks.
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Bangko Sentral ng Pilipinas (BSP) Regulated Payment Gateways</span>
              </p>
              <p className="text-[11px] text-slate-500">DTI Business Registration: DTI-PH-2026-MARKET</p>
            </div>
          </div>

          {/* Supported Payments */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Accepted Payment Gateways</h5>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <span className="font-semibold text-sky-400">GCash E-Wallet</span>
                <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800">
                  Instant QR / Mobile
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <span className="font-semibold text-emerald-400">Maya (PayMaya)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                  Digital Bank & Wallet
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <span className="font-semibold text-slate-300">Credit / Debit Card</span>
                <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                  Visa / Mastercard
                </span>
              </div>
            </div>
          </div>

          {/* Marketplace Policies */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Marketplace Policies</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <span className="hover:text-white cursor-pointer transition-colors">
                  Seller Code of Conduct & Commission Rates (5%)
                </span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer transition-colors">
                  Referral Agent Attribution & Anti-Fraud Policy
                </span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer transition-colors">
                  Consumer Protection & 7-Day Refund Policy
                </span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer transition-colors">
                  Philippine Data Privacy Act (RA 10173) Compliance
                </span>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Philippine Customer Support</h5>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                <span>Hotline: (02) 8888-PMKT (9am - 6pm PHT)</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Email: support@pmarket.ph
              </p>
              <p className="text-[11px] text-slate-500">
                Hub: Bonifacio Global City (BGC), Taguig, Metro Manila
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 P-MARKET PH. All rights reserved.</p>
          <p className="flex items-center gap-3">
            <span>Server: Express + Persistent Atomic Storage</span>
            <span>•</span>
            <span>Security: SHA-256 HMAC Signatures</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
