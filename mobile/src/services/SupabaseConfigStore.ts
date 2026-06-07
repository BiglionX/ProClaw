/**
 * SupabaseConfigStore - Supabase 连接配置持久化服务
 * 使用 expo-secure-store 安全存储 Supabase URL 和 API Key。
 * Web 平台回退到 AsyncStorage。
 *
 * 对应 PRD v11.0：云端同步为可选功能，未配置时本地功能完全可用。
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_CONFIG_KEY = '@proclaw_supabase_config';

/** Supabase 连接配置 */
export interface SupabaseConnectionConfig {
  /** Supabase 项目 URL (e.g. https://your-project.supabase.co) */
  url: string;
  /** Supabase anon API Key (以 eyJ 开头的 JWT) */
  apiKey: string;
  /** 是否已保存配置 */
  configured: boolean;
  /** 上次连接测试时间戳 */
  lastTestedAt?: number;
  /** 上次连接测试结果 */
  lastTestResult?: 'success' | 'failed';
}

/**
 * 保存 Supabase 配置到安全存储
 */
export const saveSupabaseConfig = async (url: string, apiKey: string): Promise<void> => {
  try {
    const config: SupabaseConnectionConfig = {
      url: url.trim(),
      apiKey: apiKey.trim(),
      configured: url.trim().length > 0 && apiKey.trim().length > 0,
    };

    const json = JSON.stringify(config);

    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(SUPABASE_CONFIG_KEY, json);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(SUPABASE_CONFIG_KEY, json);
      } catch {
        console.warn('[SupabaseConfig] SecureStore not available, falling back to AsyncStorage');
        await AsyncStorage.setItem(SUPABASE_CONFIG_KEY, json);
      }
    }

    console.log('[SupabaseConfig] Configuration saved');
  } catch (error) {
    console.error('[SupabaseConfig] Failed to save config:', error);
    throw error;
  }
};

/**
 * 从安全存储加载 Supabase 配置
 */
export const loadSupabaseConfig = async (): Promise<SupabaseConnectionConfig | null> => {
  try {
    let json: string | null = null;

    if (Platform.OS === 'web') {
      json = await AsyncStorage.getItem(SUPABASE_CONFIG_KEY);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        json = await SecureStore.getItemAsync(SUPABASE_CONFIG_KEY);
      } catch {
        json = await AsyncStorage.getItem(SUPABASE_CONFIG_KEY);
      }
    }

    if (!json) return null;
    return JSON.parse(json) as SupabaseConnectionConfig;
  } catch (error) {
    console.warn('[SupabaseConfig] Failed to load config:', error);
    return null;
  }
};

/**
 * 清除 Supabase 配置
 */
export const clearSupabaseConfig = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(SUPABASE_CONFIG_KEY);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.deleteItemAsync(SUPABASE_CONFIG_KEY);
      } catch {
        await AsyncStorage.removeItem(SUPABASE_CONFIG_KEY);
      }
    }

    console.log('[SupabaseConfig] Configuration cleared');
  } catch (error) {
    console.warn('[SupabaseConfig] Failed to clear config:', error);
  }
};

/**
 * 检查 Supabase 配置是否存在
 */
export const hasSupabaseConfig = async (): Promise<boolean> => {
  const config = await loadSupabaseConfig();
  return config !== null && config.configured;
};

/**
 * 获取 Supabase URL（供其他服务使用）
 */
export const getSupabaseUrl = async (): Promise<string> => {
  const config = await loadSupabaseConfig();
  return config?.url || '';
};

/**
 * 获取 Supabase API Key（供其他服务使用）
 */
export const getSupabaseApiKey = async (): Promise<string> => {
  const config = await loadSupabaseConfig();
  return config?.apiKey || '';
};

/**
 * 测试 Supabase 连接
 * 通过 HEAD 请求检查 REST API 是否可达
 */
export const testSupabaseConnection = async (
  url: string,
  apiKey: string,
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  if (!url || !apiKey) {
    return { success: false, message: '请填写 Supabase URL 和 API Key' };
  }

  const startTime = Date.now();
  try {
    // 测试基础连通性
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const latencyMs = Date.now() - startTime;

    if (response.ok || response.status === 401) {
      // 200/401 都说明服务可达 (401 仅表示需要具体表名，连接本身正常)
      return {
        success: true,
        message: `连接成功 (延迟 ${latencyMs}ms)`,
        latencyMs,
      };
    }

    // 更新测试结果到持久化存储
    await updateTestResult('failed');

    return {
      success: false,
      message: `连接失败 (HTTP ${response.status})`,
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    await updateTestResult('failed');
    return {
      success: false,
      message: error?.message || '网络请求失败，请检查 URL 是否正确',
      latencyMs,
    };
  }
};

/**
 * 更新连接测试结果到持久化配置
 */
const updateTestResult = async (result: 'success' | 'failed'): Promise<void> => {
  try {
    const config = await loadSupabaseConfig();
    if (config) {
      config.lastTestedAt = Date.now();
      config.lastTestResult = result;
      const json = JSON.stringify(config);
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(SUPABASE_CONFIG_KEY, json);
      } else {
        try {
          const SecureStore = await import('expo-secure-store');
          await SecureStore.setItemAsync(SUPABASE_CONFIG_KEY, json);
        } catch {
          await AsyncStorage.setItem(SUPABASE_CONFIG_KEY, json);
        }
      }
    }
  } catch {
    // 静默忽略测试结果更新失败
  }
};

export default {
  saveSupabaseConfig,
  loadSupabaseConfig,
  clearSupabaseConfig,
  hasSupabaseConfig,
  getSupabaseUrl,
  getSupabaseApiKey,
  testSupabaseConnection,
};
