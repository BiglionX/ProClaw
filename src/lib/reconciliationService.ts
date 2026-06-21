import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';

export interface ReconciliationRule {
  id: string;
  name: string;
  enabled: number;
  scope_type: string | null;
  scope_ids: string | null;
  trigger_type: string;
  trigger_config: string;
  statement_format: string;
  action_type: string;
  extra_emails: string | null;
  last_run_at: string | null;
  created_at: string;
}

export interface SmtpConfig {
  smtp_host: string | null;
  smtp_port: string | null;
  smtp_username: string | null;
  smtp_password: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
}

/** 生成对账单 PDF，返回文件路径 */
export async function generateStatement(
  counterpartyType: string,
  counterpartyId: string,
  startDate: string,
  endDate: string,
  format: string,
): Promise<string> {
  if (!isTauri()) {
    return '/mock/statement.pdf';
  }
  return await invoke('generate_statement', {
    counterpartyType,
    counterpartyId,
    startDate,
    endDate,
    format,
  });
}

/** 发送对账单邮件 */
export async function sendStatementEmail(
  counterpartyType: string,
  counterpartyId: string,
  filePath: string,
): Promise<string> {
  if (!isTauri()) {
    return 'Mock: email sent';
  }
  return await invoke('send_statement_email', {
    counterpartyType,
    counterpartyId,
    filePath,
  });
}

/** 创建对账提醒规则 */
export async function createReconciliationRule(
  rule: Record<string, any>,
): Promise<{ id: string; message: string }> {
  if (!isTauri()) {
    return { id: 'mock', message: 'Mock: rule created' };
  }
  return await invoke('create_reconciliation_rule', { rule });
}

/** 更新对账提醒规则 */
export async function updateReconciliationRule(
  ruleId: string,
  rule: Record<string, any>,
): Promise<{ id: string; message: string }> {
  if (!isTauri()) {
    return { id: ruleId, message: 'Mock: rule updated' };
  }
  return await invoke('update_reconciliation_rule', { ruleId, rule });
}

/** 删除对账提醒规则 */
export async function deleteReconciliationRule(ruleId: string): Promise<{ message: string }> {
  if (!isTauri()) {
    return { message: 'Mock: rule deleted' };
  }
  return await invoke('delete_reconciliation_rule', { ruleId });
}

/** 获取所有对账规则 */
export async function getReconciliationRules(): Promise<ReconciliationRule[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_reconciliation_rules');
}

/** 设置 SMTP 配置 */
export async function setSmtpConfig(
  host: string,
  port: number,
  username: string,
  password: string,
  fromEmail: string,
  fromName?: string,
): Promise<{ message: string }> {
  if (!isTauri()) {
    return { message: 'Mock: SMTP config saved' };
  }
  return await invoke('set_smtp_config', {
    host,
    port,
    username,
    password,
    fromEmail,
    fromName: fromName || null,
  });
}

/** 获取 SMTP 配置（密码已脱敏） */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  if (!isTauri()) {
    return {
      smtp_host: null,
      smtp_port: null,
      smtp_username: null,
      smtp_password: null,
      smtp_from_email: null,
      smtp_from_name: null,
    };
  }
  return await invoke('get_smtp_config');
}

/** 手动触发规则检查 */
export async function checkReconciliationRules(): Promise<{
  total_rules: number;
  triggered: number;
  message: string;
}> {
  if (!isTauri()) {
    return { total_rules: 0, triggered: 0, message: 'Mock: check done' };
  }
  return await invoke('check_reconciliation_rules');
}
