import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// 检查 Supabase 配置
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !isDemoMode
);

if (!isSupabaseConfigured && !isDemoMode) {
  console.warn(
    'Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, or enable demo mode with VITE_DEMO_MODE=true'
  );
}

// 创建 Supabase 客户端（如果未配置，使用占位符）
export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// 类型定义
export type User = {
  id: string;
  email?: string;
  created_at: string;
};

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
};
