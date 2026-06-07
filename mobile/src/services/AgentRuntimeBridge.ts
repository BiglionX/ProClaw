/**
 * AgentRuntimeBridge - 移动端 Agent 运行时桥接服务
 * 封装与桌面端的 Agent 状态同步和消息通信
 */

import { Platform } from 'react-native';
import { wsService } from './WebSocketService';
import * as ChatService from './ChatService';

// ==================== 类型定义 ====================

export interface AgentManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  permissions: string[];
  icon?: string;
  description?: string;
  author?: string;
  homepage?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  version: string;
  manifest: AgentManifest;
  enabled: boolean;
  is_builtin: boolean;
  installed_at: number;
  last_updated: number | null;
  permissions_granted: string[];
}

export interface AgentViewConfig {
  agentId: string;
  entryUrl: string;
  manifest: AgentManifest;
}

/** RPC 消息协议（与桌面端 agentRuntime.ts 一致） */
interface AgentRpcRequest {
  type: 'proclaw_request';
  id: string;
  method: string;
  params: unknown[];
}

interface AgentRpcResponse {
  type: 'proclaw_response';
  id: string;
  payload: unknown;
  error?: string;
}

// ==================== Mock 数据 ====================

const mockAgents: AgentInfo[] = [
  {
    id: 'proclaw-finance-agent',
    name: '财务管理 Agent',
    version: '1.0.0',
    manifest: {
      id: 'proclaw-finance-agent',
      name: '财务管理 Agent',
      version: '1.0.0',
      entry: 'index.html',
      permissions: ['read_user', 'read_finance', 'write_finance', 'show_notification'],
      description: '内置财务管理 Agent - 记账、预算、报表、发票管理',
      author: 'ProClaw 官方',
    },
    enabled: true,
    is_builtin: true,
    installed_at: Date.now(),
    last_updated: null,
    permissions_granted: ['read_user', 'read_finance', 'write_finance', 'show_notification'],
  },
  {
    id: 'ma_task',
    name: '任务管理 Agent',
    version: '1.0.0',
    manifest: {
      id: 'ma_task',
      name: '任务管理 Agent',
      version: '1.0.0',
      entry: 'index.html',
      permissions: ['read_user', 'send_message', 'show_notification'],
      description: '看板式任务管理，支持任务分配、进度跟踪',
      author: 'ProClaw 官方',
    },
    enabled: true,
    is_builtin: false,
    installed_at: Date.now() - 86400000,
    last_updated: Date.now(),
    permissions_granted: ['read_user', 'send_message'],
  },
  {
    id: 'ma_crm',
    name: '客户关系 Agent',
    version: '1.0.0',
    manifest: {
      id: 'ma_crm',
      name: '客户关系 Agent',
      version: '1.0.0',
      entry: 'index.html',
      permissions: ['read_user', 'read_contacts', 'send_message'],
      description: '管理客户联系人、沟通记录、商机跟踪',
      author: 'ProClaw 官方',
    },
    enabled: false,
    is_builtin: false,
    installed_at: Date.now() - 172800000,
    last_updated: null,
    permissions_granted: ['read_user', 'send_message'],
  },
];

// ==================== 桥接服务 ====================

class AgentRuntimeBridge {
  private agents: Map<string, AgentInfo> = new Map();
  private pendingRpcs: Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void; timer: ReturnType<typeof setTimeout> }
  > = new Map();
  private listeners: Map<string, Set<(agents: AgentInfo[]) => void>> = new Map();
  private rpcId = 0;
  private initialized = false;
  // 审计 C2：初始化互斥锁，防止并发初始化
  private initPromise: Promise<void> | null = null;
  // 审计 W10：保存 WS 事件退订函数，防止重复初始化时监听器累积泄漏
  private wsUnsubscribers: (() => void)[] = [];

  /** 初始化桥接 */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    // 审计 C2：并发调用复用同一个 Promise
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // 监听 WebSocket 状态同步消息
      this.setupWebSocketListeners();

      // 加载本地缓存的 Agent 列表
      await this.syncAgents();

      this.initialized = true;
    } catch (e) {
      // 审计 W15：初始化失败时清空 initPromise，允许后续重试
      this.initPromise = null;
      throw e;
    }
  }

  /** 监听 WebSocket 消息 */
  // 审计 W10：退订旧监听器后再注册新监听器，防止重复初始化时监听器累积泄漏
  private setupWebSocketListeners(): void {
    // 先清理旧的监听器
    this.wsUnsubscribers.forEach(fn => fn());
    this.wsUnsubscribers = [];

    this.wsUnsubscribers.push(
      wsService.on('agent:state_changed', (_type: string, data: any) => {
        const { agentId, enabled } = data || {};
        if (agentId) {
          const agent = this.agents.get(agentId);
          if (agent) {
            agent.enabled = enabled === true || enabled === 1;
            this.agents.set(agentId, agent);
            this.notifyListeners();
          }
        }
      }),
    );

    this.wsUnsubscribers.push(
      wsService.on('agent:installed', (_type: string, data: any) => {
        const agent = data?.agent as AgentInfo | undefined;
        if (agent) {
          this.agents.set(agent.id, agent);
          this.notifyListeners();
        }
      }),
    );

    this.wsUnsubscribers.push(
      wsService.on('agent:uninstalled', (_type: string, data: any) => {
        const { agentId } = data || {};
        if (agentId) {
          this.agents.delete(agentId);
          this.notifyListeners();
        }
      }),
    );
  }

  /** 同步 Agent 列表（从 WebSocket 或使用 mock） */
  async syncAgents(): Promise<AgentInfo[]> {
    try {
      // 尝试通过 WebSocket 请求同步
      if (wsService.connected) {
        wsService.send('agent:sync_request');
        return Array.from(this.agents.values());
      }
    } catch {
      // WebSocket 不可用，使用 mock 数据
    }

    // 回退：使用 mock 数据
    mockAgents.forEach(a => this.agents.set(a.id, a));
    this.notifyListeners();
    return mockAgents;
  }

  /** 获取已安装 Agent 列表 */
  getInstalledAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /** 获取单个 Agent 详情 */
  getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  /** 启用 Agent */
  async enableAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    agent.enabled = true;
    this.agents.set(agentId, agent);
    this.notifyListeners();

    // 同步到服务器
    try {
      if (wsService.connected) {
        wsService.send('agent:enable', { agentId });
      }
    } catch {
      // 离线时仅本地更新
    }
  }

  /** 禁用 Agent */
  async disableAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    agent.enabled = false;
    this.agents.set(agentId, agent);
    this.notifyListeners();

    try {
      if (wsService.connected) {
        wsService.send('agent:disable', { agentId });
      }
    } catch {
      // 离线时仅本地更新
    }
  }

  /** 加载 Agent 视图配置 */
  loadAgentView(agent: AgentInfo): AgentViewConfig {
    // 审计 S12：校验 manifest.id 和 version 防止路径遍历
    const safeId = encodeURIComponent(agent.manifest.id);
    const safeVersion = encodeURIComponent(agent.manifest.version);
    if (agent.manifest.id !== decodeURIComponent(safeId) || agent.manifest.version !== decodeURIComponent(safeVersion)) {
      throw new Error(`Invalid agent ID or version: contains path traversal characters`);
    }
    const assetsBaseUrl = `https://nvwa.proclaw.cc/agents/${safeId}/${safeVersion}/`;
    return {
      agentId: agent.id,
      entryUrl: `${assetsBaseUrl}${agent.manifest.entry}`,
      manifest: agent.manifest,
    };
  }

  /** 通过桥接向 Agent 发送 RPC 请求 */
  async request<T>(agentId: string, method: string, ...params: unknown[]): Promise<T> {
    const requestId = `rpc_${++this.rpcId}_${Date.now()}`;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRpcs.delete(requestId);
        reject(new Error(`RPC ${method} timed out`));
      }, 30000);

      this.pendingRpcs.set(requestId, { resolve: resolve as (v: unknown) => void, reject, timer });

      const message: AgentRpcRequest = {
        type: 'proclaw_request',
        id: requestId,
        method,
        params,
      };

      // 通过 WebSocket 发送 RPC
      if (wsService.connected) {
        wsService.send('agent:rpc', { agentId, ...message });
      } else {
        // 离线时处理本地 API
        this.handleLocalRpc(agentId, message).then(
          result => {
            const pending = this.pendingRpcs.get(requestId);
            if (pending) {
              clearTimeout(pending.timer);
              this.pendingRpcs.delete(requestId);
              pending.resolve(result);
            }
          },
          error => {
            const pending = this.pendingRpcs.get(requestId);
            if (pending) {
              clearTimeout(pending.timer);
              this.pendingRpcs.delete(requestId);
              pending.reject(error);
            }
          },
        );
      }
    });
  }

  /** 处理本地 RPC（离线回退） */
  private async handleLocalRpc(agentId: string, request: AgentRpcRequest): Promise<unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const { method } = request;
    switch (method) {
      case 'getCurrentUser':
        return { id: 'local-user', name: '本地用户', role: 'boss' };
      case 'getAgentDetail':
        return agent;
      case 'showNotification':
        console.log(`[AgentBridge] Notification: ${request.params?.[0]} - ${request.params?.[1]}`);
        return { success: true };
      case 'sendMessage': {
        // PRD v11.2: Agent WebView 内调用 proclaw.sendMessage(to, content) 的桥接
        const [to, content] = (request.params || []) as [string?, string?];
        if (!to || !content) {
          throw new Error('sendMessage requires parameters: to (string), content (string)');
        }
        try {
          const session = await ChatService.createOrGetSession(
            to, to, 'personal', ''
          );
          const msg = await ChatService.sendMessage(session.id, content, 'other');
          return { success: true, message: msg };
        } catch (e: any) {
          console.warn(`[AgentBridge] sendMessage failed:`, e?.message);
          return { success: false, error: e?.message || 'Failed to send message' };
        }
      }
      default:
        console.warn(`[AgentBridge] Unhandled RPC: ${method} for agent ${agentId}`);
        return null;
    }
  }

  /** 处理来自 Agent 的 RPC 响应 */
  handleRpcResponse(response: AgentRpcResponse): void {
    const pending = this.pendingRpcs.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRpcs.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response.payload);
    }
  }

  /** 监听 Agent 列表变化 */
  addChangeListener(key: string, callback: (agents: AgentInfo[]) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

 /** 通知所有监听器 */
  private notifyListeners(): void {
    const agentsList = this.getInstalledAgents();
    this.listeners.forEach(handlers => {
      handlers.forEach(cb => {
        try {
          cb(agentsList);
        } catch {
          // ignore listener errors
        }
      });
    });
  }

  // 审计 M2：提取工厂方法，消除 registerPluginAgents 与 installRecommendedAgents 的重复代码
  private createPluginAgent(agentId: string, pluginName: string, extraDescription: string = ''): AgentInfo {
    return {
      id: agentId,
      name: `${pluginName} - ${agentId}`,
      version: '1.0.0',
      manifest: {
        id: agentId,
        name: `${pluginName} - ${agentId}`,
        version: '1.0.0',
        entry: 'index.html',
        permissions: ['read_user', 'show_notification'],
        description: `由插件 "${pluginName}" 推荐的 AI 团队${extraDescription}`,
        author: 'ProClaw Plugin',
      },
      enabled: true,
      is_builtin: false,
      installed_at: Date.now(),
      last_updated: null,
      permissions_granted: ['read_user', 'show_notification'],
    };
  }

  /**
   * 注册插件关联的 Agent（PRD 5.4）
   * 插件安装成功后调用，将插件声明的 recommendedAgents 注册到 Agent 列表
   * @param pluginId 插件ID
   * @param pluginName 插件名称
   * @param agentIds 推荐的 Agent ID 列表
   */
  registerPluginAgents(pluginId: string, pluginName: string, agentIds: string[]): void {
    for (const agentId of agentIds) {
      if (!this.agents.has(agentId)) {
        this.agents.set(agentId, this.createPluginAgent(agentId, pluginName));
        console.log(`[AgentBridge] Registered plugin agent: ${agentId} for plugin ${pluginName}`);
      }
    }
    if (agentIds.length > 0) {
      this.notifyListeners();
    }
  }

  /**
   * 卸载插件时清理关联的 Agent
   * @param agentIds 要清理的 Agent ID 列表
   */
  unregisterPluginAgents(agentIds: string[]): void {
    for (const agentId of agentIds) {
      if (this.agents.has(agentId)) {
        const agent = this.agents.get(agentId)!;
        // 只清理非内置的插件推荐 Agent
        if (!agent.is_builtin && agent.manifest.author === 'ProClaw Plugin') {
          this.agents.delete(agentId);
          console.log(`[AgentBridge] Unregistered plugin agent: ${agentId}`);
        }
      }
    }
    if (agentIds.length > 0) {
      this.notifyListeners();
    }
  }

  /**
   * 安装推荐的 AI 团队
   * 供 PluginDetailScreen 在安装插件后调用
   * @param agentIds 推荐的 Agent ID 列表
   * @param pluginName 插件名称
   */
  async installRecommendedAgents(
    agentIds: string[],
    pluginName: string
  ): Promise<{ installed: number; skipped: number }> {
    let installed = 0;
    let skipped = 0;

    for (const agentId of agentIds) {
      if (this.agents.has(agentId)) {
        skipped++;
        continue;
      }

      this.agents.set(agentId, this.createPluginAgent(agentId, pluginName, '，提供智能辅助功能'));
      installed++;
    }

    if (installed > 0) {
      this.notifyListeners();
      console.log(`[AgentBridge] Installed ${installed} recommended agents for plugin ${pluginName}`);
    }

    return { installed, skipped };
  }
}

// 全局单例
export const agentRuntimeBridge = new AgentRuntimeBridge();
export default AgentRuntimeBridge;
