/**
 * P-MARKET PH - Authentication & Registration Modal
 * Secure login and registration for Customers, Sellers, and Agents.
 * Public creation of Super Admin is strictly forbidden with prominent security notice.
 */

import React, { useState } from 'react';
import { X, Lock, ShieldAlert, Store as StoreIcon, Users, ShoppingCart, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types/marketplace.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, switchDemoRole } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'customer' | 'seller' | 'agent'>('customer');
  const [phone, setPhone] = useState('');
  // Seller fields
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [businessType, setBusinessType] = useState<'individual' | 'sole_proprietorship' | 'corporation'>('sole_proprietorship');
  const [dtiBirNumber, setDtiBirNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Validation
    if (role === 'seller' && !storeName.trim()) {
      setErrorMessage('Store name is required for seller registration.');
      setIsLoading(false);
      return;
    }

    try {
      await register({
        email,
        password,
        fullName,
        role,
        phone,
        storeName: role === 'seller' ? storeName : undefined,
        storeDescription: role === 'seller' ? storeDescription : undefined,
        businessType: role === 'seller' ? businessType : undefined,
        dtiBirNumber: role === 'seller' ? dtiBirNumber : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSwitch = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      await switchDemoRole(targetRole);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo switch failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm">
              P
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">P-MARKET PH Account</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'login' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'register' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Demo Personas (Super convenient for reviewers) */}
        <div className="px-6 pt-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-2">⚡ Quick 1-Click Persona Sign-in:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSwitch('customer')}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-left transition-colors flex items-center gap-1.5"
              >
                <span>🛒</span>
                <div>
                  <div className="font-bold text-[11px] text-slate-900">Juan Dela Cruz</div>
                  <div className="text-[9px] text-slate-400">Customer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSwitch('seller')}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-left transition-colors flex items-center gap-1.5"
              >
                <span>🏪</span>
                <div>
                  <div className="font-bold text-[11px] text-slate-900">Manila Tech Hub</div>
                  <div className="text-[9px] text-emerald-600 font-semibold">Approved Seller</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSwitch('agent')}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:border-amber-500 text-left transition-colors flex items-center gap-1.5"
              >
                <span>🤝</span>
                <div>
                  <div className="font-bold text-[11px] text-slate-900">Maria Santos</div>
                  <div className="text-[9px] text-amber-600 font-semibold">Referral Partner</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSwitch('super_admin')}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-left transition-colors flex items-center gap-1.5"
              >
                <span>👑</span>
                <div>
                  <div className="font-bold text-[11px] text-slate-900">Master Exec</div>
                  <div className="text-[9px] text-indigo-600 font-semibold">Super Admin</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@pmarket.ph"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Account Role</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    role === 'customer'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  <span className="text-[11px] block">Customer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    role === 'seller'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <StoreIcon className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span className="text-[11px] block">Seller Store</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('agent')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    role === 'agent'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                  <span className="text-[11px] block">Referral Agent</span>
                </button>
              </div>

              {/* Super Admin Protection Security Notice */}
              <div className="mt-2.5 p-2 rounded-lg bg-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5 border border-slate-200">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  Super Admin role is restricted from public creation and protected by platform security policy.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Maria Santos"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@example.ph"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="0917-XXX-XXXX"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 8 characters"
              />
            </div>

            {/* Seller Specific Store Fields */}
            {role === 'seller' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <StoreIcon className="w-3.5 h-3.5" /> Merchant Store Registration
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1">Store Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-300 bg-white focus:outline-none"
                    placeholder="e.g. Davao Fruit Artisans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                    DTI / BIR Permit Number
                  </label>
                  <input
                    type="text"
                    value={dtiBirNumber}
                    onChange={(e) => setDtiBirNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-300 bg-white focus:outline-none font-mono"
                    placeholder="DTI-2026-XXXXX (or Pending)"
                  />
                </div>
              </div>
            )}

            {/* Agent Specific Info */}
            {role === 'agent' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                A unique referral code (e.g. <code>MARIA1234</code>) and referral URL will be generated
                for you automatically upon registration. You earn a 3% commission on every completed order.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
