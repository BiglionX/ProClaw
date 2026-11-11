/**
 * virtualCompanySync 单元测试
 *
 * Verifies:
 * - mergeAgentState 单字段 last-write-wins
 * - reconcileSync 全量对账（merged / cloudOnly / localOnly）
 * - tie 场景：云端优先
 * - 缺失 lastRunAt 时降级为云端优先
 */

import { describe, it, expect } from 'vitest';
import {
  mergeAgentState,
  reconcileSync,
  type LocalVirtualCompanySnapshot,
  type LocalAgentSnapshot,
} from './virtualCompanySync';
import type { VirtualCompanySessionWithState } from '../types/nvwax';

const NOW = '2026-01-15T10:00:00Z';
const EARLIER = '2026-01-15T08:00:00Z';
const LATEST = '2026-01-15T12:00:00Z';

function localAgent(overrides: Partial<LocalAgentSnapshot> = {}): LocalAgentSnapshot {
  return {
    id: 'agent-1',
    package_id: 'pkg-1',
    role: 'Barista',
    enabled: true,
    alias: '本地昵称',
    owner_role: 'shared',
    last_modified_at: NOW,
    ...overrides,
  };
}

function remoteAgent(overrides: any = {}) {
  return {
    agentId: 'agent-1',
    enabled: true,
    alias: '云端昵称',
    ownerRole: 'owner',
    lastRunAt: NOW,
    ...overrides,
  };
}

describe('mergeAgentState 字段级 last-write-wins', () => {
  it('local 时间更新 → 胜出 local', () => {
    const m = mergeAgentState(
      localAgent({ enabled: false, alias: 'local-new', last_modified_at: LATEST }),
      remoteAgent({ enabled: true, alias: 'remote-old', lastRunAt: EARLIER })
    );
    expect(m).not.toBeNull();
    expect(m!.enabled).toBe(false);
    expect(m!.alias).toBe('local-new');
    expect(m!.winner).toBe('local');
  });

  it('remote 时间更新 → 胜出 remote', () => {
    const m = mergeAgentState(
      localAgent({ enabled: false, alias: 'local-old', last_modified_at: EARLIER }),
      remoteAgent({ enabled: true, alias: 'remote-new', lastRunAt: LATEST })
    );
    expect(m!.enabled).toBe(true);
    expect(m!.alias).toBe('remote-new');
    expect(m!.winner).toBe('remote');
  });

  it('时间完全相等 → tie（winner=remote，因 lww 默认以云端优先的 value）', () => {
    const m = mergeAgentState(
      localAgent({ enabled: false, alias: 'local', last_modified_at: NOW }),
      remoteAgent({ enabled: true, alias: 'remote', lastRunAt: NOW })
    );
    expect(m!.enabled).toBe(true); // 云端值
    expect(m!.alias).toBe('remote');
    expect(m!.winner).toBe('tie');
  });

  it('两边都无时间戳 → 云端优先（首次同步场景）', () => {
    const m = mergeAgentState(
      localAgent({ enabled: false, alias: 'local', last_modified_at: undefined }),
      remoteAgent({ enabled: true, alias: 'remote', lastRunAt: undefined })
    );
    expect(m!.enabled).toBe(true);
    expect(m!.alias).toBe('remote');
  });

  it('只 local 时退化为 local 值', () => {
    const m = mergeAgentState(
      localAgent({ enabled: false, alias: 'local-only' }),
      undefined
    );
    expect(m!.enabled).toBe(false);
    expect(m!.alias).toBe('local-only');
  });

  it('只 remote 时退化为 remote 值', () => {
    const m = mergeAgentState(
      undefined,
      remoteAgent({ enabled: false, alias: 'remote-only' })
    );
    expect(m!.enabled).toBe(false);
    expect(m!.alias).toBe('remote-only');
  });

  it('两边都没有 → 返回 null', () => {
    expect(mergeAgentState(undefined, undefined)).toBeNull();
  });
});

function cloudSession(overrides: Partial<VirtualCompanySessionWithState> = {}): VirtualCompanySessionWithState {
  return {
    sessionId: 'session-1',
    status: 'completed',
    finalTeamSkillId: 'team-1',
    localState: {
      schemaVersion: '1.0.0',
      lastSyncedAt: NOW,
      importedPackageId: 'pkg-1',
      teamStatus: 'active',
      agents: [remoteAgent() as any],
    },
    localStateLastSyncedAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function localCompany(overrides: Partial<LocalVirtualCompanySnapshot> = {}): LocalVirtualCompanySnapshot {
  return {
    package_id: 'pkg-1',
    team_id: 'team-1',
    team_name: '精品咖啡店',
    industry: '餐饮',
    source_session: 'session-1',
    imported_at: EARLIER,
    agents: [localAgent()],
    ...overrides,
  };
}

describe('reconcileSync 全量对账', () => {
  it('两端都有同一个虚拟公司 → merged', () => {
    const r = reconcileSync([cloudSession()], [localCompany()]);
    expect(r.meta.cloudSessionCount).toBe(1);
    expect(r.meta.localCompanyCount).toBe(1);
    expect(r.meta.mergedCount).toBe(1);
    expect(r.meta.cloudOnlyCount).toBe(0);
    expect(r.meta.localOnlyCount).toBe(0);
    expect(r.merged[0].package_id).toBe('pkg-1');
    expect(r.merged[0].agents[0].enabled).toBe(true);
  });

  it('云端独有 → cloudOnly（需导入）', () => {
    const r = reconcileSync([cloudSession()], []);
    expect(r.meta.cloudOnlyCount).toBe(1);
    expect(r.meta.mergedCount).toBe(0);
    expect(r.cloudOnly[0].sessionId).toBe('session-1');
  });

  it('本地独有 → localOnly（孤儿）', () => {
    const r = reconcileSync([], [localCompany()]);
    expect(r.meta.localOnlyCount).toBe(1);
    expect(r.meta.mergedCount).toBe(0);
    expect(r.localOnly[0].package_id).toBe('pkg-1');
  });

  it('混合：云端2 + 本地1 → merged1 + cloudOnly1', () => {
    const r = reconcileSync(
      [
        cloudSession(),
        cloudSession({
          sessionId: 'session-2',
          localState: {
            schemaVersion: '1.0.0',
            lastSyncedAt: NOW,
            importedPackageId: 'pkg-2',
            teamStatus: 'active',
            agents: [],
          },
        }),
      ],
      [localCompany()]
    );
    expect(r.meta.cloudSessionCount).toBe(2);
    expect(r.meta.localCompanyCount).toBe(1);
    expect(r.meta.mergedCount).toBe(1);
    expect(r.meta.cloudOnlyCount).toBe(1);
  });

  it('云端会话但无 importedPackageId → 直接进 cloudOnly', () => {
    const r = reconcileSync(
      [
        cloudSession({
          localState: {
            schemaVersion: '1.0.0',
            // 没有 importedPackageId
          },
        }),
      ],
      []
    );
    expect(r.cloudOnly.length).toBe(1);
  });

  it('merged 包含每个 agent 的 winner 来源', () => {
    const r = reconcileSync(
      [
        cloudSession({
          localState: {
            schemaVersion: '1.0.0',
            importedPackageId: 'pkg-1',
            teamStatus: 'active',
            agents: [
              {
                agentId: 'a-1',
                enabled: false,
                alias: 'remote-a',
                ownerRole: 'owner',
                lastRunAt: LATEST, // 云端更新
              },
            ],
          },
        }),
      ],
      [
        localCompany({
          agents: [
            {
              id: 'a-1',
              package_id: 'pkg-1',
              role: 'Barista',
              enabled: true,
              alias: 'local-a',
              owner_role: 'shared',
              last_modified_at: EARLIER, // 本地旧
            },
          ],
        }),
      ]
    );
    expect(r.merged[0].agents[0].enabled).toBe(false);
    expect(r.merged[0].agents[0].alias).toBe('remote-a');
    expect(r.merged[0].agents[0].ownerRole).toBe('owner');
    expect(r.merged[0].agents[0].winner).toBe('remote');
  });

  it('空输入 → meta 全为 0', () => {
    const r = reconcileSync([], []);
    expect(r.meta.cloudSessionCount).toBe(0);
    expect(r.meta.localCompanyCount).toBe(0);
    expect(r.meta.mergedCount).toBe(0);
    expect(r.meta.cloudOnlyCount).toBe(0);
    expect(r.meta.localOnlyCount).toBe(0);
    expect(r.merged.length).toBe(0);
    expect(r.cloudOnly.length).toBe(0);
    expect(r.localOnly.length).toBe(0);
  });
});