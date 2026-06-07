/**
 * ChatService - 消息会话数据服务
 * 管理 chat_sessions 和 chat_messages 表的读写操作。
 *
 * 注意：表的创建/删除由 SchemaManager 统一管理（PRD v11.2），
 * ChatService 仅负责数据读写。首次使用时等待 SchemaManager 初始化完毕。
 */
import { getDatabase } from './DatabaseFactory';
import { generateId } from '../utils/generateId';

// ============ 类型定义 ============

export interface ChatSession {
  id: string;
  session_type: 'personal' | 'agent' | 'team' | 'group';
  target_id: string;
  target_name: string;
  target_icon: string;
  last_message: string;
  last_message_time: number;
  unread_count: number;
  is_pinned: number;
  sync_status?: string;
  created_at: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: 'self' | 'other' | 'system';
  content: string;
  created_at: number;
  sync_status?: string;
}

// ============ API ============
// 表由 SchemaManager 统一管理（PRD v11.2）

/** 获取所有会话，按置顶 + 时间倒序 */
export async function getSessions(): Promise<ChatSession[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM chat_sessions ORDER BY is_pinned DESC, last_message_time DESC`
  );
  return rows as ChatSession[];
}

/** 获取某会话的所有消息（按时间正序） */
export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
    [sessionId]
  );
  return rows as ChatMessage[];
}

/** 发送消息 */
export async function sendMessage(
  sessionId: string,
  content: string,
  senderType: 'self' | 'other' | 'system' = 'self'
): Promise<ChatMessage> {
  const db = getDatabase();
  // 审计 E6：发送前验证 session 存在，防止消息成为孤儿记录
  const session = await db.getFirstAsync(
    `SELECT id FROM chat_sessions WHERE id = ?`,
    [sessionId]
  );
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `INSERT INTO chat_messages (id, session_id, sender_type, content, created_at, sync_status) VALUES (?, ?, ?, ?, ?, 'local')`,
    [id, sessionId, senderType, content, now]
  );
  // 更新会话的最后一条消息 + 非自己发的消息递增未读计数
  if (senderType !== 'self') {
    await db.runAsync(
      `UPDATE chat_sessions SET last_message = ?, last_message_time = ?, unread_count = unread_count + 1 WHERE id = ?`,
      [content, now, sessionId]
    );
  } else {
    await db.runAsync(
      `UPDATE chat_sessions SET last_message = ?, last_message_time = ? WHERE id = ?`,
      [content, now, sessionId]
    );
  }
  return { id, session_id: sessionId, sender_type: senderType, content, created_at: now, sync_status: 'local' };
}

/** 标记会话已读 */
export async function markRead(sessionId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`UPDATE chat_sessions SET unread_count = 0 WHERE id = ?`, [sessionId]);
}

/** 切换置顶状态 */
export async function togglePin(sessionId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE chat_sessions SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?`,
    [sessionId]
  );
}

/** 创建或获取与某目标的会话 */
export async function createOrGetSession(
  targetId: string,
  targetName: string,
  sessionType: 'personal' | 'agent' | 'team' | 'group',
  targetIcon: string = ''
): Promise<ChatSession> {
  const db = getDatabase();
  // 查找已有会话
  const existing = await db.getFirstAsync(
    `SELECT * FROM chat_sessions WHERE target_id = ? AND session_type = ?`,
    [targetId, sessionType]
  );
  if (existing) {
    return existing as ChatSession;
  }
  // 创建新会话
  const id = `session_${targetId}_${Date.now()}`;
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `INSERT INTO chat_sessions (id, session_type, target_id, target_name, target_icon, created_at, last_message_time, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'local')`,
    [id, sessionType, targetId, targetName, targetIcon, now, now]
  );
  return {
    id,
    session_type: sessionType,
    target_id: targetId,
    target_name: targetName,
    target_icon: targetIcon,
    last_message: '',
    last_message_time: now,
    unread_count: 0,
    is_pinned: 0,
    sync_status: 'local',
    created_at: now,
  };
}

/** 删除会话 */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM chat_messages WHERE session_id = ?`, [sessionId]);
  await db.runAsync(`DELETE FROM chat_sessions WHERE id = ?`, [sessionId]);
}
