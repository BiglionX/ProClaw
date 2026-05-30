/**
 * ProClaw AI 团队工作日志服务
 * 使用 localStorage 存储团队工作日志记录
 */

export interface TeamWorkLog {
  id: string;
  team_id: string;
  agent_id: string;
  agent_role: string;
  action: string;
  result: string;
  related_items: string[];
  status: 'completed' | 'in_progress' | 'failed';
  created_at: string;
}

const STORAGE_PREFIX = 'proclaw-team-worklogs-';

function readLogs(teamId: string): TeamWorkLog[] {
  try {
    const key = STORAGE_PREFIX + teamId;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLogs(teamId: string, logs: TeamWorkLog[]): void {
  localStorage.setItem(STORAGE_PREFIX + teamId, JSON.stringify(logs));
}

/**
 * 获取指定团队的所有工作日志，按时间倒序排列
 */
export function getWorkLogs(teamId: string): TeamWorkLog[] {
  return readLogs(teamId).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * 为指定团队新增一条工作日志
 */
export function addWorkLog(
  teamId: string,
  log: Omit<TeamWorkLog, 'id' | 'created_at'>
): TeamWorkLog {
  const logs = readLogs(teamId);
  const newLog: TeamWorkLog = {
    ...log,
    id: `wlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
  };
  logs.unshift(newLog);
  saveLogs(teamId, logs);
  return newLog;
}

/**
 * 删除指定团队的一条工作日志
 */
export function deleteWorkLog(teamId: string, logId: string): boolean {
  const logs = readLogs(teamId);
  const filtered = logs.filter((l) => l.id !== logId);
  if (filtered.length === logs.length) return false;
  saveLogs(teamId, filtered);
  return true;
}

/**
 * 清空指定团队的所有工作日志
 */
export function clearWorkLogs(teamId: string): void {
  saveLogs(teamId, []);
}

/**
 * 获取工作日志按日期的分组
 */
export function getWorkLogsGroupedByDate(teamId: string): Record<string, TeamWorkLog[]> {
  const logs = getWorkLogs(teamId);
  const grouped: Record<string, TeamWorkLog[]> = {};
  for (const log of logs) {
    const dateKey = log.created_at.slice(0, 10);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(log);
  }
  return grouped;
}
