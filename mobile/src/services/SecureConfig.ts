/**
 * SecureConfig - 通用安全存储服务
 *
 * 复用 AuthService 中成熟的 secureGet/set/delete 模式，
 * 为 AI API Key 等敏感配置提供 OS 级加密存储。
 *
 * - iOS: Keychain
 * - Android: EncryptedSharedPreferences / Keystore
 * - Web: AsyncStorage（开发环境回退）
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// ============ 存储键名 ============

export const SECURE_KEYS = {
  AI_API_KEY: 'proclaw_ai_api_key',
  AI_API_BASE: 'proclaw_ai_api_base',
  AI_MODEL: 'proclaw_ai_model',
  /** PRD v11.2 Phase 3: 多供应商密钥 */
  OPENAI_API_KEY: 'proclaw_openai_api_key',
  ANTHROPIC_API_KEY: 'proclaw_anthropic_api_key',
  OLLAMA_API_KEY: 'proclaw_ollama_api_key',
} as const;

// ============ 平台抽象 ============

export async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    // 审计 S1：Web 平台 AsyncStorage（localStorage）无 OS 级加密
    // 仅用于开发调试，生产环境应使用原生平台（iOS Keychain/Android Keystore）
    logger.debug('[SecureConfig] Web platform: using AsyncStorage (no OS-level encryption for', key, ')');
    return await AsyncStorage.getItem(key);
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    // 审计 S1：Web 平台明文存储，仅用于开发环境
    logger.debug('[SecureConfig] Web platform: storing in AsyncStorage without encryption for', key);
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    logger.warn('[SecureConfig] Failed to save:', key, e);
  }
}

export async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    logger.warn('[SecureConfig] Failed to delete:', key, e);
  }
}
