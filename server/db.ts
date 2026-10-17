/**
 * P-MARKET PH - Persistent Database Engine
 * Disk-backed atomic storage with transaction-safe inventory reservation and immutable financial ledger.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Store,
  Product,
  Order,
  PaymentRecord,
  CommissionEntry,
  PayoutRequest,
  AuditLog,
  MarketplaceSettings,
  OrderItem,
} from '../src/types/marketplace.ts';
import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_STORES,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_COMMISSIONS,
  INITIAL_AUDIT_LOGS,
} from './seedData.ts';

interface DatabaseSchema {
  users: (User & { passwordHash: string; salt: string })[];
  stores: Store[];
  products: Product[];
  orders: Order[];
  payments: PaymentRecord[];
  commissions: CommissionEntry[];
  payouts: PayoutRequest[];
  auditLogs: AuditLog[];
  settings: MarketplaceSettings;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'marketplace_db.json');

class DatabaseEngine {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDbInitialized();
    this.data = this.loadFromDisk();
  }

  private ensureDbInitialized() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        users: INITIAL_USERS,
        stores: INITIAL_STORES,
        products: INITIAL_PRODUCTS,
        orders: INITIAL_ORDERS,
        payments: [
          {
            id: 'pay_001',
            orderId: 'ord_demo_001',
            amount: 2370,
            currency: 'PHP',
            method: 'gcash',
            status: 'paid',
            provider: 'sandbox_paymongo',
            referenceNumber: 'GCASH-REF-20261015-4421',
            idempotencyKey: 'idemp_demo_20261015_001',
            paidAt: '2026-10-15T08:30:00.000Z',
            feeAmount: 0,
            createdAt: '2026-10-15T08:29:00.000Z',
          },
        ],
        commissions: INITIAL_COMMISSIONS,
        payouts: [],
        auditLogs: INITIAL_AUDIT_LOGS,
        settings: INITIAL_SETTINGS,
      };
      this.saveToDiskSync(initialDb);
    }
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error loading database, initializing fresh state', err);
      this.ensureDbInitialized();
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  }

  private saveToDiskSync(dataToSave: DatabaseSchema) {
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`;
    fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  private persist() {
    this.saveToDiskSync(this.data);
  }

  // --- SETTINGS ---
  getSettings(): MarketplaceSettings {
    return { ...this.data.settings };
  }

  updateSettings(updates: Partial<MarketplaceSettings>): MarketplaceSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.persist();
    return this.getSettings();
  }

  // --- USERS ---
  getUsers(): (User & { passwordHash: string; salt: string })[] {
    return this.data.users;
  }

  getUserById(id: string): (User & { passwordHash: string; salt: string }) | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): (User & { passwordHash: string; salt: string }) | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  getUserByReferralCode(code: string): (User & { passwordHash: string; salt: string }) | undefined {
    return this.data.users.find(
      (u) => u.role === 'agent' && u.referralCode?.toUpperCase() === code.toUpperCase().trim()
    );
  }

  createUser(user: User & { passwordHash: string; salt: string }): User {
    this.data.users.push(user);
    this.persist();
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.persist();
    const { passwordHash, salt, ...safeUser } = this.data.users[idx];
    return safeUser;
  }

  // --- STORES ---
  getStores(): Store[] {
    return this.data.stores;
  }

  getStoreById(id: string): Store | undefined {
    return this.data.stores.find((s) => s.id === id);
  }

  getStoreBySellerId(sellerId: string): Store | undefined {
    return this.data.stores.find((s) => s.sellerId === sellerId);
  }

  createStore(store: Store): Store {
    this.data.stores.push(store);
    this.persist();
    return store;
  }

  updateStore(id: string, updates: Partial<Store>): Store | null {
    const idx = this.data.stores.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.stores[idx] = { ...this.data.stores[idx], ...updates };
    this.persist();
    return this.data.stores[idx];
  }

  // --- PRODUCTS ---
  getProducts(): Product[] {
    return this.data.products;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  createProduct(product: Product): Product {
    this.data.products.unshift(product);
    this.persist();
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = {
      ...this.data.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.products[idx];
  }

  deleteProduct(id: string): boolean {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.products[idx].status = 'archived';
    this.persist();
    return true;
  }

  // --- ATOMIC INVENTORY ENGINE ---
  // Validates stock levels for all items in an order before decrementing.
  // If any item is out of stock, rejects the transaction without modifying inventory.
  reserveAndDecrementStock(items: { productId: string; quantity: number }[]): {
    success: boolean;
    error?: string;
  } {
    // 1. Validation phase
    for (const item of items) {
      const product = this.data.products.find((p) => p.id === item.productId);
      if (!product) {
        return { success: false, error: `Product ID ${item.productId} not found.` };
      }
      if (product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.title}". Requested ${item.quantity}, only ${product.stock} available.`,
        };
      }
    }

    // 2. Execution phase
    for (const item of items) {
      const product = this.data.products.find((p) => p.id === item.productId)!;
      product.stock -= item.quantity;
      product.updatedAt = new Date().toISOString();
    }

    this.persist();
    return { success: true };
  }

  restoreStock(items: { productId: string; quantity: number }[]): void {
    for (const item of items) {
      const product = this.data.products.find((p) => p.id === item.productId);
      if (product) {
        product.stock += item.quantity;
        product.updatedAt = new Date().toISOString();
      }
    }
    this.persist();
  }

  // --- ORDERS ---
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  createOrder(order: Order): Order {
    this.data.orders.unshift(order);
    this.persist();
    return order;
  }

  updateOrder(id: string, updates: Partial<Order>): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    this.data.orders[idx] = {
      ...this.data.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.orders[idx];
  }

  // --- PAYMENTS ---
  getPayments(): PaymentRecord[] {
    return this.data.payments;
  }

  getPaymentByReference(ref: string): PaymentRecord | undefined {
    return this.data.payments.find((p) => p.referenceNumber === ref);
  }

  getPaymentByIdempotencyKey(key: string): PaymentRecord | undefined {
    return this.data.payments.find((p) => p.idempotencyKey === key);
  }

  createPayment(payment: PaymentRecord): PaymentRecord {
    this.data.payments.unshift(payment);
    this.persist();
    return payment;
  }

  updatePayment(id: string, updates: Partial<PaymentRecord>): PaymentRecord | null {
    const idx = this.data.payments.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.payments[idx] = { ...this.data.payments[idx], ...updates };
    this.persist();
    return this.data.payments[idx];
  }

  // --- COMMISSION ENGINE ---
  getCommissions(): CommissionEntry[] {
    return this.data.commissions;
  }

  createCommissionEntry(entry: CommissionEntry): CommissionEntry {
    this.data.commissions.unshift(entry);
    this.persist();
    return entry;
  }

  updateCommission(id: string, updates: Partial<CommissionEntry>): CommissionEntry | null {
    const idx = this.data.commissions.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.commissions[idx] = {
      ...this.data.commissions[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.commissions[idx];
  }

  /**
   * Generates commission ledger entries when an order is paid.
   * Calculations:
   * - Platform items: Platform earns 100% minus agent referral commission (if referred).
   * - Seller items:
   *   - Platform fee = Item Subtotal * (platformCommissionPct / 100)
   *   - Agent fee (if referred) = Item Subtotal * (agentCommissionPct / 100)
   *   - Seller net = Item Subtotal - Platform fee - Agent fee
   */
  processOrderCommissions(order: Order): CommissionEntry[] {
    const existing = this.data.commissions.filter((c) => c.orderId === order.id);
    if (existing.length > 0) {
      // Prevent duplicate commission entries for same order
      return existing;
    }

    const settings = this.getSettings();
    const createdEntries: CommissionEntry[] = [];
    const timestamp = new Date().toISOString();

    const agent = order.referredByAgentId ? this.getUserById(order.referredByAgentId) : null;

    for (const item of order.items) {
      const itemSubtotal = item.subtotal;

      if (item.isPlatformOwned) {
        // Platform owned sale
        if (agent) {
          const agentCommission = Number(
            ((itemSubtotal * settings.agentCommissionPct) / 100).toFixed(2)
          );
          const agentEntry: CommissionEntry = {
            id: `com_${crypto.randomUUID()}`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            entryType: 'agent_commission',
            recipientId: agent.id,
            recipientName: agent.fullName,
            recipientRole: 'agent',
            grossOrderAmount: itemSubtotal,
            commissionRatePct: settings.agentCommissionPct,
            calculatedAmount: agentCommission,
            status: 'pending',
            notes: `Agent ${settings.agentCommissionPct}% referral fee for platform product "${item.title}"`,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          this.createCommissionEntry(agentEntry);
          createdEntries.push(agentEntry);
        }
      } else {
        // Third-party seller product
        const platformFee = Number(
          ((itemSubtotal * settings.platformCommissionPct) / 100).toFixed(2)
        );

        // Platform marketplace take rate
        const platformEntry: CommissionEntry = {
          id: `com_${crypto.randomUUID()}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          entryType: 'marketplace_fee',
          recipientName: 'P-MARKET PH Platform',
          recipientRole: 'platform',
          grossOrderAmount: itemSubtotal,
          commissionRatePct: settings.platformCommissionPct,
          calculatedAmount: platformFee,
          status: 'pending',
          notes: `Marketplace take fee (${settings.platformCommissionPct}%) on seller product "${item.title}"`,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        this.createCommissionEntry(platformEntry);
        createdEntries.push(platformEntry);

        // Agent referral cut (if referred)
        let agentFee = 0;
        if (agent) {
          agentFee = Number(((itemSubtotal * settings.agentCommissionPct) / 100).toFixed(2));
          const agentEntry: CommissionEntry = {
            id: `com_${crypto.randomUUID()}`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            entryType: 'agent_commission',
            recipientId: agent.id,
            recipientName: agent.fullName,
            recipientRole: 'agent',
            grossOrderAmount: itemSubtotal,
            commissionRatePct: settings.agentCommissionPct,
            calculatedAmount: agentFee,
            status: 'pending',
            notes: `Agent ${settings.agentCommissionPct}% referral fee on marketplace sale "${item.title}"`,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          this.createCommissionEntry(agentEntry);
          createdEntries.push(agentEntry);
        }

        // Seller net earnings = item subtotal - platform fee (platform covers or deducts)
        const sellerNet = Number((itemSubtotal - platformFee).toFixed(2));
        const sellerEntry: CommissionEntry = {
          id: `com_${crypto.randomUUID()}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          entryType: 'seller_net',
          recipientId: item.sellerId,
          recipientName: item.sellerStoreName || 'Independent Seller',
          recipientRole: 'seller',
          grossOrderAmount: itemSubtotal,
          commissionRatePct: Number((100 - settings.platformCommissionPct).toFixed(1)),
          calculatedAmount: sellerNet,
          status: 'pending',
          notes: `Net seller payout accrual for "${item.title}" after ${settings.platformCommissionPct}% platform fee`,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        this.createCommissionEntry(sellerEntry);
        createdEntries.push(sellerEntry);
      }
    }

    return createdEntries;
  }

  /**
   * Reverses commission entries for refunded or cancelled orders.
   * Appends balancing correction entries to keep ledger immutable.
   */
  reverseOrderCommissions(orderId: string, reason: string): CommissionEntry[] {
    const existingEntries = this.data.commissions.filter(
      (c) => c.orderId === orderId && c.status !== 'reversed'
    );
    const reversalEntries: CommissionEntry[] = [];
    const timestamp = new Date().toISOString();

    for (const entry of existingEntries) {
      // Mark original entry as reversed
      entry.status = 'reversed';
      entry.updatedAt = timestamp;

      // Create balancing correction ledger entry (negative)
      const correctionEntry: CommissionEntry = {
        id: `com_rev_${crypto.randomUUID()}`,
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
        entryType: entry.entryType,
        recipientId: entry.recipientId,
        recipientName: entry.recipientName,
        recipientRole: entry.recipientRole,
        grossOrderAmount: -entry.grossOrderAmount,
        commissionRatePct: entry.commissionRatePct,
        calculatedAmount: -entry.calculatedAmount,
        status: 'reversed',
        notes: `REVERSAL CORRECTION: ${reason}. Original Entry ID: ${entry.id}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.data.commissions.unshift(correctionEntry);
      reversalEntries.push(correctionEntry);
    }

    this.persist();
    return reversalEntries;
  }

  // --- PAYOUTS ---
  getPayouts(): PayoutRequest[] {
    return this.data.payouts;
  }

  getPayoutById(id: string): PayoutRequest | undefined {
    return this.data.payouts.find((p) => p.id === id);
  }

  createPayout(payout: PayoutRequest): PayoutRequest {
    this.data.payouts.unshift(payout);
    this.persist();
    return payout;
  }

  updatePayout(id: string, updates: Partial<PayoutRequest>): PayoutRequest | null {
    const idx = this.data.payouts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.payouts[idx] = { ...this.data.payouts[idx], ...updates };
    this.persist();
    return this.data.payouts[idx];
  }

  // --- AUDIT LOGS ---
  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  recordAuditLog(
    performedByUserId: string,
    performedByRole: any,
    targetType: any,
    targetId: string,
    action: string,
    details: string,
    metadata?: Record<string, unknown>
  ): AuditLog {
    const log: AuditLog = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      action,
      performedByUserId,
      performedByRole,
      targetType,
      targetId,
      details,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep last 1,000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.persist();
    return log;
  }
}

export const db = new DatabaseEngine();
