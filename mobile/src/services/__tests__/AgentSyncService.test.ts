/// <reference types="jest" />

/**
 * AgentSyncService 单元测试
 * 测试 Agent WebSocket 状态同步服务
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

// Mock WebSocketService
const mockWsOn = jest.fn().mockReturnValue(jest.fn());
const mockWsSend = jest.fn();

const mockWsService = {
  connected: false,
  on: mockWsOn,
  send: mockWsSend,
};

jest.mock('../../services/WebSocketService', () => ({
  wsService: mockWsService,
}));

// Mock AgentRuntimeBridge
const mockGetInstalledAgents = jest.fn();
const mockHandleRpcResponse = jest.fn();

jest.mock('../../services/AgentRuntimeBridge', () => ({
  agentRuntimeBridge: {
    getInstalledAgents: mockGetInstalledAgents,
    handleRpcResponse: mockHandleRpcResponse,
  },
}));

// 重置模块以获取新实例
let agentSyncService: any;

describe('AgentSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 清理并重新导入模块
    jest.resetModules();
    
    const module = require('../../services/AgentSyncService');
    agentSyncService = module.agentSyncService;
    
    // 重置内部状态
    agentSyncService.initialized = false;
    agentSyncService.listeners = new Map();
    agentSyncService.wsUnsubscribers = [];
  });

  describe('initialize', () => {
    it('重复初始化应直接返回', () => {
      agentSyncService.initialize();
      const firstCallCount = mockWsOn.mock.calls.length;

      agentSyncService.initialize();
      const secondCallCount = mockWsOn.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('应注册所有 WebSocket 监听器', () => {
      agentSyncService.initialize();

      // agent:state_changed
      expect(mockWsOn).toHaveBeenCalledWith('agent:state_changed', expect.any(Function));
      // agent:installed
      expect(mockWsOn).toHaveBeenCalledWith('agent:installed', expect.any(Function));
      // agent:uninstalled
      expect(mockWsOn).toHaveBeenCalledWith('agent:uninstalled', expect.any(Function));
      // agent:sync_response
      expect(mockWsOn).toHaveBeenCalledWith('agent:sync_response', expect.any(Function));
      // agent:rpc_response
      expect(mockWsOn).toHaveBeenCalledWith('agent:rpc_response', expect.any(Function));
      // connected
      expect(mockWsOn).toHaveBeenCalledWith('connected', expect.any(Function));
    });

    it('初始化后 initialized 应为 true', () => {
      agentSyncService.initialize();

      expect(agentSyncService.initialized).toBe(true);
    });

    it('应记录日志', () => {
      const { logger } = require('../../utils/logger');

      agentSyncService.initialize();

      expect(logger.log).toHaveBeenCalledWith('[AgentSync] Service initialized');
    });

    it('应保存退订函数', () => {
      agentSyncService.initialize();

      expect(agentSyncService.wsUnsubscribers.length).toBeGreaterThan(0);
    });
  });

  describe('requestSync', () => {
    it('WebSocket 已连接时应发送 sync_request', () => {
      mockWsService.connected = true;

      agentSyncService.requestSync();

      expect(mockWsSend).toHaveBeenCalledWith('agent:sync_request');
    });

    it('WebSocket 未连接时不应发送', () => {
      mockWsService.connected = false;

      agentSyncService.requestSync();

      expect(mockWsSend).not.toHaveBeenCalled();
    });
  });

  describe('sendToggleState', () => {
    it('启用 Agent 应发送 enable 命令', () => {
      mockWsService.connected = true;

      agentSyncService.sendToggleState('agent-1', true);

      expect(mockWsSend).toHaveBeenCalledWith('agent:enable', { agentId: 'agent-1' });
    });

    it('禁用 Agent 应发送 disable 命令', () => {
      mockWsService.connected = true;

      agentSyncService.sendToggleState('agent-1', false);

      expect(mockWsSend).toHaveBeenCalledWith('agent:disable', { agentId: 'agent-1' });
    });

    it('WebSocket 未连接时不应发送', () => {
      mockWsService.connected = false;

      agentSyncService.sendToggleState('agent-1', true);

      expect(mockWsSend).not.toHaveBeenCalled();
    });
  });

  describe('sendInstallRequest', () => {
    it('应发送包含 manifestJson 的安装请求', () => {
      mockWsService.connected = true;

      agentSyncService.sendInstallRequest('{"id":"test"}', 'Test Agent', '1.0.0');

      expect(mockWsSend).toHaveBeenCalledWith('agent:install_request', {
        manifestJson: '{"id":"test"}',
        name: 'Test Agent',
        version: '1.0.0',
      });
    });

    it('WebSocket 未连接时不应发送', () => {
      mockWsService.connected = false;

      agentSyncService.sendInstallRequest('{"id":"test"}', 'Test Agent', '1.0.0');

      expect(mockWsSend).not.toHaveBeenCalled();
    });
  });

  describe('addEventListener', () => {
    it('应返回取消订阅函数', () => {
      const unsubscribe = agentSyncService.addEventListener('test', jest.fn());

      expect(typeof unsubscribe).toBe('function');
    });

    it('同一事件类型应支持多个监听器', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      agentSyncService.addEventListener('test', callback1);
      agentSyncService.addEventListener('test', callback2);

      const listeners = agentSyncService.listeners.get('test');
      expect(listeners?.size).toBe(2);
    });

    it('取消订阅后应不再收到通知', () => {
      const callback = jest.fn();
      const unsubscribe = agentSyncService.addEventListener('agent:state_changed', callback);
      unsubscribe();

      // 模拟事件触发
      agentSyncService.dispatch('agent:state_changed', { agentId: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('handleStateChanged', () => {
    it('无 agentId 时应直接返回', () => {
      const agents = [{ id: 'agent-1', enabled: false }];
      mockGetInstalledAgents.mockReturnValue(agents);

      agentSyncService.handleStateChanged({ enabled: true });

      // 不应更新
      expect(agents[0].enabled).toBe(false);
    });

    it('应更新对应 Agent 的 enabled 状态', () => {
      const agents = [
        { id: 'agent-1', enabled: false },
        { id: 'agent-2', enabled: true },
      ];
      mockGetInstalledAgents.mockReturnValue(agents);

      agentSyncService.handleStateChanged({ agentId: 'agent-1', enabled: true });

      expect(agents[0].enabled).toBe(true);
    });

    it('enabled 为 1 时也应更新为 true', () => {
      const agents = [{ id: 'agent-1', enabled: false }];
      mockGetInstalledAgents.mockReturnValue(agents);

      agentSyncService.handleStateChanged({ agentId: 'agent-1', enabled: 1 });

      expect(agents[0].enabled).toBe(true);
    });
  });

  describe('handleAgentInstalled', () => {
    it('无 agent 数据时应直接返回', () => {
      expect(() => {
        agentSyncService.handleAgentInstalled({});
      }).not.toThrow();
    });

    it('有 agent 数据时应不抛错', () => {
      const agent = { id: 'new-agent', name: 'New Agent' };

      expect(() => {
        agentSyncService.handleAgentInstalled({ agent });
      }).not.toThrow();
    });
  });

  describe('handleAgentUninstalled', () => {
    it('无 agentId 时应直接返回', () => {
      expect(() => {
        agentSyncService.handleAgentUninstalled({});
      }).not.toThrow();
    });

    it('有 agentId 时应不抛错', () => {
      expect(() => {
        agentSyncService.handleAgentUninstalled({ agentId: 'agent-1' });
      }).not.toThrow();
    });
  });

  describe('handleSyncResponse', () => {
    it('无 agents 数组时应直接返回', () => {
      expect(() => {
        agentSyncService.handleSyncResponse({});
      }).not.toThrow();
    });

    it('有 agents 数组时应不抛错', () => {
      const agents = [{ id: 'agent-1' }, { id: 'agent-2' }];

      expect(() => {
        agentSyncService.handleSyncResponse({ agents });
      }).not.toThrow();
    });
  });

  describe('dispatch', () => {
    it('应调用所有注册的监听器', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      agentSyncService.addEventListener('test:event', callback1);
      agentSyncService.addEventListener('test:event', callback2);

      agentSyncService.dispatch('test:event', { data: 'test' });

      expect(callback1).toHaveBeenCalledWith('test:event', { data: 'test' });
      expect(callback2).toHaveBeenCalledWith('test:event', { data: 'test' });
    });

    it('未注册的事件应不触发任何监听器', () => {
      const callback = jest.fn();

      agentSyncService.dispatch('unregistered:event', {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('监听器抛出异常应被捕获', () => {
      const goodCallback = jest.fn();
      const badCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      agentSyncService.addEventListener('test', goodCallback);
      agentSyncService.addEventListener('test', badCallback);

      expect(() => {
        agentSyncService.dispatch('test', {});
      }).not.toThrow();

      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('WebSocket 事件集成', () => {
    it('连接恢复时应自动请求同步', () => {
      agentSyncService.initialize();
      mockWsService.connected = true;

      // 找到 connected 监听器并调用
      const connectedHandler = mockWsOn.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];

      if (connectedHandler) {
        connectedHandler('connected', {});
      }

      expect(mockWsSend).toHaveBeenCalledWith('agent:sync_request');
    });

    it('收到 rpc_response 应转发给 AgentRuntimeBridge', () => {
      agentSyncService.initialize();

      const rpcHandler = mockWsOn.mock.calls.find(
        call => call[0] === 'agent:rpc_response'
      )?.[1];

      const response = { id: 'rpc_1', payload: { result: 'ok' } };

      if (rpcHandler) {
        rpcHandler('agent:rpc_response', response);
      }

      expect(mockHandleRpcResponse).toHaveBeenCalledWith(response);
    });

    it('收到 null data 时不应调用 handleRpcResponse', () => {
      agentSyncService.initialize();

      const rpcHandler = mockWsOn.mock.calls.find(
        call => call[0] === 'agent:rpc_response'
      )?.[1];

      if (rpcHandler) {
        rpcHandler('agent:rpc_response', null);
      }

      expect(mockHandleRpcResponse).not.toHaveBeenCalled();
    });
  });
});