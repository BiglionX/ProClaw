import { createClient } from '@supabase/supabase-js';
import type { Profile, ApiKey, TokenBalance, TokenSale, ExternalIntegration, ApiUsageLog, TokenPackage } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 检查是否为有效 URL
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

const isConfigured = supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl);

if (!isConfigured) {
  console.warn('⚠️  Supabase not configured. Using demo mode.');
  console.warn('Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Database types for better type safety
export type Tables = {
  profiles: Profile;
  api_keys: ApiKey;
  token_balances: TokenBalance;
  token_sales: TokenSale;
  external_integrations: ExternalIntegration;
  api_usage_logs: ApiUsageLog;
  token_packages: TokenPackage;
};
