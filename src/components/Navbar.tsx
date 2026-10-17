/**
 * P-MARKET PH - Header Navigation Bar
 * High-visibility brand banner, instant demo role switcher, search, cart, and account dropdown.
 */

import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  User as UserIcon,
  LogOut,
  Shield,
  Store as StoreIcon,
  Users,
  Package,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useReferral } from '../context/ReferralContext.tsx';
import { UserRole } from '../types/marketplace.ts';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openAuthModal: () => void;
  openProductDetail?: (product: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
  openAuthModal,
}) => {
  const { user, store, logout, switchDemoRole, isLoading } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const { referralCode, agentName } = useReferral();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleRoleSwitch = async (role: UserRole) => {
    setIsRoleMenuOpen(false);
    await switchDemoRole(role);
    // Switch to corresponding primary view
    if (role === 'super_admin') setCurrentTab('admin');
    else if (role === 'seller') setCurrentTab('seller');
    else if (role === 'agent') setCurrentTab('agent');
    else setCurrentTab('storefront');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
      {/* Top Banner: Quick Demo Role Switcher & Active Referral Notice */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Referral attribution indicator if active */}
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded font-medium border border-blue-700/50">
              🇵🇭 Philippine Marketplace
            </span>
            {referralCode && (
              <span className="bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded font-medium border border-amber-700/50 flex items-center gap-1">
                <span>🤝 Partner Ref:</span>
                <strong>{referralCode}</strong>
                {agentName && <span className="text-amber-200">({agentName})</span>}
              </span>
            )}
          </div>

          {/* Quick Demo Switcher Bar */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1 hidden sm:inline">Demo Persona:</span>
            <div className="inline-flex rounded-md shadow-xs bg-slate-900 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => handleRoleSwitch('customer')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  user?.role === 'customer'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Switch to Customer: Juan Dela Cruz"
              >
                <span>🛒</span> Customer
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('seller')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  user?.role === 'seller'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Switch to Seller: Manila Tech Hub"
              >
                <span>🏪</span> Seller
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('agent')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  user?.role === 'agent'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Switch to Referral Agent: Maria Santos"
              >
                <span>🤝</span> Agent
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('super_admin')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  user?.role === 'super_admin'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Switch to Super Admin: Master Exec"
              >
                <span>👑</span> Super Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentTab('storefront')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-900/40 text-white font-extrabold text-xl group-hover:scale-105 transition-transform">
                P
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                    P-MARKET
                  </span>
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                    PH
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Flagship Retail & Multi-Vendor
                </p>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setCurrentTab('storefront')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  currentTab === 'storefront'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                Storefront
              </button>

              {user?.role === 'customer' && (
                <button
                  onClick={() => setCurrentTab('my-orders')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    currentTab === 'my-orders'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-400" />
                  My Orders
                </button>
              )}

              {user?.role === 'seller' && (
                <button
                  onClick={() => setCurrentTab('seller')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    currentTab === 'seller'
                      ? 'bg-slate-800 text-emerald-400 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <StoreIcon className="w-4 h-4 text-emerald-400" />
                  Seller Dashboard
                </button>
              )}

              {user?.role === 'agent' && (
                <button
                  onClick={() => setCurrentTab('agent')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    currentTab === 'agent'
                      ? 'bg-slate-800 text-amber-400 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  Agent Partner Hub
                </button>
              )}

              {user?.role === 'super_admin' && (
                <button
                  onClick={() => setCurrentTab('admin')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin'
                      ? 'bg-slate-800 text-indigo-400 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Super Admin
                </button>
              )}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search coffee, mechanical keyboards, chargers, banig bags..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (currentTab !== 'storefront') setCurrentTab('storefront');
                }}
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-sm rounded-xl pl-9 pr-4 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Actions: Cart, User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="View shopping cart"
            >
              <ShoppingCart className="w-5 h-5 text-slate-200" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-slate-900 shadow-sm animate-pulse">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Profile / Account Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white uppercase">
                    {user.fullName.slice(0, 1)}
                  </div>
                  <div className="hidden lg:block text-left text-xs">
                    <div className="font-semibold truncate max-w-[120px]">{user.fullName}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-semibold text-white truncate">{user.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                          Role: {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setCurrentTab('storefront');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Marketplace Home
                      </button>

                      <button
                        onClick={() => {
                          setCurrentTab('my-orders');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Package className="w-3.5 h-3.5" /> Order History & Tracking
                      </button>

                      {user.role === 'seller' && (
                        <button
                          onClick={() => {
                            setCurrentTab('seller');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-emerald-400 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <StoreIcon className="w-3.5 h-3.5" /> Manage Store & Inventory
                        </button>
                      )}

                      {user.role === 'agent' && (
                        <button
                          onClick={() => {
                            setCurrentTab('agent');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-amber-400 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Users className="w-3.5 h-3.5" /> Referral Links & Commissions
                        </button>
                      )}

                      {user.role === 'super_admin' && (
                        <button
                          onClick={() => {
                            setCurrentTab('admin');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-indigo-400 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Shield className="w-3.5 h-3.5" /> Master Super Admin Console
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-800 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                          setCurrentTab('storefront');
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="pb-3 sm:hidden">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentTab !== 'storefront') setCurrentTab('storefront');
              }}
              className="w-full bg-slate-800 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-3 py-2 border border-slate-700 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>
    </header>
  );
};
