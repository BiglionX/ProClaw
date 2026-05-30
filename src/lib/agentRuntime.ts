/**
 * Agent 运行时核心模块
 * 管理 Agent 的加载、卸载、通信和 API 桥接
 */

// ==================== 消息协议类型 ====================

/** 主框架 → Agent 的消息 */
export interface FrameToAgentMessage {
  type: 'proclaw_response' | 'proclaw_event' | 'proclaw_request';
  id?: string;
  payload?: unknown;
  error?: string;
  method?: string;
  params?: unknown[];
}

/** Agent → 主框架的消息 */
export interface AgentToFrameMessage {
  type: 'proclaw_request';
  id: string;
  method: string;
  params: unknown[];
}

/** Agent 运行时实例 */
export interface AgentInstance {
  id: string;
  name: string;
  version: string;
  iframe: HTMLIFrameElement | null;
  worker: Worker | null;
  sandbox: 'iframe' | 'worker';
  manifest: AgentManifest;
  state: 'loading' | 'running' | 'disabled' | 'error';
}

/** Agent 性能指标 */
export interface AgentPerformanceMetrics {
  /** 启动耗时（毫秒） */
  startupTime: number;
  /** 消息请求频率（条/分钟） */
  messageRate: number;
  /** 资源加载数量（iframe 子资源数估算） */
  resourceCount: number;
  /** 上次活跃时间 */
  lastActiveAt: number | null;
  /** 总请求次数 */
  totalRequests: number;
}

/** Agent 快捷操作定义 */
export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  /** 操作适用的上下文（如 'chat', 'notification', 'global'） */
  context: 'chat' | 'notification' | 'global';
  /** 触发动作：向 Agent 发送的消息 */
  triggerMessage?: string;
  /** 触发动作：调用 Agent 的方法名 */
  triggerMethod?: string;
  /** 触发参数 */
  triggerParams?: unknown[];
}

/** Agent Manifest 结构 */
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
  capabilities?: string[];
}

// ==================== CEO Agent 任务相关类型 ====================

/** CEO Agent 分派的任务 */
export interface CeoDispatchedTask {
  taskId: string;
  type: string;
  priority: number;
  description: string;
  expected_output: string;
  deadline: string;
  context_snapshot: string;
  assigned_to: string;
}

/** 子 Agent 完成任务后的结果 */
export interface CeoTaskResult {
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  output: string;
  error?: string;
  completedAt: number;
}

// ==================== API 桥接 ====================

/** 前端 Tauri 调用封装 */
async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

/** Agent API 处理函数映射 */
type ApiHandler = (args: unknown[], context: { agentId: string }) => Promise<unknown>;

const apiHandlers: Record<string, ApiHandler> = {
  async getCurrentUser(_args) {
    try {
      return await invokeTauri('get_current_user_cmd');
    } catch {
      // 回退：从 authStore 获取
      const { useAuthStore } = await import('./authStore');
      const state = useAuthStore.getState();
      return state.user;
    }
  },

  async sendMessage(args) {
    const [to, content] = args as [string, string];
    return invokeTauri('send_message', { to, content });
  },

  async showNotification(args) {
    const [title, body] = args as [string, string];
    // 浏览器 Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      const notifOptions: globalThis.NotificationOptions = {
        body,
      };
      const notif = new Notification(title, notifOptions);
      // 处理通知点击
      notif.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('proclaw:notification-click', {
          detail: { title, body },
        }));
      };
    }
    return { success: true };
  },

  async openAgentMarket() {
    // 触发全局事件，由 App 层处理路由跳转
    window.dispatchEvent(new CustomEvent('proclaw:open-market'));
    return { success: true };
  },

  async getInstalledAgents() {
    return invokeTauri('get_installed_agents');
  },

  async getAgentDetail(args) {
    const [agentId] = args as [string];
    return invokeTauri('get_agent_detail', { agentId });
  },

  async storageGet(args) {
    const [key] = args as [string];
    try {
      const raw = localStorage.getItem(`proclaw_agent_storage_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async storageSet(args) {
    const [key, value] = args as [string, unknown];
    localStorage.setItem(`proclaw_agent_storage_${key}`, JSON.stringify(value));
    return { success: true };
  },

  async dbQuery(args, context) {
    const [sql, params] = args as [string, unknown[]?];
    return invokeTauri('agent_db_query', {
      agentId: context.agentId,
      sql,
      paramsJson: params ? JSON.stringify(params) : null,
    });
  },

  async dbExecute(args, context) {
    const [sql, params] = args as [string, unknown[]?];
    return invokeTauri('agent_db_execute', {
      agentId: context.agentId,
      sql,
      paramsJson: params ? JSON.stringify(params) : null,
    });
  },
};

// ==================== Agent 运行时管理器 ====================

class AgentRuntimeManager {
  private instances: Map<string, AgentInstance> = new Map();
  private pendingRequests: Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }> = new Map();
  private requestCounter = 0;

  // 性能监控
  private performanceCounters: Map<string, {
    startupTime: number;
    messageTimestamps: number[];
    totalRequests: number;
    lastActiveAt: number | null;
  }> = new Map();

  // 快捷操作注册表
  private quickActionRegistry: Map<string, QuickAction[]> = new Map();

  /**
   * 加载 Agent
   * @param manifest Agent Manifest
   * @param assetsBaseUrl Agent 资源的基础 URL
   */
  async loadAgent(manifest: AgentManifest, assetsBaseUrl: string): Promise<AgentInstance> {
    const startTime = performance.now();

    const instance: AgentInstance = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      iframe: null,
      worker: null,
      sandbox: 'iframe',
      manifest,
      state: 'loading',
    };

    // 创建 iframe 沙箱
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    iframe.src = `${assetsBaseUrl}/${manifest.entry}`;

    // 等待 iframe 加载完成
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error(`Failed to load agent: ${manifest.name}`));
      // 超时处理
      setTimeout(() => resolve(), 10000);
    });

    const startupTime = performance.now() - startTime;

    instance.iframe = iframe;
    instance.state = 'running';

    // 初始化性能计数器
    this.performanceCounters.set(manifest.id, {
      startupTime,
      messageTimestamps: [],
      totalRequests: 0,
      lastActiveAt: Date.now(),
    });

    // 设置消息监听
    window.addEventListener('message', this.handleMessage.bind(this, instance));

    this.instances.set(manifest.id, instance);
    return instance;
  }

  /**
   * 卸载 Agent
   */
  unloadAgent(agentId: string): void {
    const instance = this.instances.get(agentId);
    if (!instance) return;

    if (instance.iframe) {
      document.body.removeChild(instance.iframe);
    }
    if (instance.worker) {
      instance.worker.terminate();
    }

    this.instances.delete(agentId);
  }

  /**
   * 向 Agent 发送消息
   */
  postMessage(agentId: string, message: FrameToAgentMessage): void {
    const instance = this.instances.get(agentId);
    if (!instance) {
      console.warn(`[AgentRuntime] Agent ${agentId} not found`);
      return;
    }

    if (instance.iframe?.contentWindow) {
      instance.iframe.contentWindow.postMessage(message, '*');
    }
  }

  /**
   * 向指定 Agent 发起请求并等待响应
   */
  async request<T>(agentId: string, method: string, ...params: unknown[]): Promise<T> {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve: resolve as (v: unknown) => void, reject });

      this.postMessage(agentId, {
        type: 'proclaw_request',
        id: requestId,
        method,
        params,
      });

      // 超时
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  /**
   * 获取 Agent 实例
   */
  getAgent(agentId: string): AgentInstance | undefined {
    return this.instances.get(agentId);
  }

  /**
   * 获取 Agent 性能指标
   */
  getAgentPerformance(agentId: string): AgentPerformanceMetrics | null {
    const counter = this.performanceCounters.get(agentId);
    if (!counter) return null;

    return {
      startupTime: counter.startupTime,
      messageRate: counter.messageTimestamps.length,
      resourceCount: this.estimateResourceCount(agentId),
      lastActiveAt: counter.lastActiveAt,
      totalRequests: counter.totalRequests,
    };
  }

  /** 估算 iframe 子资源加载数量 */
  private estimateResourceCount(agentId: string): number {
    const instance = this.instances.get(agentId);
    if (!instance?.iframe) return 0;
    // 通过 iframe contentDocument 获取资源数量（仅同源可用）
    try {
      const doc = instance.iframe.contentDocument;
      if (!doc) return 0;
      // 统计 img/script/link 标签数作为资源数量估算
      return (
        doc.querySelectorAll('img').length +
        doc.querySelectorAll('script').length +
        doc.querySelectorAll('link[rel="stylesheet"]').length
      );
    } catch {
      return 0; // 跨域 iframe 无法访问
    }
  }

  /**
   * 注册 Agent 的快捷操作
   */
  registerQuickActions(agentId: string, actions: QuickAction[]): void {
    this.quickActionRegistry.set(agentId, actions);
  }

  /**
   * 获取指定 Agent 的快捷操作
   */
  getQuickActions(agentId: string): QuickAction[] {
    return this.quickActionRegistry.get(agentId) || [];
  }

  /**
   * 获取所有 Agent 的快捷操作（按 context 筛选）
   */
  getAllQuickActions(context?: 'chat' | 'notification' | 'global'): { agentId: string; actions: QuickAction[] }[] {
    const result: { agentId: string; actions: QuickAction[] }[] = [];
    this.quickActionRegistry.forEach((actions, agentId) => {
      const filtered = context ? actions.filter(a => a.context === context) : actions;
      if (filtered.length > 0) {
        result.push({ agentId, actions: filtered });
      }
    });
    return result;
  }

  /**
   * 触发 Agent 的快捷操作
   */
  async triggerQuickAction(agentId: string, actionId: string): Promise<void> {
    const actions = this.quickActionRegistry.get(agentId);
    if (!actions) return;
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    if (action.triggerMessage) {
      // 通过聊天发送触发消息
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('send_message', { to: agentId, content: action.triggerMessage });
    } else if (action.triggerMethod) {
      // 通过 postMessage 调用 Agent 方法
      await this.request(agentId, action.triggerMethod, ...(action.triggerParams || []));
    }
  }

  // ==================== CEO Agent 任务分派 API ====================

  /**
   * 向子 Agent 分派任务（通过 postMessage 发送 onTask 通知）
   */
  async dispatchTask(agentId: string, task: CeoDispatchedTask): Promise<boolean> {
    const instance = this.instances.get(agentId);
    if (!instance || instance.state !== 'running') {
      console.warn(`[AgentRuntime] Cannot dispatch task to ${agentId}: agent not running`);
      return false;
    }

    try {
      // 通过 postMessage 向子 Agent 发送 onTask 事件
      await this.request(agentId, 'onTask', task);
      return true;
    } catch (e) {
      console.error(`[AgentRuntime] Failed to dispatch task to ${agentId}:`, e);
      return false;
    }
  }

  /**
   * 子 Agent 完成任务后调用此方法返回结果给 CEO Agent
   */
  async completeTask(taskId: string, result: CeoTaskResult): Promise<void> {
    // 记录任务完成
    console.log(`[AgentRuntime] Task ${taskId} completed with status: ${result.status}`);

    // 通过 Tauri 后端更新任务状态
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('ceo_update_task_status', {
        taskId,
        status: result.status,
        result: JSON.stringify(result),
      });
    } catch (e) {
      console.error('[AgentRuntime] Failed to update task status:', e);
    }

    // 通知 CEO Agent 任务已完成
    const ceoInstance = this.instances.get('ceo-agent');
    if (ceoInstance) {
      this.postMessage('ceo-agent', {
        type: 'proclaw_event',
        payload: {
          event: 'task_completed',
          taskId,
          result,
        },
      });
    }
  }

  /**
   * 处理来自 Agent 的消息
   */
  private async handleMessage(instance: AgentInstance, event: MessageEvent): Promise<void> {
    const data = event.data as AgentToFrameMessage;

    if (!data || data.type !== 'proclaw_request') return;

    // 更新性能计数器
    const counter = this.performanceCounters.get(instance.id);
    if (counter) {
      counter.totalRequests++;
      counter.messageTimestamps.push(Date.now());
      counter.lastActiveAt = Date.now();
      // 只保留最近 1 分钟的时间戳
      const oneMinuteAgo = Date.now() - 60000;
      counter.messageTimestamps = counter.messageTimestamps.filter(t => t > oneMinuteAgo);
    }

    const { id, method, params } = data;

    try {
      const handler = apiHandlers[method];
      if (!handler) {
        throw new Error(`Unknown API method: ${method}`);
      }

      const result = await handler(params || [], { agentId: instance.id });

      // 发送响应回 Agent
      this.postMessage(instance.id, {
        type: 'proclaw_response',
        id,
        payload: result,
      });
    } catch (error) {
      this.postMessage(instance.id, {
        type: 'proclaw_response',
        id,
        payload: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/** 全局单例 */
export const agentRuntime = new AgentRuntimeManager();

export default AgentRuntimeManager;
