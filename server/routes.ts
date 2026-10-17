/**
 * P-MARKET PH - Express API Router
 * Full REST API for authentication, marketplace storefront, orders, GCash/Maya payments,
 * commission ledger, seller fulfillment, agent referrals, and super admin operations.
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from './db.ts';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  requireSuperAdmin,
  requireSeller,
  requireAgent,
  optionalAuth,
  AuthenticatedRequest,
} from './auth.ts';
import {
  createPaymentIntent,
  executeSandboxPayment,
  processSuccessfulPayment,
  verifyWebhookSignature,
  isLivePaymentConfigured,
} from './paymentGateway.ts';
import {
  User,
  Store,
  Product,
  Order,
  OrderItem,
  PayoutRequest,
  PaymentMethod,
} from '../src/types/marketplace.ts';

const router = Router();

// ==========================================
// 1. AUTHENTICATION & SESSION MANAGEMENT
// ==========================================

// Register new user (Customer, Seller, Agent)
// IMPORTANT: Public registration CANNOT create a Super Admin!
router.post('/auth/register', (req, res) => {
  try {
    const { email, password, fullName, role, phone, storeName, storeDescription, businessType, dtiBirNumber } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Email, password, full name, and role are required.' });
    }

    // STRICT CHECK: Disallow Super Admin creation via public register
    if (role === 'super_admin') {
      return res.status(403).json({
        error: 'Security restriction: Super Admin accounts cannot be created via public registration.',
      });
    }

    if (!['customer', 'seller', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const { hash, salt } = hashPassword(password);
    const userId = `usr_${role}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    let storeId: string | undefined;
    let referralCode: string | undefined;

    // Handle Seller store registration
    if (role === 'seller') {
      if (!storeName) {
        return res.status(400).json({ error: 'Store name is required for seller registration.' });
      }
      storeId = `store_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const newStore: Store = {
        id: storeId,
        sellerId: userId,
        storeName,
        storeSlug: slug,
        description: storeDescription || 'Independent Philippine Merchant on P-MARKET PH',
        businessType: businessType || 'sole_proprietorship',
        dtiBirNumber: dtiBirNumber || 'Pending Submission',
        status: 'pending_approval', // Requires Admin approval
        contactPhone: phone || '09XXXXXXXXX',
        locationCity: 'Metro Manila, Philippines',
        createdAt: new Date().toISOString(),
      };
      db.createStore(newStore);
    }

    // Handle Agent referral code generation
    if (role === 'agent') {
      // Generate unique referral code: e.g. "NAME123"
      const cleanName = fullName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      referralCode = `${cleanName}${randomDigits}`;
    }

    const newUser = db.createUser({
      id: userId,
      email,
      fullName,
      role,
      phone: phone || '',
      status: 'active',
      storeId,
      referralCode,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      salt,
    });

    const token = generateToken(newUser);

    db.recordAuditLog(
      newUser.id,
      newUser.role,
      'auth',
      newUser.id,
      'USER_REGISTERED',
      `New ${role} account registered: ${email}`
    );

    return res.status(201).json({
      token,
      user: newUser,
      store: storeId ? db.getStoreById(storeId) : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Login
router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userWithSecrets = db.getUserByEmail(email);
    if (!userWithSecrets) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (userWithSecrets.status !== 'active') {
      return res.status(403).json({ error: 'This account has been suspended by administration.' });
    }

    const isValid = verifyPassword(password, userWithSecrets.passwordHash, userWithSecrets.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { passwordHash, salt, ...safeUser } = userWithSecrets;
    const token = generateToken(safeUser);
    const store = safeUser.storeId ? db.getStoreById(safeUser.storeId) : undefined;

    db.recordAuditLog(
      safeUser.id,
      safeUser.role,
      'auth',
      safeUser.id,
      'USER_LOGIN',
      `User ${email} logged in successfully.`
    );

    return res.json({ token, user: safeUser, store });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Get Current User Profile
router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const store = user.storeId ? db.getStoreById(user.storeId) : undefined;
  return res.json({ user, store });
});

// Quick Switch Demo Endpoint (Allows reviewer to test roles seamlessly)
router.post('/auth/demo-switch', (req, res) => {
  const { role } = req.body;
  const users = db.getUsers();
  const targetUser = users.find((u) => u.role === role);
  if (!targetUser) {
    return res.status(404).json({ error: `Demo user for role ${role} not found.` });
  }
  const { passwordHash, salt, ...safeUser } = targetUser;
  const token = generateToken(safeUser);
  const store = safeUser.storeId ? db.getStoreById(safeUser.storeId) : undefined;

  return res.json({ token, user: safeUser, store });
});

// ==========================================
// 2. PRODUCT CATALOG & INVENTORY MANAGEMENT
// ==========================================

// Public Products Listing (Only approved products shown to public)
router.get('/products', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { q, category, type } = req.query;
  let products = db.getProducts().filter((p) => p.status === 'approved');

  if (category && category !== 'All') {
    products = products.filter((p) => p.category === category);
  }

  if (type === 'platform') {
    products = products.filter((p) => p.isPlatformOwned);
  } else if (type === 'seller') {
    products = products.filter((p) => !p.isPlatformOwned);
  }

  if (q && typeof q === 'string') {
    const term = q.toLowerCase();
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.tags?.some((t) => t.toLowerCase().includes(term))
    );
  }

  return res.json({ products });
});

// Single Product Details
router.get('/products/:id', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const sellerStore = product.sellerId ? db.getStoreBySellerId(product.sellerId) : null;
  return res.json({ product, sellerStore });
});

// Seller: Get My Products (Includes drafts, pending, approved)
router.get('/seller/products', requireAuth, requireSeller, (req: AuthenticatedRequest, res) => {
  const sellerId = req.user!.id;
  const products = db.getProducts().filter((p) => p.sellerId === sellerId);
  return res.json({ products });
});

// Create Product (Seller or Super Admin)
router.post('/products', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== 'seller' && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only sellers and super administrators can create products.' });
    }

    const { title, description, price, originalPrice, stock, category, images, tags, weightKg } = req.body;

    if (!title || !price || stock === undefined || !category) {
      return res.status(400).json({ error: 'Title, price, stock quantity, and category are required.' });
    }

    const isPlatform = user.role === 'super_admin';
    const store = user.storeId ? db.getStoreById(user.storeId) : undefined;

    // Check seller store approval status
    if (user.role === 'seller' && store?.status !== 'approved') {
      return res.status(400).json({
        error: 'Your store is currently pending administrator verification. You may submit products once approved.',
      });
    }

    const productId = `prod_${isPlatform ? 'plat' : 'sel'}_${Date.now()}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

    const newProduct: Product = {
      id: productId,
      title,
      slug,
      description: description || '',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      stock: Number(stock),
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      category,
      images: Array.isArray(images) && images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
      ],
      isPlatformOwned: isPlatform,
      sellerId: isPlatform ? undefined : user.id,
      sellerStoreName: isPlatform ? 'P-MARKET Flagship Retail' : store?.storeName || 'Merchant',
      // Platform products auto-approved, seller products submitted for admin approval
      status: isPlatform ? 'approved' : 'pending_approval',
      tags: tags || [],
      weightKg: weightKg ? Number(weightKg) : 0.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createProduct(newProduct);

    db.recordAuditLog(
      user.id,
      user.role,
      'product',
      productId,
      'PRODUCT_CREATED',
      `${user.role === 'super_admin' ? 'Super Admin' : 'Seller'} created product "${title}". Status: ${newProduct.status}`
    );

    return res.status(201).json({ product: newProduct });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Product creation failed.' });
  }
});

// Update Product
router.put('/products/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  // Authorization check: Super admin can edit any, seller can edit only their own
  if (user.role !== 'super_admin' && product.sellerId !== user.id) {
    return res.status(403).json({ error: 'You are not authorized to modify this product.' });
  }

  const { title, description, price, originalPrice, stock, category, images, tags } = req.body;
  const updates: Partial<Product> = {};
  if (title) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = Number(price);
  if (originalPrice !== undefined) updates.originalPrice = Number(originalPrice);
  if (stock !== undefined) updates.stock = Number(stock);
  if (category) updates.category = category;
  if (images) updates.images = images;
  if (tags) updates.tags = tags;

  // If seller edits an approved product price/title, send back to pending_approval if desired
  const updated = db.updateProduct(product.id, updates);

  db.recordAuditLog(
    user.id,
    user.role,
    'product',
    product.id,
    'PRODUCT_UPDATED',
    `Product "${product.title}" updated by ${user.role}.`
  );

  return res.json({ product: updated });
});

// Admin Review Product (Approve / Reject)
router.post('/products/:id/review', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (action === 'approve') {
    db.updateProduct(product.id, { status: 'approved', rejectionReason: undefined });
    db.recordAuditLog(
      req.user!.id,
      'super_admin',
      'product',
      product.id,
      'PRODUCT_APPROVED',
      `Product "${product.title}" approved for marketplace display.`
    );
  } else if (action === 'reject') {
    db.updateProduct(product.id, {
      status: 'rejected',
      rejectionReason: rejectionReason || 'Does not meet product catalog standards.',
    });
    db.recordAuditLog(
      req.user!.id,
      'super_admin',
      'product',
      product.id,
      'PRODUCT_REJECTED',
      `Product "${product.title}" rejected: ${rejectionReason}`
    );
  } else {
    return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
  }

  return res.json({ product: db.getProductById(product.id) });
});

// ==========================================
// 3. ORDERS & CHECKOUT MANAGEMENT
// ==========================================

// Create Order (With Server-Side Inventory Check & Anti-Fraud Referral Attribution)
router.post('/orders', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { items, shippingAddress, paymentMethod, referralCode, guestInfo } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phoneNumber) {
      return res.status(400).json({ error: 'Full shipping address and contact phone are required.' });
    }

    // Determine customer info
    const customer = req.user;
    const customerId = customer ? customer.id : `usr_guest_${Date.now()}`;
    const customerName = customer ? customer.fullName : guestInfo?.fullName || shippingAddress.fullName;
    const customerEmail = customer ? customer.email : guestInfo?.email || 'guest@pmarket.ph';
    const customerPhone = customer?.phone || shippingAddress.phoneNumber;

    // Validate and atomically reserve inventory
    const stockItemsToReserve = items.map((i: any) => ({
      productId: i.productId,
      quantity: Number(i.quantity),
    }));

    const stockResult = db.reserveAndDecrementStock(stockItemsToReserve);
    if (!stockResult.success) {
      return res.status(400).json({ error: stockResult.error });
    }

    // Build verified order items with server-side pricing to prevent client tampering
    const orderItems: OrderItem[] = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const product = db.getProductById(item.productId);
      if (!product) {
        // Rollback stock
        db.restoreStock(stockItemsToReserve);
        return res.status(400).json({ error: `Product ${item.productId} was not found.` });
      }

      const itemQty = Math.max(1, Number(item.quantity));
      const itemSubtotal = product.price * itemQty;
      calculatedSubtotal += itemSubtotal;

      orderItems.push({
        id: `item_${crypto.randomUUID()}`,
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: itemQty,
        subtotal: itemSubtotal,
        image: product.images[0] || '',
        isPlatformOwned: product.isPlatformOwned,
        sellerId: product.sellerId,
        sellerStoreName: product.sellerStoreName,
        fulfillmentStatus: 'pending',
      });
    }

    // Shipping calculation: Free shipping for orders above ₱2,000, else ₱120 for Metro Manila / ₱180 provincial
    const isNCR = shippingAddress.region?.includes('NCR') || shippingAddress.city?.includes('Manila');
    const shippingFee = calculatedSubtotal >= 2000 ? 0 : isNCR ? 120 : 180;
    const totalAmount = calculatedSubtotal + shippingFee;

    // Agent Referral Attribution & Anti-Fraud Verification
    let attributedAgentId: string | undefined;
    let validReferralCode: string | undefined;

    if (referralCode) {
      const agentUser = db.getUserByReferralCode(referralCode);
      if (agentUser) {
        // ANTI-FRAUD RULE 1: Agents cannot refer themselves!
        const isSelfReferral =
          customer &&
          (customer.id === agentUser.id || customer.email.toLowerCase() === agentUser.email.toLowerCase());

        if (isSelfReferral) {
          console.warn(`Self-referral attempt blocked for agent: ${agentUser.email}`);
        } else {
          attributedAgentId = agentUser.id;
          validReferralCode = agentUser.referralCode;
        }
      }
    }

    const orderId = `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const orderNumber = `PMKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      items: orderItems,
      subtotal: calculatedSubtotal,
      shippingFee,
      discountAmount: 0,
      totalAmount,
      status: 'pending_payment',
      shippingAddress,
      paymentMethod: paymentMethod || 'gcash',
      paymentStatus: 'pending',
      referralCode: validReferralCode,
      referredByAgentId: attributedAgentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createOrder(newOrder);

    // Create payment intent
    const paymentIntent = createPaymentIntent(newOrder, newOrder.paymentMethod);

    db.recordAuditLog(
      customerId,
      customer?.role || 'customer',
      'order',
      orderId,
      'ORDER_CREATED',
      `Order ${orderNumber} created for ₱${totalAmount.toFixed(2)}. Attributed agent: ${validReferralCode || 'None'}.`
    );

    return res.status(201).json({
      order: newOrder,
      paymentIntent,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Order creation failed.' });
  }
});

// Get Customer Orders
router.get('/orders/my', requireAuth, (req: AuthenticatedRequest, res) => {
  const customerId = req.user!.id;
  const orders = db.getOrders().filter((o) => o.customerId === customerId);
  return res.json({ orders });
});

// Get Seller Authorized Orders (Strictly scoped: NEVER exposes other sellers' data!)
router.get('/orders/seller', requireAuth, requireSeller, (req: AuthenticatedRequest, res) => {
  const sellerId = req.user!.id;
  const allOrders = db.getOrders();

  // Filter orders that contain at least one item belonging to this seller
  const sellerOrders = allOrders
    .filter((order) => order.items.some((item) => item.sellerId === sellerId))
    .map((order) => {
      // Filter out items that belong to OTHER sellers for privacy!
      const myItems = order.items.filter((item) => item.sellerId === sellerId);
      const myItemsSubtotal = myItems.reduce((acc, i) => acc + i.subtotal, 0);

      return {
        ...order,
        items: myItems,
        sellerSpecificSubtotal: myItemsSubtotal,
      };
    });

  return res.json({ orders: sellerOrders });
});

// Super Admin: View All Orders
router.get('/orders/all', requireAuth, requireSuperAdmin, (req, res) => {
  const orders = db.getOrders();
  return res.json({ orders });
});

// Update Order Status / Seller Fulfillment
router.put('/orders/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { status, courierName, trackingNumber, itemId } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Seller can only update shipping for their own items
  if (user.role === 'seller') {
    const hasMyItem = order.items.some((i) => i.sellerId === user.id);
    if (!hasMyItem) {
      return res.status(403).json({ error: 'Unauthorized to modify this order.' });
    }

    // Update fulfillment on seller's item
    let allDelivered = true;
    for (const item of order.items) {
      if (item.sellerId === user.id) {
        if (itemId && item.id !== itemId) continue;
        if (courierName) item.courierName = courierName;
        if (trackingNumber) item.trackingNumber = trackingNumber;
        if (status === 'shipped') item.fulfillmentStatus = 'shipped';
        if (status === 'delivered') item.fulfillmentStatus = 'delivered';
      }
      if (item.fulfillmentStatus !== 'delivered') {
        allDelivered = false;
      }
    }

    // If all items delivered, mark whole order delivered
    const newOrderStatus = allDelivered ? 'delivered' : status === 'shipped' ? 'shipped' : order.status;
    const updated = db.updateOrder(order.id, {
      items: order.items,
      status: newOrderStatus,
    });

    return res.json({ order: updated });
  }

  // Super Admin can update any order status
  if (user.role === 'super_admin') {
    const updated = db.updateOrder(order.id, { status });
    return res.json({ order: updated });
  }

  return res.status(403).json({ error: 'Unauthorized.' });
});

// Customer Request Cancellation / Refund
router.post('/orders/:id/request-refund', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { reason } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (order.customerId !== user.id && user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  if (order.status === 'delivered') {
    db.updateOrder(order.id, {
      status: 'refund_requested',
      refundReason: reason || 'Customer requested return and refund.',
    });
  } else if (order.status === 'pending_payment' || order.status === 'paid' || order.status === 'processing') {
    // If not yet shipped, cancel order and restore stock
    db.updateOrder(order.id, {
      status: 'cancelled',
      cancellationReason: reason || 'Customer requested cancellation.',
    });
    // Restore inventory
    db.restoreStock(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    // Reverse commissions
    db.reverseOrderCommissions(order.id, 'Order cancelled prior to shipment');
  }

  return res.json({ order: db.getOrderById(order.id) });
});

// Super Admin Process Refund (Dispute resolution & commission reversal)
router.post('/orders/:id/process-refund', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  const { approve, refundAmount, notes } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (approve) {
    const actualRefund = refundAmount ? Number(refundAmount) : order.totalAmount;
    db.updateOrder(order.id, {
      status: 'refunded',
      paymentStatus: 'refunded',
      refundAmount: actualRefund,
      refundProcessedAt: new Date().toISOString(),
    });

    // Restore inventory if returned
    db.restoreStock(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));

    // Reverses commissions in immutable financial ledger
    db.reverseOrderCommissions(order.id, `Admin approved refund: ${notes || 'Refund completed'}`);

    db.recordAuditLog(
      req.user!.id,
      'super_admin',
      'order',
      order.id,
      'ORDER_REFUND_APPROVED',
      `Refund of ₱${actualRefund.toFixed(2)} approved for ${order.orderNumber}. Commissions reversed.`
    );
  } else {
    // Reject refund request
    db.updateOrder(order.id, {
      status: 'delivered', // Return to delivered state
      refundReason: `Refund rejected by admin: ${notes || 'Condition criteria not met.'}`,
    });
  }

  return res.json({ order: db.getOrderById(order.id) });
});

// ==========================================
// 4. PAYMENT GATEWAY API (GCASH & MAYA)
// ==========================================

// Check Payment Gateway Configuration Status
router.get('/payments/config', (req, res) => {
  const settings = db.getSettings();
  return res.json({
    sandboxMode: settings.sandboxMode,
    isLiveConfigured: isLivePaymentConfigured,
    gatewayName: settings.gatewayName,
    supportedChannels: ['gcash', 'maya', 'card'],
    credentialsChecklist: {
      hasSecretKey: Boolean(process.env.PAYMENT_GATEWAY_SECRET_KEY),
      hasPublicKey: Boolean(process.env.PAYMENT_PUBLIC_KEY),
      hasWebhookSecret: Boolean(process.env.PAYMENT_WEBHOOK_SECRET),
    },
  });
});

// Interactive Sandbox E-Wallet Payment Execution (GCash & Maya)
router.post('/payments/sandbox-pay', (req, res) => {
  try {
    const { orderId, mobileNumber, walletMethod } = req.body;

    if (!orderId || !mobileNumber || !walletMethod) {
      return res.status(400).json({ error: 'Order ID, mobile number, and wallet method are required.' });
    }

    if (!['gcash', 'maya'].includes(walletMethod)) {
      return res.status(400).json({ error: 'Invalid wallet method. Must be gcash or maya.' });
    }

    const result = executeSandboxPayment({
      orderId,
      mobileNumber,
      walletMethod,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      referenceNumber: result.referenceNumber,
      order: result.order,
      message: `Simulated ${walletMethod.toUpperCase()} payment successful! Reference: ${result.referenceNumber}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Payment simulation failed.' });
  }
});

// Webhook Endpoint (For official PayMongo / Maya Gateway notifications)
router.post('/payments/webhook', (req, res) => {
  try {
    const signatureHeader = (req.headers['paymongo-signature'] ||
      req.headers['x-maya-signature'] ||
      req.headers['x-signature']) as string;
    const rawBody = JSON.stringify(req.body);

    // Validate signature
    const isValid = verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid && !process.env.SKIP_WEBHOOK_SIGNATURE) {
      console.warn('Invalid payment webhook signature received.');
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body;
    const eventId = event.id || `evt_${crypto.randomUUID()}`;
    const eventType = event.type || event.data?.attributes?.type;

    if (eventType === 'payment.paid' || event.status === 'PAYMENT_SUCCESS') {
      const orderId = event.data?.attributes?.metadata?.order_id || event.order_id;
      const amountPaid = (event.data?.attributes?.amount || event.amount) / 100; // in PHP
      const referenceNumber = event.data?.id || event.reference_number || `REF-${Date.now()}`;

      processSuccessfulPayment({
        orderId,
        referenceNumber,
        amountPaid,
        providerEventId: eventId,
        provider: 'paymongo_live',
        rawPayload: event,
      });
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Webhook processing failed.' });
  }
});

// ==========================================
// 5. COMMISSION ENGINE & FINANCIAL LEDGER
// ==========================================

// Get Agent Ledger & Balance
router.get('/commissions/agent', requireAuth, requireAgent, (req: AuthenticatedRequest, res) => {
  const agentId = req.user!.id;
  const entries = db.getCommissions().filter((c) => c.recipientId === agentId);

  const pending = entries
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);
  const approved = entries
    .filter((e) => e.status === 'approved' || e.status === 'payable')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);
  const paid = entries
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);
  const reversed = entries
    .filter((e) => e.status === 'reversed')
    .reduce((sum, e) => sum + Math.abs(e.calculatedAmount), 0);

  return res.json({
    entries,
    summary: {
      pending: Number(pending.toFixed(2)),
      approved: Number(approved.toFixed(2)),
      payableBalance: Number(approved.toFixed(2)),
      paid: Number(paid.toFixed(2)),
      reversed: Number(reversed.toFixed(2)),
    },
  });
});

// Get Seller Ledger & Balance
router.get('/commissions/seller', requireAuth, requireSeller, (req: AuthenticatedRequest, res) => {
  const sellerId = req.user!.id;
  const entries = db.getCommissions().filter((c) => c.recipientId === sellerId);

  const pending = entries
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);
  const approved = entries
    .filter((e) => e.status === 'approved' || e.status === 'payable')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);
  const paid = entries
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);

  return res.json({
    entries,
    summary: {
      pending: Number(pending.toFixed(2)),
      approved: Number(approved.toFixed(2)),
      availableBalance: Number(approved.toFixed(2)),
      paid: Number(paid.toFixed(2)),
    },
  });
});

// Super Admin: Master Financial Ledger
router.get('/commissions/master-ledger', requireAuth, requireSuperAdmin, (req, res) => {
  const entries = db.getCommissions();
  const settings = db.getSettings();

  const totalMarketplaceFees = entries
    .filter((e) => e.entryType === 'marketplace_fee' && e.status !== 'reversed')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);

  const totalAgentCommissions = entries
    .filter((e) => e.entryType === 'agent_commission' && e.status !== 'reversed')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);

  const totalSellerNet = entries
    .filter((e) => e.entryType === 'seller_net' && e.status !== 'reversed')
    .reduce((sum, e) => sum + e.calculatedAmount, 0);

  return res.json({
    entries,
    totals: {
      marketplaceFees: Number(totalMarketplaceFees.toFixed(2)),
      agentCommissions: Number(totalAgentCommissions.toFixed(2)),
      sellerNetLiabilities: Number(totalSellerNet.toFixed(2)),
    },
    settings,
  });
});

// ==========================================
// 6. PAYOUT DISBURSEMENT MANAGEMENT
// ==========================================

// Request Payout (Seller or Agent)
router.post('/payouts/request', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== 'seller' && user.role !== 'agent') {
      return res.status(403).json({ error: 'Only sellers and agents can request payouts.' });
    }

    const { amount, method, accountName, accountNumber, bankName } = req.body;
    const settings = db.getSettings();

    const requestAmount = Number(amount);
    if (!requestAmount || requestAmount < settings.minPayoutAmount) {
      return res.status(400).json({
        error: `Minimum payout threshold is ₱${settings.minPayoutAmount.toFixed(2)}.`,
      });
    }

    if (!method || !accountName || !accountNumber) {
      return res.status(400).json({
        error: 'Payout method (GCash, Maya, Bank), account holder name, and account number are required.',
      });
    }

    // Calculate user's approved balance from ledger
    const ledger = db.getCommissions().filter((c) => c.recipientId === user.id && (c.status === 'approved' || c.status === 'payable'));
    const totalApproved = ledger.reduce((sum, c) => sum + c.calculatedAmount, 0);

    // Subtract already requested/approved payouts
    const existingPayouts = db.getPayouts().filter((p) => p.userId === user.id && (p.status === 'requested' || p.status === 'approved'));
    const pendingPayoutTotal = existingPayouts.reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = totalApproved - pendingPayoutTotal;
    if (requestAmount > availableBalance) {
      return res.status(400).json({
        error: `Requested amount ₱${requestAmount.toFixed(2)} exceeds available balance of ₱${availableBalance.toFixed(2)}.`,
      });
    }

    const newPayout: PayoutRequest = {
      id: `po_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      storeId: user.storeId,
      amount: requestAmount,
      method,
      accountName,
      accountNumber,
      bankName: method === 'bank_transfer' ? bankName : undefined,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };

    db.createPayout(newPayout);

    db.recordAuditLog(
      user.id,
      user.role,
      'payout',
      newPayout.id,
      'PAYOUT_REQUESTED',
      `${user.role.toUpperCase()} ${user.fullName} requested ₱${requestAmount.toFixed(2)} via ${method} (${accountNumber}).`
    );

    return res.status(201).json({ payout: newPayout });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Payout request failed.' });
  }
});

// View My Payouts
router.get('/payouts/my', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const payouts = db.getPayouts().filter((p) => p.userId === userId);
  return res.json({ payouts });
});

// Super Admin: View All Payout Requests
router.get('/payouts/admin', requireAuth, requireSuperAdmin, (req, res) => {
  const payouts = db.getPayouts();
  return res.json({ payouts });
});

// Super Admin: Process Payout (Approve/Complete with Reference Number)
router.post('/payouts/:id/process', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  const { action, referenceNumber, adminNotes } = req.body; // action: 'complete' | 'reject'
  const payout = db.getPayoutById(req.params.id);

  if (!payout) {
    return res.status(404).json({ error: 'Payout request not found.' });
  }

  if (action === 'complete') {
    if (!referenceNumber) {
      return res.status(400).json({ error: 'Disbursement reference number is required for completing payout.' });
    }

    db.updatePayout(payout.id, {
      status: 'completed',
      referenceNumber,
      adminNotes,
      processedByAdminId: req.user!.id,
      processedAt: new Date().toISOString(),
    });

    // Mark matching approved ledger entries as paid
    const userEntries = db.getCommissions().filter((c) => c.recipientId === payout.userId && c.status === 'approved');
    let remainingToMark = payout.amount;
    for (const entry of userEntries) {
      if (remainingToMark <= 0) break;
      entry.status = 'paid';
      entry.payoutId = payout.id;
      entry.updatedAt = new Date().toISOString();
      remainingToMark -= entry.calculatedAmount;
    }

    db.recordAuditLog(
      req.user!.id,
      'super_admin',
      'payout',
      payout.id,
      'PAYOUT_COMPLETED',
      `Payout of ₱${payout.amount.toFixed(2)} to ${payout.userName} (${payout.method}) completed. Ref: ${referenceNumber}.`
    );
  } else if (action === 'reject') {
    db.updatePayout(payout.id, {
      status: 'rejected',
      adminNotes: adminNotes || 'Rejected by administration.',
      processedByAdminId: req.user!.id,
      processedAt: new Date().toISOString(),
    });

    db.recordAuditLog(
      req.user!.id,
      'super_admin',
      'payout',
      payout.id,
      'PAYOUT_REJECTED',
      `Payout request of ₱${payout.amount.toFixed(2)} rejected: ${adminNotes}`
    );
  }

  return res.json({ payout: db.getPayoutById(payout.id) });
});

// ==========================================
// 7. SUPER ADMIN OVERSIGHT & SETTINGS
// ==========================================

// Admin Dashboard Overview Statistics
router.get('/admin/overview', requireAuth, requireSuperAdmin, (req, res) => {
  const orders = db.getOrders();
  const products = db.getProducts();
  const stores = db.getStores();
  const users = db.getUsers();
  const commissions = db.getCommissions();
  const payouts = db.getPayouts();
  const settings = db.getSettings();

  const totalGMV = orders
    .filter((o) => o.paymentStatus === 'paid' && o.status !== 'refunded')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const platformNetFees = commissions
    .filter((c) => c.entryType === 'marketplace_fee' && c.status !== 'reversed')
    .reduce((sum, c) => sum + c.calculatedAmount, 0);

  const pendingSellerApprovals = stores.filter((s) => s.status === 'pending_approval').length;
  const pendingProductApprovals = products.filter((p) => p.status === 'pending_approval').length;
  const pendingPayouts = payouts.filter((p) => p.status === 'requested').length;

  return res.json({
    metrics: {
      totalGMV: Number(totalGMV.toFixed(2)),
      platformNetFees: Number(platformNetFees.toFixed(2)),
      totalOrders: orders.length,
      totalSellers: stores.length,
      totalAgents: users.filter((u) => u.role === 'agent').length,
      totalCustomers: users.filter((u) => u.role === 'customer').length,
      pendingSellerApprovals,
      pendingProductApprovals,
      pendingPayouts,
    },
    settings,
  });
});

// Manage Sellers
router.get('/admin/sellers', requireAuth, requireSuperAdmin, (req, res) => {
  const stores = db.getStores();
  const sellersWithProfiles = stores.map((store) => {
    const user = db.getUserById(store.sellerId);
    return {
      store,
      user: user ? { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, status: user.status } : null,
    };
  });
  return res.json({ sellers: sellersWithProfiles });
});

// Approve/Reject/Suspend Seller Store
router.post('/admin/sellers/:id/review', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  const { action } = req.body; // 'approve' | 'reject' | 'suspend' | 'activate'
  const store = db.getStoreById(req.params.id);

  if (!store) {
    return res.status(404).json({ error: 'Store not found.' });
  }

  let newStatus: Store['status'] = store.status;
  if (action === 'approve') newStatus = 'approved';
  else if (action === 'reject') newStatus = 'rejected';
  else if (action === 'suspend') newStatus = 'suspended';
  else if (action === 'activate') newStatus = 'approved';

  const updatedStore = db.updateStore(store.id, {
    status: newStatus,
    approvedAt: action === 'approve' ? new Date().toISOString() : store.approvedAt,
  });

  // Also update user status if suspended
  if (action === 'suspend') {
    db.updateUser(store.sellerId, { status: 'suspended' });
  } else if (action === 'activate' || action === 'approve') {
    db.updateUser(store.sellerId, { status: 'active' });
  }

  db.recordAuditLog(
    req.user!.id,
    'super_admin',
    'seller',
    store.id,
    `SELLER_STATUS_${action.toUpperCase()}`,
    `Seller store "${store.storeName}" status changed to ${newStatus}.`
  );

  return res.json({ store: updatedStore });
});

// System Audit Logs
router.get('/admin/audit-logs', requireAuth, requireSuperAdmin, (req, res) => {
  const logs = db.getAuditLogs();
  return res.json({ logs });
});

// Update Commission Rates & Marketplace Settings
router.put('/admin/settings', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  const { platformCommissionPct, agentCommissionPct, minPayoutAmount, sandboxMode } = req.body;
  const updates: Partial<any> = {};

  if (platformCommissionPct !== undefined) updates.platformCommissionPct = Number(platformCommissionPct);
  if (agentCommissionPct !== undefined) updates.agentCommissionPct = Number(agentCommissionPct);
  if (minPayoutAmount !== undefined) updates.minPayoutAmount = Number(minPayoutAmount);
  if (sandboxMode !== undefined) updates.sandboxMode = Boolean(sandboxMode);

  const updatedSettings = db.updateSettings(updates);

  db.recordAuditLog(
    req.user!.id,
    'super_admin',
    'settings',
    'global_settings',
    'SETTINGS_UPDATED',
    `Commission rates updated: Platform ${updatedSettings.platformCommissionPct}%, Agent ${updatedSettings.agentCommissionPct}%.`
  );

  return res.json({ settings: updatedSettings });
});

// ==========================================
// 8. AGENT REFERRAL SYSTEM
// ==========================================

// Validate Referral Code (Called when shopper loads storefront or adds to cart)
router.get('/agent/validate/:code', (req, res) => {
  const agentUser = db.getUserByReferralCode(req.params.code);
  if (!agentUser || agentUser.status !== 'active') {
    return res.status(404).json({ valid: false, error: 'Invalid or inactive referral code.' });
  }

  return res.json({
    valid: true,
    code: agentUser.referralCode,
    agentName: agentUser.fullName,
  });
});

// Agent Performance & Attributed Conversions
router.get('/agent/overview', requireAuth, requireAgent, (req: AuthenticatedRequest, res) => {
  const agent = req.user!;
  const orders = db.getOrders().filter((o) => o.referredByAgentId === agent.id);
  const commissions = db.getCommissions().filter((c) => c.recipientId === agent.id);

  const attributedSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.calculatedAmount, 0);
  const approvedCommissions = commissions
    .filter((c) => c.status === 'approved' || c.status === 'payable')
    .reduce((sum, c) => sum + c.calculatedAmount, 0);
  const paidCommissions = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.calculatedAmount, 0);

  return res.json({
    referralCode: agent.referralCode,
    stats: {
      totalAttributedOrders: orders.length,
      totalAttributedSales: Number(attributedSales.toFixed(2)),
      pendingCommissions: Number(pendingCommissions.toFixed(2)),
      approvedCommissions: Number(approvedCommissions.toFixed(2)),
      paidCommissions: Number(paidCommissions.toFixed(2)),
    },
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalAmount: o.totalAmount,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    })),
  });
});

export default router;
