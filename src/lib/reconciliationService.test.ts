import { describe, it, expect, vi, beforeEach } from 'vitest';

import { invoke } from '@tauri-apps/api/core';
const reconciliationService = await import('../lib/reconciliationService');

describe('reconciliationService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // 确保 isTauri 在每个测试前都返回 true
    const tauri = await import('../lib/tauri');
    vi.mocked(tauri.isTauri).mockImplementation(() => true);
  });

  it('generateStatement - 应该使用正确的参数调用', async () => {
    vi.mocked(invoke).mockResolvedValue('/tmp/statement.pdf');
    const result = await reconciliationService.generateStatement('supplier', 's_001', '2026-01-01', '2026-06-05', 'detail');

    expect(invoke).toHaveBeenCalledWith('generate_statement', {
      counterpartyType: 'supplier', counterpartyId: 's_001',
      startDate: '2026-01-01', endDate: '2026-06-05', format: 'detail',
    });
    expect(result).toBe('/tmp/statement.pdf');
  });

  it('generateStatement - 非 Tauri 环境返回 mock', async () => {
    const tauri = await import('../lib/tauri');
    vi.mocked(tauri.isTauri).mockReturnValue(false);
    const result = await reconciliationService.generateStatement('supplier', 's_001', '2026-01-01', '2026-06-05', 'detail');
    expect(result).toBe('/mock/statement.pdf');
  });

  it('createReconciliationRule - 应该使用正确的参数调用', async () => {
    const rule = {
      name: '月度催款', enabled: 1, scope_type: 'customer', scope_ids: null,
      trigger_type: 'date', trigger_config: '{"day":1}', statement_format: 'open_items',
      action_type: 'email', extra_emails: null,
    };
    vi.mocked(invoke).mockResolvedValue({ id: 'rule_001', message: '规则创建成功' });

    const result = await reconciliationService.createReconciliationRule(rule);

    expect(invoke).toHaveBeenCalledWith('create_reconciliation_rule', { rule });
    expect(result.id).toBe('rule_001');
  });

  it('updateReconciliationRule - 应该使用正确的参数调用', async () => {
    vi.mocked(invoke).mockResolvedValue({ id: 'rule_001', message: '规则更新成功' });

    const result = await reconciliationService.updateReconciliationRule('rule_001', { name: 'test', enabled: 0 });

    expect(invoke).toHaveBeenCalledWith('update_reconciliation_rule', { ruleId: 'rule_001', rule: { name: 'test', enabled: 0 } });
    expect(result.message).toBe('规则更新成功');
  });

  it('deleteReconciliationRule - 应该使用正确的参数调用', async () => {
    vi.mocked(invoke).mockResolvedValue({ message: '规则已删除' });

    const result = await reconciliationService.deleteReconciliationRule('rule_001');

    expect(invoke).toHaveBeenCalledWith('delete_reconciliation_rule', { ruleId: 'rule_001' });
    expect(result.message).toBe('规则已删除');
  });

  it('getReconciliationRules - 应该调用并返回规则列表', async () => {
    const mockRules = [{
      id: 'r1', name: '规则1', enabled: 1, scope_type: 'all', scope_ids: null,
      trigger_type: 'date', trigger_config: '{"day":1}', statement_format: 'detail',
      action_type: 'email', extra_emails: null, last_run_at: null, created_at: '2026-06-05',
    }];
    vi.mocked(invoke).mockResolvedValue(mockRules);

    const result = await reconciliationService.getReconciliationRules();

    expect(invoke).toHaveBeenCalledWith('get_reconciliation_rules');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('规则1');
  });

  it('setSmtpConfig - 应该使用正确的参数调用', async () => {
    vi.mocked(invoke).mockResolvedValue({ message: 'SMTP 配置保存成功' });

    const result = await reconciliationService.setSmtpConfig('smtp.example.com', 587, 'user@example.com', 'password123', 'noreply@example.com', '公司名称');

    expect(invoke).toHaveBeenCalledWith('set_smtp_config', {
      host: 'smtp.example.com', port: 587, username: 'user@example.com',
      password: 'password123', fromEmail: 'noreply@example.com', fromName: '公司名称',
    });
    expect(result.message).toBe('SMTP 配置保存成功');
  });

  it('getSmtpConfig - 应该调用并返回配置', async () => {
    const mockConfig = {
      smtp_host: 'smtp.example.com', smtp_port: '587', smtp_username: 'user',
      smtp_password: '******', smtp_from_email: 'from@test.com', smtp_from_name: '公司',
    };
    vi.mocked(invoke).mockResolvedValue(mockConfig);

    const result = await reconciliationService.getSmtpConfig();

    expect(invoke).toHaveBeenCalledWith('get_smtp_config');
    expect(result.smtp_host).toBe('smtp.example.com');
  });

  it('checkReconciliationRules - 应该调用并返回结果', async () => {
    vi.mocked(invoke).mockResolvedValue({ total_rules: 5, triggered: 2, message: '检查完成' });

    const result = await reconciliationService.checkReconciliationRules();

    expect(invoke).toHaveBeenCalledWith('check_reconciliation_rules');
    expect(result.triggered).toBe(2);
  });
});
