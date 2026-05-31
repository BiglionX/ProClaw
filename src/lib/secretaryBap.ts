import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauri';
import type { BapRecord } from '../types/secretary';

// ==================== BAP 前端缓存 ====================

/** 查询频率缓存（模块 -> { count, lastQueryAt }） */
interface QueryStat {
  module: string;
  count: number;
  lastQueryAt: number;
}

let queryStatsCache: Map<string, QueryStat> = new Map();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// ==================== BAP 后端接口 ====================

/** 从后端加载全部 BAP 记录 */
export async function loadBap(profileType?: string): Promise<BapRecord[]> {
  if (!isTauri()) return [];
  try {
    return await invoke('bap_get_all', { profileType: profileType || null });
  } catch (error) {
    console.error('Failed to load BAP:', error);
    return [];
  }
}

/** 保存一条 BAP 记录 */
export async function saveBapRecord(
  profileType: string,
  key: string,
  value: unknown,
  confidence?: number,
  source?: string,
): Promise<BapRecord | null> {
  if (!isTauri()) return null;
  try {
    return await invoke('bap_upsert', {
      record: {
        profile_type: profileType,
        key,
        value: JSON.stringify(value),
        confidence: confidence ?? 0.5,
        source: source ?? 'observed',
      },
    });
  } catch (error) {
    console.error('Failed to save BAP record:', error);
    return null;
  }
}

/** 按类型删除 BAP 记录 */
export async function deleteBapByType(profileType: string): Promise<number> {
  if (!isTauri()) return 0;
  try {
    const result: { deleted: number } = await invoke('bap_delete_by_type', {
      profileType,
    });
    return result.deleted;
  } catch (error) {
    console.error('Failed to delete BAP by type:', error);
    return 0;
  }
}

/** 重置 BAP 学习数据 */
export async function resetBapLearning(): Promise<number> {
  if (!isTauri()) return 0;
  try {
    const result: { deleted: number } = await invoke('bap_reset_learning');
    return result.deleted;
  } catch (error) {
    console.error('Failed to reset BAP learning:', error);
    return 0;
  }
}

// ==================== 查询跟踪与被动学习 ====================

/** 记录老板的一次查询行为（内存缓存 + 定时落库） */
export function trackQuery(module: string, _keyword: string): void {
  const existing = queryStatsCache.get(module);
  if (existing) {
    existing.count += 1;
    existing.lastQueryAt = Date.now();
  } else {
    queryStatsCache.set(module, {
      module,
      count: 1,
      lastQueryAt: Date.now(),
    });
  }

  // 每 10 次查询或每 30 秒落库一次
  const totalQueries = Array.from(queryStatsCache.values()).reduce((sum, s) => sum + s.count, 0);
  if (totalQueries % 10 === 0) {
    flushQueryStats();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushQueryStats();
      flushTimer = null;
    }, 30000);
  }
}

/** 将缓存中的查询统计写入后端（含时间衰减） */
async function flushQueryStats(): Promise<void> {
  if (queryStatsCache.size === 0) return;

  const now = Date.now();
  const stats = Array.from(queryStatsCache.values());
  for (const stat of stats) {
    // 时间衰减：近7天权重1.0, 7-30天权重0.6, 超过30天权重0.3
    const daysSinceLastQuery = (now - stat.lastQueryAt) / 86400000;
    let decayFactor = 1.0;
    if (daysSinceLastQuery > 30) {
      decayFactor = 0.3;
    } else if (daysSinceLastQuery > 7) {
      decayFactor = 0.6;
    }

    await saveBapRecord(
      'kpi_preference',
      `query:${stat.module}`,
      { ...stat, decayFactor },
      Math.min(0.5 + (stat.count * decayFactor) / 20, 1.0),
      'observed',
    );
  }
}

// ==================== 查询时间序列记录 ====================

/** 查询历史时间序列（用于模式分析） */
const queryHistory: Array<{ module: string; keyword: string; timestamp: number; hour: number; dayOfWeek: number }> = [];
const MAX_HISTORY = 200;

/** 记录查询到历史序列 */
export function recordQueryToHistory(module: string, keyword: string): void {
  const now = new Date();
  queryHistory.push({
    module,
    keyword,
    timestamp: Date.now(),
    hour: now.getHours(),
    dayOfWeek: now.getDay(), // 0=Sun, 1=Mon, ..., 6=Sat
  });
  // 限制历史长度
  if (queryHistory.length > MAX_HISTORY) {
    queryHistory.splice(0, queryHistory.length - MAX_HISTORY);
  }
}

// ==================== 模式分析 ====================

interface QueryPattern {
  type: 'time_routine' | 'kpi_sequence' | 'seasonal';
  module: string;
  confidence: number;
  description: string;
}

/**
 * 分析查询时间分布，发现 Routine 模式
 * 例如：每周一查周报、每天上午查库存
 */
export function analyzeQueryPattern(): QueryPattern[] {
  if (queryHistory.length < 3) return [];

  const patterns: QueryPattern[] = [];

  // 按模块分组
  const byModule = new Map<string, typeof queryHistory>();
  for (const q of queryHistory) {
    const list = byModule.get(q.module) || [];
    list.push(q);
    byModule.set(q.module, list);
  }

  for (const [module, queries] of byModule) {
    if (queries.length < 3) continue;

    // 检测按天规律（每天同一小时查询）
    const hourCounts = new Map<number, number>();
    for (const q of queries) {
      hourCounts.set(q.hour, (hourCounts.get(q.hour) || 0) + 1);
    }
    for (const [hour, count] of hourCounts) {
      const ratio = count / queries.length;
      if (ratio >= 0.5 && count >= 3) {
        patterns.push({
          type: 'time_routine',
          module,
          confidence: Math.min(0.5 + ratio * 0.3, 0.9),
          description: `每天${hour.toString().padStart(2, '0')}:00左右查询${module}`,
        });
      }
    }

    // 检测按周规律（每周同一天查询）
    const dayCounts = new Map<number, number>();
    for (const q of queries) {
      dayCounts.set(q.dayOfWeek, (dayCounts.get(q.dayOfWeek) || 0) + 1);
    }
    for (const [day, count] of dayCounts) {
      const ratio = count / queries.length;
      if (ratio >= 0.4 && count >= 2) {
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        patterns.push({
          type: 'time_routine',
          module,
          confidence: Math.min(0.4 + ratio * 0.3, 0.85),
          description: `每${dayNames[day]}查询${module}`,
        });
      }
    }
  }

  return patterns;
}

/**
 * 分析连续查询序列，发现关联KPI
 * 例如：查"销售额"后经常追查"退货率"
 */
export function inferRelatedKPIs(): Array<{ primary: string; related: string; confidence: number }> {
  if (queryHistory.length < 4) return [];

  const sequencePairs = new Map<string, Map<string, number>>();

  for (let i = 0; i < queryHistory.length - 1; i++) {
    const current = queryHistory[i].module;
    const next = queryHistory[i + 1].module;
    if (current !== next) {
      if (!sequencePairs.has(current)) {
        sequencePairs.set(current, new Map());
      }
      const nextMap = sequencePairs.get(current)!;
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }
  }

  const results: Array<{ primary: string; related: string; confidence: number }> = [];
  for (const [primary, relatedMap] of sequencePairs) {
    for (const [related, count] of relatedMap) {
      if (count >= 2) {
        results.push({
          primary,
          related,
          confidence: Math.min(0.3 + count * 0.15, 0.9),
        });
      }
    }
  }

  return results;
}

/**
 * 检测季节性查询模式
 * 例如：春节前查库存、双11前查营销数据
 */
export function inferSeasonalPattern(): QueryPattern[] {
  if (queryHistory.length < 5) return [];

  const patterns: QueryPattern[] = [];

  // 中国主要节假日前后的特征日期
  const seasons: Array<{ name: string; month: number; dayStart: number; dayEnd: number }> = [
    { name: '春节', month: 1, dayStart: 15, dayEnd: 31 },
    { name: '双11', month: 10, dayStart: 15, dayEnd: 31 },
    { name: '双12', month: 11, dayStart: 15, dayEnd: 30 },
    { name: '中秋/国庆', month: 9, dayStart: 15, dayEnd: 30 },
  ];

  for (const season of seasons) {
    const seasonalQueries = queryHistory.filter((q) => {
      const d = new Date(q.timestamp);
      return d.getMonth() + 1 === season.month && d.getDate() >= season.dayStart;
    });

    if (seasonalQueries.length >= 2) {
      // 统计在季前高频查询的模块
      const moduleCounts = new Map<string, number>();
      for (const q of seasonalQueries) {
        moduleCounts.set(q.module, (moduleCounts.get(q.module) || 0) + 1);
      }
      for (const [module, count] of moduleCounts) {
        if (count >= 2) {
          patterns.push({
            type: 'seasonal',
            module,
            confidence: Math.min(0.3 + count * 0.2, 0.8),
            description: `${season.name}前关注${module}`,
          });
        }
      }
    }
  }

  return patterns;
}

/**
 * 执行完整的BAP被动学习分析并写入后端
 */
export async function runFullBapAnalysis(): Promise<void> {
  if (!isTauri()) return;

  try {
    // 分析时间规律
    const routinePatterns = analyzeQueryPattern();
    for (const pattern of routinePatterns) {
      await saveBapRecord(
        'time_routine',
        pattern.module,
        { description: pattern.description, confidence: pattern.confidence },
        pattern.confidence,
        'inferred',
      );
    }

    // 分析关联KPI
    const relatedKPIs = inferRelatedKPIs();
    for (const kpi of relatedKPIs) {
      await saveBapRecord(
        'kpi_preference',
        `related:${kpi.primary}->${kpi.related}`,
        { primary: kpi.primary, related: kpi.related },
        kpi.confidence,
        'inferred',
      );
    }

    // 分析季节性模式
    const seasonalPatterns = inferSeasonalPattern();
    for (const pattern of seasonalPatterns) {
      await saveBapRecord(
        'custom_rule',
        `seasonal:${pattern.module}`,
        { description: pattern.description, confidence: pattern.confidence },
        pattern.confidence,
        'inferred',
      );
    }
  } catch (error) {
    console.error('BAP analysis failed:', error);
  }
}

// ==================== BAP 摘要生成 ====================

/** 从 BAP 记录中生成摘要（用于欢迎语、简报） */
export async function getBapSummary(): Promise<{
  topKpis: string[];
  hasRoutines: boolean;
  hasAlerts: boolean;
}> {
  if (!isTauri()) {
    return { topKpis: [], hasRoutines: false, hasAlerts: false };
  }

  try {
    const records = await loadBap();
    const kpiRecords = records.filter((r) => r.profile_type === 'kpi_preference');
    const routineRecords = records.filter((r) => r.profile_type === 'time_routine');
    const alertRecords = records.filter((r) => r.profile_type === 'alert_threshold');

    // 按置信度排序取前3
    kpiRecords.sort((a, b) => b.confidence - a.confidence);
    const topKpis = kpiRecords
      .slice(0, 3)
      .map((r) => {
        try {
          const val = JSON.parse(r.value as string);
          return val.kpi || r.key;
        } catch {
          return r.key;
        }
      });

    return {
      topKpis,
      hasRoutines: routineRecords.length > 0,
      hasAlerts: alertRecords.length > 0,
    };
  } catch {
    return { topKpis: [], hasRoutines: false, hasAlerts: false };
  }
}
