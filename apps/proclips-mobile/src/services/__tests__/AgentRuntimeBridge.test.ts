/// <reference types="jest" />

/**
 * AgentRuntimeBridge 单元测试
 * 测试 Agent 运行时桥接服务
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

// Mock errorUtils
jest.mock('../../utils/errorUtils', () => ({
  getErrorMessage: jest.fn((e) => e instanceof Error ? e.message : String(e)),
}));

// Mock WebSocketService
const mockWsService = {
  connected: false,
  on: jest.fn().mockReturnValue(jest.fn()),
  send: jest.fn(),
};

jest.mock('../../services/WebSocketService', () => ({
  wsService: mockWsService,
}));

// Mock ChatService
const mockChatService = {
  createOrGetSession: jest.fn(),
  sendMessage: jest.fn(),
};

jest.mock('../../services/ChatService', () => mockChatService);

// Mock Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock getAvailableProviders for AI config
jest.mock('../../config/ai', () => ({
  getAIConfig: jest.fn().mockResolvedValue({
    providers: {},
    maxTokens: 2048,
    temperature: 0.7,
  }),
  isAIConfigured: jest.fn().mockReturnValue(false),
  getAvailableProviders: jest.fn().mockReturnValue([]),
}));

import { agentRuntimeBridge } from '../../services/AgentRuntimeBridge';

// 测试用的 mock Agent 数据
const mockAgentData = {
  id: 'proclaw-finance-agent',
  name: '财务管理 Agent',
  version: '1.0.0',
  manifest: {
    id: 'proclaw-finance-agent',
    name: '财务管理 Agent',
    version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'read_finance'],
    description: '内置财务管理 Agent',
    author: 'ProClaw 官方',
  },
  enabled: true,
  is_builtin: true,
  installed_at: Date.now(),
  last_updated: null,
  permissions_granted: ['read_user', 'read_finance'],
};

const mockAgentData2 = {
  id: 'ma_task',
  name: '任务管理 Agent',
  version: '1.0.0',
  manifest: {
    id: 'ma_task',
    name: '任务管理 Agent',
    version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'send_message'],
    description: '任务管理',
    author: 'ProClaw 官方',
  },
  enabled: false,
  is_builtin: false,
  installed_at: Date.now() - 86400000,
  last_updated: Date.now(),
  permissions_granted: ['read_user', 'send_message'],
};

describe('AgentRuntimeBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWsService.connected = false;
    // 重新初始化 bridge
    (agentRuntimeBridge as any).initialized = false;
    (agentRuntimeBridge as any).initPromise = null;
    (agentRuntimeBridge as any).agents = new Map();
    (agentRuntimeBridge as any).pendingRpcs = new Map();
    (agentRuntimeBridge as any).listeners = new Map();
    (agentRuntimeBridge as any).wsUnsubscribers = [];
    (agentRuntimeBridge as any).rpcId = 0;
  });

  describe('initialize', () => {
    it('初始化后 initialized 应为 true', async () => {
      await agentRuntimeBridge.initialize();

      expect((agentRuntimeBridge as any).initialized).toBe(true);
    });

    it('应设置 WebSocket 监听器', async () => {
      await agentRuntimeBridge.initialize();

      expect(mockWsService.on).toHaveBeenCalledWith('agent:state_changed', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('agent:installed', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('agent:uninstalled', expect.any(Function));
    });
  });

  describe('syncAgents', () => {
    it('WebSocket 已连接时应发送 sync_request', async () => {
      mockWsService.connected = true;

      await agentRuntimeBridge.syncAgents();

      expect(mockWsService.send).toHaveBeenCalledWith('agent:sync_request');
    });

    it('WebSocket 未连接时应使用 mock 数据', async () => {
      mockWsService.connected = false;

      const agents = await agentRuntimeBridge.syncAgents();

      // mock 数据应该在 agents 中
      expect(Array.isArray(agents)).toBe(true);
    });
  });

  describe('getInstalledAgents', () => {
    it('应返回所有已安装的 Agent', async () => {
      await agentRuntimeBridge.initialize();

      const agents = agentRuntimeBridge.getInstalledAgents();

      expect(Array.isArray(agents)).toBe(true);
    });

    it('Agent 列表应包含内置 Agent', async () => {
      await agentRuntimeBridge.initialize();

      const agents = agentRuntimeBridge.getInstalledAgents();
      const hasFinanceAgent = agents.some(a => a.id === 'proclaw-finance-agent');

      expect(hasFinanceAgent).toBe(true);
    });
  });

  describe('getAgent', () => {
    it('应返回指定 Agent', async () => {
      await agentRuntimeBridge.initialize();

      const agent = agentRuntimeBridge.getAgent('proclaw-finance-agent');

      expect(agent).toBeDefined();
      expect(agent?.id).toBe('proclaw-finance-agent');
    });

    it('Agent 不存在时应返回 undefined', async () => {
      await agentRuntimeBridge.initialize();

      const agent = agentRuntimeBridge.getAgent('nonexistent-agent');

      expect(agent).toBeUndefined();
    });
  });

  describe('enableAgent', () => {
    it('启用存在的 Agent 应成功', async () => {
      await agentRuntimeBridge.initialize();

      await expect(
        agentRuntimeBridge.enableAgent('proclaw-finance-agent')
      ).resolves.not.toThrow();
    });

    it('启用后 Agent enabled 应为 true', async () => {
      await agentRuntimeBridge.initialize();

      await agentRuntimeBridge.enableAgent('proclaw-finance-agent');

      const agent = agentRuntimeBridge.getAgent('proclaw-finance-agent');
      expect(agent?.enabled).toBe(true);
    });

    it('启用不存在的 Agent 应抛出错误', async () => {
      await agentRuntimeBridge.initialize();

      await expect(
        agentRuntimeBridge.enableAgent('nonexistent-agent')
      ).rejects.toThrow('Agent nonexistent-agent not found');
    });

    it('WebSocket 已连接时应发送 enable 消息', async () => {
      await agentRuntimeBridge.initialize();
      mockWsService.connected = true;

      await agentRuntimeBridge.enableAgent('proclaw-finance-agent');

      expect(mockWsService.send).toHaveBeenCalledWith(
        'agent:enable',
        { agentId: 'proclaw-finance-agent' }
      );
    });
  });

  describe('disableAgent', () => {
    it('禁用存在的 Agent 应成功', async () => {
      await agentRuntimeBridge.initialize();

      await expect(
        agentRuntimeBridge.disableAgent('proclaw-finance-agent')
      ).resolves.not.toThrow();
    });

    it('禁用后 Agent enabled 应为 false', async () => {
      await agentRuntimeBridge.initialize();

      await agentRuntimeBridge.disableAgent('proclaw-finance-agent');

      const agent = agentRuntimeBridge.getAgent('proclaw-finance-agent');
      expect(agent?.enabled).toBe(false);
    });

    it('禁用不存在的 Agent 应抛出错误', async () => {
      await agentRuntimeBridge.initialize();

      await expect(
        agentRuntimeBridge.disableAgent('nonexistent-agent')
      ).rejects.toThrow('Agent nonexistent-agent not found');
    });

    it('WebSocket 已连接时应发送 disable 消息', async () => {
      await agentRuntimeBridge.initialize();
      mockWsService.connected = true;

      await agentRuntimeBridge.disableAgent('proclaw-finance-agent');

      expect(mockWsService.send).toHaveBeenCalledWith(
        'agent:disable',
        { agentId: 'proclaw-finance-agent' }
      );
    });
  });

  describe('loadAgentView', () => {
    it('应返回正确的视图配置', async () => {
      await agentRuntimeBridge.initialize();
      const agent = agentRuntimeBridge.getAgent('proclaw-finance-agent')!;

      const config = agentRuntimeBridge.loadAgentView(agent);

      expect(config.agentId).toBe('proclaw-finance-agent');
      expect(config.entryUrl).toContain('proclaw-finance-agent');
      expect(config.manifest).toBeDefined();
    });

    it('应正确编码 manifest ID 和 version', async () => {
      await agentRuntimeBridge.initialize();
      const agent = agentRuntimeBridge.getAgent('proclaw-finance-agent')!;

      const config = agentRuntimeBridge.loadAgentView(agent);

      expect(config.entryUrl).toContain(encodeURIComponent(agent.manifest.id));
      expect(config.entryUrl).toContain(encodeURIComponent(agent.manifest.version));
    });
  });

  describe('request (RPC)', () => {
    it('离线时应调用本地 RPC 处理', async () => {
      mockWsService.connected = false;
      await agentRuntimeBridge.initialize();

      const result = await agentRuntimeBridge.request('proclaw-finance-agent', 'getAgentDetail');

      expect(result).toBeDefined();
    });

    it('getCurrentUser 应返回本地用户', async () => {
      mockWsService.connected = false;
      await agentRuntimeBridge.initialize();

      const result = await agentRuntimeBridge.request('proclaw-finance-agent', 'getCurrentUser');

      expect(result).toEqual({
        id: 'local-user',
        name: '本地用户',
        role: 'boss',
      });
    });

    it('showNotification 应记录日志', async () => {
      mockWsService.connected = false;
      await agentRuntimeBridge.initialize();

      await agentRuntimeBridge.request('proclaw-finance-agent', 'showNotification', 'Test Title', 'Test Body');

      const { logger } = require('../../utils/logger');
      expect(logger.log).toHaveBeenCalled();
    });

    it('sendMessage 应调用 ChatService', async () => {
      mockWsService.connected = false;
      await agentRuntimeBridge.initialize();

      mockChatService.createOrGetSession.mockResolvedValue({ id: 'session_123' });
      mockChatService.sendMessage.mockResolvedValue({ id: 'msg_1', content: 'Hello' });

      const result = await agentRuntimeBridge.request('proclaw-finance-agent', 'sendMessage', 'target_id', 'Hello');

      expect(mockChatService.createOrGetSession).toHaveBeenCalledWith('target_id', 'target_id', 'personal', '');
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('session_123', 'Hello', 'other');
      expect(result).toEqual({ success: true, message: { id: 'msg_1', content: 'Hello' } });
    });

    it('sendMessage 缺少参数应抛出错误', async () => {
      mockWsService.connected = false;
      await agentRuntimeBridge.initialize();

      await expect(
        agentRuntimeBridge.request('proclaw-finance-agent', 'sendMessage')
      ).rejects.toThrow('sendMessage requires parameters');
    });

    it('未知方法应返回 null', async () => {
      mockWsService.connected = false;
      await agentRuntimeBridge.initialize();

      const result = await agentRuntimeBridge.request('proclaw-finance-agent', 'unknownMethod');

      expect(result).toBeNull();
    });
  });

  describe('addChangeListener', () => {
    it('应返回取消订阅函数', async () => {
      await agentRuntimeBridge.initialize();

      const unsubscribe = agentRuntimeBridge.addChangeListener('test', jest.fn());

      expect(typeof unsubscribe).toBe('function');
    });

    it('取消订阅后应不再收到通知', async () => {
      await agentRuntimeBridge.initialize();
      const callback = jest.fn();

      const unsubscribe = agentRuntimeBridge.addChangeListener('test', callback);
      unsubscribe();

      // 触发通知
      (agentRuntimeBridge as any).notifyListeners();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('registerPluginAgents', () => {
    it('应注册插件推荐的 Agent', async () => {
      await agentRuntimeBridge.initialize();

      agentRuntimeBridge.registerPluginAgents('plugin-1', '测试插件', ['plugin-agent-1']);

      const agent = agentRuntimeBridge.getAgent('plugin-agent-1');
      expect(agent).toBeDefined();
      expect(agent?.manifest.author).toBe('ProClaw Plugin');
    });

    it('重复注册应忽略', async () => {
      await agentRuntimeBridge.initialize();

      agentRuntimeBridge.registerPluginAgents('plugin-1', '测试插件', ['plugin-agent-1']);
      agentRuntimeBridge.registerPluginAgents('plugin-1', '测试插件', ['plugin-agent-1']);

      const agents = agentRuntimeBridge.getInstalledAgents();
      const pluginAgents = agents.filter(a => a.id === 'plugin-agent-1');

      expect(pluginAgents.length).toBe(1);
    });

    it('应触发监听器通知', async () => {
      await agentRuntimeBridge.initialize();

      const callback = jest.fn();
      agentRuntimeBridge.addChangeListener('test', callback);

      agentRuntimeBridge.registerPluginAgents('plugin-1', '测试插件', ['plugin-agent-1']);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('unregisterPluginAgents', () => {
    it('应移除插件推荐的 Agent', async () => {
      await agentRuntimeBridge.initialize();

      agentRuntimeBridge.registerPluginAgents('plugin-1', '测试插件', ['plugin-agent-1']);
      agentRuntimeBridge.unregisterPluginAgents(['plugin-agent-1']);

      const agent = agentRuntimeBridge.getAgent('plugin-agent-1');
      expect(agent).toBeUndefined();
    });

    it('内置 Agent 不应被移除', async () => {
      await agentRuntimeBridge.initialize();

      const builtinAgent = agentRuntimeBridge.getAgent('proclaw-finance-agent');
      expect(builtinAgent).toBeDefined();

      agentRuntimeBridge.unregisterPluginAgents(['proclaw-finance-agent']);

      const stillExists = agentRuntimeBridge.getAgent('proclaw-finance-agent');
      expect(stillExists).toBeDefined();
    });

    it('应触发监听器通知', async () => {
      await agentRuntimeBridge.initialize();
      agentRuntimeBridge.registerPluginAgents('plugin-1', '测试插件', ['plugin-agent-1']);

      const callback = jest.fn();
      agentRuntimeBridge.addChangeListener('test', callback);

      agentRuntimeBridge.unregisterPluginAgents(['plugin-agent-1']);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('installRecommendedAgents', () => {
    it('应安装推荐的 Agent', async () => {
      await agentRuntimeBridge.initialize();

      const result = await agentRuntimeBridge.installRecommendedAgents(
        ['rec-agent-1', 'rec-agent-2'],
        '推荐插件'
      );

      expect(result.installed).toBe(2);
      expect(result.skipped).toBe(0);

      const agent1 = agentRuntimeBridge.getAgent('rec-agent-1');
      const agent2 = agentRuntimeBridge.getAgent('rec-agent-2');
      expect(agent1).toBeDefined();
      expect(agent2).toBeDefined();
    });

    it('已存在的 Agent 应被跳过', async () => {
      await agentRuntimeBridge.initialize();
      agentRuntimeBridge.registerPluginAgents('plugin-1', '已有插件', ['rec-agent-1']);

      const result = await agentRuntimeBridge.installRecommendedAgents(
        ['rec-agent-1'],
        '推荐插件'
      );

      expect(result.installed).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('应触发监听器通知', async () => {
      await agentRuntimeBridge.initialize();

      const callback = jest.fn();
      agentRuntimeBridge.addChangeListener('test', callback);

      await agentRuntimeBridge.installRecommendedAgents(['new-agent'], '新插件');

      expect(callback).toHaveBeenCalled();
    });
  });
});