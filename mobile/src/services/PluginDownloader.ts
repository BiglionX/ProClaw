/**
 * PluginDownloader - 插件下载与校验
 * 从 FlowHub 下载插件 ZIP 包，校验签名，解压到指定目录。
 *
 * 对应 PRD v11.0 第5.2节
 */

import { Platform } from 'react-native';
import JSZip from 'jszip';
import CryptoJS from 'crypto-js';
import type { PluginManifest } from './PluginRegistry';
import { logger } from '../utils/logger';

/** FlowHub 插件元数据 */
export interface FlowHubPluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string;
  permissions: string[];
  downloadUrl: string;
  signatureUrl: string;
  size: number;
  minAppVersion: string;
  recommendedAgents?: string[];
  rating?: number;
  downloads?: number;
}

/** 解压后的插件文件 */
export interface ExtractedPlugin {
  manifest: PluginManifest;
  upSql: string;
  downSql: string;
}

const FLOWHUB_API_BASE = 'https://flowhub.proclaw.com/api/v1';

// 签名验证公钥从安全配置加载（审计 S3：不再硬编码签名密钥）
let _signingKey: CryptoJS.lib.WordArray | null = null;

const getSigningKey = async (): Promise<CryptoJS.lib.WordArray | null> => {
  if (_signingKey) return _signingKey;
  try {
    const { secureGet } = await import('./SecureConfig');
    const hex = await secureGet('proclaw_plugin_signing_key');
    if (hex) {
      _signingKey = CryptoJS.enc.Hex.parse(hex);
      return _signingKey;
    }
  } catch { /* 安全存储不可用 */ }
  // 无签名密钥则无法验证
  logger.warn('[PluginDownloader] No signing key configured, signature verification will fail');
  return null;
};

/**
 * 从 FlowHub 获取可用插件列表
 */
export const fetchAvailablePlugins = async (): Promise<FlowHubPluginInfo[]> => {
  try {
    const response = await fetch(`${FLOWHUB_API_BASE}/plugins`);
    if (!response.ok) {
      throw new Error(`FlowHub API error: ${response.status}`);
    }
    const data = await response.json();
    return data.plugins || [];
  } catch (error) {
    logger.warn('[PluginDownloader] Failed to fetch plugins:', error);
    return getMockPlugins(); // 开发阶段返回模拟数据
  }
};

/**
 * 获取插件详情
 */
export const fetchPluginDetail = async (
  pluginId: string
): Promise<FlowHubPluginInfo | null> => {
  try {
    // 审计 V4 修复：编码 pluginId 防止路径遍历
    const response = await fetch(`${FLOWHUB_API_BASE}/plugins/${encodeURIComponent(pluginId)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    logger.warn('[PluginDownloader] Failed to fetch plugin detail');
    const mock = getMockPlugins().find(p => p.id === pluginId);
    return mock || null;
  }
};

/**
 * 下载并安装插件
 * @param pluginInfo 插件信息
 * @param targetDir 目标目录
 * @returns 是否成功
 */
export const downloadAndInstall = async (
  pluginInfo: FlowHubPluginInfo,
  targetDir: string
): Promise<boolean> => {
  try {
    logger.log(`[PluginDownloader] Downloading plugin: ${pluginInfo.name}`);

    // 1. 下载 ZIP
    const response = await fetch(pluginInfo.downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const zipData = await response.arrayBuffer();

    // 2. 校验签名
    const signatureValid = await verifySignature(pluginInfo, zipData);
    if (!signatureValid) {
      logger.warn('[PluginDownloader] Signature verification failed, rejecting plugin');
      return false;
    }

    // 3. 解压 ZIP 并提取文件
    const extracted = await extractPluginZip(zipData);
    if (!extracted) {
      throw new Error('Failed to extract plugin ZIP');
    }

    // 4. 保存到文件系统
    await savePluginFiles(targetDir, pluginInfo, extracted);

    logger.log(`[PluginDownloader] Plugin installed: ${pluginInfo.name}`);
    return true;
  } catch (error) {
    logger.error('[PluginDownloader] Installation failed:', error);
    return false;
  }
};

/**
 * 解压插件 ZIP 包并提取关键文件
 */
export const extractPluginZip = async (zipData: ArrayBuffer): Promise<ExtractedPlugin | null> => {
  try {
    // 审计 W4：防御 zip bomb，限制解压前数据大小为 50MB
    const MAX_ZIP_SIZE = 50 * 1024 * 1024;
    if (zipData.byteLength > MAX_ZIP_SIZE) {
      logger.warn(`[PluginDownloader] ZIP too large: ${zipData.byteLength} bytes, max ${MAX_ZIP_SIZE}`);
      return null;
    }

    const zip = await JSZip.loadAsync(zipData);

    // 读取 manifest.json
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      logger.warn('[PluginDownloader] ZIP missing manifest.json');
      return null;
    }
    const manifestContent = await manifestFile.async('string');
    const manifest: PluginManifest = JSON.parse(manifestContent);

    // 读取 up.sql
    const upSqlFile = zip.file('up.sql');
    if (!upSqlFile) {
      logger.warn('[PluginDownloader] ZIP missing up.sql');
      return null;
    }
    const upSql = await upSqlFile.async('string');

    // 审计 D2：验证 upSql 只包含安全的 DDL/DML 语句（禁止 DROP DATABASE、ATTACH 等）
    const dangerousPatterns = /\b(DROP\s+DATABASE|ATTACH\s+DATABASE|DETACH\s+DATABASE|PRAGMA\s|VACUUM|REINDEX)\b/i;
    if (dangerousPatterns.test(upSql)) {
      logger.warn('[PluginDownloader] up.sql contains dangerous SQL, rejecting plugin');
      return null;
    }

    // 读取 down.sql（可选）
    let downSql = '';
    const downSqlFile = zip.file('down.sql');
    if (downSqlFile) {
      downSql = await downSqlFile.async('string');
      // 审计 W17：downSql 同样需校验危险 SQL，防止卸载时执行破坏性语句
      if (dangerousPatterns.test(downSql)) {
        logger.warn('[PluginDownloader] down.sql contains dangerous SQL, rejecting plugin');
        return null;
      }
    }

    logger.log(`[PluginDownloader] Extracted plugin: ${manifest.name} v${manifest.version}`);
    return { manifest, upSql, downSql };
  } catch (error) {
    logger.error('[PluginDownloader] ZIP extraction failed:', error);
    return null;
  }
};

/**
 * 校验插件签名（HMAC-SHA256）
 * 使用预共享密钥验证 ZIP 内容的完整性
 * 审计 S4/S5：签名获取失败或无签名 URL 时拒绝插件
 */
export const verifySignature = async (
  pluginInfo: FlowHubPluginInfo,
  zipData: ArrayBuffer
): Promise<boolean> => {
  try {
    // 如果有签名 URL，下载并验证
    if (pluginInfo.signatureUrl) {
      const signingKey = await getSigningKey();
      if (!signingKey) {
        logger.error('[PluginDownloader] No signing key available, cannot verify signature');
        return false;
      }

      const sigResponse = await fetch(pluginInfo.signatureUrl);
      if (!sigResponse.ok) {
        logger.error('[PluginDownloader] Failed to fetch signature, rejecting plugin');
        return false; // 审计 S4：签名获取失败时拒绝
      }
      const signatureText = await sigResponse.text();

      // 审计 R1 修复：将 ArrayBuffer 转为 WordArray，4 字节打包为一个 word
      const bytes = new Uint8Array(zipData);
      const words: number[] = [];
      for (let i = 0; i < bytes.length; i += 4) {
        words.push(
          (bytes[i] << 24) |
          ((bytes[i + 1] ?? 0) << 16) |
          ((bytes[i + 2] ?? 0) << 8) |
          (bytes[i + 3] ?? 0)
        );
      }
      const wordArray = CryptoJS.lib.WordArray.create(words, bytes.length);
      const computedSig = CryptoJS.HmacSHA256(wordArray, signingKey).toString(CryptoJS.enc.Hex);

      // 比较签名（constant-time 比较防止时序攻击）
      const expectedSig = signatureText.trim();
      if (computedSig.length !== expectedSig.length) return false;
      let diff = 0;
      for (let i = 0; i < computedSig.length; i++) {
        diff |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
      }
      return diff === 0;
    }

    // 审计 S5：无签名 URL 时拒绝插件
    logger.error('[PluginDownloader] No signature URL provided, rejecting unsigned plugin');
    return false;
  } catch (error) {
    logger.error('[PluginDownloader] Signature verification error:', error);
    return false;
  }
};

/**
 * 保存解压后的插件文件到本地
 */
const savePluginFiles = async (
  targetDir: string,
  pluginInfo: FlowHubPluginInfo,
  extracted: ExtractedPlugin
): Promise<void> => {
  if (Platform.OS === 'web') {
    // Web 平台：保存到 localStorage
    try {
      localStorage.setItem(
        `plugin_${pluginInfo.id}`,
        JSON.stringify({
          manifest: extracted.manifest,
          upSql: extracted.upSql,
          downSql: extracted.downSql,
          installedAt: Date.now(),
        })
      );
    } catch (error) {
      logger.warn('[PluginDownloader] Web storage save failed:', error);
    }
  } else {
    // 原生平台：使用 expo-file-system 写入各文件
    try {
      const FileSystem = await import('expo-file-system');
      const pluginDir = `${FileSystem.Paths.document.uri}${targetDir}`;

      // 创建目录（expo-file-system v19 API：Directory 类）
      const dir = new FileSystem.Directory(pluginDir);
      if (!dir.exists) {
        await dir.create({ intermediates: true });
      }

      // 保存 manifest.json
      const manifestFile = new FileSystem.File(`${pluginDir}manifest.json`);
      await manifestFile.create();
      await manifestFile.write(JSON.stringify(extracted.manifest));

      // 保存 up.sql
      const upSqlFile = new FileSystem.File(`${pluginDir}up.sql`);
      await upSqlFile.create();
      await upSqlFile.write(extracted.upSql);

      // 保存 down.sql（如果有）
      if (extracted.downSql) {
        const downSqlFile = new FileSystem.File(`${pluginDir}down.sql`);
        await downSqlFile.create();
        await downSqlFile.write(extracted.downSql);
      }

      logger.log(`[PluginDownloader] Files saved to: ${pluginDir}`);
    } catch (error) {
      logger.error('[PluginDownloader] File save failed:', error);
      throw error;
    }
  }
};

/**
 * 开发阶段模拟插件数据
 */
const getMockPlugins = (): FlowHubPluginInfo[] => [
  {
    id: 'plugin_catering',
    name: '餐厅管理插件',
    version: '1.0.0',
    description: '餐饮行业工作流：菜单管理、后厨订单、库存管理',
    author: 'ProClaw Team',
    icon: '🍽️',
    permissions: ['products:read', 'products:write', 'orders:read', 'orders:write'],
    downloadUrl: 'https://flowhub.proclaw.com/plugins/catering/v1.0.0.zip',
    signatureUrl: 'https://flowhub.proclaw.com/plugins/catering/v1.0.0.sig',
    size: 512000,
    minAppVersion: '1.0.0',
    recommendedAgents: ['agent_kitchen_optimizer'],
    rating: 4.5,
    downloads: 1280,
  },
  {
    id: 'plugin_beauty',
    name: '美容美发插件',
    version: '1.0.0',
    description: '美容行业管理：预约管理、会员系统、服务项目',
    author: 'ProClaw Team',
    icon: '💇',
    permissions: ['customers:read', 'customers:write', 'orders:read'],
    downloadUrl: 'https://flowhub.proclaw.com/plugins/beauty/v1.0.0.zip',
    signatureUrl: 'https://flowhub.proclaw.com/plugins/beauty/v1.0.0.sig',
    size: 384000,
    minAppVersion: '1.0.0',
    recommendedAgents: ['agent_appointment_manager'],
    rating: 4.2,
    downloads: 856,
  },
  {
    id: 'plugin_pet',
    name: '宠物服务插件',
    version: '1.0.0',
    description: '宠物行业管理：宠物档案、服务记录、商品销售',
    author: 'ProClaw Team',
    icon: '🐾',
    permissions: ['customers:read', 'customers:write', 'products:read'],
    downloadUrl: 'https://flowhub.proclaw.com/plugins/pet/v1.0.0.zip',
    signatureUrl: 'https://flowhub.proclaw.com/plugins/pet/v1.0.0.sig',
    size: 256000,
    minAppVersion: '1.0.0',
    rating: 4.0,
    downloads: 423,
  },
];

export default {
  fetchAvailablePlugins,
  fetchPluginDetail,
  downloadAndInstall,
};
