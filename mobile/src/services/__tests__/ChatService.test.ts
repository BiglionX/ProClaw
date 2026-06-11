/// <reference types="jest" />

/**
 * ChatService 单元测试
 * 测试消息会话管理
 */

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock DatabaseFactory
const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
};

jest.mock('../DatabaseFactory', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

// Mock generateId
jest.mock('../../utils/generateId', () => ({
  generateId: jest.fn((prefix) => `${prefix}_${Date.now()}`),
}));

import {
  getSessions,
  getMessages,
  sendMessage,
  markRead,
  togglePin,
  createOrGetSession,
  deleteSession,
} from '../ChatService';

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);
    mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });
  });

  describe('getSessions', () => {
    it('应从数据库查询会话列表', async () => {
      const mockSessions = [
        { id: 'session1', target_name: '张三', last_message: '你好' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockSessions);

      const sessions = await getSessions();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('chat_sessions')
      );
      expect(sessions).toEqual(mockSessions);
    });

    it('数据库错误时应抛出异常', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('DB error'));

      await expect(getSessions()).rejects.toThrow('DB error');
    });

    it('应按置顶和时间排序', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getSessions();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_pinned DESC, last_message_time DESC')
      );
    });
  });

  describe('getMessages', () => {
    it('应查询指定会话的消息', async () => {
      const mockMessages = [
        { id: 'msg1', content: 'Hello' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockMessages);

      const messages = await getMessages('session_123');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('chat_messages'),
        ['session_123']
      );
      expect(messages).toEqual(mockMessages);
    });

    it('应按时间正序排列', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await getMessages('session_123');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        ['session_123']
      );
    });

    it('数据库错误时应抛出异常', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('DB error'));

      await expect(getMessages('session_123')).rejects.toThrow('DB error');
    });
  });

  describe('sendMessage', () => {
    it('session 不存在时应抛出错误', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      await expect(
        sendMessage('nonexistent_session', 'Hello')
      ).rejects.toThrow('Session not found');
    });

    it('session 存在时应插入消息并更新会话', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 'session_123' });
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const message = await sendMessage('session_123', 'Hello');

      expect(message.session_id).toBe('session_123');
      expect(message.content).toBe('Hello');
      expect(message.sender_type).toBe('self');
    });

    it('自己发送的消息不应增加未读计数', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 'session_123' });
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      await sendMessage('session_123', 'My message', 'self');

      // 验证 update 不包含 unread_count
      const updateCall = mockDb.runAsync.mock.calls.find(
        (call) => call[0].includes('UPDATE chat_sessions')
      );
      expect(updateCall[0]).not.toContain('unread_count + 1');
    });

    it('其他用户发送的消息应增加未读计数', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 'session_123' });
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      await sendMessage('session_123', 'Other message', 'other');

      const updateCall = mockDb.runAsync.mock.calls.find(
        (call) => call[0].includes('unread_count + 1')
      );
      expect(updateCall).toBeDefined();
    });

    it('应设置 sync_status 为 local', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 'session_123' });
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const message = await sendMessage('session_123', 'Hello');

      expect(message.sync_status).toBe('local');
    });

    it('可指定 sender_type', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 'session_123' });
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const message = await sendMessage('session_123', 'System msg', 'system');

      expect(message.sender_type).toBe('system');
    });
  });

  describe('markRead', () => {
    it('应更新会话未读数为 0', async () => {
      await markRead('session_123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('unread_count = 0'),
        ['session_123']
      );
    });

    it('应使用正确的表名', async () => {
      await markRead('session_123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE chat_sessions'),
        expect.any(Array)
      );
    });
  });

  describe('togglePin', () => {
    it('应切换置顶状态', async () => {
      await togglePin('session_123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('is_pinned'),
        ['session_123']
      );
    });

    it('应使用 CASE WHEN 逻辑', async () => {
      await togglePin('session_123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END'),
        expect.any(Array)
      );
    });
  });

  describe('createOrGetSession', () => {
    it('会话存在时应返回现有会话', async () => {
      const existingSession = {
        id: 'session_existing',
        target_id: 'target_123',
        target_name: '张三',
        session_type: 'personal',
      };
      mockDb.getFirstAsync.mockResolvedValueOnce(existingSession);

      const session = await createOrGetSession('target_123', '张三', 'personal');

      expect(session).toEqual(existingSession);
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('会话不存在时应创建新会话', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const session = await createOrGetSession('target_456', '李四', 'agent', 'icon_url');

      expect(session.target_id).toBe('target_456');
      expect(session.target_name).toBe('李四');
      expect(session.session_type).toBe('agent');
      expect(session.target_icon).toBe('icon_url');
      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('新会话应有默认属性', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const session = await createOrGetSession('target_789', '王五', 'team');

      expect(session.last_message).toBe('');
      expect(session.unread_count).toBe(0);
      expect(session.is_pinned).toBe(0);
      expect(session.sync_status).toBe('local');
    });

    it('应按 target_id 和 session_type 查询', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      await createOrGetSession('target_123', '测试', 'group');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE target_id = ? AND session_type = ?'),
        ['target_123', 'group']
      );
    });

    it('默认 targetIcon 应为空字符串', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const session = await createOrGetSession('target_123', '测试', 'personal');

      expect(session.target_icon).toBe('');
    });

    it('应插入正确的表字段', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      await createOrGetSession('target_123', '测试', 'personal', 'icon');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_sessions'),
        expect.any(Array)
      );
    });
  });

  describe('deleteSession', () => {
    it('应先删除会话的所有消息', async () => {
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      await deleteSession('session_123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM chat_messages'),
        ['session_123']
      );
    });

    it('应删除会话本身', async () => {
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      await deleteSession('session_123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM chat_sessions'),
        ['session_123']
      );
    });

    it('应调用两次 runAsync', async () => {
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      await deleteSession('session_123');

      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });

    it('消息删除应先于会话删除', async () => {
      const callOrder: string[] = [];
      mockDb.runAsync.mockImplementation((sql: string) => {
        if (sql.includes('chat_messages')) {
          callOrder.push('messages');
        } else if (sql.includes('chat_sessions')) {
          callOrder.push('sessions');
        }
        return Promise.resolve({ rowsAffected: 1 });
      });

      await deleteSession('session_123');

      expect(callOrder[0]).toBe('messages');
      expect(callOrder[1]).toBe('sessions');
    });
  });
});