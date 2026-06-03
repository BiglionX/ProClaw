/**
 * 插件权限管理器 Permission Manager
 *
 * 管理插件权限的声明、展示、确认和运行时校验。
 *
 * PRD v10.0 权限规范：
 * - 插件在 manifest.json 中声明所需权限
 * - 安装时向用户展示权限列表，用户确认后写入许可
 * - 运行时校验：每次 API 调用前检查权限
 */

import { safeInvoke, isTauri } from './tauri';
import type { IndustryPluginManifest } from '../config/appMode';

/** 权限定义 */
export interface PermissionDef {
  id: string;
  label: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/** 已授予的权限记录 */
interface GrantedPermission {
  pluginId: string;
  permissions: string[];
  grantedAt: string;
  pluginVersion: string;
}

/** 预定义的权限清单 */
export const ALL_PERMISSIONS: PermissionDef[] = [
  {
    id: 'database:create_table',
    label: '创建数据库表',
    description: '允许插件创建新的数据表以存储行业特有数据',
    riskLevel: 'medium',
  },
  {
    id: 'database:read:*',
    label: '读取所有数据',
    description: '允许插件读取所有数据库表中的数据',
    riskLevel: 'high',
  },
  {
    id: 'database:write:*',
    label: '写入所有数据',
    description: '允许插件新增、修改、删除数据库中的数据',
    riskLevel: 'high',
  },
  {
    id: 'menu:add',
    label: '添加导航菜单',
    description: '允许插件在侧边栏添加导航菜单项',
    riskLevel: 'low',
  },
  {
    id: 'printer:write',
    label: '打印',
    description: '允许插件调用本地打印机打印小票、单据等',
    riskLevel: 'medium',
  },
  {
    id: 'notification:send',
    label: '发送通知',
    description: '允许插件向用户发送桌面通知',
    riskLevel: 'low',
  },
  {
    id: 'filesystem:read',
    label: '读取文件系统',
    description: '允许插件读取本地文件系统中的文件',
    riskLevel: 'high',
  },
  {
    id: 'filesystem:write',
    label: '写入文件系统',
    description: '允许插件在本地文件系统中创建或修改文件',
    riskLevel: 'high',
  },
  {
    id: 'network:http',
    label: 'HTTP 网络请求',
    description: '允许插件发起 HTTP 网络请求',
    riskLevel: 'medium',
  },
];

/** 权限 ID 到定义的快速查找 */
const permissionMap = new Map<string, PermissionDef>();
for (const perm of ALL_PERMISSIONS) {
  permissionMap.set(perm.id, perm);
}

/**
 * 获取权限的中文标签
 */
export function getPermissionLabel(permissionId: string): string {
  return permissionMap.get(permissionId)?.label ?? permissionId;
}

/**
 * 获取权限的描述
 */
export function getPermissionDescription(permissionId: string): string {
  return permissionMap.get(permissionId)?.description ?? '未知权限';
}

/**
 * 获取权限的风险等级
 */
export function getPermissionRiskLevel(permissionId: string): string {
  return permissionMap.get(permissionId)?.riskLevel ?? 'medium';
}

// ============ 权限存储（localStorage） ============

const STORAGE_KEY = 'proclaw-plugin-permissions';

/**
 * 从 localStorage 读取已授予的权限
 */
function loadGrantedPermissions(): GrantedPermission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GrantedPermission[];
  } catch {
    return [];
  }
}

/**
 * 将已授予的权限保存到 localStorage
 */
function saveGrantedPermissions(grants: GrantedPermission[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(grants));
}

/**
 * 检查用户是否已授予插件指定权限（本地记录）
 */
export function hasLocalPermission(pluginId: string, permissionId: string): boolean {
  const grants = loadGrantedPermissions();
  const grant = grants.find((g) => g.pluginId === pluginId);
  if (!grant) return false;
  return grant.permissions.some((p) => {
    // 精确匹配
    if (p === permissionId) return true;
    // 通配符匹配（如 database:read:* 匹配 database:read:products）
    if (p.endsWith(':*') && permissionId.startsWith(p.slice(0, -1))) {
      return true;
    }
    return false;
  });
}

/**
 * 获取插件已获授权的所有权限列表
 */
export function getPluginGrantedPermissions(pluginId: string): string[] {
  const grants = loadGrantedPermissions();
  return grants.find((g) => g.pluginId === pluginId)?.permissions ?? [];
}

/**
 * 保存插件权限授权记录
 */
export function grantPluginPermissions(
  pluginId: string,
  permissions: string[],
  pluginVersion: string
): void {
  const grants = loadGrantedPermissions();
  const existingIndex = grants.findIndex((g) => g.pluginId === pluginId);

  const grant: GrantedPermission = {
    pluginId,
    permissions,
    grantedAt: new Date().toISOString(),
    pluginVersion,
  };

  if (existingIndex >= 0) {
    grants[existingIndex] = grant;
  } else {
    grants.push(grant);
  }

  saveGrantedPermissions(grants);
}

/**
 * 清除插件权限授权（卸载插件时调用）
 */
export function revokePluginPermissions(pluginId: string): void {
  const grants = loadGrantedPermissions().filter((g) => g.pluginId !== pluginId);
  saveGrantedPermissions(grants);
}

/**
 * 从插件 manifest 解析权限声明列表
 */
export function getManifestPermissions(manifest: IndustryPluginManifest): string[] {
  return manifest.permissions ?? [];
}

/**
 * 检查插件 manifest 声明的权限是否都有中文描述
 */
export function validatePermissions(permissions: string[]): {
  valid: boolean;
  unknownPermissions: string[];
} {
  const unknownPermissions = permissions.filter((p) => !permissionMap.has(p));
  return {
    valid: unknownPermissions.length === 0,
    unknownPermissions,
  };
}

// ============ 安装时权限确认对话框 ============

/**
 * 显示权限确认对话框
 *
 * 在插件安装时调用，向用户展示插件声明的权限列表，
 * 用户点击"同意"后保存授权记录。
 *
 * @param pluginName - 插件名称
 * @param permissions - 插件声明的权限 ID 列表
 * @returns 用户是否同意
 */
export async function showPermissionDialog(
  pluginName: string,
  permissions: string[]
): Promise<boolean> {
  // 如果没有权限声明，直接通过
  if (!permissions || permissions.length === 0) {
    return true;
  }

  // 解析权限详情
  const permissionDetails = permissions.map((id) => ({
    id,
    label: getPermissionLabel(id),
    description: getPermissionDescription(id),
    riskLevel: getPermissionRiskLevel(id),
  }));

  // 按风险等级分组
  const highRisk = permissionDetails.filter((p) => p.riskLevel === 'high');
  const mediumRisk = permissionDetails.filter((p) => p.riskLevel === 'medium');
  const lowRisk = permissionDetails.filter((p) => p.riskLevel === 'low');

  // 构建确认消息
  let message = `插件「${pluginName}」请求以下权限：\n\n`;

  if (highRisk.length > 0) {
    message += `🔴 高风险权限：\n${highRisk.map((p) => `  • ${p.label}：${p.description}`).join('\n')}\n\n`;
  }
  if (mediumRisk.length > 0) {
    message += `🟡 中风险权限：\n${mediumRisk.map((p) => `  • ${p.label}：${p.description}`).join('\n')}\n\n`;
  }
  if (lowRisk.length > 0) {
    message += `🟢 低风险权限：\n${lowRisk.map((p) => `  • ${p.label}`).join('\n')}\n\n`;
  }

  message += '是否同意授予以上权限？';

  // 使用浏览器的 confirm 对话框（Tauri 环境中可使用原生对话框）
  return window.confirm(message);
}

// ============ 运行时权限校验 ============

/**
 * 运行时校验权限（集成 Tauri 命令）
 *
 * 检查插件是否在 manifest 中声明了指定权限，同时检查本地授权记录。
 * 既支持纯前端校验（localStorage），也支持 Rust 侧校验（Tauri 命令）。
 *
 * @param pluginId - 插件 ID
 * @param requiredPermission - 所需权限 ID
 * @returns 是否有权限
 */
export async function checkRuntimePermission(
  pluginId: string,
  requiredPermission: string
): Promise<boolean> {
  // 1. 本地 localStorage 检查
  if (hasLocalPermission(pluginId, requiredPermission)) {
    return true;
  }

  // 2. Rust 侧权限检查（Tauri 环境）
  if (isTauri()) {
    try {
      const result = await safeInvoke<boolean>('verify_plugin_permission', {
        pluginId,
        requiredPermission,
      });
      return result === true;
    } catch {
      return false;
    }
  }

  return false;
}
