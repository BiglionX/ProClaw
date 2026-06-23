"use strict";
// ProClaw Cloud 托管版 - Supabase 浏览器端客户端
// 使用函数延迟创建实例，避免模块级别执行导致构建时环境变量缺失
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
var ssr_1 = require("@supabase/ssr");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
var supabaseClient = null;
function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = (0, ssr_1.createBrowserClient)(supabaseUrl, supabaseAnonKey);
    }
    return supabaseClient;
}
