// ProClaw Cloud 托管版 - Supabase 浏览器端客户端
// 使用函数延迟创建实例，避免模块级别执行导致构建时环境变量缺失

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

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
