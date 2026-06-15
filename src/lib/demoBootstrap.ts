/**
 * 演示数据引导服务（ProClaw 1.0.0）
 * ------------------------------------------------------------------
 * 演示账号 `boss / IamBigBoss` 首次登录（或检测到无预置数据时）自动注入：
 *   - 20 个 iPhone 电池 SPU（demo 产品）
 *   - 1 个已开通的云商城（proclaw.cc/demo）
 *   - 3 个 AI Team（AI 经营团队 / 国内社媒 / 海外社媒）从 Nvwax 下载，失败回退到 localTeamSkillMap
 *   - 1 个外贸柜台运营助手插件（注册到 manifestRegistry）
 *   - 数据标记为「演示数据」方便后续识别/重置（demoFlag）
 * 幂等性：通过查询现有数据判断是否需要注入；多次调用不会重复插入。
 */

import { isDemoAccount } from './aiTeamTokenService';
import { safeInvoke, isTauri } from './tauri';
import { createCloudStore, getCloudStore, type CloudStore, type PlanType } from './cloudStoreService';
import { AgentMarketService } from './agentMarketService';
import { markAsDemoData, clearDemoData, isDemoDataInitialized } from './demoFlag';
import { registerForeignCounterPlugin } from './manifestRegistry';

// =============== 类型定义 ===============

export interface DemoBootstrapResult {
  /** 注入的产品数量 */
  products: number;
  /** 是否成功激活云商城 */
  cloudStore: boolean;
  /** 已安装的 AI Team 名称列表 */
  teams: string[];
  /** 已注册的插件 ID 列表 */
  plugins: string[];
  /** 整体耗时（毫秒） */
  durationMs: number;
  /** 详细日志（每一步） */
  steps: DemoBootstrapStep[];
  /** 是否发生任何错误 */
  hasError: boolean;
}

export interface DemoBootstrapStep {
  name: string;
  success: boolean;
  message: string;
  durationMs: number;
}

// =============== 常量 ===============

/** 演示数据版本号（每次结构调整时递增） */
export const DEMO_DATA_VERSION = '1.0.0';

/** 3 个预置 AI Team 的 Skill ID（顺序：经营 → 国内 → 海外） */
export const DEMO_TEAM_SKILL_IDS = [
  'team-skill-biz-ops-001',
  'team-skill-social-cn-001',
  'team-skill-social-us-eu-001',
] as const;

/** 演示账号默认云商城子域名（与 cloud-store/src/middleware.ts 的 /shop/[store] 路由对齐） */
export const DEMO_CLOUD_STORE_SUBDOMAIN = 'demo';

/**
 * 演示账号云商城的访问 URL（路径模式而非子域名模式）。
 * - 桌面端展示与云端中间件都使用此 URL
 * - 与 marketing-site 的「proclaw.cc/shop/demo」保持一致
 */
export const DEMO_CLOUD_STORE_URL = 'https://proclaw.cc/demo';

/** 演示账号默认云商城套餐 */
export const DEMO_CLOUD_STORE_PLAN: PlanType = 'free';

/** 演示数据本地存储 key（仅用于缓存初始化的元数据） */
const DEMO_BOOTSTRAP_CACHE_KEY = 'proclaw_demo_bootstrap_v1';

// =============== 主入口 ===============

/**
 * 引导演示账号的预置数据包。幂等：可重复调用而不会产生重复数据。
 * 非演示账号调用时直接返回零结果。
 */
export async function bootstrapDemoData(opts?: { force?: boolean; silent?: boolean }): Promise<DemoBootstrapResult> {
  const t0 = performance.now();
  const force = !!opts?.force;
  const silent = !!opts?.silent;

  const empty: DemoBootstrapResult = {
    products: 0,
    cloudStore: false,
    teams: [],
    plugins: [],
    durationMs: 0,
    steps: [],
    hasError: false,
  };

  // 非演示账号直接返回零结果
  if (!isDemoAccount()) {
    return { ...empty, durationMs: performance.now() - t0 };
  }

  // 已初始化过且非强制刷新：直接返回缓存结果
  if (!force && isDemoDataInitialized()) {
    const cached = readBootstrapCache();
    if (cached) {
      if (!silent) console.info('[demoBootstrap] 已完成初始化，返回缓存结果');
      return {
        ...cached,
        durationMs: performance.now() - t0,
        steps: [],
      };
    }
  }

  const steps: DemoBootstrapStep[] = [];
  let productsCount = 0;
  let cloudStoreActivated = false;
  const installedTeams: string[] = [];
  const registeredPlugins: string[] = [];

  // 1) 注册「外贸柜台运营助手」插件（最优先，因为后续可能被 AI Team 引用）
  try {
    const t1 = performance.now();
    await registerForeignCounterPlugin();
    registeredPlugins.push('ma_foreign_counter');
    steps.push({
      name: 'register-plugin:ma_foreign_counter',
      success: true,
      message: '外贸柜台运营助手已注册',
      durationMs: performance.now() - t1,
    });
  } catch (err) {
    steps.push({
      name: 'register-plugin:ma_foreign_counter',
      success: false,
      message: String(err),
      durationMs: 0,
    });
  }

  // 2) 注入 20 个产品 SPU
  try {
    const t2 = performance.now();
    productsCount = await ensureProducts(force);
    steps.push({
      name: 'ensure-products',
      success: true,
      message: `已注入 ${productsCount} 个演示产品`,
      durationMs: performance.now() - t2,
    });
  } catch (err) {
    steps.push({
      name: 'ensure-products',
      success: false,
      message: String(err),
      durationMs: 0,
    });
  }

  // 3) 开通云商城
  try {
    const t3 = performance.now();
    cloudStoreActivated = await ensureCloudStore(force);
    steps.push({
      name: 'ensure-cloud-store',
      success: cloudStoreActivated,
      message: cloudStoreActivated
        ? `云商城已开通（${DEMO_CLOUD_STORE_URL}）`
        : '云商城激活失败',
      durationMs: performance.now() - t3,
    });
  } catch (err) {
    steps.push({
      name: 'ensure-cloud-store',
      success: false,
      message: String(err),
      durationMs: 0,
    });
  }

  // 4) 安装 3 个 AI Team
  for (const skillId of DEMO_TEAM_SKILL_IDS) {
    try {
      const t = performance.now();
      const teamName = await ensureTeamFromNvwax(skillId, force);
      if (teamName) installedTeams.push(teamName);
      steps.push({
        name: `install-team:${skillId}`,
        success: !!teamName,
        message: teamName ? `已安装 ${teamName}` : '安装失败（已记录）',
        durationMs: performance.now() - t,
      });
    } catch (err) {
      steps.push({
        name: `install-team:${skillId}`,
        success: false,
        message: String(err),
        durationMs: 0,
      });
    }
  }

  // 5) 标记为演示数据 + 写缓存
  try {
    markAsDemoData({
      version: DEMO_DATA_VERSION,
      productsCount,
      cloudStoreSubdomain: DEMO_CLOUD_STORE_SUBDOMAIN,
      teamNames: installedTeams,
      pluginIds: registeredPlugins,
      initializedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[demoBootstrap] 写入演示标记失败:', err);
  }

  const hasError = steps.some(s => !s.success);
  const result: DemoBootstrapResult = {
    products: productsCount,
    cloudStore: cloudStoreActivated,
    teams: installedTeams,
    plugins: registeredPlugins,
    durationMs: performance.now() - t0,
    steps,
    hasError,
  };

  writeBootstrapCache(result);

  if (!silent) {
    if (hasError) console.warn('[demoBootstrap] 完成，但部分步骤失败：', result);
    else console.info('[demoBootstrap] 完成', result);
  }

  // 广播事件，让 TeamsPage / CloudStorePage 等组件刷新
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('proclaw:demo-bootstrapped', { detail: result }));
  }

  return result;
}

// =============== 子模块 ===============

/** 注入 20 个演示产品（幂等）。返回实际新增的产品数 */
async function ensureProducts(force: boolean): Promise<number> {
  // Tauri 环境：通过后端命令批量 seed
  if (isTauri()) {
    try {
      const inserted = await safeInvoke<number>('seed_demo_products', { force });
      return typeof inserted === 'number' ? inserted : 0;
    } catch (err) {
      console.warn('[demoBootstrap] seed_demo_products 失败，回退到本地 mock：', err);
      // 继续走本地 mock 分支
    }
  }

  // 浏览器环境 / 后端无 seed 命令：通过 cloudStoreService.getSyncableProducts 已有的 DEMO_PRODUCTS 兜底
  // 这里不重复插入，因为 cloudStoreService 已经初始化了 mockProducts
  const { DEMO_PRODUCTS_FOR_BOOTSTRAP } = await import('./demoBootstrapData');
  return DEMO_PRODUCTS_FOR_BOOTSTRAP.length;
}

/** 确保云商城已开通。返回是否激活。 */
async function ensureCloudStore(force: boolean): Promise<boolean> {
  try {
    if (!force) {
      const existing = await getCloudStore();
      if (existing && existing.status === 'active') {
        // 标记为演示数据
        markCloudStoreAsDemo(existing);
        return true;
      }
    }

    // 创建演示云商城
    const store = await createCloudStore(DEMO_CLOUD_STORE_PLAN, DEMO_CLOUD_STORE_SUBDOMAIN);
    markCloudStoreAsDemo(store);
    return !!store;
  } catch (err) {
    console.error('[demoBootstrap] ensureCloudStore 失败：', err);
    return false;
  }
}

/**
 * 从 Nvwax 安装一个 AI Team。
 * - 1. 先调用 Nvwax API；失败回退到 localTeamSkillMap。
 * - 2. 通过 AgentMarketService.installTeamSkill 实际安装其中的 agents。
 * - 3. 在后端 teams 表中创建一条 team 记录（installTeamSkill 不会创建 team 记录）。
 * - 幂等：同名 Team 已存在则跳过。
 */
export async function ensureTeamFromNvwax(skillId: string, force: boolean): Promise<string | null> {
  try {
    const displayName = lookupTeamDisplayName(skillId);
    if (!displayName) {
      console.warn(`[demoBootstrap] ensureTeamFromNvwax: 未知的 skillId ${skillId}`);
      return null;
    }

    // 幂等检查
    if (!force) {
      const existing = await safeInvoke<Array<{ name: string; id: string; tags?: string[] }>>('get_teams');
      if (existing && existing.some(t => t.name === displayName)) {
        return displayName;
      }
    }

    // 1) 安装 team skill 中的 agents（内部已包含 Nvwax → localTeamSkillMap 回退）
    const installResult = await AgentMarketService.installTeamSkill(skillId);

    // 2) 在后端 teams 表中创建 team 记录
    //    installTeamSkill 只装 agents，不会创建 team 记录，必须显式调用 create_team
    const { localTeamSkillMap } = await import('./agentMarketService');
    const teamTemplate = localTeamSkillMap[skillId];
    if (!teamTemplate) {
      console.warn(`[demoBootstrap] 未找到 ${skillId} 的本地团队模板`);
      return installResult.success ? displayName : null;
    }

    const members = (teamTemplate.roles || []).map((r, idx) => ({
      agent_id: r.agent_type,
      role: r.role,
      responsibilities: r.specialty,
      sort_order: idx,
    }));

    const payload = {
      name: displayName,
      description: teamTemplate.description || '',
      category: mapTeamCategory(teamTemplate.category),
      tags: extractTags(teamTemplate.roles),
      members,
      workflow: {
        mode: 'sequential',
        steps: (teamTemplate.roles || []).slice(0, 3).map((r, idx) => ({
          order: idx + 1,
          agent_role: r.role,
          action: idx === 0 ? 'analyze' : 'review_and_enhance',
          input_from: idx === 0 ? 'system_trigger' : `step_${idx}`,
        })),
        fallback_strategy: 'skip_on_error',
      },
      triggers: {},
      schedules: {},
    };

    try {
      await safeInvoke('create_team', { payload });
    } catch (err) {
      console.warn(`[demoBootstrap] create_team(${displayName}) 失败：`, err);
    }

    return displayName;
  } catch (err) {
    console.error(`[demoBootstrap] ensureTeamFromNvwax(${skillId}) 失败：`, err);
    return null;
  }
}

/** 把英文 category 映射到 TeamsPage 已知的分类 */
function mapTeamCategory(raw: string | undefined): string {
  switch (raw) {
    case 'business_operations':
      return '通用经营';
    case 'social_media_cn':
    case 'cn_market':
      return '国内社媒';
    case 'social_media_us':
    case 'us_eu_market':
      return '海外社媒';
    case 'website_operations':
      return '网站运营';
    default:
      return raw || '通用经营';
  }
}

/** 从 roles 中提取 tags（用 role 名） */
function extractTags(roles: Array<{ role: string }> | undefined): string[] {
  if (!Array.isArray(roles)) return [];
  return roles.map(r => r.role).filter(Boolean);
}

/** 把 cloud store 标记为演示数据 */
function markCloudStoreAsDemo(store: CloudStore): void {
  try {
    // 通过 localStorage 记录演示云商城 ID，便于后续清除
    const raw = localStorage.getItem('proclaw_demo_cloud_store_id');
    const existing = raw ? (JSON.parse(raw) as string[]) : [];
    if (!existing.includes(store.id)) {
      existing.push(store.id);
      localStorage.setItem('proclaw_demo_cloud_store_id', JSON.stringify(existing));
    }
    // 设置 theme_data.demo = true
    if (isTauri()) {
      safeInvoke('mark_store_as_demo', { storeId: store.id }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/** 根据 skillId 获取展示名（与 localTeamSkillMap 对齐） */
function lookupTeamDisplayName(skillId: string): string {
  const map: Record<string, string> = {
    'team-skill-biz-ops-001': 'AI 经营团队',
    'team-skill-social-cn-001': '国内社媒运营 Team',
    'team-skill-social-us-eu-001': '欧美社媒运营 Team',
    'team-skill-social-sea-001': '东南亚社媒运营 Team',
    'team-skill-site-ops-001': '网站运营 AI Team',
  };
  return map[skillId] || skillId;
}

// =============== 缓存工具 ===============

interface BootstrapCacheShape extends Omit<DemoBootstrapResult, 'durationMs' | 'steps'> {
  cachedAt: string;
}

function readBootstrapCache(): BootstrapCacheShape | null {
  try {
    const raw = localStorage.getItem(DEMO_BOOTSTRAP_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeBootstrapCache(result: DemoBootstrapResult): void {
  try {
    const cache: BootstrapCacheShape = {
      products: result.products,
      cloudStore: result.cloudStore,
      teams: result.teams,
      plugins: result.plugins,
      hasError: result.hasError,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(DEMO_BOOTSTRAP_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

// =============== 重置工具 ===============

/**
 * 重置演示数据（仅在演示账号下可用）。
 * 清空所有演示标记，下次 bootstrap 时会重新注入。
 */
export async function resetDemoData(): Promise<DemoBootstrapResult> {
  if (!isDemoAccount()) {
    throw new Error('仅演示账号可重置演示数据');
  }
  try {
    clearDemoData();
    localStorage.removeItem(DEMO_BOOTSTRAP_CACHE_KEY);
    localStorage.removeItem('proclaw_demo_cloud_store_id');
  } catch {
    /* ignore */
  }
  return bootstrapDemoData({ force: true, silent: true });
}

/**
 * 检查是否已经完成演示数据初始化
 */
export function isBootstrapped(): boolean {
  return isDemoDataInitialized() && !!readBootstrapCache();
}
