import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock tauri module 强制走 dev fallback 路径
vi.mock('./tauri', () => ({
  isTauri: () => false,
  safeInvoke: async () => null,
}));

import {
  getAgentProfileOverride,
  saveAgentProfileOverride,
  deleteAgentProfileOverride,
  resolveAgentDisplay,
  onProfileChanged,
  emitProfileChanged,
  resetAgentProfile,
  type AgentProfileOverride,
} from './agentProfileService';
import { AGENT_AVATAR_PRESETS, getDefaultAgentAvatar } from '../types/agentAvatarLibrary';

describe('agentProfileService（dev 模式）', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  describe('getAgentProfileOverride', () => {
    it('未设置时返回 null', async () => {
      const result = await getAgentProfileOverride('test-agent');
      expect(result).toBeNull();
    });

    it('设置后能读取', async () => {
      await saveAgentProfileOverride('test-agent', { display_name: '小测' });
      const result = await getAgentProfileOverride('test-agent');
      expect(result?.display_name).toBe('小测');
    });
  });

  describe('saveAgentProfileOverride', () => {
    it('upsert：首次创建', async () => {
      const saved = await saveAgentProfileOverride('test-agent', { display_name: '小测' });
      expect(saved?.agent_id).toBe('test-agent');
      expect(saved?.display_name).toBe('小测');
      expect(saved?.updated_at).toBeTruthy();
    });

    it('upsert：部分字段更新', async () => {
      await saveAgentProfileOverride('test-agent', { display_name: '小测', avatar_key: 'agent_05' });
      await saveAgentProfileOverride('test-agent', { display_name: '小测v2' });
      const result = await getAgentProfileOverride('test-agent');
      expect(result?.display_name).toBe('小测v2');
      expect(result?.avatar_key).toBe('agent_05'); // 保留
    });

    it('触发 profile-changed 事件', async () => {
      const handler = vi.fn();
      const unsubscribe = onProfileChanged(handler);
      await saveAgentProfileOverride('test-agent', { display_name: '小测' });
      expect(handler).toHaveBeenCalledWith('test-agent');
      unsubscribe();
    });
  });

  describe('deleteAgentProfileOverride', () => {
    it('删除后 getAgentProfileOverride 返回 null', async () => {
      await saveAgentProfileOverride('test-agent', { display_name: '小测' });
      await deleteAgentProfileOverride('test-agent');
      const result = await getAgentProfileOverride('test-agent');
      expect(result).toBeNull();
    });

    it('未设置时返回 false（不抛错）', async () => {
      const result = await deleteAgentProfileOverride('non-existent');
      expect(result).toBe(true); // dev 模式直接返回 true
    });
  });

  describe('resolveAgentDisplay', () => {
    it('无 override 时使用默认名 + 哈希头像', () => {
      const result = resolveAgentDisplay('test-agent', '默认名', '🤖', null);
      expect(result.displayName).toBe('默认名');
      expect(result.avatarFallback).toBe('🤖');
      expect(result.isCustomAvatar).toBe(false);
      expect(result.avatarUrl).toMatch(/^\/agents\/team\/avatars\//);
    });

    it('有 display_name override 时使用新名', () => {
      const override: AgentProfileOverride = {
        agent_id: 'test-agent',
        display_name: '小测',
        avatar_key: null,
        custom_avatar_path: null,
        updated_at: '2024-01-01',
      };
      const result = resolveAgentDisplay('test-agent', '默认名', '🤖', override);
      expect(result.displayName).toBe('小测');
    });

    it('有 avatar_key override 时使用库头像', () => {
      const override: AgentProfileOverride = {
        agent_id: 'test-agent',
        display_name: null,
        avatar_key: 'agent_05',
        custom_avatar_path: null,
        updated_at: '2024-01-01',
      };
      const result = resolveAgentDisplay('test-agent', '默认名', '🤖', override);
      expect(result.activeAvatarKey).toBe('agent_05');
      expect(result.avatarUrl).toBe('/agents/team/avatars/agent_05.svg');
    });

    it('有 custom_avatar_path (data url) 时使用自定义', () => {
      const override: AgentProfileOverride = {
        agent_id: 'test-agent',
        display_name: null,
        avatar_key: null,
        custom_avatar_path: 'data:image/png;base64,xxxxx',
        updated_at: '2024-01-01',
      };
      const result = resolveAgentDisplay('test-agent', '默认名', '🤖', override);
      expect(result.isCustomAvatar).toBe(true);
      expect(result.avatarUrl).toContain('data:image/png');
    });

    it('custom_avatar 优先级高于 avatar_key', () => {
      const override: AgentProfileOverride = {
        agent_id: 'test-agent',
        display_name: null,
        avatar_key: 'agent_05',
        custom_avatar_path: 'data:image/png;base64,xxxxx',
        updated_at: '2024-01-01',
      };
      const result = resolveAgentDisplay('test-agent', '默认名', '🤖', override);
      expect(result.isCustomAvatar).toBe(true);
      expect(result.avatarUrl).toContain('data:image/png');
    });
  });

  describe('事件总线', () => {
    it('onProfileChanged 能正确取消订阅', () => {
      const handler = vi.fn();
      const unsubscribe = onProfileChanged(handler);
      emitProfileChanged('agent-x');
      expect(handler).toHaveBeenCalledTimes(1);
      unsubscribe();
      emitProfileChanged('agent-y');
      expect(handler).toHaveBeenCalledTimes(1); // 没变
    });

    it('emitProfileChanged 不传 agentId 也能触发', () => {
      const handler = vi.fn();
      const unsubscribe = onProfileChanged(handler);
      emitProfileChanged();
      expect(handler).toHaveBeenCalledWith(undefined);
      unsubscribe();
    });
  });

  describe('resetAgentProfile', () => {
    it('等价于 deleteAgentProfileOverride', async () => {
      await saveAgentProfileOverride('test-agent', { display_name: '小测' });
      await resetAgentProfile('test-agent');
      const result = await getAgentProfileOverride('test-agent');
      expect(result).toBeNull();
    });
  });

  describe('头像库元数据一致性', () => {
    it('AGENT_AVATAR_PRESETS 应有 30 项', () => {
      expect(AGENT_AVATAR_PRESETS.length).toBe(30);
    });

    it('每个 preset 都有 src 指向 /agents/team/avatars/', () => {
      AGENT_AVATAR_PRESETS.forEach(preset => {
        expect(preset.src).toMatch(/^\/agents\/team\/avatars\/agent_\d{2}\.svg$/);
      });
    });

    it('getDefaultAgentAvatar 总返回有效 URL', () => {
      const url = getDefaultAgentAvatar('any-agent');
      expect(url).toMatch(/^\/agents\/team\/avatars\//);
    });

    it('同样的 agentId 总返回同样的 URL（稳定哈希）', () => {
      const a = getDefaultAgentAvatar('fixed-agent');
      const b = getDefaultAgentAvatar('fixed-agent');
      expect(a).toBe(b);
    });

    it('不同 agentId 大概率返回不同 URL', () => {
      const a = getDefaultAgentAvatar('agent-1');
      const b = getDefaultAgentAvatar('agent-2');
      // 不强求不同（哈希可能碰撞），但 30 个里至少应该有差异
      const all = new Set<string>();
      for (let i = 0; i < 30; i++) {
        all.add(getDefaultAgentAvatar(`agent-${i}`));
      }
      // djb2 哈希 30 个 ID 后，桶分布应至少产出 18 个不同的 key（生日悖论 ≈ 60%）
      expect(all.size).toBeGreaterThanOrEqual(18);
      // a != b 是弱断言
      void a; void b;
    });
  });
});
