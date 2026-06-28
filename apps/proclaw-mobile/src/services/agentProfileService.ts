/**
 * Agent 个性化配置（昵称/头像）服务层（移动端版）
 *
 * 对应桌面端 `src/lib/agentProfileService.ts`：
 * - AgentProfileOverride 字段命名 **100% 一致**（agent_id / display_name / avatar_key / custom_avatar_path / updated_at）
 * - 事件名 'proclaw:agent-profile-changed' 与桌面端一致
 *
 * 移动端实现差异：
 * - 数据存储：桌面端用 Tauri + localStorage；移动端用 SQLite agent_profile_overrides 表 + AsyncStorage 缓存
 * - 头像文件：桌面端走 Rust 落盘；移动端走 expo-file-system 写入 app 文档目录
 * - 事件总线：桌面端用 window.dispatchEvent；移动端用 DeviceEventEmitter（Web fallback EventTarget）
 *
 * 接口完整性：
 * - getAgentProfileOverride / listAgentProfileOverrides / saveAgentProfileOverride
 * - deleteAgentProfileOverride / resetAgentProfile / uploadCustomAvatar / readCustomAvatarDataUrl
 * - resolveAgentDisplay（字段命名与桌面端一致）
 */

import { DeviceEventEmitter, Platform } from 'react-native';
import {
  AGENT_AVATAR_PRESETS,
  getAgentAvatarPreset,
  getDefaultAgentAvatar as getDefaultAgentAvatarUrl,
  type AgentAvatarPreset,
} from '../types/agentAvatarLibrary';
import { getDatabase } from './DatabaseFactory';
import { logger } from '../utils/logger';

// ==================== 类型（与桌面端字段命名 100% 一致）====================

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
const PROFILE_CHANGED_DETAIL_KEY = 'agentId';

interface ProfileChangedDetail {
  agentId?: string;
}

/**
 * 通知联系人页/ChatPage 等模块刷新头像显示
 * 使用 DeviceEventEmitter（RN 原生），Web fallback EventTarget
 */
export function emitProfileChanged(agentId?: string) {
  try {
    if (Platform.OS === 'web' && typeof EventTarget !== 'undefined') {
      // Web 平台：使用自定义事件总线（与桌面端 window 事件保持兼容语义）
      const target = (globalThis as any).__proclawEventTarget as EventTarget | undefined;
      if (target && typeof CustomEvent !== 'undefined') {
        target.dispatchEvent(
          new CustomEvent(PROFILE_CHANGED_EVENT, { detail: { agentId } }),
        );
        return;
      }
    }
    DeviceEventEmitter.emit(PROFILE_CHANGED_EVENT, { agentId });
  } catch (e) {
    logger.warn('[agentProfileService] emitProfileChanged failed:', e);
  }
}

/**
 * 监听 Agent 个性化变更
 * @returns 取消监听的函数
 */
export function onProfileChanged(
  handler: (agentId?: string) => void,
): () => void {
  if (Platform.OS === 'web' && typeof EventTarget !== 'undefined') {
    const target = (globalThis as any).__proclawEventTarget as EventTarget;
    if (target) {
      const wrapped = (e: Event) => {
        const detail = (e as CustomEvent<ProfileChangedDetail>).detail;
        handler(detail?.agentId);
      };
      target.addEventListener(PROFILE_CHANGED_EVENT, wrapped as EventListener);
      return () => target.removeEventListener(PROFILE_CHANGED_EVENT, wrapped as EventListener);
    }
  }

  const sub = DeviceEventEmitter.addListener(
    PROFILE_CHANGED_EVENT,
    (detail: ProfileChangedDetail) => handler(detail?.agentId),
  );
  return () => sub.remove();
}

// ==================== AsyncStorage 缓存层（Web 平台降级）====================

const DEV_CACHE_KEY = 'proclaw:agent-profile-overrides';

let _asyncStorage: any = null;
async function getAsyncStorage() {
  if (_asyncStorage !== null) return _asyncStorage;
  try {
    _asyncStorage = await import('@react-native-async-storage/async-storage');
  } catch {
    _asyncStorage = false; // 不可用
  }
  return _asyncStorage;
}

async function readDevCache(): Promise<Record<string, AgentProfileOverride>> {
  try {
    const AS = await getAsyncStorage();
    if (!AS) return {};
    const raw = await AS.default.getItem(DEV_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AgentProfileOverride>) : {};
  } catch {
    return {};
  }
}

async function writeDevCache(map: Record<string, AgentProfileOverride>) {
  try {
    const AS = await getAsyncStorage();
    if (!AS) return;
    await AS.default.setItem(DEV_CACHE_KEY, JSON.stringify(map));
  } catch (err) {
    logger.warn('[agentProfileService] writeDevCache failed:', err);
  }
}

// ==================== 数据库行类型（INTEGER → ISO string）====================

interface AgentProfileRow {
  agent_id: string;
  display_name: string | null;
  avatar_key: string | null;
  custom_avatar_path: string | null;
  updated_at: number;
}

function rowToProfile(row: AgentProfileRow): AgentProfileOverride {
  return {
    agent_id: row.agent_id,
    display_name: row.display_name,
    avatar_key: row.avatar_key,
    custom_avatar_path: row.custom_avatar_path,
    // 数据库存的是 INTEGER（unix seconds），UI 用 ISO string（与桌面端一致）
    updated_at: new Date(row.updated_at * 1000).toISOString(),
  };
}

// ==================== 核心 API ====================

/**
 * 内部：尝试从 SQLite 读取单条 override
 * 数据库未就绪时返回 null（调用方应回退到 AsyncStorage）
 */
async function readFromDb(agentId: string): Promise<AgentProfileOverride | null> {
  try {
    const db = getDatabase();
    const row = (await db.getFirstAsync(
      `SELECT agent_id, display_name, avatar_key, custom_avatar_path, updated_at
       FROM agent_profile_overrides WHERE agent_id = ?`,
      [agentId],
    )) as AgentProfileRow | null;
    return row ? rowToProfile(row) : null;
  } catch {
    return null;
  }
}

/**
 * 内部：尝试 upsert 一条 override 到 SQLite
 */
async function upsertInDb(profile: AgentProfileOverride): Promise<boolean> {
  try {
    const db = getDatabase();
    const updatedAt = Math.floor(new Date(profile.updated_at).getTime() / 1000);
    await db.runAsync(
      `INSERT OR REPLACE INTO agent_profile_overrides
       (agent_id, display_name, avatar_key, custom_avatar_path, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        profile.agent_id,
        profile.display_name,
        profile.avatar_key,
        profile.custom_avatar_path,
        updatedAt,
      ],
    );
    return true;
  } catch (e) {
    logger.warn('[agentProfileService] upsertInDb failed:', e);
    return false;
  }
}

/**
 * 内部：从 SQLite 删除一条 override
 */
async function deleteFromDb(agentId: string): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.runAsync(
      `DELETE FROM agent_profile_overrides WHERE agent_id = ?`,
      [agentId],
    );
    return true;
  } catch (e) {
    logger.warn('[agentProfileService] deleteFromDb failed:', e);
    return false;
  }
}

/**
 * 查询单个 Agent 的个性化覆盖
 * 优先 SQLite，未就绪时回退 AsyncStorage
 */
export async function getAgentProfileOverride(
  agentId: string,
): Promise<AgentProfileOverride | null> {
  const fromDb = await readFromDb(agentId);
  if (fromDb !== null) return fromDb;
  const cache = await readDevCache();
  return cache[agentId] || null;
}

/**
 * 列出所有 override（启动时一次性预热缓存）
 */
export async function listAgentProfileOverrides(): Promise<AgentProfileOverride[]> {
  try {
    const db = getDatabase();
    const rows = (await db.getAllAsync(
      `SELECT agent_id, display_name, avatar_key, custom_avatar_path, updated_at
       FROM agent_profile_overrides ORDER BY updated_at DESC`,
    )) as AgentProfileRow[];
    return rows.map(rowToProfile);
  } catch {
    const cache = await readDevCache();
    return Object.values(cache);
  }
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

  // 主存储 SQLite
  const dbOk = await upsertInDb(next);

  // 兜底：即使 DB 写入失败，也保存到 AsyncStorage（保证 Web 平台可用）
  const cache = await readDevCache();
  cache[agentId] = next;
  await writeDevCache(cache);

  if (!dbOk) {
    logger.warn('[agentProfileService] saveAgentProfileOverride persisted only to cache');
  }

  emitProfileChanged(agentId);
  return next;
}

/**
 * 删除个性化覆盖（恢复默认）
 */
export async function deleteAgentProfileOverride(agentId: string): Promise<boolean> {
  const dbOk = await deleteFromDb(agentId);
  const cache = await readDevCache();
  delete cache[agentId];
  await writeDevCache(cache);
  emitProfileChanged(agentId);
  return dbOk;
}

/**
 * 上传自定义头像
 *
 * 接收 expo-image-picker 的 Asset，写入 app 文档目录的 agent_avatars/<agentId>/<hash>.jpg
 * 原生平台（expo-file-system）写入文件，返回相对路径；Web 平台回退到 dataUrl 存数据库。
 *
 * 限制 ≤ 2MB
 */
export async function uploadCustomAvatar(
  agentId: string,
  file: { uri: string; size?: number; mimeType?: string },
): Promise<UploadAvatarResult | null> {
  const sizeBytes = file.size ?? 0;
  if (sizeBytes > 2 * 1024 * 1024) {
    throw new Error('头像文件不能超过 2MB');
  }
  if (file.mimeType && !file.mimeType.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }

  if (Platform.OS === 'web') {
    // Web 平台：直接把 dataUrl 存入数据库（与桌面端 dev 模式一致）
    const dataUrl = file.uri;
    await saveAgentProfileOverride(agentId, {
      avatar_key: null,
      custom_avatar_path: dataUrl,
    });
    return { relative_path: dataUrl, size_bytes: sizeBytes };
  }

  // 原生平台：用 expo-file-system 写入文件
  try {
    const FileSystem = await import('expo-file-system');
    const dir = `${FileSystem.Paths.document.uri}agent_avatars/${agentId}/`;

    // 创建目录（expo-file-system v19 API）
    const directory = new FileSystem.Directory(dir);
    if (!directory.exists) {
      await directory.create({ intermediates: true });
    }

    // 计算文件 hash（用 uri 的 basename + 当前时间，避免碰撞）
    const timestamp = Date.now();
    const ext = file.uri.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg';
    const filename = `${timestamp}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    const targetUri = `${dir}${filename}`;

    // 从源 uri 复制到目标位置
    const sourceFile = new FileSystem.File(file.uri);
    const targetFile = new FileSystem.File(targetUri);
    await sourceFile.copy(targetFile);

    // 返回相对路径（供 SQLite 存储）
    const relativePath = `agent_avatars/${agentId}/${filename}`;
    return { relative_path: relativePath, size_bytes: sizeBytes };
  } catch (e) {
    logger.error('[agentProfileService] uploadCustomAvatar failed:', e);
    throw new Error('头像保存失败：' + (e instanceof Error ? e.message : String(e)));
  }
}

/**
 * 异步读取 custom_avatar_path 的 dataUrl
 *
 * - Web 平台：custom_avatar_path 本身就是 dataUrl，直接返回
 * - 原生平台：custom_avatar_path 是相对路径，从 expo-file-system 读取并转 base64
 */
export async function readCustomAvatarDataUrl(
  relativePath: string,
): Promise<string | null> {
  if (!relativePath) return null;
  if (relativePath.startsWith('data:')) return relativePath;

  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const FileSystem = await import('expo-file-system');
    const file = new FileSystem.File(`${FileSystem.Paths.document.uri}${relativePath}`);
    if (!file.exists) return null;

    // expo-file-system v19 读取二进制，转 base64
    const base64 = await file.base64();
    // 简单探测 mime 类型
    const ext = relativePath.match(/\.(jpe?g|png|webp|gif)$/i)?.[1]?.toLowerCase() || 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    return `data:${mimeMap[ext] || 'image/jpeg'};base64,${base64}`;
  } catch (e) {
    logger.warn('[agentProfileService] readCustomAvatarDataUrl failed:', e);
    return null;
  }
}

/**
 * 读取本地自定义头像的 file:// URI（供 <Image source={{ uri }}> 直接使用）
 *
 * 与 readCustomAvatarDataUrl 不同：本函数返回 file:// URI，避免大图转 base64 占用内存
 */
export async function readCustomAvatarFileUri(
  relativePath: string,
): Promise<string | null> {
  if (!relativePath) return null;
  if (relativePath.startsWith('data:') || relativePath.startsWith('file:')) {
    return relativePath;
  }
  if (Platform.OS === 'web') return null;

  try {
    const FileSystem = await import('expo-file-system');
    const file = new FileSystem.File(`${FileSystem.Paths.document.uri}${relativePath}`);
    if (!file.exists) return null;
    return file.uri;
  } catch {
    return null;
  }
}

// ==================== 组合显示工具 ====================

/**
 * 头像显示信息
 */
export interface ResolvedAgentDisplay {
  /** 最终展示名（override 优先） */
  displayName: string;
  /** 头像 key（库头像）或 null（自定义头像） */
  avatarKey: string | null;
  /** 自定义头像路径（dataUrl 或相对路径） */
  customAvatarPath: string | null;
  /** 头像 emoji 兜底 */
  avatarFallback: string;
  /** 当前使用的头像库 key（用于在选择器中标记选中） */
  activeAvatarKey: string | null;
  /** 是否使用用户上传的自定义头像 */
  isCustomAvatar: boolean;
}

/**
 * 组合显示信息：override 优先 → 库头像 → 默认
 *
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
  let activeAvatarKey: string | null = null;
  let isCustomAvatar = false;

  if (ovr?.custom_avatar_path) {
    isCustomAvatar = true;
  } else if (ovr?.avatar_key) {
    const preset = getAgentAvatarPreset(ovr.avatar_key);
    if (preset) {
      activeAvatarKey = ovr.avatar_key;
    } else {
      activeAvatarKey = getDefaultAgentAvatarUrl(agentId);
    }
  } else {
    activeAvatarKey = getDefaultAgentAvatarUrl(agentId);
  }

  return {
    displayName,
    avatarKey: activeAvatarKey,
    customAvatarPath: ovr?.custom_avatar_path || null,
    avatarFallback: defaultEmoji,
    activeAvatarKey: isCustomAvatar ? null : activeAvatarKey,
    isCustomAvatar,
  };
}

/**
 * 重置为默认（删除 override）
 */
export async function resetAgentProfile(agentId: string): Promise<boolean> {
  return deleteAgentProfileOverride(agentId);
}

export { AGENT_AVATAR_PRESETS, type AgentAvatarPreset };