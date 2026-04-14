// User & Profile Types
export interface User {
  id: string;
  email?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

// API Key Types
export interface ApiKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'google' | 'ollama' | 'custom';
  key_name: string;
  encrypted_key: string;
  base_url?: string;
  model_list?: string[];
  is_active: boolean;
  usage_limit?: number;
  used_count: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyFormData {
  provider: string;
  key_name: string;
  api_key: string;
  base_url?: string;
  model_list?: string[];
  usage_limit?: number;
}

// Token Types
export interface TokenBalance {
  user_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  updated_at: string;
}

export interface TokenSale {
  id: string;
  user_id: string;
  amount: number;
  price: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  payment_method?: 'alipay' | 'wechat' | 'stripe' | 'paypal';
  transaction_id?: string;
  metadata?: any;
  created_at: string;
  completed_at?: string;
  refunded_at?: string;
}

export interface TokenPackage {
  id: string;
  name: string;
  description?: string;
  token_amount: number;
  price: number;
  currency: string;
  discount_percentage: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// External Integration Types
export interface ExternalIntegration {
  id: string;
  user_id: string;
  name: string;
  type: 'webhook' | 'api_endpoint' | 'oauth';
  endpoint_url: string;
  auth_type?: 'bearer' | 'api_key' | 'oauth2' | 'none';
  credentials?: string;
  headers?: any;
  is_active: boolean;
  is_approved: boolean;
  last_tested_at?: string;
  test_status?: 'success' | 'failed' | 'pending' | 'never';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// API Usage Log Types
export interface ApiUsageLog {
  id: string;
  user_id: string;
  api_key_id?: string;
  endpoint?: string;
  model?: string;
  tokens_used: number;
  cost: number;
  response_time_ms?: number;
  status_code?: number;
  error_message?: string;
  ip_address?: string;
  created_at: string;
}

// Stats Types
export interface UserStats {
  total_api_calls: number;
  total_tokens_used: number;
  total_cost: number;
  active_api_keys: number;
  token_balance?: number;
}

export interface PlatformStats {
  total_users: number;
  total_admins: number;
  total_api_calls: number;
  total_tokens_sold: number;
  total_revenue: number;
  active_api_keys: number;
  today_new_users: number;
  today_api_calls: number;
}

// Session Type
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: User;
}
