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

// HMAC-SHA256 签名公钥（硬编码，实际应由签名服务器分发）
const SIGNING_KEY = CryptoJS.enc.Hex.parse('50726f436c6177506c7567696e5369676e696e674b657932303234');

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
    console.warn('[PluginDownloader] Failed to fetch plugins:', error);
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
    const response = await fetch(`${FLOWHUB_API_BASE}/plugins/${pluginId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    console.warn('[PluginDownloader] Failed to fetch plugin detail');
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
    console.log(`[PluginDownloader] Downloading plugin: ${pluginInfo.name}`);

    // 1. 下载 ZIP
    const response = await fetch(pluginInfo.downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const zipData = await response.arrayBuffer();

    // 2. 校验签名
    const signatureValid = await verifySignature(pluginInfo, zipData);
    if (!signatureValid) {
      console.warn('[PluginDownloader] Signature verification failed, rejecting plugin');
      return false;
    }

    // 3. 解压 ZIP 并提取文件
    const extracted = await extractPluginZip(zipData);
    if (!extracted) {
      throw new Error('Failed to extract plugin ZIP');
    }

    // 4. 保存到文件系统
    await savePluginFiles(targetDir, pluginInfo, extracted);

    console.log(`[PluginDownloader] Plugin installed: ${pluginInfo.name}`);
    return true;
  } catch (error) {
    console.error('[PluginDownloader] Installation failed:', error);
    return false;
  }
};

/**
 * 解压插件 ZIP 包并提取关键文件
 */
export const extractPluginZip = async (zipData: ArrayBuffer): Promise<ExtractedPlugin | null> => {
  try {
    const zip = await JSZip.loadAsync(zipData);

    // 读取 manifest.json
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      console.warn('[PluginDownloader] ZIP missing manifest.json');
      return null;
    }
    const manifestContent = await manifestFile.async('string');
    const manifest: PluginManifest = JSON.parse(manifestContent);

    // 读取 up.sql
    const upSqlFile = zip.file('up.sql');
    if (!upSqlFile) {
      console.warn('[PluginDownloader] ZIP missing up.sql');
      return null;
    }
    const upSql = await upSqlFile.async('string');

    // 读取 down.sql（可选）
    let downSql = '';
    const downSqlFile = zip.file('down.sql');
    if (downSqlFile) {
      downSql = await downSqlFile.async('string');
    }

    console.log(`[PluginDownloader] Extracted plugin: ${manifest.name} v${manifest.version}`);
    return { manifest, upSql, downSql };
  } catch (error) {
    console.error('[PluginDownloader] ZIP extraction failed:', error);
    return null;
  }
};

/**
 * 校验插件签名（HMAC-SHA256）
 * 使用预共享密钥验证 ZIP 内容的完整性
 */
export const verifySignature = async (
  pluginInfo: FlowHubPluginInfo,
  zipData: ArrayBuffer
): Promise<boolean> => {
  try {
    // 如果有签名 URL，下载并验证
    if (pluginInfo.signatureUrl) {
      const sigResponse = await fetch(pluginInfo.signatureUrl);
      if (!sigResponse.ok) {
        console.warn('[PluginDownloader] Failed to fetch signature, allowing unsigned');
        return true; // 开发阶段允许无签名
      }
      const signatureText = await sigResponse.text();

      // 将 ArrayBuffer 转为 WordArray 用于 HMAC 计算
      const bytes = new Uint8Array(zipData);
      const words: number[] = [];
      for (let i = 0; i < bytes.length; i++) {
        words.push(bytes[i]);
      }
      const wordArray = CryptoJS.lib.WordArray.create(words, words.length);
      const computedSig = CryptoJS.HmacSHA256(wordArray, SIGNING_KEY).toString(CryptoJS.enc.Hex);

      // 比较签名（constant-time 比较防止时序攻击）
      const expectedSig = signatureText.trim();
      if (computedSig.length !== expectedSig.length) return false;
      let diff = 0;
      for (let i = 0; i < computedSig.length; i++) {
        diff |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
      }
      return diff === 0;
    }

    // 无签名 URL，开发阶段允许通过
    console.warn('[PluginDownloader] No signature URL, allowing unsigned (dev mode)');
    return true;
  } catch (error) {
    console.error('[PluginDownloader] Signature verification error:', error);
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
      console.warn('[PluginDownloader] Web storage save failed:', error);
    }
  } else {
    // 原生平台：使用 expo-file-system 写入各文件
    try {
      const FileSystem = await import('expo-file-system');
      const pluginDir = `${FileSystem.documentDirectory}${targetDir}`;

      // 创建目录
      await FileSystem.makeDirectoryAsync(pluginDir, { intermediates: true });

      // 保存 manifest.json
      await FileSystem.writeAsStringAsync(
        `${pluginDir}manifest.json`,
        JSON.stringify(extracted.manifest)
      );

      // 保存 up.sql
      await FileSystem.writeAsStringAsync(
        `${pluginDir}up.sql`,
        extracted.upSql
      );

      // 保存 down.sql（如果有）
      if (extracted.downSql) {
        await FileSystem.writeAsStringAsync(
          `${pluginDir}down.sql`,
          extracted.downSql
        );
      }

      console.log(`[PluginDownloader] Files saved to: ${pluginDir}`);
    } catch (error) {
      console.error('[PluginDownloader] File save failed:', error);
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
