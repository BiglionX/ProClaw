"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
var supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// 检查是否为有效 URL
var isValidUrl = function (url) {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    }
    catch (_a) {
        return false;
    }
};
var isConfigured = supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl);
if (!isConfigured) {
    console.warn('⚠️  Supabase not configured. Using demo mode.');
    console.warn('Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}
exports.supabase = (0, supabase_js_1.createClient)(isConfigured ? supabaseUrl : 'https://placeholder.supabase.co', isConfigured ? supabaseAnonKey : 'placeholder-key', {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
