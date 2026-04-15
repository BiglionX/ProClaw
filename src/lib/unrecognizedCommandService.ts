/**
 * 未识别指令收集服务
 * 用于收集和分析用户输入但无法识别的自然语言指令
 */

export interface UnrecognizedCommand {
  id: string;
  originalText: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  context?: {
    currentPage?: string;
    previousCommands?: string[];
  };
}

const STORAGE_KEY = 'proclaw_unrecognized_commands';
const MAX_STORED_COMMANDS = 1000; // 最多存储1000条记录
const DUPLICATE_TIME_WINDOW = 5 * 60 * 1000; // 5分钟内的相同指令视为重复
const AUTO_CLEANUP_DAYS = 30; // 自动清琅30天前的数据

/**
 * 检查是否为重复指令（5分钟内的相同指令）
 */
function isDuplicate(text: string, commands: UnrecognizedCommand[]): boolean {
  const normalizedText = text.toLowerCase().trim();
  const now = Date.now();

  return commands.some(cmd => {
    const cmdTime = new Date(cmd.timestamp).getTime();
    const timeDiff = now - cmdTime;
    const isSameText = cmd.originalText.toLowerCase().trim() === normalizedText;
    
    return isSameText && timeDiff < DUPLICATE_TIME_WINDOW;
  });
}

/**
 * 保存未识别的指令
 */
export function saveUnrecognizedCommand(
  text: string,
  options?: {
    userId?: string;
    sessionId?: string;
    context?: UnrecognizedCommand['context'];
  }
): void {
  try {
    const commands = getUnrecognizedCommands();

    // 检查是否为重复指令
    if (isDuplicate(text, commands)) {
      console.log('[UnrecognizedCommand] Skipped duplicate:', text);
      return;
    }

    const newCommand: UnrecognizedCommand = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      originalText: text.trim(),
      timestamp: new Date().toISOString(),
      userId: options?.userId,
      sessionId: options?.sessionId,
      context: options?.context,
    };

    // 添加到列表开头（最新的在前）
    commands.unshift(newCommand);

    // 限制存储数量
    if (commands.length > MAX_STORED_COMMANDS) {
      commands.length = MAX_STORED_COMMANDS;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
    console.log('[UnrecognizedCommand] Saved:', newCommand.originalText);
  } catch (error) {
    console.error('[UnrecognizedCommand] Failed to save:', error);
  }
}

/**
 * 获取所有未识别的指令
 */
export function getUnrecognizedCommands(): UnrecognizedCommand[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    let commands: UnrecognizedCommand[] = JSON.parse(data);

    // 自动清理过期数据
    commands = autoCleanup(commands);

    return commands;
  } catch (error) {
    console.error('[UnrecognizedCommand] Failed to load:', error);
    return [];
  }
}

/**
 * 自动清理过期数据
 */
function autoCleanup(commands: UnrecognizedCommand[]): UnrecognizedCommand[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - AUTO_CLEANUP_DAYS);

  const originalCount = commands.length;
  const filtered = commands.filter(
    cmd => new Date(cmd.timestamp) >= cutoffDate
  );

  if (filtered.length < originalCount) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log(
      `[UnrecognizedCommand] Auto-cleaned ${originalCount - filtered.length} expired commands`
    );
  }

  return filtered;
}

/**
 * 清除所有未识别的指令
 */
export function clearUnrecognizedCommands(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[UnrecognizedCommand] All commands cleared');
  } catch (error) {
    console.error('[UnrecognizedCommand] Failed to clear:', error);
  }
}

/**
 * 删除指定的未识别指令
 */
export function deleteUnrecognizedCommand(id: string): void {
  try {
    const commands = getUnrecognizedCommands();
    const filtered = commands.filter(cmd => cmd.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[UnrecognizedCommand] Failed to delete:', error);
  }
}

/**
 * 导出未识别指令为 JSON
 */
export function exportUnrecognizedCommands(): string {
  const commands = getUnrecognizedCommands();
  return JSON.stringify(commands, null, 2);
}

/**
 * 导出未识别指令为 CSV
 */
export function exportUnrecognizedCommandsAsCSV(): string {
  const commands = getUnrecognizedCommands();

  if (commands.length === 0) {
    return '';
  }

  // CSV 表头
  const headers = ['ID', '时间', '用户指令', '用户ID', '会话ID', '当前页面'];

  // CSV 数据行
  const rows = commands.map(cmd => [
    cmd.id,
    new Date(cmd.timestamp).toLocaleString('zh-CN'),
    `"${cmd.originalText.replace(/"/g, '""')}"`, // 转义双引号
    cmd.userId || '',
    cmd.sessionId || '',
    cmd.context?.currentPage || '',
  ]);

  // 组合 CSV 内容
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return `\ufeff${csvContent}`; // 添加 BOM 以支持中文
}

/**
 * 下载未识别指令文件
 */
export function downloadUnrecognizedCommands(format: 'json' | 'csv' = 'json'): void {
  const content =
    format === 'json'
      ? exportUnrecognizedCommands()
      : exportUnrecognizedCommandsAsCSV();

  if (!content) {
    alert('没有可导出的数据');
    return;
  }

  const blob = new Blob([content], {
    type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `unrecognized_commands_${timestamp}.${format}`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log(`[UnrecognizedCommand] Downloaded: ${filename}`);
}

/**
 * 获取统计信息
 */
export function getUnrecognizedCommandsStats(): {
  totalCount: number;
  todayCount: number;
  weekCount: number;
  topCommands: Array<{ text: string; count: number }>;
} {
  const commands = getUnrecognizedCommands();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 统计总数
  const totalCount = commands.length;

  // 统计今日数量
  const todayCount = commands.filter(
    cmd => new Date(cmd.timestamp) >= today
  ).length;

  // 统计本周数量
  const weekCount = commands.filter(
    cmd => new Date(cmd.timestamp) >= weekAgo
  ).length;

  // 统计高频指令
  const commandFrequency: Record<string, number> = {};
  commands.forEach(cmd => {
    const text = cmd.originalText.toLowerCase().trim();
    commandFrequency[text] = (commandFrequency[text] || 0) + 1;
  });

  const topCommands = Object.entries(commandFrequency)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // 取前10个

  return {
    totalCount,
    todayCount,
    weekCount,
    topCommands,
  };
}
