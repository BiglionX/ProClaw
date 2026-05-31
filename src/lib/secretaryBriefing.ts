/**
 * 秘书每日简报模块
 * 
 * 基于 BAP 时间惯例配置，在预设时间推送经营简报。
 * 简报内容动态基于 BAP topKpis 生成。
 */

import { loadBap, getBapSummary } from './secretaryBap';
import { isTauri } from './tauri';

// ==================== 简报生成 ====================

/**
 * 生成简报文本
 * @param secretaryName 秘书名称
 * @param topKpis 关注的前 N 个 KPI
 * @param type 简报类型
 */
export function generateBriefing(
  secretaryName: string,
  topKpis: string[],
  type: 'daily' | 'weekly' | 'monthly' = 'daily',
): string {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  let body = `老板${greeting}！我是${secretaryName}，来向您汇报啦～\n\n`;

  if (type === 'daily') {
    body += '📋 **今日概况**\n';
    body += '以下是您可能关心的经营数据：\n\n';
  } else if (type === 'weekly') {
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    body += `📋 **本周概览（第${getWeekNumber(now)}周）**\n`;
    body += `本周${weekDays[now.getDay()]}，为您汇总本周经营数据：\n\n`;
  } else {
    body += `📋 **本月概览（${now.getMonth() + 1}月）**\n`;
    body += '为您汇总本月经营数据：\n\n';
  }

  if (topKpis.length > 0) {
    body += '📊 **您常关注的指标：**\n';
    topKpis.forEach((kpi, i) => {
      body += `${i + 1}. ${kpi}\n`;
    });
    body += '\n';
  }

  body += '💡 **温馨提示**\n';
  body += `- 右键我的头像可以调整关注设置\n`;
  body += `- 如需深入分析，可以直接问我\n\n`;

  body += `祝您今天工作顺利！😊`;

  return body;
}

// ==================== 简报调度 ====================

interface BriefingSchedule {
  daily: boolean;
  dailyTime: string; // HH:mm format
  weekly: boolean;
  monthly: boolean;
  lastDailyBriefing: string | null; // YYYY-MM-DD
  lastWeeklyBriefing: number | null; // ISO week number
  lastMonthlyBriefing: string | null; // YYYY-MM
}

/**
 * 从 localStorage 读取简报调度状态
 */
function getScheduleState(): BriefingSchedule {
  try {
    const raw = localStorage.getItem('proclaw-secretary-briefing-schedule');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    daily: false,
    dailyTime: '09:00',
    weekly: false,
    monthly: false,
    lastDailyBriefing: null,
    lastWeeklyBriefing: null,
    lastMonthlyBriefing: null,
  };
}

/**
 * 保存简报调度状态
 */
function saveScheduleState(state: BriefingSchedule): void {
  localStorage.setItem('proclaw-secretary-briefing-schedule', JSON.stringify(state));
}

/**
 * 检查是否应该触发简报
 * @param secretaryName 秘书名称
 * @returns 如果需要推送简报，返回简报文本；否则返回 null
 */
export async function checkBriefingDue(secretaryName: string): Promise<string | null> {
  if (!isTauri()) return null;

  try {
    // 从 BAP 加载简报配置
    const routineRecords = await loadBap('time_routine');
    const schedule = getScheduleState();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 检查是否有简报启用
    for (const record of routineRecords) {
      if (record.key === 'daily_brief') {
        try {
          const val = JSON.parse(record.value as string);
          if (val.enabled && val.time) {
            schedule.daily = true;
            schedule.dailyTime = val.time;
          }
        } catch {}
      } else if (record.key === 'weekly_report') {
        try {
          const val = JSON.parse(record.value as string);
          schedule.weekly = !!val.enabled;
        } catch {}
      } else if (record.key === 'monthly_compare') {
        try {
          const val = JSON.parse(record.value as string);
          schedule.monthly = !!val.enabled;
        } catch {}
      }
    }

    // 检查每日简报
    if (schedule.daily) {
      const [targetHour, targetMin] = schedule.dailyTime.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = targetHour * 60 + targetMin;

      // 在当前时间的 ±5 分钟内触发
      if (schedule.lastDailyBriefing !== today &&
          Math.abs(currentMinutes - targetMinutes) <= 5) {
        schedule.lastDailyBriefing = today;
        saveScheduleState(schedule);
        const { topKpis } = await getBapSummary();
        return generateBriefing(secretaryName, topKpis, 'daily');
      }
    }

    // 检查周报（周五）
    if (schedule.weekly && now.getDay() === 5) {
      const weekNum = getWeekNumber(now);
      if (schedule.lastWeeklyBriefing !== weekNum) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (currentMinutes >= 17 * 60 && currentMinutes <= 17 * 60 + 5) {
          schedule.lastWeeklyBriefing = weekNum;
          saveScheduleState(schedule);
          const { topKpis } = await getBapSummary();
          return generateBriefing(secretaryName, topKpis, 'weekly');
        }
      }
    }

    // 检查月报（每月1号）
    if (schedule.monthly && now.getDate() === 1) {
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (schedule.lastMonthlyBriefing !== monthKey) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (currentMinutes >= 9 * 60 && currentMinutes <= 9 * 60 + 5) {
          schedule.lastMonthlyBriefing = monthKey;
          saveScheduleState(schedule);
          const { topKpis } = await getBapSummary();
          return generateBriefing(secretaryName, topKpis, 'monthly');
        }
      }
    }
  } catch (error) {
    console.error('Failed to check briefing due:', error);
  }

  return null;
}

/**
 * 启动简报调度器（每分钟检查一次）
 * @param secretaryName 秘书名称
 * @param onBriefing 简报回调，将简报文本作为系统消息推入聊天
 * @returns 清理函数
 */
export function startBriefingScheduler(
  secretaryName: string,
  onBriefing: (content: string) => void,
): () => void {
  // 启动时立即检查一次
  checkBriefingDue(secretaryName).then((briefing) => {
    if (briefing) onBriefing(briefing);
  });

  // 每分钟检查一次
  const intervalId = setInterval(async () => {
    const briefing = await checkBriefingDue(secretaryName);
    if (briefing) onBriefing(briefing);
  }, 60000);

  return () => clearInterval(intervalId);
}

// ==================== 工具函数 ====================

/** 获取 ISO 周数 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
