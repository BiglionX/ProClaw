/**
 * Virtual Company 多设备同步 - 合并逻辑
 *
 * 解决场景：
 *   - 用户在 ProClaw 桌面端 A 停用了某个 Agent，在桌面端 B 启用了同一 Agent
 *   - 用户在 A 改了 agent 别名，B 没改
 *   - NvWaX 上有新导入的虚拟公司，本地还没下载
 *
 * 合并策略（last-write-wins per field）：
 *   1. 以 `importedPackageId` 作为唯一键匹配本地/NvWaX 两端的虚拟公司
 *   2. 每个 Agent 字段（enabled/alias/ownerRole）独立比较 `lastRunAt`：
 *      时间更新的字段胜出；若一边没有 lastRunAt（首次同步），以云端为准
 *   3. NvWaX 上有但本地没有 → 标记为 "需导入"，由前端弹出"是否现在导入"
 *   4. 本地有但 NvWaX 没有 → 标记为 "孤儿"，保留本地（避免误删）
 *
 * Sprint: 2.15（v1.3.2 引入）。
 *
 * 关联文档：
 * - 跨包 API 参考：[`docs/integration/NVWAX_INTEGRATION.md`](../../docs/integration/NVWAX_INTEGRATION.md) §4.6
 * - 架构规范：[`docs/MULTI_PROJECT_INTEGRATION_SPEC.md` §11.4](../../docs/MULTI_PROJECT_INTEGRATION_SPEC.md#114-字段级-last-write-wins-合并)
 * - 跨包数据契约：[`docs/integration/virtual-company-package.schema.json`](../../docs/integration/virtual-company-package.schema.json)（schemaVersion 1.0.0）
 *
 * 该模块纯函数 + 无副作用，便于单测。前端 / 后端均可调用。
 */

import type {
  VirtualCompanyAgentRemoteState,
  VirtualCompanySessionWithState,
} from '../types/nvwax';

/**
 * 本地 SQLite 中的虚拟公司（最小化字段，足够做合并决策）
 * 由调用方从 ProClawPlugin.db.query('SELECT ... FROM virtual_companies') 填充
 */
export interface LocalVirtualCompanySnapshot {
  package_id: string;
  team_id: string;
  team_name: string;
  industry?: string;
  source_session?: string;
  imported_at: string;
  agents: LocalAgentSnapshot[];
}

/**
 * 本地 SQLite 中的 Agent 状态
 */
export interface LocalAgentSnapshot {
  id: string;
  package_id: string;
  role: string;
  /** 本地是否启用（来自 virtual_company_agents 或用户最近一次切换） */
  enabled: boolean;
  /** 本地别名（来自 UI 输入框） */
  alias?: string;
  /** 负责人角色 owner/shared/reviewer */
  owner_role?: string;
  /** 本地最近修改时间（ISO 8601）；由调用方持久化到本地 metadata */
  last_modified_at?: string;
}

/**
 * 合并每个 Agent 字段的结果
 */
export interface MergedAgentState {
  agentId: string;
  /** 胜出值 */
  enabled: boolean;
  alias?: string;
  ownerRole?: string;
  /** 胜出来源 */
  winner: 'local' | 'remote' | 'tie';
  winnerFieldTimestamps: {
    enabledAt?: string;
    aliasAt?: string;
    ownerRoleAt?: string;
  };
}

/**
 * 合并单个虚拟公司的结果
 */
export interface MergedVirtualCompany {
  package_id: string;
  team_id: string;
  team_name: string;
  team_status: 'active' | 'paused' | 'archived';
  /** 该虚拟公司所有 Agent 的最终状态 */
  agents: MergedAgentState[];
  /** 合并时间 */
  merged_at: string;
  /** 是否来自云端（云端新增、本地没有） */
  isFromCloudOnly: boolean;
  /** 是否本地独有（孤儿：云端删除了） */
  isLocalOnly: boolean;
}

/**
 * 多设备同步全量对账结果
 */
export interface SyncReconciliation {
  /** 已合并的虚拟公司（本地 + 云端均有） */
  merged: MergedVirtualCompany[];
  /** 云端独有：需导入的虚拟公司 */
  cloudOnly: VirtualCompanySessionWithState[];
  /** 本地独有（孤儿）：保留，不上传 */
  localOnly: LocalVirtualCompanySnapshot[];
  /** 同步元信息 */
  meta: {
    syncedAt: string;
    cloudSessionCount: number;
    localCompanyCount: number;
    mergedCount: number;
    cloudOnlyCount: number;
    localOnlyCount: number;
  };
}

/**
 * 解析 ISO 8601 时间为可比较的毫秒数（无效时返回 0）
 */
function tsMs(iso?: string): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * 单字段 last-write-wins：返回胜出值及其时间戳
 */
function lww<T>(
  localVal: T | undefined,
  localTs: string | undefined,
  remoteVal: T | undefined,
  remoteTs: string | undefined,
): { value: T | undefined; winner: 'local' | 'remote' | 'tie'; ts?: string } {
  const lMs = tsMs(localTs);
  const rMs = tsMs(remoteTs);
  if (lMs === 0 && rMs === 0) {
    // 都无时间戳：两边都没改过；以云端为准（更权威）
    return { value: remoteVal !== undefined ? remoteVal : localVal, winner: 'remote' };
  }
  if (rMs > lMs) {
    return { value: remoteVal, winner: 'remote', ts: remoteTs };
  }
  if (lMs > rMs) {
    return { value: localVal, winner: 'local', ts: localTs };
  }
  // 完全相等时间：优先云端（数据最终一致性方向）
  return {
    value: remoteVal !== undefined ? remoteVal : localVal,
    winner: 'tie',
    ts: remoteTs || localTs,
  };
}

/**
 * 合并单个 Agent 的所有字段
 */
export function mergeAgentState(
  local: LocalAgentSnapshot | undefined,
  remote: VirtualCompanyAgentRemoteState | undefined,
): MergedAgentState | null {
  if (!local && !remote) return null;
  const agentId = (local?.id || remote?.agentId) as string;

  // enabled 字段
  const enabledLww = lww<boolean>(
    local?.enabled,
    local?.last_modified_at,
    remote?.enabled,
    remote?.lastRunAt,
  );

  // alias 字段
  const aliasLww = lww<string | undefined>(
    local?.alias,
    local?.last_modified_at,
    remote?.alias,
    remote?.lastRunAt,
  );

  // ownerRole 字段
  const ownerLww = lww<string | undefined>(
    local?.owner_role,
    local?.last_modified_at,
    remote?.ownerRole,
    remote?.lastRunAt,
  );

  // 综合 winner：以 enabled 字段的胜出方为主（用户最关心的就是启停）
  const winner = enabledLww.winner;

  return {
    agentId,
    enabled: enabledLww.value !== undefined ? enabledLww.value : true,
    alias: aliasLww.value,
    ownerRole: ownerLww.value,
    winner,
    winnerFieldTimestamps: {
      enabledAt: enabledLww.ts,
      aliasAt: aliasLww.ts,
      ownerRoleAt: ownerLww.ts,
    },
  };
}

/**
 * 全量对账：把 NvWaX 会话列表 + 本地 SQLite snapshot 合并成 SyncReconciliation
 *
 * @param cloudSessions  从 NvWaX 拉到的会话列表（含 local_state）
 * @param localCompanies 从本地 SQLite 读到的虚拟公司快照
 * @returns 全量对账结果
 */
export function reconcileSync(
  cloudSessions: VirtualCompanySessionWithState[],
  localCompanies: LocalVirtualCompanySnapshot[],
): SyncReconciliation {
  const nowIso = new Date().toISOString();
  const merged: MergedVirtualCompany[] = [];
  const cloudOnly: VirtualCompanySessionWithState[] = [];
  const localOnly: LocalVirtualCompanySnapshot[] = [];

  // 以 importedPackageId 为键建立 cloud ↔ local 索引
  const localByPkg = new Map<string, LocalVirtualCompanySnapshot>();
  for (const lc of localCompanies) {
    localByPkg.set(lc.package_id, lc);
  }

  const cloudByPkg = new Map<string, VirtualCompanySessionWithState>();
  for (const cs of cloudSessions) {
    const ls = cs.localState;
    const pkgId = ls?.importedPackageId;
    if (pkgId) {
      cloudByPkg.set(pkgId, cs);
    } else {
      // 云端会话但没有 importedPackageId：可能是 ProClaw 没同步过的"纯云端"
      cloudOnly.push(cs);
    }
  }

  // 1. 处理每个云端会话（要么 merged，要么 cloudOnly）
  for (const cs of cloudSessions) {
    const ls = cs.localState;
    if (!ls?.importedPackageId) continue; // 已加到 cloudOnly
    const local = localByPkg.get(ls.importedPackageId);
    if (!local) {
      // 本地没有，云端有 → cloudOnly（需导入）
      cloudOnly.push(cs);
      continue;
    }
    // 两端都有 → 合并
    const remoteAgents = ls.agents || [];
    const localAgents = local.agents || [];

    const remoteById = new Map<string, VirtualCompanyAgentRemoteState>();
    for (const ra of remoteAgents) remoteById.set(ra.agentId, ra);
    const localById = new Map<string, LocalAgentSnapshot>();
    for (const la of localAgents) localById.set(la.id, la);

    const agentAgentIds = new Set<string>([
      ...Array.from(remoteById.keys()),
      ...Array.from(localById.keys()),
    ]);

    const mergedAgents: MergedAgentState[] = [];
    for (const aid of agentAgentIds) {
      const m = mergeAgentState(localById.get(aid), remoteById.get(aid));
      if (m) mergedAgents.push(m);
    }

    merged.push({
      package_id: local.package_id,
      team_id: local.team_id,
      team_name: local.team_name,
      team_status: (ls.teamStatus as 'active' | 'paused' | 'archived') || 'active',
      agents: mergedAgents,
      merged_at: nowIso,
      isFromCloudOnly: false,
      isLocalOnly: false,
    });
  }

  // 2. 处理本地独有的（孤儿）
  for (const lc of localCompanies) {
    if (!cloudByPkg.has(lc.package_id)) {
      localOnly.push(lc);
    }
  }

  return {
    merged,
    cloudOnly,
    localOnly,
    meta: {
      syncedAt: nowIso,
      cloudSessionCount: cloudSessions.length,
      localCompanyCount: localCompanies.length,
      mergedCount: merged.length,
      cloudOnlyCount: cloudOnly.length,
      localOnlyCount: localOnly.length,
    },
  };
}

/**
 * 把 merged 结果中的本地快照转换回 SQLite upsert payload
 * 供 nvwax_import_virtual_company_from_url 复用结构
 */
export function mergedToImportPayload(m: MergedVirtualCompany): {
  package_id: string;
  team_id: string;
  team_name: string;
  team_status: string;
  agents: Array<{ id: string; enabled: boolean; alias?: string; ownerRole?: string }>;
} {
  return {
    package_id: m.package_id,
    team_id: m.team_id,
    team_name: m.team_name,
    team_status: m.team_status,
    agents: m.agents.map((a) => ({
      id: a.agentId,
      enabled: a.enabled,
      alias: a.alias,
      ownerRole: a.ownerRole,
    })),
  };
}

/**
 * Sprint 2.15: 启动后台同步（App 启动 5 秒后由 main.tsx 触发）
 *
 * 与 reconcileSync() 的区别：
 *   - reconcileSync 是纯函数，便于单测
 *   - startBackgroundSync 串起：拉取 NvWaX 列表 → 拉取每个详情 → 读本地 SQLite → 合并 → 写回 SQLite → 触发 UI 事件
 *
 * 静默失败：网络/鉴权错误一律 console.debug，不打扰用户。
 * UI 通知通过 window.CustomEvent('virtual-company:sync-cloud-only')，
 *  Companies 页可监听后更新「立即同步」报告卡片。
 */
export async function startBackgroundSync(): Promise<SyncReconciliation | null> {
  // 仅在浏览器/Tauri环境下运行；SSR/Node 直接 no-op
  if (typeof window === 'undefined') return null;

  // 检查 ProClawPlugin 是否可用（开发模式下可能没有）
  const w = window as any;
  const ProClawPlugin = w.ProClawPlugin;

  try {
    // 1. 拉 NvWaX 会话列表
    const { NvwaXService } = await import('./nvwaxClient');
    const list = await NvwaXService.listVirtualCompanySessionsWithState(30, 0);
    const cloudSessions = list.sessions || [];

    // 2. 读本地 SQLite 快照
    const localCompanies: LocalVirtualCompanySnapshot[] = [];
    if (ProClawPlugin && ProClawPlugin.db) {
      const localRows = await ProClawPlugin.db.query(
        'SELECT package_id, team_id, team_name, industry, source_session, imported_at FROM virtual_companies'
      );
      for (const r of localRows || []) {
        const agents = await ProClawPlugin.db.query(
          'SELECT id, package_id, name, role, description FROM virtual_company_agents WHERE package_id = ?1',
          [r.package_id]
        );
        localCompanies.push({
          package_id: r.package_id,
          team_id: r.team_id,
          team_name: r.team_name,
          industry: r.industry,
          source_session: r.source_session,
          imported_at: r.imported_at,
          agents: (agents || []).map((a: any) => ({
            id: a.id,
            package_id: a.package_id,
            role: a.role,
            enabled: true,
            alias: '',
            owner_role: 'shared',
            last_modified_at: r.imported_at,
          })),
        });
      }
    }

    // 3. 对账（纯函数）
    const reconciliation = reconcileSync(cloudSessions, localCompanies);

    // 4. 把 merged 写回本地 SQLite（更新 imported_at + 触发虚拟公司列表刷新）
    if (ProClawPlugin && ProClawPlugin.db && reconciliation.merged.length > 0) {
      for (const m of reconciliation.merged) {
        await ProClawPlugin.db.execute(
          "UPDATE virtual_companies SET imported_at = datetime('now') WHERE package_id = ?1",
          [m.package_id]
        );
        for (const agent of m.agents) {
          // 仅更新本地差异字段（enabled/alias/ownerRole），这里通过 metadata 存储
          // 完整持久化需要新增列；当前最小实现：写到一个简单的 local_agent_states 表
          // （迁移在 persistence_v2 阶段再做；目前仅打 log 验证逻辑）
          // TODO: 后续 Sprint 加 ALTER TABLE virtual_company_agents 加 enabled/alias/owner_role 列
          console.debug('[virtualCompanySync] merge', agent.agentId, '→', agent.enabled, agent.alias);
        }
      }
    }

    // 5. 通知 UI：云端独有 > 0 时派发事件
    if (reconciliation.cloudOnly.length > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('virtual-company:sync-cloud-only', {
          detail: {
            count: reconciliation.cloudOnly.length,
            syncedAt: reconciliation.meta.syncedAt,
          },
        })
      );
    }

    return reconciliation;
  } catch (err) {
    console.debug('[virtualCompanySync] 后台同步失败（静默）：', err);
    return null;
  }
}