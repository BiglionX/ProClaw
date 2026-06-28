/// <reference types="jest" />

/**
 * InvitationService 单元测试
 * 测试邀请链接解析、接受邀请 API 调用
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

// 全局 fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  acceptInvitation,
  acceptEmployeeInvitation,
  parseInviteLink,
  type AcceptInvitationRequest,
  type AcceptInvitationResponse,
  type AcceptEmployeeInvitationRequest,
  type AcceptEmployeeInvitationResponse,
} from '../InvitationService';

describe('InvitationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('acceptInvitation', () => {
    it('成功时应返回响应数据', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: '邀请接受成功',
          user_id: 'user_123',
          token: 'jwt_token_here',
        }),
      });

      const request: AcceptInvitationRequest = {
        invite_code: 'INVITE123',
        new_user: {
          name: '张三',
          phone: '13800138000',
          password: 'password123',
        },
      };

      const result = await acceptInvitation('https://api.example.com', request);

      expect(result.success).toBe(true);
      expect(result.user_id).toBe('user_123');
      expect(result.token).toBe('jwt_token_here');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/invitations/accept',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('服务器返回错误时应抛出异常', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: '邀请码无效' }),
      });

      const request: AcceptInvitationRequest = {
        invite_code: 'INVALID',
        new_user: { name: '测试' },
      };

      await expect(
        acceptInvitation('https://api.example.com', request)
      ).rejects.toThrow('邀请码无效');
    });

    it('网络错误时应抛出异常', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request: AcceptInvitationRequest = {
        invite_code: 'CODE123',
        new_user: { name: '测试' },
      };

      await expect(
        acceptInvitation('https://api.example.com', request)
      ).rejects.toThrow('Network error');
    });

    it('应正确设置 Content-Type 头', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const request: AcceptInvitationRequest = {
        invite_code: 'CODE123',
        new_user: { name: '测试' },
      };

      await acceptInvitation('https://api.example.com', request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('应正确序列化请求体', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const request: AcceptInvitationRequest = {
        invite_code: 'CODE123',
        new_user: {
          name: '张三',
          phone: '13800138000',
        },
      };

      await acceptInvitation('https://api.example.com', request);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.invite_code).toBe('CODE123');
      expect(body.new_user.name).toBe('张三');
      expect(body.new_user.phone).toBe('13800138000');
    });
  });

  describe('acceptEmployeeInvitation', () => {
    it('成功时应返回响应数据', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: '员工邀请接受成功',
          user_id: 'emp_456',
          roles: ['staff', 'sales'],
        }),
      });

      const request: AcceptEmployeeInvitationRequest = {
        invite_code: 'EMP_INVITE_789',
        phone: '13900139000',
        name: '李四',
        password: 'securepwd',
      };

      const result = await acceptEmployeeInvitation('https://api.example.com', request);

      expect(result.success).toBe(true);
      expect(result.user_id).toBe('emp_456');
      expect(result.roles).toContain('staff');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/invitations/accept_employee',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('邀请码已使用时应抛出异常', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: '邀请码已被使用' }),
      });

      const request: AcceptEmployeeInvitationRequest = {
        invite_code: 'USED_CODE',
        phone: '13900139000',
        name: '已使用',
      };

      await expect(
        acceptEmployeeInvitation('https://api.example.com', request)
      ).rejects.toThrow('邀请码已被使用');
    });

    it('无密码时应能正常发送请求', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: '员工邀请接受成功',
          user_id: 'emp_789',
        }),
      });

      const request: AcceptEmployeeInvitationRequest = {
        invite_code: 'EMP_CODE',
        phone: '13900139000',
        name: '无密码员工',
      };

      const result = await acceptEmployeeInvitation('https://api.example.com', request);

      expect(result.success).toBe(true);
    });

    it('网络错误时应抛出异常', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const request: AcceptEmployeeInvitationRequest = {
        invite_code: 'CODE123',
        phone: '13900139000',
        name: '测试',
      };

      await expect(
        acceptEmployeeInvitation('https://api.example.com', request)
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('parseInviteLink', () => {
    describe('完整 URL 格式', () => {
      it('应解析标准 HTTPS URL', () => {
        const result = parseInviteLink(
          'https://proclaw.app/invite?code=ABC123&host=https://api.proclaw.app&type=partner'
        );

        expect(result.invite_code).toBe('ABC123');
        expect(result.host).toBe('https://api.proclaw.app');
        expect(result.type).toBe('partner');
      });

      it('应解析无 type 参数的 URL', () => {
        const result = parseInviteLink(
          'https://proclaw.app/invite?code=TEST&host=https://server.com'
        );

        expect(result.invite_code).toBe('TEST');
        expect(result.host).toBe('https://server.com');
        expect(result.type).toBeUndefined();
      });

      it('应解析只有 code 的 URL', () => {
        const result = parseInviteLink(
          'https://proclaw.app/invite?code=ONLY_CODE'
        );

        expect(result.invite_code).toBe('ONLY_CODE');
        expect(result.host).toBeUndefined();
        expect(result.type).toBeUndefined();
      });
    });

    describe('自定义协议格式', () => {
      it('应解析 proclaw:// 协议链接', () => {
        const result = parseInviteLink(
          'proclaw://invite?code=PROTOCOL123&host=https://api.example.com&type=employee'
        );

        expect(result.invite_code).toBe('PROTOCOL123');
        expect(result.host).toBe('https://api.example.com');
        expect(result.type).toBe('employee');
      });

      it('应正确解码 URL 编码的 host', () => {
        const result = parseInviteLink(
          'proclaw://invite?code=ENCODED&host=https%3A%2F%2Fapi.example.com&type=test'
        );

        expect(result.host).toBe('https://api.example.com');
      });

      it('应解析无 type 的协议链接', () => {
        const result = parseInviteLink(
          'proclaw://invite?code=NOTYPE&host=https://server.com'
        );

        expect(result.invite_code).toBe('NOTYPE');
        expect(result.type).toBeUndefined();
      });

      it('应解析只有 code 的协议链接', () => {
        const result = parseInviteLink(
          'proclaw://invite?code=CODE_ONLY'
        );

        expect(result.invite_code).toBe('CODE_ONLY');
        expect(result.host).toBeUndefined();
      });
    });

    describe('无效格式处理', () => {
      it('空字符串应返回空对象', () => {
        const result = parseInviteLink('');

        expect(result).toEqual({});
      });

      it('无效 URL 应返回空对象', () => {
        const result = parseInviteLink('not-a-valid-url');

        expect(result).toEqual({});
      });

      it('proclaw:// 无 invite 路径应尝试解析为标准 URL', () => {
        const result = parseInviteLink('proclaw://other?code=123');

        // 函数会尝试作为标准 URL 解析
        expect(result.invite_code).toBe('123');
      });

      it('缺少 code 参数应返回空对象', () => {
        const result = parseInviteLink(
          'https://proclaw.app/invite?host=https://server.com'
        );

        expect(result.invite_code).toBeUndefined();
      });
    });

    describe('边界情况', () => {
      it('特殊字符在 code 中应正确处理', () => {
        const result = parseInviteLink(
          'proclaw://invite?code=CODE-123_TEST&host=https://server.com'
        );

        expect(result.invite_code).toBe('CODE-123_TEST');
      });

      it('多个 & 符号应正确解析', () => {
        const result = parseInviteLink(
          'https://proclaw.app/invite?code=A&host=B&type=C&extra=D'
        );

        expect(result.invite_code).toBe('A');
        expect(result.host).toBe('B');
        expect(result.type).toBe('C');
      });
    });
  });

  describe('请求体验证', () => {
    it('acceptInvitation 应发送正确的 JSON 结构', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await acceptInvitation('https://api.example.com', {
        invite_code: 'TEST_CODE',
        new_user: {
          name: '用户名',
          phone: '12345678901',
          password: 'pwd123',
        },
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body).toEqual({
        invite_code: 'TEST_CODE',
        new_user: {
          name: '用户名',
          phone: '12345678901',
          password: 'pwd123',
        },
      });
    });

    it('acceptEmployeeInvitation 应发送正确的 JSON 结构', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await acceptEmployeeInvitation('https://api.example.com', {
        invite_code: 'EMP_CODE',
        phone: '12345678901',
        name: '员工名',
        password: 'emp_pwd',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body).toEqual({
        invite_code: 'EMP_CODE',
        phone: '12345678901',
        name: '员工名',
        password: 'emp_pwd',
      });
    });
  });
});