/**
 * P-MARKET PH - Agent Referral Attribution Context
 * Captures referral parameters from URL, validates code authenticity, and manages customer attribution.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

interface ReferralContextType {
  referralCode: string | null;
  agentName: string | null;
  isValid: boolean;
  clearReferral: () => void;
  applyReferralCode: (code: string) => Promise<boolean>;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);
const REF_STORAGE_KEY = 'pmarket_active_ref_code';
const AGENT_NAME_STORAGE_KEY = 'pmarket_active_ref_agent';

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [referralCode, setReferralCode] = useState<string | null>(() => {
    return localStorage.getItem(REF_STORAGE_KEY);
  });
  const [agentName, setAgentName] = useState<string | null>(() => {
    return localStorage.getItem(AGENT_NAME_STORAGE_KEY);
  });
  const [isValid, setIsValid] = useState<boolean>(Boolean(referralCode));

  const { user } = useAuth();

  // On mount, inspect query string for ?ref=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      applyReferralCode(refParam);
    }
  }, []);

  const applyReferralCode = async (code: string): Promise<boolean> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;

    // Prevent self-referral: if logged in as agent with this code
    if (user?.role === 'agent' && user.referralCode?.toUpperCase() === trimmed) {
      console.warn('Self referral blocked: agent cannot refer own purchases.');
      return false;
    }

    try {
      const res = await api.validateReferralCode(trimmed);
      if (res.valid) {
        setReferralCode(res.code);
        setAgentName(res.agentName);
        setIsValid(true);
        localStorage.setItem(REF_STORAGE_KEY, res.code);
        localStorage.setItem(AGENT_NAME_STORAGE_KEY, res.agentName);
        return true;
      }
    } catch {
      // invalid code
    }
    return false;
  };

  const clearReferral = () => {
    setReferralCode(null);
    setAgentName(null);
    setIsValid(false);
    localStorage.removeItem(REF_STORAGE_KEY);
    localStorage.removeItem(AGENT_NAME_STORAGE_KEY);
  };

  return (
    <ReferralContext.Provider
      value={{
        referralCode,
        agentName,
        isValid,
        clearReferral,
        applyReferralCode,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const ctx = useContext(ReferralContext);
  if (!ctx) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return ctx;
}
