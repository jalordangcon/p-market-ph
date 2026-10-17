/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';
import { ReferralProvider } from './context/ReferralContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { StorefrontView } from './views/StorefrontView.tsx';
import { CustomerOrdersView } from './views/CustomerOrdersView.tsx';
import { SellerDashboardView } from './views/SellerDashboardView.tsx';
import { AgentDashboardView } from './views/AgentDashboardView.tsx';
import { AdminDashboardView } from './views/AdminDashboardView.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Product, Order } from './types/marketplace.ts';

function MainApp() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('storefront');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleOrderSuccess = (order: Order) => {
    // Optionally switch to my-orders to show real-time tracking
    setCurrentTab('my-orders');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        openAuthModal={() => setIsAuthOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'storefront' && (
          <StorefrontView
            searchQuery={searchQuery}
            onSelectProduct={(product) => setSelectedProduct(product)}
          />
        )}

        {currentTab === 'my-orders' && <CustomerOrdersView />}

        {currentTab === 'seller' && <SellerDashboardView />}

        {currentTab === 'agent' && <AgentDashboardView />}

        {currentTab === 'admin' && <AdminDashboardView />}
      </main>

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ReferralProvider>
          <MainApp />
        </ReferralProvider>
      </CartProvider>
    </AuthProvider>
  );
}
