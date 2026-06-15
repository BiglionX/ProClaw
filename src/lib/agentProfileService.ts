/**
 * Agent 个性化配置（昵称/头像）服务层
 *
 * 包装 Rust 端 agent_profile_commands.rs 的 6 个命令，
 * 提供前端业务层需要的工具函数：批量读取、单条 upsert、上传/读取头像、
 * 缓存失效（事件总线）。
 *
 * 浏览器开发模式下 safeInvoke 返回 null，本服务会：
 * - 退回到 localStorage 缓存（key: proclaw:agent-profile-overrides）
 * - 这样 dev server 也能完整跑通前端逻辑
 */

import { isTauri, safeInvoke } from './tauri';
import {
  AGENT_AVATAR_PRESETS,
  getAgentAvatarPreset,
  getDefaultAgentAvatar as getDefaultAgentAvatarUrl,
  type AgentAvatarPreset,
} from '../types/agentAvatarLibrary';

// ==================== 类型 ====================

export interface AgentProfileOverride {
  agent_id: string;
  display_name: string | null;
  avatar_key: string | null;
  custom_avatar_path: string | null;
  updated_at: string;
}

export interface UploadAvatarResult {
  relative_path: string;
  size_bytes: number;
}

// ==================== 事件总线 ====================

const PROFILE_CHANGED_EVENT = 'proclaw:agent-profile-changed';

/**
 * 通知联系人页/ChatPage 等模块刷新头像显示
 */
export function emitProfileChanged(agentId?: string) {
  window.dispatchEvent(
    new CustomEvent(PROFILE_CHANGED_EVENT, { detail: { agentId } }),
  );
}

/**
 * 监听 Agent 个性化变更
 * @returns 取消监听的函数
 */
export function onProfileChanged(handler: (agentId?: string) => void): () => void {
  const wrapped = (e: Event) => {
    const detail = (e as CustomEvent<{ agentId?: string }>).detail;
    handler(detail?.agentId);
  };
  window.addEventListener(PROFILE_CHANGED_EVENT, wrapped);
  return () => window.removeEventListener(PROFILE_CHANGED_EVENT, wrapped);
}

// ==================== 浏览器降级 ====================

const DEV_CACHE_KEY = 'proclaw:agent-profile-overrides';

function readDevCache(): Record<string, AgentProfileOverride> {
  try {
    const raw = localStorage.getItem(DEV_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AgentProfileOverride>) : {};
  } catch {
    return {};
  }
}

function writeDevCache(map: Record<string, AgentProfileOverride>) {
  try {
    localStorage.setItem(DEV_CACHE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[agentProfileService] 写入 dev cache 失败:', err);
  }
}

function setDevCacheItem(profile: AgentProfileOverride) {
  const map = readDevCache();
  map[profile.agent_id] = profile;
  writeDevCache(map);
}

function deleteDevCacheItem(agentId: string) {
  const map = readDevCache();
  delete map[agentId];
  writeDevCache(map);
}

// ==================== 核心 API ====================

/**
 * 查询单个 Agent 的个性化覆盖
 * dev 模式下从 localStorage 读取
 */
export async function getAgentProfileOverride(
  agentId: string,
): Promise<AgentProfileOverride | null> {
  if (!isTauri()) {
    return readDevCache()[agentId] || null;
  }
  const result = await safeInvoke<AgentProfileOverride | null>(
    'get_agent_profile_override',
    { agentId },
  );
  return result || null;
}

/**
 * 列出所有 override（启动时一次性预热缓存）
 */
export async function listAgentProfileOverrides(): Promise<AgentProfileOverride[]> {
  if (!isTauri()) {
    return Object.values(readDevCache());
  }
  const result = await safeInvoke<AgentProfileOverride[]>(
    'list_agent_profile_overrides',
  );
  return result || [];
}

/**
 * 创建或更新个性化覆盖
 */
export async function saveAgentProfileOverride(
  agentId: string,
  fields: Partial<Pick<AgentProfileOverride, 'display_name' | 'avatar_key' | 'custom_avatar_path'>>,
): Promise<AgentProfileOverride | null> {
  // 读取现有或构造新
  let existing = await getAgentProfileOverride(agentId);
  if (!existing) {
    existing = {
      agent_id: agentId,
      display_name: null,
      avatar_key: null,
      custom_avatar_path: null,
      updated_at: new Date().toISOString(),
    };
  }
  const next: AgentProfileOverride = {
    ...existing,
    ...fields,
    updated_at: new Date().toISOString(),
  };

  if (!isTauri()) {
    setDevCacheItem(next);
    emitProfileChanged(agentId);
    return next;
  }

  const result = await safeInvoke<AgentProfileOverride | null>(
    'upsert_agent_profile_override',
    { profile: next },
  );
  emitProfileChanged(agentId);
  return result || next;
}

/**
 * 删除个性化覆盖（恢复默认）
 */
export async function deleteAgentProfileOverride(agentId: string): Promise<boolean> {
  if (!isTauri()) {
    deleteDevCacheItem(agentId);
    emitProfileChanged(agentId);
    return true;
  }
  const result = await safeInvoke<boolean>('delete_agent_profile_override', { agentId });
  emitProfileChanged(agentId);
  return !!result;
}

/**
 * 上传自定义头像（File → base64 → Rust 落盘）
 * 限制 ≤2MB
 */
export async function uploadCustomAvatar(
  agentId: string,
  file: File,
): Promise<UploadAvatarResult | null> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('头像文件不能超过 2MB');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }
  const dataUrl = await readFileAsDataURL(file);

  if (!isTauri()) {
    // dev 模式：把 dataUrl 缓存在 localStorage
    setDevCacheItem({
      agent_id: agentId,
      display_name: null,
      avatar_key: null,
      custom_avatar_path: dataUrl, // dev 模式直接当 dataUrl 用
      updated_at: new Date().toISOString(),
    });
    emitProfileChanged(agentId);
    return { relative_path: dataUrl, size_bytes: file.size };
  }

  const result = await safeInvoke<UploadAvatarResult>('upload_custom_avatar', {
    input: { agent_id: agentId, data_url: dataUrl },
  });
  return result;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

// ==================== 组合显示工具 ====================

/**
 * 头像显示信息
 */
export interface ResolvedAgentDisplay {
  /** 最终展示名（override 优先） */
  displayName: string;
  /** 头像 URL（custom_avatar > avatar_key 库 > 默认 SVG） */
  avatarUrl: string;
  /** 头像 emoji 兜底 */
  avatarFallback: string;
  /** 当前使用的头像库 key（用于在选择器中标记选中） */
  activeAvatarKey: string | null;
  /** 是否使用用户上传的自定义头像 */
  isCustomAvatar: boolean;
}

/**
 * 组合显示信息：override 优先 → 库头像 → 默认
 * @param agentId Agent ID
 * @param defaultName 默认昵称
 * @param defaultEmoji 兜底 emoji
 * @param override 用户 override（可空，由服务层内部读取）
 */
export function resolveAgentDisplay(
  agentId: string,
  defaultName: string,
  defaultEmoji: string = '🤖',
  override?: AgentProfileOverride | null,
): ResolvedAgentDisplay {
  const ovr = override ?? null;
  const displayName = ovr?.display_name || defaultName;

  // 头像优先级：custom_avatar_path → avatar_key 库 → 默认
  let avatarUrl: string;
  let isCustomAvatar = false;
  let activeAvatarKey: string | null = null;

  if (ovr?.custom_avatar_path) {
    // dev 模式下 custom_avatar_path 直接是 dataUrl
    if (ovr.custom_avatar_path.startsWith('data:')) {
      avatarUrl = ovr.custom_avatar_path;
      isCustomAvatar = true;
    } else {
      // Tauri 模式：路径需要 read_custom_avatar 转 dataUrl
      // 这里返回 path，由组件调用 readCustomAvatarDataUrl 异步加载
      avatarUrl = ovr.custom_avatar_path;
      isCustomAvatar = true;
    }
  } else if (ovr?.avatar_key) {
    const preset = getAgentAvatarPreset(ovr.avatar_key);
    avatarUrl = preset?.src || getDefaultAgentAvatarUrl(agentId);
    activeAvatarKey = ovr.avatar_key;
  } else {
    avatarUrl = getDefaultAgentAvatarUrl(agentId);
  }

  return {
    displayName,
    avatarUrl,
    avatarFallback: defaultEmoji,
    activeAvatarKey,
    isCustomAvatar,
  };
}

/**
 * 异步读取 custom_avatar_path 的 dataUrl（Tauri 模式）
 */
export async function readCustomAvatarDataUrl(relativePath: string): Promise<string | null> {
  if (relativePath.startsWith('data:')) return relativePath;
  if (!isTauri()) return null;
  const result = await safeInvoke<string>('read_custom_avatar', { relativePath });
  return result;
}

/**
 * 重置为默认（删除 override）
 */
export async function resetAgentProfile(agentId: string): Promise<boolean> {
  return deleteAgentProfileOverride(agentId);
}

export { AGENT_AVATAR_PRESETS, type AgentAvatarPreset };
