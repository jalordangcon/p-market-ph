/**
 * P-MARKET PH - Core Type Definitions
 * Philippine Multi-Vendor Marketplace with Direct Retail, Independent Sellers, and Referral Agents
 */

export type UserRole = 'super_admin' | 'seller' | 'agent' | 'customer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  status: 'active' | 'suspended';
  // Seller specific
  storeId?: string;
  // Agent specific
  referralCode?: string;
}

export interface Store {
  id: string;
  sellerId: string;
  storeName: string;
  storeSlug: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessType: 'individual' | 'sole_proprietorship' | 'corporation';
  dtiBirNumber?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  contactPhone: string;
  locationCity: string;
  createdAt: string;
  approvedAt?: string;
}

export type ProductStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number; // In Philippine Pesos (PHP)
  originalPrice?: number; // For discount display
  stock: number;
  sku: string;
  category: string;
  images: string[];
  isPlatformOwned: boolean; // True = Sold directly by P-MARKET Flagship
  sellerId?: string; // If not platform-owned
  sellerStoreName?: string;
  status: ProductStatus;
  rejectionReason?: string;
  tags?: string[];
  weightKg?: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded'
  | 'disputed';

export interface OrderItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  subtotal: number;
  image: string;
  isPlatformOwned: boolean;
  sellerId?: string;
  sellerStoreName?: string;
  fulfillmentStatus?: 'pending' | 'processing' | 'shipped' | 'delivered';
  courierName?: string;
  trackingNumber?: string;
}

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string; // 09XX-XXX-XXXX format
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetAddress: string;
  postalCode: string;
  deliveryNotes?: string;
}

export type PaymentMethod = 'gcash' | 'maya' | 'card' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  currency: 'PHP';
  method: PaymentMethod;
  status: PaymentStatus;
  provider: 'sandbox_paymongo' | 'sandbox_maya' | 'paymongo_live' | 'maya_live';
  referenceNumber: string;
  idempotencyKey: string;
  paidAt?: string;
  feeAmount?: number;
  rawResponse?: Record<string, unknown>;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. PMKT-20261017-9821
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paymentReference?: string;
  referralCode?: string;
  referredByAgentId?: string;
  cancellationReason?: string;
  refundReason?: string;
  refundAmount?: number;
  refundProcessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CommissionStatus = 'pending' | 'approved' | 'payable' | 'paid' | 'reversed';
export type CommissionType = 'marketplace_fee' | 'agent_commission' | 'seller_net';

export interface CommissionEntry {
  id: string;
  orderId: string;
  orderNumber: string;
  entryType: CommissionType;
  recipientId?: string; // Seller ID or Agent ID (null for platform)
  recipientName: string;
  recipientRole: 'platform' | 'seller' | 'agent';
  grossOrderAmount: number;
  commissionRatePct: number;
  calculatedAmount: number;
  status: CommissionStatus;
  notes: string;
  payoutId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PayoutStatus = 'requested' | 'approved' | 'rejected' | 'completed';
export type PayoutMethod = 'gcash' | 'maya' | 'bank_transfer';

export interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: 'seller' | 'agent';
  storeId?: string;
  amount: number;
  method: PayoutMethod;
  accountName: string;
  accountNumber: string; // e.g. GCash mobile 0917-XXX-XXXX or Bank Account
  bankName?: string;
  status: PayoutStatus;
  referenceNumber?: string;
  adminNotes?: string;
  processedByAdminId?: string;
  createdAt: string;
  processedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedByUserId: string;
  performedByRole: UserRole;
  targetType: 'order' | 'product' | 'seller' | 'agent' | 'commission' | 'payout' | 'settings' | 'auth';
  targetId: string;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface MarketplaceSettings {
  platformCommissionPct: number; // e.g. 5.0%
  agentCommissionPct: number; // e.g. 3.0%
  minPayoutAmount: number; // e.g. 500 PHP
  sandboxMode: boolean; // true = simulated GCash & Maya gateways
  autoApproveDays: number; // days after delivery to mark commission payable
  gatewayName: string;
  webhookSecretConfigured: boolean;
  liveSecretConfigured: boolean;
}
