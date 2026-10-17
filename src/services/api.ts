/**
 * P-MARKET PH - API Client & Utility Helpers
 */

import {
  Product,
  Order,
  User,
  Store,
  PayoutRequest,
  AuditLog,
  CommissionEntry,
  MarketplaceSettings,
  PaymentMethod,
} from '../types/marketplace.ts';

const TOKEN_KEY = 'pmarket_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}: ${res.statusText}`);
  }

  return data as T;
}

// Philippine Peso currency formatter
export function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Clean date formatting
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi<{ token: string; user: User; store?: Store }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: any) =>
    fetchApi<{ token: string; user: User; store?: Store }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => fetchApi<{ user: User; store?: Store }>('/api/auth/me'),

  switchDemoRole: (role: string) =>
    fetchApi<{ token: string; user: User; store?: Store }>('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  // Products
  getProducts: (params?: { q?: string; category?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.category) query.set('category', params.category);
    if (params?.type) query.set('type', params.type);
    return fetchApi<{ products: Product[] }>(`/api/products?${query.toString()}`);
  },

  getProduct: (id: string) =>
    fetchApi<{ product: Product; sellerStore?: Store }>(`/api/products/${id}`),

  createProduct: (productData: any) =>
    fetchApi<{ product: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),

  updateProduct: (id: string, updates: any) =>
    fetchApi<{ product: Product }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  reviewProduct: (id: string, action: 'approve' | 'reject', rejectionReason?: string) =>
    fetchApi<{ product: Product }>(`/api/products/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectionReason }),
    }),

  getSellerProducts: () =>
    fetchApi<{ products: Product[] }>('/api/seller/products'),

  // Orders
  createOrder: (payload: {
    items: { productId: string; quantity: number }[];
    shippingAddress: any;
    paymentMethod: PaymentMethod;
    referralCode?: string;
  }) =>
    fetchApi<{ order: Order; paymentIntent: any }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyOrders: () => fetchApi<{ orders: Order[] }>('/api/orders/my'),

  getSellerOrders: () => fetchApi<{ orders: (Order & { sellerSpecificSubtotal?: number })[] }>('/api/orders/seller'),

  getAllOrders: () => fetchApi<{ orders: Order[] }>('/api/orders/all'),

  updateOrderStatus: (
    orderId: string,
    payload: { status: string; courierName?: string; trackingNumber?: string; itemId?: string }
  ) =>
    fetchApi<{ order: Order }>(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  requestRefund: (orderId: string, reason: string) =>
    fetchApi<{ order: Order }>(`/api/orders/${orderId}/request-refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  processRefund: (orderId: string, approve: boolean, refundAmount?: number, notes?: string) =>
    fetchApi<{ order: Order }>(`/api/orders/${orderId}/process-refund`, {
      method: 'POST',
      body: JSON.stringify({ approve, refundAmount, notes }),
    }),

  // Payments
  getPaymentConfig: () =>
    fetchApi<{
      sandboxMode: boolean;
      isLiveConfigured: boolean;
      gatewayName: string;
      supportedChannels: string[];
      credentialsChecklist: {
        hasSecretKey: boolean;
        hasPublicKey: boolean;
        hasWebhookSecret: boolean;
      };
    }>('/api/payments/config'),

  simulateSandboxPay: (orderId: string, mobileNumber: string, walletMethod: 'gcash' | 'maya') =>
    fetchApi<{ success: boolean; referenceNumber: string; order: Order; message: string }>(
      '/api/payments/sandbox-pay',
      {
        method: 'POST',
        body: JSON.stringify({ orderId, mobileNumber, walletMethod }),
      }
    ),

  // Commissions
  getAgentCommissions: () =>
    fetchApi<{
      entries: CommissionEntry[];
      summary: {
        pending: number;
        approved: number;
        payableBalance: number;
        paid: number;
        reversed: number;
      };
    }>('/api/commissions/agent'),

  getSellerCommissions: () =>
    fetchApi<{
      entries: CommissionEntry[];
      summary: {
        pending: number;
        approved: number;
        availableBalance: number;
        paid: number;
      };
    }>('/api/commissions/seller'),

  getMasterLedger: () =>
    fetchApi<{
      entries: CommissionEntry[];
      totals: {
        marketplaceFees: number;
        agentCommissions: number;
        sellerNetLiabilities: number;
      };
      settings: MarketplaceSettings;
    }>('/api/commissions/master-ledger'),

  // Payouts
  requestPayout: (payload: {
    amount: number;
    method: 'gcash' | 'maya' | 'bank_transfer';
    accountName: string;
    accountNumber: string;
    bankName?: string;
  }) =>
    fetchApi<{ payout: PayoutRequest }>('/api/payouts/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyPayouts: () => fetchApi<{ payouts: PayoutRequest[] }>('/api/payouts/my'),

  getAllPayouts: () => fetchApi<{ payouts: PayoutRequest[] }>('/api/payouts/admin'),

  processPayout: (
    payoutId: string,
    action: 'complete' | 'reject',
    referenceNumber?: string,
    adminNotes?: string
  ) =>
    fetchApi<{ payout: PayoutRequest }>(`/api/payouts/${payoutId}/process`, {
      method: 'POST',
      body: JSON.stringify({ action, referenceNumber, adminNotes }),
    }),

  // Super Admin
  getAdminOverview: () =>
    fetchApi<{
      metrics: {
        totalGMV: number;
        platformNetFees: number;
        totalOrders: number;
        totalSellers: number;
        totalAgents: number;
        totalCustomers: number;
        pendingSellerApprovals: number;
        pendingProductApprovals: number;
        pendingPayouts: number;
      };
      settings: MarketplaceSettings;
    }>('/api/admin/overview'),

  getAdminSellers: () =>
    fetchApi<{
      sellers: {
        store: Store;
        user: { id: string; email: string; fullName: string; phone: string; status: string } | null;
      }[];
    }>('/api/admin/sellers'),

  reviewSeller: (storeId: string, action: 'approve' | 'reject' | 'suspend' | 'activate') =>
    fetchApi<{ store: Store }>(`/api/admin/sellers/${storeId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  getAuditLogs: () => fetchApi<{ logs: AuditLog[] }>('/api/admin/audit-logs'),

  updateSettings: (updates: Partial<MarketplaceSettings>) =>
    fetchApi<{ settings: MarketplaceSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // Agent
  validateReferralCode: (code: string) =>
    fetchApi<{ valid: boolean; code: string; agentName: string }>(`/api/agent/validate/${code}`),

  getAgentOverview: () =>
    fetchApi<{
      referralCode: string;
      stats: {
        totalAttributedOrders: number;
        totalAttributedSales: number;
        pendingCommissions: number;
        approvedCommissions: number;
        paidCommissions: number;
      };
      orders: any[];
    }>('/api/agent/overview'),
};
