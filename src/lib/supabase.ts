// 桌面端主数据在本地 SQLite；Supabase 为可选能力（云中继 / 多设备 / 云端统计）
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

console.log('Supabase URL configured:', !!supabaseUrl);
console.log('Demo mode:', isDemoMode);

// 检查 Supabase 配置
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !isDemoMode
);

if (!isSupabaseConfigured && !isDemoMode) {
  console.info(
    'Supabase 未配置：桌面端将使用本地 SQLite。如需云中继或多设备同步，请配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。'
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
      detectSessionInUrl: false,
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
