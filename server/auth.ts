/**
 * P-MARKET PH - Authentication & Authorization Security Module
 * PBKDF2 password hashing, cryptographically signed tokens, and role-based access control.
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../src/types/marketplace.ts';
import { db } from './db.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'pmarket-ph-sec-2026-auth-session-key';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 10000, 32, 'sha256').toString('hex');
  return { hash, salt: chosenSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

interface TokenPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadStr)
    .digest('base64url');
  return `${payloadStr}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadStr)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Middleware: Authenticates token if present (does not block if missing)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      const user = db.getUserById(payload.userId);
      if (user && user.status === 'active') {
        const { passwordHash, salt, ...safeUser } = user;
        req.user = safeUser;
      }
    }
  }
  next();
}

// Middleware: Requires authenticated session
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }

  const user = db.getUserById(payload.userId);
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Account suspended or not found.' });
  }

  const { passwordHash, salt, ...safeUser } = user;
  req.user = safeUser;
  next();
}

// Middleware: Requires specific roles
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Authorized for: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
}

export const requireSuperAdmin = requireRoles(['super_admin']);
export const requireSeller = requireRoles(['seller']);
export const requireAgent = requireRoles(['agent']);
export const requireCustomerOrAgent = requireRoles(['customer', 'agent']);
