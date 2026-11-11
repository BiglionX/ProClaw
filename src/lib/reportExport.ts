import {
  CashFlowReport,
  ProfitLossReport,
  ReportLineItem,
  ReportLineKind,
  getCashFlowReport,
  getProfitLossReport,
  getReportLines,
} from './financeService';

const EMPTY_COPY: Record<ReportLineKind, string> = {
  revenue: '本期间没有对应的收入凭证或已出库订单',
  cogs: '本期间没有对应的成本凭证或已出库订单',
  operating_expense: '本期间没有费用凭证',
  cash_in: '本期间没有收款记录',
  cash_out: '本期间没有付款记录',
};

const SECTION_TITLE: Record<ReportLineKind, string> = {
  revenue: '销售收入明细',
  cogs: '销售成本明细',
  operating_expense: '运营费用明细',
  cash_in: '经营现金流入明细',
  cash_out: '经营现金流出明细',
};

const PARTY_LABEL: Record<ReportLineKind, string> = {
  revenue: '客户',
  cogs: '客户',
  operating_expense: '科目',
  cash_in: '对方',
  cash_out: '对方',
};

function csvCell(value: string | number): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : '';
  }
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(cells: Array<string | number>): string {
  return cells.map(csvCell).join(',');
}

function detailSection(kind: ReportLineKind, lines: ReportLineItem[]): string[] {
  const header = csvRow(['日期', '单号', PARTY_LABEL[kind], '摘要', '来源', '金额']);
  if (lines.length === 0) {
    return [SECTION_TITLE[kind], csvRow(['说明', EMPTY_COPY[kind]]), ''];
  }
  return [
    SECTION_TITLE[kind],
    header,
    ...lines.map((line) =>
      csvRow([
        line.date,
        line.doc_no,
        line.party,
        line.summary,
        line.source,
        line.amount,
      ]),
    ),
    '',
  ];
}

export function buildProfitLossCsv(
  report: ProfitLossReport,
  details: Record<'revenue' | 'cogs' | 'operating_expense', ReportLineItem[]>,
): string {
  return [
    '利润表',
    csvRow(['期间', `${report.period.start} ~ ${report.period.end}`]),
    '',
    csvRow(['项目', '金额']),
    csvRow(['销售收入', report.revenue]),
    csvRow(['销售成本', report.cost_of_goods_sold]),
    csvRow(['毛利润', report.gross_profit]),
    csvRow(['运营费用', report.operating_expenses]),
    csvRow(['净利润', report.net_profit]),
    csvRow(['利润率', `${report.profit_margin.toFixed(2)}%`]),
    '',
    ...detailSection('revenue', details.revenue),
    ...detailSection('cogs', details.cogs),
    ...detailSection('operating_expense', details.operating_expense),
  ].join('\n');
}

export function buildCashFlowCsv(
  report: CashFlowReport,
  details: Record<'cash_in' | 'cash_out', ReportLineItem[]>,
): string {
  return [
    '现金流量表',
    csvRow(['期间', `${report.period.start} ~ ${report.period.end}`]),
    '',
    csvRow(['项目', '金额', '备注']),
    csvRow(['现金流入', report.operating_activities.inflow, '']),
    csvRow(['现金流出', report.operating_activities.outflow, '']),
    csvRow(['经营净现金流', report.operating_activities.net, '']),
    csvRow(['投资活动净额', report.investing_activities, '暂无构成']),
    csvRow(['筹资活动净额', report.financing_activities, '暂无构成']),
    csvRow(['净现金流', report.net_cash_flow, '']),
    '',
    ...detailSection('cash_in', details.cash_in),
    ...detailSection('cash_out', details.cash_out),
  ].join('\n');
}

export function buildDetailCsv(
  kind: ReportLineKind,
  startDate: string,
  endDate: string,
  lines: ReportLineItem[],
): string {
  return [
    csvRow(['期间', `${startDate} ~ ${endDate}`]),
    '',
    ...detailSection(kind, lines),
  ].join('\n');
}

export function exportDetailCsv(
  kind: ReportLineKind,
  startDate: string,
  endDate: string,
  lines: ReportLineItem[],
) {
  downloadCsv(
    reportExportFilename(SECTION_TITLE[kind], startDate, endDate),
    buildDetailCsv(kind, startDate, endDate, lines),
  );
}

export function reportExportFilename(title: string, startDate: string, endDate: string): string {
  return `${title}_${startDate}_${endDate}.csv`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportProfitLossCsv(startDate: string, endDate: string) {
  const [report, revenue, cogs, operatingExpense] = await Promise.all([
    getProfitLossReport(startDate, endDate),
    getReportLines(startDate, endDate, 'revenue'),
    getReportLines(startDate, endDate, 'cogs'),
    getReportLines(startDate, endDate, 'operating_expense'),
  ]);
  downloadCsv(
    reportExportFilename('利润表', report.period.start, report.period.end),
    buildProfitLossCsv(report, {
      revenue,
      cogs,
      operating_expense: operatingExpense,
    }),
  );
}

export async function exportCashFlowCsv(startDate: string, endDate: string) {
  const [report, cashIn, cashOut] = await Promise.all([
    getCashFlowReport(startDate, endDate),
    getReportLines(startDate, endDate, 'cash_in'),
    getReportLines(startDate, endDate, 'cash_out'),
  ]);
  downloadCsv(
    reportExportFilename('现金流量表', report.period.start, report.period.end),
    buildCashFlowCsv(report, { cash_in: cashIn, cash_out: cashOut }),
  );
}
