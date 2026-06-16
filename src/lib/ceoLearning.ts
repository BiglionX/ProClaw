/**
 * CEO Agent 决策偏好自动学习（任务 #5：CEO Agent 个性化学习）
 *
 * 基于用户对 ConfirmationCard 的"确认/拒绝/修改/稍后"行为
 * 分析历史决策日志，自动调整偏好权重
 *
 * 触发条件：
 * - 用户多次拒绝高风险 → 降级 risk_tolerance
 * - 用户偏好快速确认 → 降低 auto_approve_threshold
 * - 用户经常选择 A 方案 → 提升对应 strategy 权重
 */

import { safeInvoke, isTauri } from './tauri';

// ==================== 类型定义 ====================

export type DecisionAction = 'confirm' | 'reject' | 'modify' | 'snooze';

export interface DecisionRecord {
  /** 决策 ID */
  id: string;
  /** 决策动作 */
  action: DecisionAction;
  /** AI 提议的风险等级 */
  riskLevel?: 'low' | 'medium' | 'high';
  /** 用户选择的最终方案 */
  chosenOption?: string;
  /** AI 提议的方案（用户可选择对比） */
  proposedOptions?: string[];
  /** 决策耗时（秒） */
  decisionSeconds?: number;
  /** 决策时间戳 */
  timestamp: number;
  /** 关联 PCP 条目 */
  pcpId?: string;
}

export interface LearnedPreferences {
  /** 预算敏感度 (1-10) */
  budgetSensitivity: number;
  /** 风险偏好 (1-10) */
  riskTolerance: number;
  /** 自动确认阈值 (0-1) */
  autoApproveThreshold: number;
  /** 决策风格 */
  decisionStyle: 'conservative' | 'balanced' | 'aggressive';
  /** 样本数量 */
  sampleCount: number;
  /** 置信度 (0-1) */
  confidence: number;
  /** 上次更新时间 */
  updatedAt: number;
}

// ==================== 决策记录存储 ====================

const STORAGE_KEY = 'proclaw:ceo:decision_log';
const LEARNED_KEY = 'proclaw:ceo:learned_preferences';
const MAX_RECORDS = 200;

/** 读取决策日志 */
function loadDecisionLog(): DecisionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存决策日志（保留最近 MAX_RECORDS 条） */
function saveDecisionLog(records: DecisionRecord[]): void {
  try {
    const trimmed = records.slice(-MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/** 读取已学习的偏好 */
function loadLearnedPrefs(): LearnedPreferences | null {
  try {
    const raw = localStorage.getItem(LEARNED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 保存已学习的偏好 */
function saveLearnedPrefs(prefs: LearnedPreferences): void {
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

// ==================== 偏好学习算法 ====================

/**
 * 根据决策日志计算新的偏好值
 *
 * 规则：
 * 1. budget_sensitivity：最近 30 天用户拒绝率 > 30% → 调高（更保守）
 * 2. risk_tolerance：用户拒绝 high-risk 比例高 → 调低
 * 3. auto_approve_threshold：用户平均决策时间 < 10s → 调低（允许更多自动执行）
 * 4. decision_style：基于历史行为模式推断
 */
function learnPreferences(records: DecisionRecord[]): LearnedPreferences {
  // 默认值
  const defaults: LearnedPreferences = {
    budgetSensitivity: 5,
    riskTolerance: 5,
    autoApproveThreshold: 0.85,
    decisionStyle: 'balanced',
    sampleCount: 0,
    confidence: 0,
    updatedAt: Date.now(),
  };

  if (records.length < 5) {
    return { ...defaults, sampleCount: records.length, confidence: records.length / 10 };
  }

  // 过滤近 30 天
  const recent = records.filter(
    r => r.timestamp > Date.now() - 30 * 86400000
  );
  const effectiveRecords = recent.length >= 5 ? recent : records;

  // 1. 风险偏好推断
  const highRiskRecords = effectiveRecords.filter(r => r.riskLevel === 'high');
  const highRiskRejection = highRiskRecords.length > 0
    ? highRiskRecords.filter(r => r.action === 'reject').length / highRiskRecords.length
    : 0;
  let riskTolerance = 5;
  if (highRiskRejection >= 0.7) {
    riskTolerance = 3; // 强烈保守
  } else if (highRiskRejection >= 0.5) {
    riskTolerance = 4;
  } else if (highRiskRejection <= 0.2 && highRiskRecords.length >= 3) {
    riskTolerance = 7; // 偏激进
  } else if (highRiskRejection <= 0.4) {
    riskTolerance = 6;
  }

  // 2. 预算敏感度推断
  const rejectedCount = effectiveRecords.filter(r => r.action === 'reject').length;
  const totalCount = effectiveRecords.length;
  const rejectionRate = rejectedCount / totalCount;
  let budgetSensitivity = 5;
  if (rejectionRate > 0.4) {
    budgetSensitivity = 7; // 频繁拒绝 → 偏严格
  } else if (rejectionRate > 0.25) {
    budgetSensitivity = 6;
  } else if (rejectionRate < 0.1 && totalCount >= 10) {
    budgetSensitivity = 4; // 几乎不拒绝 → 偏宽松
  }

  // 3. 自动确认阈值推断（基于平均决策时间）
  const recordsWithTime = effectiveRecords.filter(r => r.decisionSeconds != null);
  let autoApproveThreshold = 0.85;
  if (recordsWithTime.length >= 5) {
    const avgTime = recordsWithTime.reduce((sum, r) => sum + (r.decisionSeconds || 0), 0) / recordsWithTime.length;
    if (avgTime < 5) {
      autoApproveThreshold = 0.6; // 决策快 → 信任 AI
    } else if (avgTime < 15) {
      autoApproveThreshold = 0.75;
    } else if (avgTime < 30) {
      autoApproveThreshold = 0.85;
    } else {
      autoApproveThreshold = 0.95; // 决策慢 → 要求更严
    }
  }

  // 4. 决策风格
  let decisionStyle: 'conservative' | 'balanced' | 'aggressive' = 'balanced';
  if (riskTolerance <= 3 || budgetSensitivity >= 7) {
    decisionStyle = 'conservative';
  } else if (riskTolerance >= 7 || autoApproveThreshold <= 0.7) {
    decisionStyle = 'aggressive';
  }

  // 5. 置信度（基于样本量）
  const confidence = Math.min(effectiveRecords.length / 30, 0.95);

  return {
    budgetSensitivity,
    riskTolerance,
    autoApproveThreshold,
    decisionStyle,
    sampleCount: effectiveRecords.length,
    confidence,
    updatedAt: Date.now(),
  };
}

// ==================== 主 API ====================

export const ceoLearning = {
  /**
   * 记录用户的一次决策行为
   * @param record 决策记录（不含 id/timestamp，会自动生成）
   */
  recordDecision(record: Omit<DecisionRecord, 'id' | 'timestamp'> & { timestamp?: number }): void {
    const fullRecord: DecisionRecord = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: record.timestamp || Date.now(),
      ...record,
    };
    const records = loadDecisionLog();
    records.push(fullRecord);
    saveDecisionLog(records);

    // 异步触发学习
    this.learn({ silent: true });
  },

  /**
   * 执行完整学习流程
   * @returns 学习后的偏好建议
   */
  learn(opts?: { silent?: boolean }): LearnedPreferences {
    const records = loadDecisionLog();
    const newPrefs = learnPreferences(records);
    saveLearnedPrefs(newPrefs);

    if (!opts?.silent) {
      console.info('[ceoLearning] 已学习决策偏好：', newPrefs);
    }

    return newPrefs;
  },

  /**
   * 获取当前已学习的偏好
   */
  getLearnedPreferences(): LearnedPreferences | null {
    return loadLearnedPrefs();
  },

  /**
   * 获取决策日志
   */
  getDecisionLog(): DecisionRecord[] {
    return loadDecisionLog();
  },

  /**
   * 获取学习建议（与当前手动设置的偏好对比）
   * @param currentPrefs 当前手动偏好
   * @returns 推荐采纳 vs 不采纳
   */
  getRecommendation(currentPrefs?: Partial<LearnedPreferences>): {
    shouldAdopt: boolean;
    diffs: Array<{
      key: keyof LearnedPreferences;
      current: number | string;
      suggested: number | string;
      reason: string;
    }>;
    learned: LearnedPreferences | null;
  } {
    const learned = loadLearnedPrefs();
    if (!learned) {
      return { shouldAdopt: false, diffs: [], learned: null };
    }

    // 样本不足不建议采纳
    if (learned.sampleCount < 10) {
      return { shouldAdopt: false, diffs: [], learned };
    }

    // 对比每个偏好
    const diffs: Array<{
      key: keyof LearnedPreferences;
      current: number | string;
      suggested: number | string;
      reason: string;
    }> = [];

    if (currentPrefs) {
      if (currentPrefs.budgetSensitivity != null &&
          Math.abs(currentPrefs.budgetSensitivity - learned.budgetSensitivity) >= 2) {
        diffs.push({
          key: 'budgetSensitivity',
          current: currentPrefs.budgetSensitivity,
          suggested: learned.budgetSensitivity,
          reason: '基于您的拒绝/确认比例推断',
        });
      }
      if (currentPrefs.riskTolerance != null &&
          Math.abs(currentPrefs.riskTolerance - learned.riskTolerance) >= 2) {
        diffs.push({
          key: 'riskTolerance',
          current: currentPrefs.riskTolerance,
          suggested: learned.riskTolerance,
          reason: '基于高风险操作接受率推断',
        });
      }
      if (currentPrefs.autoApproveThreshold != null &&
          Math.abs(currentPrefs.autoApproveThreshold - learned.autoApproveThreshold) >= 0.1) {
        diffs.push({
          key: 'autoApproveThreshold',
          current: currentPrefs.autoApproveThreshold,
          suggested: learned.autoApproveThreshold,
          reason: '基于平均决策耗时推断',
        });
      }
    }

    return {
      shouldAdopt: diffs.length > 0 && learned.confidence >= 0.5,
      diffs,
      learned,
    };
  },

  /**
   * 应用学习到的偏好（覆盖当前手动设置）
   */
  async applyLearnedPreferences(): Promise<boolean> {
    const learned = loadLearnedPrefs();
    if (!learned) return false;

    if (isTauri()) {
      try {
        // 调用 Rust 后端更新偏好
        await safeInvoke('update_preference', { key: 'budget_sensitivity', value: String(learned.budgetSensitivity) });
        await safeInvoke('update_preference', { key: 'risk_tolerance', value: String(learned.riskTolerance) });
        await safeInvoke('update_preference', { key: 'auto_approve_threshold', value: String(learned.autoApproveThreshold) });
        await safeInvoke('update_preference', { key: 'decision_style', value: JSON.stringify(learned.decisionStyle) });
        return true;
      } catch (err) {
        console.warn('[ceoLearning] Rust 后端更新失败，使用 localStorage 兜底：', err);
      }
    }

    // localStorage 兜底
    try {
      const ceoPrefsKey = 'proclaw:ceo:preferences';
      localStorage.setItem(ceoPrefsKey, JSON.stringify({
        budget_sensitivity: String(learned.budgetSensitivity),
        risk_tolerance: String(learned.riskTolerance),
        auto_approve_threshold: String(learned.autoApproveThreshold),
        decision_style: JSON.stringify(learned.decisionStyle),
      }));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 清空学习数据
   */
  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEARNED_KEY);
    } catch {
      /* ignore */
    }
  },
};

export default ceoLearning;
