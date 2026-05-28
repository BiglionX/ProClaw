import { create } from 'zustand';

export interface AgentItem {
  id: string;
  name: string;
  version: string;
  manifest: {
    id: string;
    name: string;
    version: string;
    entry: string;
    permissions: string[];
    icon?: string;
    description?: string;
    author?: string;
    homepage?: string;
  };
  enabled: boolean;
  is_builtin: boolean;
  installed_at: number;
  last_updated: number | null;
  permissions_granted: string[];
}

interface AgentManagerState {
  agents: AgentItem[];
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  enableAgent: (agentId: string) => Promise<void>;
  disableAgent: (agentId: string) => Promise<void>;
  uninstallAgent: (agentId: string) => Promise<void>;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export const useAgentManagerStore = create<AgentManagerState>((set, _get) => {
  const fetchAgents = async () => {
    set({ loading: true, error: null });
    try {
      const agents = await invoke<AgentItem[]>('get_installed_agents');
      set({ agents, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  };

  // 监听 agents-changed 事件自动刷新
  if (typeof window !== 'undefined') {
    window.addEventListener('proclaw:agents-changed', fetchAgents);
  }

  return {
  agents: [],
  loading: false,
  error: null,

  fetchAgents,

  enableAgent: async (agentId: string) => {
    try {
      await invoke('enable_agent', { agentId });
      set(state => ({
        agents: state.agents.map(a => a.id === agentId ? { ...a, enabled: true } : a),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 并发限制错误直接 throw 让 UI 层捕获
      if (msg.includes('最大并发')) {
        throw new Error(msg);
      }
      console.error('Failed to enable agent:', err);
    }
  },

  disableAgent: async (agentId: string) => {
    try {
      await invoke('disable_agent', { agentId });
      set(state => ({
        agents: state.agents.map(a => a.id === agentId ? { ...a, enabled: false } : a),
      }));
    } catch (err) {
      console.error('Failed to disable agent:', err);
    }
  },

  uninstallAgent: async (agentId: string) => {
    try {
      await invoke('uninstall_agent', { agentId });
      set(state => ({
        agents: state.agents.filter(a => a.id !== agentId),
      }));
    } catch (err) {
      console.error('Failed to uninstall agent:', err);
    }
  },
  };
});
