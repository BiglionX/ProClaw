import { describe, expect, it } from 'vitest';
import type { CashFlowReport, ProfitLossReport, ReportLineItem } from './financeService';
import { buildCashFlowCsv, buildDetailCsv, buildProfitLossCsv, reportExportFilename } from './reportExport';

const profit: ProfitLossReport = {
  period: { start: '2026-11-01', end: '2026-11-11' },
  revenue: 10290,
  cost_of_goods_sold: 100,
  gross_profit: 10190,
  operating_expenses: 0,
  net_profit: 10190,
  profit_margin: 99.03,
};

const revenueLine: ReportLineItem = {
  id: 'r1',
  date: '2026-11-02',
  doc_no: 'SO-1',
  party: '客户甲',
  summary: 'SO-1 贷：主营业务收入',
  amount: 10290,
  source: '凭证',
  reference_type: 'sales_order',
  reference_id: 'so-1',
};

describe('reportExport', () => {
  it('利润表文件名使用期间本地日期', () => {
    expect(reportExportFilename('利润表', '2026-11-01', '2026-11-11')).toBe(
      '利润表_2026-11-01_2026-11-11.csv',
    );
  });

  it('利润表先写汇总，空明细写说明', () => {
    const csv = buildProfitLossCsv(profit, {
      revenue: [revenueLine],
      cogs: [],
      operating_expense: [],
    });
    expect(csv).toContain('期间,2026-11-01 ~ 2026-11-11');
    expect(csv).toContain('销售收入,10290.00');
    expect(csv).toContain('利润率,99.03%');
    expect(csv).toContain('销售收入明细');
    expect(csv).toContain('2026-11-02,SO-1,客户甲,SO-1 贷：主营业务收入,凭证,10290.00');
    expect(csv).toContain('说明,本期间没有对应的成本凭证或已出库订单');
    expect(csv).toContain('说明,本期间没有费用凭证');
  });

  it('现金流量表标出投资和筹资暂无构成', () => {
    const report: CashFlowReport = {
      period: { start: '2026-10-01', end: '2026-10-31' },
      operating_activities: { inflow: 80, outflow: 40, net: 40 },
      investing_activities: 0,
      financing_activities: 0,
      net_cash_flow: 40,
    };
    const csv = buildCashFlowCsv(report, { cash_in: [], cash_out: [] });
    expect(csv.startsWith('现金流量表')).toBe(true);
    expect(csv).toContain('投资活动净额,0.00,暂无构成');
    expect(csv).toContain('筹资活动净额,0.00,暂无构成');
    expect(csv).toContain('说明,本期间没有收款记录');
    expect(csv).toContain('说明,本期间没有付款记录');
  });

  it('明细导出只包含当前打开的那一类', () => {
    const csv = buildDetailCsv('revenue', '2026-11-01', '2026-11-11', [revenueLine]);
    expect(csv).toContain('期间,2026-11-01 ~ 2026-11-11');
    expect(csv).toContain('销售收入明细');
    expect(csv).toContain('2026-11-02,SO-1,客户甲');
    expect(csv).not.toContain('销售成本明细');
    expect(reportExportFilename('销售收入明细', '2026-11-01', '2026-11-11')).toBe(
      '销售收入明细_2026-11-01_2026-11-11.csv',
    );
  });

  it('含逗号的摘要会被引号包住', () => {
    const csv = buildProfitLossCsv(profit, {
      revenue: [{ ...revenueLine, summary: '运费,加急' }],
      cogs: [],
      operating_expense: [],
    });
    expect(csv).toContain('"运费,加急"');
  });
});
