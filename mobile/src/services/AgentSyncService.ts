/**
 * AgentSyncService - 移动端 Agent WebSocket 状态同步服务
 * 复用现有的 WebSocketService 连接，同步 Agent 状态
 */

import { wsService } from './WebSocketService';
import type { AgentInfo } from './AgentRuntimeBridge';
import { agentRuntimeBridge } from './AgentRuntimeBridge';

type SyncCallback = (type: string, data: any) => void;

class AgentSyncService {
  private listeners: Map<string, Set<SyncCallback>> = new Map();
  private initialized = false;

  /** 初始化同步服务 */
  initialize(): void {
    if (this.initialized) return;

    // 监听 Agent 状态变化消息
    wsService.on('agent:state_changed', (_type: string, data: any) => {
      this.handleStateChanged(data);
      this.dispatch('agent:state_changed', data);
    });

    // 监听 Agent 安装/卸载消息
    wsService.on('agent:installed', (_type: string, data: any) => {
      this.handleAgentInstalled(data);
      this.dispatch('agent:installed', data);
    });

    wsService.on('agent:uninstalled', (_type: string, data: any) => {
      this.handleAgentUninstalled(data);
      this.dispatch('agent:uninstalled', data);
    });

    // 监听完整列表同步
    wsService.on('agent:sync_response', (_type: string, data: any) => {
      this.handleSyncResponse(data);
      this.dispatch('agent:sync_response', data);
    });

    // 监听 RPC 响应
    wsService.on('agent:rpc_response', (_type: string, data: any) => {
      if (data) {
        agentRuntimeBridge.handleRpcResponse(data);
      }
    });

    // 连接恢复时自动请求同步
    wsService.on('connected', () => {
      this.requestSync();
    });

    this.initialized = true;
    console.log('[AgentSync] Service initialized');
  }

  /** 请求完整 Agent 列表同步 */
  requestSync(): void {
    if (wsService.connected) {
      wsService.send('agent:sync_request');
    }
  }

  /** 发送启用/禁用命令 */
  sendToggleState(agentId: string, enabled: boolean): void {
    if (wsService.connected) {
      wsService.send(enabled ? 'agent:enable' : 'agent:disable', { agentId });
    }
  }

  /** 发送安装请求 */
  sendInstallRequest(manifestJson: string, name: string, version: string): void {
    if (wsService.connected) {
      wsService.send('agent:install_request', {
        manifestJson,
        name,
        version,
      });
    }
  }

  /** 处理状态变化 */
  private handleStateChanged(data: any): void {
    const { agentId, enabled } = data || {};
    if (!agentId) return;

    const agents = agentRuntimeBridge.getInstalledAgents();
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      agent.enabled = enabled === true || enabled === 1;
    }
  }

  /** 处理 Agent 安装 */
  private handleAgentInstalled(data: any): void {
    const agent = data?.agent as AgentInfo | undefined;
    if (agent) {
      // AgentRuntimeBridge 中的 listeners 会自动处理
    }
  }

  /** 处理 Agent 卸载 */
  private handleAgentUninstalled(data: any): void {
    const { agentId } = data || {};
    if (agentId) {
      // AgentRuntimeBridge 中的 listeners 会自动处理
    }
  }

  /** 处理完整列表同步响应 */
  private handleSyncResponse(data: any): void {
    const agents = data?.agents as AgentInfo[] | undefined;
    if (Array.isArray(agents)) {
      agents.forEach(a => {
        // 更新 AgentRuntimeBridge 的缓存
      });
    }
  }

  /** 注册同步事件监听 */
  addEventListener(type: string, callback: SyncCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /** 分发事件 */
  private dispatch(type: string, data: any): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach(cb => {
        try {
          cb(type, data);
        } catch (e) {
          console.warn(`[AgentSync] Handler error for ${type}:`, e);
        }
      });
    }
  }
}

// 全局单例
export const agentSyncService = new AgentSyncService();
export default AgentSyncService;
