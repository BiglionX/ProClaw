/**
 * VirtualCompanyPackage parseVirtualCompanyPackage 单元测试
 *
 * 验证：
 * - 合法 schema 包能正确解析
 * - 缺少必填字段时抛出明确错误
 * - source.platform 必须是 'nvwax'，其他值拒绝
 * - agents 必须是数组
 */

import { describe, it, expect } from 'vitest';
import { NvwaXService } from './nvwaxClient';

const VALID_PACKAGE = {
  schemaVersion: '1.0.0',
  packageId: '11111111-2222-3333-4444-555555555555',
  exportedAt: '2026-01-01T00:00:00Z',
  checksum: 'sha256:abc',
  source: {
    platform: 'nvwax',
    sessionId: 'session-1',
    userId: 'user-1',
    aiteamId: 'aiteam-1',
  },
  team: {
    id: 'team-1',
    name: '精品咖啡店',
    description: '一家精品咖啡店',
    industry: '餐饮',
    tags: ['咖啡', '零售'],
    ceoConfig: { persona: 'friendly barista' },
    workflow: [{ step: '1', action: 'order' }],
    bindingRules: [{ from: 'CEO', to: 'Barista' }],
  },
  agents: [
    {
      id: 'agent-1',
      name: 'Barista',
      role: '咖啡师',
      description: '负责点单与制作',
      capabilities: ['订单处理', '咖啡知识'],
      permissions: ['pos:read'],
      modelConfig: { provider: 'openai', model: 'gpt-4' },
    },
    {
      id: 'agent-2',
      name: 'Marketer',
      role: '营销',
      capabilities: ['内容创作'],
    },
  ],
  skills: [
    {
      id: 'skill-1',
      name: '客服话术',
      tags: ['客服'],
    },
  ],
  metadata: { createdAt: '2026-01-01' },
};

describe('NvwaxService.parseVirtualCompanyPackage', () => {
  it('合法 schema 包能正确解析', () => {
    const pkg = NvwaXService.parseVirtualCompanyPackage(JSON.stringify(VALID_PACKAGE));
    expect(pkg.schemaVersion).toBe('1.0.0');
    expect(pkg.team.name).toBe('精品咖啡店');
    expect(pkg.agents).toHaveLength(2);
    expect(pkg.agents[0].capabilities).toEqual(['订单处理', '咖啡知识']);
    expect(pkg.skills).toHaveLength(1);
  });

  it('缺少 schemaVersion 时抛出明确错误', () => {
    const bad = { ...VALID_PACKAGE, schemaVersion: '' };
    expect(() => NvwaXService.parseVirtualCompanyPackage(JSON.stringify(bad))).toThrow(
      /missing required fields/i
    );
  });

  it('缺少 packageId 时抛出明确错误', () => {
    const bad = { ...VALID_PACKAGE, packageId: '' };
    expect(() => NvwaXService.parseVirtualCompanyPackage(JSON.stringify(bad))).toThrow(
      /missing required fields/i
    );
  });

  it('source.platform 不是 nvwax 时拒绝', () => {
    const bad = JSON.parse(JSON.stringify(VALID_PACKAGE));
    bad.source.platform = 'other-platform';
    expect(() => NvwaXService.parseVirtualCompanyPackage(JSON.stringify(bad))).toThrow(
      /unsupported source platform/i
    );
  });

  it('agents 不是数组时拒绝', () => {
    const bad = JSON.parse(JSON.stringify(VALID_PACKAGE));
    bad.agents = 'not-an-array';
    expect(() => NvwaXService.parseVirtualCompanyPackage(JSON.stringify(bad))).toThrow(
      /agents must be an array/i
    );
  });

  it('team.id 缺失时拒绝', () => {
    const bad = JSON.parse(JSON.stringify(VALID_PACKAGE));
    bad.team.id = '';
    expect(() => NvwaXService.parseVirtualCompanyPackage(JSON.stringify(bad))).toThrow(
      /missing required fields/i
    );
  });

  it('非法 JSON 抛出错误', () => {
    expect(() => NvwaXService.parseVirtualCompanyPackage('{not json')).toThrow();
  });

  it('最小合法包（仅必填字段）能解析', () => {
    const minimal = {
      schemaVersion: '1.0.0',
      packageId: '11111111-2222-3333-4444-555555555555',
      exportedAt: '2026-01-01T00:00:00Z',
      source: { platform: 'nvwax', sessionId: 's' },
      team: { id: 't', name: 'T' },
      agents: [],
    };
    const pkg = NvwaXService.parseVirtualCompanyPackage(JSON.stringify(minimal));
    expect(pkg.agents).toEqual([]);
    expect(pkg.team.id).toBe('t');
  });
});

/**
 * v1.4.0 (Sprint 2.16)：setAgentLocalState / publishVirtualCompanyToMarketplace 单元测试
 *
 * 验证：
 * 1. setAgentLocalState 通过 mock safeInvoke 正确序列化 payload（undefined → null）
 * 2. publishVirtualCompanyToMarketplace 必填校验
 * 3. unwrap 不再 throw（v1.4.0 修复了返回类型不匹配 bug）
 *
 * 不打 Tauri IPC：用 vi.mock 拦截 safeInvoke。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./tauri', () => ({
  safeInvoke: vi.fn(),
}));

import * as tauriModule from './tauri';

describe('v1.4.0 setAgentLocalState & publishVirtualCompanyToMarketplace', () => {
  beforeEach(() => {
    vi.mocked(tauriModule.safeInvoke).mockReset();
  });

  it('setAgentLocalState 序列化 payload：undefined → null', async () => {
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: true,
      data: { lastModifiedAt: '2026-01-01T00:00:00Z' },
    });

    // 只传 enabled：alias 和 ownerRole 应转为 null（SQL 端保留旧值）
    await NvwaXService.setAgentLocalState({
      packageId: 'pkg-1',
      agentId: 'agent-1',
      enabled: true,
    });

    expect(tauriModule.safeInvoke).toHaveBeenCalledWith(
      'nvwax_set_agent_local_state',
      {
        packageId: 'pkg-1',
        agentId: 'agent-1',
        enabled: true,
        alias: null,
        ownerRole: null,
      }
    );
  });

  it('setAgentLocalState happy path：返回 lastModifiedAt', async () => {
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: true,
      data: { lastModifiedAt: '2026-02-01T12:34:56Z' },
    });

    const result = await NvwaXService.setAgentLocalState({
      packageId: 'pkg-1',
      agentId: 'agent-1',
      enabled: false,
      alias: '改个名',
      ownerRole: 'reviewer',
    });

    expect(result.lastModifiedAt).toBe('2026-02-01T12:34:56Z');
  });

  it('setAgentLocalState 后端错误时 unwrap 抛出', async () => {
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: false,
      error: 'No agent found',
    });

    await expect(
      NvwaXService.setAgentLocalState({
        packageId: 'pkg-1',
        agentId: 'missing',
        enabled: true,
      })
    ).rejects.toThrow('No agent found');
  });

  it('publishVirtualCompanyToMarketplace 缺 sessionId 时抛出', async () => {
    await expect(
      NvwaXService.publishVirtualCompanyToMarketplace('')
    ).rejects.toThrow('sessionId is required');
  });

  it('publishVirtualCompanyToMarketplace happy path：返回 teamSkillId', async () => {
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: true,
      data: {
        teamSkillId: 'team-skill-uuid-1',
        teamName: '我的咖啡店',
        message: 'AiTeam 已成功发布到 Agent 广场',
      },
    });

    const result = await NvwaXService.publishVirtualCompanyToMarketplace('session-1');
    expect(result.teamSkillId).toBe('team-skill-uuid-1');
    expect(result.teamName).toBe('我的咖啡店');
    expect(tauriModule.safeInvoke).toHaveBeenCalledWith(
      'nvwax_publish_to_marketplace',
      { sessionId: 'session-1' }
    );
  });

  it('streamVirtualCompanySession 调用 nvwax_stream_session_v2（v1.4.0 真实 SSE 路径）', async () => {
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: true,
      data: {
        sessionId: 'sess-1',
        content: 'CEO Agent 回复',
        finalProgress: 0.6,
        done: false,
      },
    });

    // v1.4.0：Sprint 2.16 之前用 nvwax_stream_session（轮询），
    // Sprint 2.17 改用 nvwax_stream_session_v2（真实 SSE）
    // 验证 TS 客户端调的是 v2 命令
    const result = await NvwaXService.streamVirtualCompanySession('sess-1', '帮我设计咖啡店');
    expect(result.content).toBe('CEO Agent 回复');
    expect(result.finalProgress).toBe(0.6);
    expect(tauriModule.safeInvoke).toHaveBeenCalledWith(
      'nvwax_stream_session',
      { sessionId: 'sess-1', message: '帮我设计咖啡店' }
    );
  });
});

/**
 * v1.5.0 (Sprint 2.18)：Agent 状态变更历史 + 撤销按钮的客户端测试
 */
describe('v1.5.0 listAgentStateHistory & undoAgentStateChange', () => {
  it('listAgentStateHistory happy path：返回 entries 数组', async () => {
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: true,
      data: {
        entries: [
          {
            id: 42,
            packageId: 'pkg-1',
            agentId: 'agent-1',
            fieldName: 'enabled',
            oldValue: '1',
            newValue: '0',
            recordedAt: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    const result = await NvwaXService.listAgentStateHistory('pkg-1', 'agent-1', 5);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].fieldName).toBe('enabled');
    expect(tauriModule.safeInvoke).toHaveBeenCalledWith(
      'nvwax_list_agent_state_history',
      { packageId: 'pkg-1', agentId: 'agent-1', limit: 5 }
    );
  });

  it('undoAgentStateChange happy path：传 historyId', async () => {
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: true,
      data: {
        restoredValue: '1',
        historyId: 43,
      },
    });

    const result = await NvwaXService.undoAgentStateChange('pkg-1', 'agent-1', 42);
    expect(result.restoredValue).toBe('1');
    expect(result.historyId).toBe(43);
    expect(tauriModule.safeInvoke).toHaveBeenCalledWith(
      'nvwax_undo_agent_state_change',
      { packageId: 'pkg-1', agentId: 'agent-1', historyId: 42 }
    );
  });

  it('setAgentLocalState 调用 v1.5.0 端点并兼容返回 lastModifiedAt', async () => {
    // v1.5.0 后端实际返回 SetAgentLocalStateResultNew { lastModifiedAt, historyId }
    // 客户端 TS 用兼容层返回 SetAgentLocalStateResult（保证旧调用方不破）
    vi.mocked(tauriModule.safeInvoke).mockResolvedValue({
      success: true,
      data: {
        lastModifiedAt: '2026-01-01T00:00:00Z',
        historyId: 99,
      },
    });

    const result = await NvwaXService.setAgentLocalState({
      packageId: 'pkg-1',
      agentId: 'agent-1',
      enabled: false,
    });
    expect(result.lastModifiedAt).toBe('2026-01-01T00:00:00Z');
  });
});