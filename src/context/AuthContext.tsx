/**
 * P-MARKET PH - Auth Context & Session Provider
 * Manages user authentication, current store (for sellers), and 1-click demo role switching.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Store, UserRole } from '../types/marketplace.ts';
import { api, getStoredToken, setStoredToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  store: Store | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const stored = getStoredToken();
      if (!stored) {
        setUser(null);
        setStore(null);
        setIsLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
      setStore(data.store || null);
    } catch (err) {
      console.warn('Session verification failed, clearing token');
      setStoredToken(null);
      setToken(null);
      setUser(null);
      setStore(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If no token exists on first load, default to Customer demo so the marketplace is immediately interactive
    const init = async () => {
      const existingToken = getStoredToken();
      if (existingToken) {
        await refreshProfile();
      } else {
        // Initialize as Juan Dela Cruz (Customer) by default for immediate convenience
        try {
          const res = await api.switchDemoRole('customer');
          setStoredToken(res.token);
          setToken(res.token);
          setUser(res.user);
          setStore(res.store || null);
        } catch {
          // ignore
        } finally {
          setIsLoading(false);
        }
      }
    };
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setStore(res.store || null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setStore(res.store || null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setStore(null);
  };

  const switchDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.switchDemoRole(role);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setStore(res.store || null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        token,
        isLoading,
        login,
        register,
        logout,
        switchDemoRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
