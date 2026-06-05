import {
  AccountBalance as BalanceIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as UpIcon,
  Receipt as ReceiptIcon,
  AccountBalanceWallet as WalletIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Description as DescriptionIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  CashFlowReport,
  FinancialSummary,
  ProfitLossReport,
  getCashFlowReport,
  getFinancialSummary,
  getProfitLossReport,
} from '../lib/financeService';
import {
  ARAPSummaryItem,
  ARAPDetailItem,
  getARAPSummary,
  getARAPDetail,
} from '../lib/paymentService';
import {
  ReconciliationRule,
  SmtpConfig,
  generateStatement,
  sendStatementEmail,
  createReconciliationRule,
  updateReconciliationRule,
  deleteReconciliationRule,
  getReconciliationRules,
  setSmtpConfig,
  getSmtpConfig,
  checkReconciliationRules,
} from '../lib/reconciliationService';


export default function FinancePage() {
  const [tabValue, setTabValue] = useState(0);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);

  // AR/AP 台账状态
  const [arApSummary, setArApSummary] = useState<ARAPSummaryItem[]>([]);
  const [arApSearch, setArApSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<ARAPDetailItem[]>([]);

  // 对账单状态
  const [stmtCounterpartyType, setStmtCounterpartyType] = useState('supplier');
  const [stmtCounterpartyId, setStmtCounterpartyId] = useState('');
  const [stmtStartDate, setStmtStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [stmtEndDate, setStmtEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [stmtFormat, setStmtFormat] = useState('detail');
  const [stmtPreview, setStmtPreview] = useState<ARAPDetailItem[]>([]);
  const [stmtLoading, setStmtLoading] = useState(false);

  // 提醒设置状态
  const [rules, setRules] = useState<ReconciliationRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReconciliationRule | null>(null);
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);

  // 加载财务概览
  const loadSummary = async () => {
    try {
      const data = await getFinancialSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  // 加载利润表
  const loadProfitLoss = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      const data = await getProfitLossReport(startDate, endDate);
      setProfitLoss(data);
    } catch (err) {
      console.error('Failed to load profit/loss:', err);
    }
  };

  // 加载现金流量表
  const loadCashFlow = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      const data = await getCashFlowReport(startDate, endDate);
      setCashFlow(data);
    } catch (err) {
      console.error('Failed to load cash flow:', err);
    }
  };

  useEffect(() => {
    loadSummary();
    loadProfitLoss();
    loadCashFlow();
  }, []);

  // 加载 AR/AP 台账
  const loadARAP = async (type: 'supplier' | 'customer') => {
    try {
      const data = await getARAPSummary(type);
      setArApSummary(data);
    } catch (err) {
      console.error('Failed to load AR/AP summary:', err);
    }
  };

  // 展开明细
  const handleExpandRow = async (type: 'supplier' | 'customer', id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null);
      setDetailItems([]);
      return;
    }
    setExpandedRow(id);
    try {
      const items = await getARAPDetail(type, id);
      setDetailItems(items);
    } catch (err) {
      console.error('Failed to load AR/AP detail:', err);
      setDetailItems([]);
    }
  };

  const formatCurrency = (value: number) => {
    return `¥${value.toFixed(2)}`;
  };

  // 加载对账规则
  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const data = await getReconciliationRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setRulesLoading(false);
    }
  };

  // 加载 SMTP 配置
  const loadSmtpConfig = async () => {
    try {
      const config = await getSmtpConfig();
      setSmtpConfig(config);
    } catch (err) {
      console.error('Failed to load SMTP config:', err);
    }
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          📊 财务报表
        </Typography>
        <Typography variant="body1" color="text.secondary">
          利润表、现金流量表和财务概览
        </Typography>
      </Box>

      {/* 标签页 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => {
            setTabValue(newValue);
            if (newValue === 3) loadARAP('supplier');
            if (newValue === 4) loadARAP('customer');
            if (newValue === 5) loadRules();
            if (newValue === 6) { loadRules(); loadSmtpConfig(); }
          }}
          variant="fullWidth"
        >
          <Tab icon={<BalanceIcon />} label="财务概览" />
          <Tab icon={<MoneyIcon />} label="利润表" />
          <Tab icon={<UpIcon />} label="现金流量表" />
          <Tab icon={<ReceiptIcon />} label="应付台账" />
          <Tab icon={<WalletIcon />} label="应收台账" />
          <Tab icon={<DescriptionIcon />} label="对账单" />
          <Tab icon={<NotificationsIcon />} label="提醒设置" />
        </Tabs>
      </Paper>

      {/* 财务概览标签页 */}
      {tabValue === 0 && summary && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card
                sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    本月收入
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.monthly_revenue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    本月支出
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.monthly_expense)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  bgcolor:
                    summary.monthly_profit >= 0
                      ? 'primary.light'
                      : 'warning.light',
                  color: 'white',
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    本月利润
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.monthly_profit)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    营运资金
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.working_capital)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 详细数据表格 */}
          <Paper
            elevation={0}
            sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}
          >
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        应收账款
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'warning.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(summary.accounts_receivable)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        应付账款
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'error.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(summary.accounts_payable)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        库存价值
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'primary.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(summary.inventory_value)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 利润表标签页 */}
      {tabValue === 1 && profitLoss && (
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'primary.50',
              }}
            >
              <Typography variant="h6">
                利润表 ({profitLoss.period.start} ~ {profitLoss.period.end})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        销售收入
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'success.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(profitLoss.revenue)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        销售成本
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'error.main', fontWeight: 'bold' }}
                      >
                        -{formatCurrency(profitLoss.cost_of_goods_sold)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <Typography
                        sx={{ fontWeight: 'bold', fontSize: '1.1em' }}
                      >
                        毛利润
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '1.1em',
                          color:
                            profitLoss.gross_profit >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(profitLoss.gross_profit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        运营费用
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'error.main', fontWeight: 'bold' }}
                      >
                        -{formatCurrency(profitLoss.operating_expenses)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'primary.50' }}>
                    <TableCell>
                      <Typography
                        sx={{ fontWeight: 'bold', fontSize: '1.2em' }}
                      >
                        净利润
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '1.2em',
                          color:
                            profitLoss.net_profit >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(profitLoss.net_profit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        利润率
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color:
                            profitLoss.profit_margin >= 20
                              ? 'success.main'
                              : profitLoss.profit_margin >= 10
                                ? 'warning.main'
                                : 'error.main',
                        }}
                      >
                        {profitLoss.profit_margin.toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 现金流量表标签页 */}
      {tabValue === 2 && cashFlow && (
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'info.50',
              }}
            >
              <Typography variant="h6">
                现金流量表 ({cashFlow.period.start} ~ {cashFlow.period.end})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography
                        sx={{ fontWeight: 'bold', color: 'primary.main' }}
                      >
                        经营活动现金流
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>现金流入</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'success.main' }}>
                        {formatCurrency(cashFlow.operating_activities.inflow)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>现金流出</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'error.main' }}>
                        -{formatCurrency(cashFlow.operating_activities.outflow)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ pl: 4 }}>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        经营净现金流
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color:
                            cashFlow.operating_activities.net >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(cashFlow.operating_activities.net)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography
                        sx={{ fontWeight: 'bold', color: 'primary.main' }}
                      >
                        投资活动现金流
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>净额</TableCell>
                    <TableCell align="right">
                      {formatCurrency(cashFlow.investing_activities)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography
                        sx={{ fontWeight: 'bold', color: 'primary.main' }}
                      >
                        筹资活动现金流
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>净额</TableCell>
                    <TableCell align="right">
                      {formatCurrency(cashFlow.financing_activities)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'info.50' }}>
                    <TableCell>
                      <Typography
                        sx={{ fontWeight: 'bold', fontSize: '1.2em' }}
                      >
                        净现金流
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '1.2em',
                          color:
                            cashFlow.net_cash_flow >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(cashFlow.net_cash_flow)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 应收/应付台账通用组件 */}
      {tabValue >= 3 && tabValue <= 4 && (
        <ARAPLedger
          tabValue={tabValue}
          arApSummary={arApSummary}
          arApSearch={arApSearch}
          setArApSearch={setArApSearch}
          expandedRow={expandedRow}
          detailItems={detailItems}
          onRefresh={() => loadARAP(tabValue === 3 ? 'supplier' : 'customer')}
          onExpandRow={(id) => handleExpandRow(tabValue === 3 ? 'supplier' : 'customer', id)}
          formatCurrency={formatCurrency}
        />
      )}

      {/* 对账单 Tab */}
      {tabValue === 5 && (
        <StatementTab
          stmtCounterpartyType={stmtCounterpartyType}
          setStmtCounterpartyType={setStmtCounterpartyType}
          stmtCounterpartyId={stmtCounterpartyId}
          setStmtCounterpartyId={setStmtCounterpartyId}
          stmtStartDate={stmtStartDate}
          setStmtStartDate={setStmtStartDate}
          stmtEndDate={stmtEndDate}
          setStmtEndDate={setStmtEndDate}
          stmtFormat={stmtFormat}
          setStmtFormat={setStmtFormat}
          stmtPreview={stmtPreview}
          setStmtPreview={setStmtPreview}
          stmtLoading={stmtLoading}
          setStmtLoading={setStmtLoading}
          formatCurrency={formatCurrency}
        />
      )}

      {/* 提醒设置 Tab */}
      {tabValue === 6 && (
        <RulesTab
          rules={rules}
          rulesLoading={rulesLoading}
          loadRules={loadRules}
          ruleDialogOpen={ruleDialogOpen}
          setRuleDialogOpen={setRuleDialogOpen}
          editingRule={editingRule}
          setEditingRule={setEditingRule}
          smtpDialogOpen={smtpDialogOpen}
          setSmtpDialogOpen={setSmtpDialogOpen}
          smtpConfig={smtpConfig}
          loadSmtpConfig={loadSmtpConfig}
        />
      )}
    </Box>
  );
}

// 应收/应付台账通用组件
interface ARAPLedgerProps {
  tabValue: number;
  arApSummary: ARAPSummaryItem[];
  arApSearch: string;
  setArApSearch: (v: string) => void;
  expandedRow: string | null;
  detailItems: ARAPDetailItem[];
  onRefresh: () => void;
  onExpandRow: (id: string) => void;
  formatCurrency: (v: number) => string;
}

function ARAPLedger({
  tabValue,
  arApSummary,
  arApSearch,
  setArApSearch,
  expandedRow,
  detailItems,
  onRefresh,
  onExpandRow,
  formatCurrency,
}: ARAPLedgerProps) {
  const isPayable = tabValue === 3;
  const title = isPayable ? '应付台账' : '应收台账';
  const subtitle = isPayable ? '按供应商汇总的应付账款' : '按客户汇总的应收账款';

  const filtered = arApSummary.filter(
    (item) =>
      !arApSearch ||
      (item.counterparty_name && item.counterparty_name.toLowerCase().includes(arApSearch.toLowerCase())) ||
      (item.counterparty_code && item.counterparty_code.toLowerCase().includes(arApSearch.toLowerCase()))
  );

  return (
    <Box>
      {/* 标题和搜索 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="搜索名称或编码..."
            value={arApSearch}
            onChange={(e) => setArApSearch(e.target.value)}
          />
          <Button variant="outlined" size="small" onClick={onRefresh}>
            刷新
          </Button>
        </Box>
      </Box>

      {/* 汇总表格 */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600 }}>{isPayable ? '供应商' : '客户'}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>总金额</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{isPayable ? '已付金额' : '已收金额'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{isPayable ? '未付余额' : '未收余额'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>订单数</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      {arApSearch ? '未搜索到匹配的记录' : '暂无数据'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <>
                    <TableRow
                      hover
                      onClick={() => onExpandRow(item.counterparty_id)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 500 }}>
                          {item.counterparty_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.counterparty_code || '-'}</TableCell>
                      <TableCell align="right">{formatCurrency(item.total_amount)}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: 'success.main' }}>
                          {formatCurrency(item.paid_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: item.balance > 0
                              ? (isPayable ? 'error.main' : 'warning.main')
                              : 'text.secondary',
                          }}
                        >
                          {formatCurrency(item.balance)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.order_count}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onExpandRow(item.counterparty_id); }}>
                          {expandedRow === item.counterparty_id ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    {/* 展开的明细行 */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={expandedRow === item.counterparty_id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              未清项明细
                            </Typography>
                            {detailItems.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">暂无未清项</Typography>
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>单据号</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>总金额</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>{isPayable ? '已付' : '已收'}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>余额</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {detailItems.map((d) => (
                                    <TableRow key={d.order_id}>
                                      <TableCell>{d.order_number}</TableCell>
                                      <TableCell>{d.order_date}</TableCell>
                                      <TableCell align="right">{formatCurrency(d.total_amount)}</TableCell>
                                      <TableCell align="right">{formatCurrency(d.paid_amount)}</TableCell>
                                      <TableCell align="right">
                                        <Typography sx={{ fontWeight: 500, color: d.balance > 0 ? 'error.main' : 'text.secondary' }}>
                                          {formatCurrency(d.balance)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Box
                                          sx={{
                                            display: 'inline-block',
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontSize: '0.75rem',
                                            bgcolor: d.payment_status === 'paid' ? 'success.light' : d.payment_status === 'partial' ? 'warning.light' : 'grey.200',
                                            color: d.payment_status === 'paid' ? 'success.contrastText' : d.payment_status === 'partial' ? 'warning.contrastText' : 'text.secondary',
                                          }}
                                        >
                                          {d.payment_status === 'paid' ? '已结清' : d.payment_status === 'partial' ? '部分付款' : '未付'}
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// ---- 对账单 Tab 组件 ----
interface StatementTabProps {
  stmtCounterpartyType: string;
  setStmtCounterpartyType: (v: string) => void;
  stmtCounterpartyId: string;
  setStmtCounterpartyId: (v: string) => void;
  stmtStartDate: string;
  setStmtStartDate: (v: string) => void;
  stmtEndDate: string;
  setStmtEndDate: (v: string) => void;
  stmtFormat: string;
  setStmtFormat: (v: string) => void;
  stmtPreview: ARAPDetailItem[];
  setStmtPreview: (v: ARAPDetailItem[]) => void;
  stmtLoading: boolean;
  setStmtLoading: (v: boolean) => void;
  formatCurrency: (v: number) => string;
}

function StatementTab({
  stmtCounterpartyType,
  setStmtCounterpartyType,
  stmtCounterpartyId,
  setStmtCounterpartyId,
  stmtStartDate,
  setStmtStartDate,
  stmtEndDate,
  setStmtEndDate,
  stmtFormat,
  setStmtFormat,
  stmtPreview,
  setStmtPreview,
  stmtLoading,
  setStmtLoading,
  formatCurrency,
}: StatementTabProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stmtMessage, setStmtMessage] = useState('');

  // 加载供应商/客户列表
  useEffect(() => {
    const loadLists = async () => {
      if (stmtCounterpartyType === 'specific_supplier') {
        try {
          const { getSuppliers } = await import('../lib/purchaseService');
          const data = await getSuppliers();
          setSuppliers(data);
        } catch { /* ignore */ }
      } else if (stmtCounterpartyType === 'specific_customer') {
        try {
          const { getCustomers } = await import('../lib/salesService');
          const data = await getCustomers();
          setCustomers(data);
        } catch { /* ignore */ }
      }
    };
    loadLists();
  }, [stmtCounterpartyType]);

  const handlePreview = async () => {
    setStmtMessage('');
    setStmtLoading(true);
    try {
      const { getARAPDetail } = await import('../lib/paymentService');
      const type = stmtCounterpartyType === 'supplier' || stmtCounterpartyType === 'specific_supplier' ? 'supplier' : 'customer';
      // 预览使用 ARAP API 获取未清项
      const items = await getARAPDetail(type as any, stmtCounterpartyId);
      setStmtPreview(items);
    } catch (err: any) {
      setStmtMessage(err.toString());
    } finally {
      setStmtLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setStmtLoading(true);
    setStmtMessage('');
    try {
      const type = stmtCounterpartyType === 'supplier' || stmtCounterpartyType === 'specific_supplier' ? 'supplier' : 'customer';
      const path = await generateStatement(type, stmtCounterpartyId, stmtStartDate, stmtEndDate, stmtFormat);
      const { save } = await import('@tauri-apps/plugin-dialog');
      const savePath = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `statement_${stmtCounterpartyType}_${stmtStartDate}_${stmtEndDate}.pdf`,
      });
      if (savePath) {
        // 复制文件到用户选择的位置（Tauri 2.x 可以使用 fs plugin）
        try {
          const { copyFile } = await import('@tauri-apps/plugin-fs');
          await copyFile(path, savePath);
          setStmtMessage(`PDF 已保存至: ${savePath}`);
        } catch {
          setStmtMessage(`PDF 已生成: ${path}`);
        }
      }
    } catch (err: any) {
      setStmtMessage(err.toString());
    } finally {
      setStmtLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setStmtLoading(true);
    setStmtMessage('');
    try {
      const type = stmtCounterpartyType === 'supplier' || stmtCounterpartyType === 'specific_supplier' ? 'supplier' : 'customer';
      const path = await generateStatement(type, stmtCounterpartyId, stmtStartDate, stmtEndDate, stmtFormat);
      const result = await sendStatementEmail(type, stmtCounterpartyId, path);
      setStmtMessage(result);
    } catch (err: any) {
      setStmtMessage(err.toString());
    } finally {
      setStmtLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>对账单</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        生成并导出交易明细/余额/未清项三种格式的对账单
      </Typography>

      {/* 筛选区 */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField
            select
            size="small"
            label="对象类型"
            value={stmtCounterpartyType}
            onChange={(e) => { setStmtCounterpartyType(e.target.value); setStmtCounterpartyId(''); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="supplier">供应商</MenuItem>
            <MenuItem value="customer">客户</MenuItem>
            <MenuItem value="specific_supplier">指定供应商</MenuItem>
            <MenuItem value="specific_customer">指定客户</MenuItem>
          </TextField>

          {stmtCounterpartyType === 'specific_supplier' && (
            <TextField
              select
              size="small"
              label="选择供应商"
              value={stmtCounterpartyId}
              onChange={(e) => setStmtCounterpartyId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {suppliers.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
          )}

          {stmtCounterpartyType === 'specific_customer' && (
            <TextField
              select
              size="small"
              label="选择客户"
              value={stmtCounterpartyId}
              onChange={(e) => setStmtCounterpartyId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {customers.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="开始日期"
            type="date"
            size="small"
            value={stmtStartDate}
            onChange={(e) => setStmtStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Typography sx={{ alignSelf: 'center' }}>~</Typography>
          <TextField
            label="结束日期"
            type="date"
            size="small"
            value={stmtEndDate}
            onChange={(e) => setStmtEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            size="small"
            label="格式"
            value={stmtFormat}
            onChange={(e) => setStmtFormat(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="detail">交易明细</MenuItem>
            <MenuItem value="balance">余额</MenuItem>
            <MenuItem value="open_items">未清项</MenuItem>
          </TextField>

          <Button variant="outlined" onClick={handlePreview} disabled={stmtLoading || !stmtCounterpartyId && stmtCounterpartyType.startsWith('specific_')}>
            生成预览
          </Button>
          <Button variant="contained" color="primary" onClick={handleDownloadPdf} disabled={stmtLoading}>
            下载 PDF
          </Button>
          <Button variant="contained" color="secondary" onClick={handleSendEmail} disabled={stmtLoading}>
            发送邮件
          </Button>
        </Box>
      </Paper>

      {/* 消息提示 */}
      {stmtMessage && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 1, bgcolor: stmtMessage.includes('失败') || stmtMessage.includes('错误') ? 'error.50' : 'success.50' }}>
          <Typography variant="body2" color={stmtMessage.includes('失败') || stmtMessage.includes('错误') ? 'error.main' : 'success.main'}>
            {stmtMessage}
          </Typography>
        </Paper>
      )}

      {/* 预览区域 */}
      {stmtLoading && <Typography sx={{ py: 2 }}>处理中...</Typography>}
      {!stmtLoading && stmtPreview.length > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 600 }}>单据号</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>总金额</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>已付/已收</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>余额</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stmtPreview.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.order_number}</TableCell>
                    <TableCell>{item.order_date}</TableCell>
                    <TableCell>{item.order_type === 'purchase' ? '采购' : '销售'}</TableCell>
                    <TableCell align="right">{formatCurrency(item.total_amount)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.paid_amount)}</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 500, color: item.balance > 0 ? 'error.main' : 'text.secondary' }}>
                        {formatCurrency(item.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{
                        display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, fontSize: '0.75rem',
                        bgcolor: item.payment_status === 'paid' ? 'success.light' : item.payment_status === 'partial' ? 'warning.light' : 'grey.200',
                        color: item.payment_status === 'paid' ? 'success.contrastText' : item.payment_status === 'partial' ? 'warning.contrastText' : 'text.secondary',
                      }}>
                        {item.payment_status === 'paid' ? '已结清' : item.payment_status === 'partial' ? '部分付款' : '未付'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      {!stmtLoading && stmtPreview.length === 0 && !stmtMessage && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          请选择对象和日期范围后生成预览
        </Typography>
      )}
    </Box>
  );
}

// ---- 提醒设置 Tab 组件 ----
interface RulesTabProps {
  rules: ReconciliationRule[];
  rulesLoading: boolean;
  loadRules: () => void;
  ruleDialogOpen: boolean;
  setRuleDialogOpen: (v: boolean) => void;
  editingRule: ReconciliationRule | null;
  setEditingRule: (v: ReconciliationRule | null) => void;
  smtpDialogOpen: boolean;
  setSmtpDialogOpen: (v: boolean) => void;
  smtpConfig: SmtpConfig | null;
  loadSmtpConfig: () => void;
}

function RulesTab({
  rules,
  rulesLoading,
  loadRules,
  ruleDialogOpen,
  setRuleDialogOpen,
  editingRule,
  setEditingRule,
  smtpDialogOpen,
  setSmtpDialogOpen,
  smtpConfig,
  loadSmtpConfig,
}: RulesTabProps) {
  const [ruleName, setRuleName] = useState('');
  const [ruleScopeType, setRuleScopeType] = useState('all');
  const [ruleScopeIds, setRuleScopeIds] = useState('');
  const [ruleTriggerType, setRuleTriggerType] = useState('date');
  const [ruleTriggerDay, setRuleTriggerDay] = useState(1);
  const [ruleTriggerInterval, setRuleTriggerInterval] = useState(7);
  const [ruleTriggerMinAmount, setRuleTriggerMinAmount] = useState(100000);
  const [ruleStatementFormat, setRuleStatementFormat] = useState('detail');
  const [ruleActionType, setRuleActionType] = useState('email');
  const [ruleExtraEmails, setRuleExtraEmails] = useState('');
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleError, setRuleError] = useState('');
  const [ruleMessage, setRuleMessage] = useState('');

  // SMTP dialog state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState('');

  // 打开编辑规则对话框
  const handleOpenEdit = (rule: ReconciliationRule | null) => {
    setEditingRule(rule);
    if (rule) {
      setRuleName(rule.name);
      setRuleScopeType(rule.scope_type || 'all');
      setRuleScopeIds(rule.scope_ids || '');
      setRuleTriggerType(rule.trigger_type);
      setRuleStatementFormat(rule.statement_format);
      setRuleActionType(rule.action_type);
      setRuleExtraEmails(rule.extra_emails || '');
      setRuleEnabled(rule.enabled === 1);
      try {
        const cfg = JSON.parse(rule.trigger_config);
        setRuleTriggerDay(cfg.day || 1);
        setRuleTriggerInterval(cfg.interval_days || 7);
        setRuleTriggerMinAmount(cfg.min_amount || 100000);
      } catch {
        setRuleTriggerDay(1);
        setRuleTriggerInterval(7);
        setRuleTriggerMinAmount(100000);
      }
    } else {
      setRuleName('');
      setRuleScopeType('all');
      setRuleScopeIds('');
      setRuleTriggerType('date');
      setRuleTriggerDay(1);
      setRuleTriggerInterval(7);
      setRuleTriggerMinAmount(100000);
      setRuleStatementFormat('detail');
      setRuleActionType('email');
      setRuleExtraEmails('');
      setRuleEnabled(true);
    }
    setRuleError('');
    setRuleMessage('');
    setRuleDialogOpen(true);
  };

  // 保存规则
  const handleSaveRule = async () => {
    if (!ruleName.trim()) { setRuleError('规则名称不能为空'); return; }
    setRuleSaving(true);
    setRuleError('');
    try {
      let triggerConfig: string;
      if (ruleTriggerType === 'date') {
        triggerConfig = JSON.stringify({ day: ruleTriggerDay });
      } else if (ruleTriggerType === 'period') {
        triggerConfig = JSON.stringify({ interval_days: ruleTriggerInterval });
      } else {
        triggerConfig = JSON.stringify({ min_amount: ruleTriggerMinAmount });
      }

      const ruleData = {
        name: ruleName.trim(),
        enabled: ruleEnabled ? 1 : 0,
        scope_type: ruleScopeType === 'all' ? null : ruleScopeType,
        scope_ids: ruleScopeIds || null,
        trigger_type: ruleTriggerType,
        trigger_config: triggerConfig,
        statement_format: ruleStatementFormat,
        action_type: ruleActionType,
        extra_emails: ruleExtraEmails || null,
      };

      if (editingRule) {
        await updateReconciliationRule(editingRule.id, ruleData);
      } else {
        await createReconciliationRule(ruleData);
      }
      setRuleDialogOpen(false);
      loadRules();
    } catch (err: any) {
      setRuleError(err.toString());
    } finally {
      setRuleSaving(false);
    }
  };

  // 删除规则
  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('确定删除此规则？')) return;
    try {
      await deleteReconciliationRule(ruleId);
      loadRules();
    } catch (err: any) {
      setRuleMessage(err.toString());
    }
  };

  // 立即执行规则检查
  const handleCheckNow = async () => {
    try {
      const result = await checkReconciliationRules();
      setRuleMessage(result.message);
    } catch (err: any) {
      setRuleMessage(err.toString());
    }
  };

  // 打开 SMTP 配置对话框
  const handleOpenSmtp = () => {
    if (smtpConfig) {
      setSmtpHost(smtpConfig.smtp_host || '');
      setSmtpPort(smtpConfig.smtp_port || '587');
      setSmtpUsername(smtpConfig.smtp_username || '');
      setSmtpPassword('');
      setSmtpFromEmail(smtpConfig.smtp_from_email || '');
      setSmtpFromName(smtpConfig.smtp_from_name || '');
    } else {
      setSmtpHost('');
      setSmtpPort('587');
      setSmtpUsername('');
      setSmtpPassword('');
      setSmtpFromEmail('');
      setSmtpFromName('');
    }
    setSmtpMessage('');
    setSmtpDialogOpen(true);
  };

  // 保存 SMTP 配置
  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    setSmtpMessage('');
    try {
      await setSmtpConfig(smtpHost, parseInt(smtpPort) || 587, smtpUsername, smtpPassword, smtpFromEmail, smtpFromName || undefined);
      setSmtpMessage('SMTP 配置已保存');
      setSmtpDialogOpen(false);
      loadSmtpConfig();
    } catch (err: any) {
      setSmtpMessage(err.toString());
    } finally {
      setSmtpSaving(false);
    }
  };

  // 格式化触发条件显示
  const formatTrigger = (rule: ReconciliationRule) => {
    try {
      const cfg = JSON.parse(rule.trigger_config);
      if (rule.trigger_type === 'date') return `每月 ${cfg.day || 1} 日`;
      if (rule.trigger_type === 'period') return `每 ${cfg.interval_days || 7} 天`;
      if (rule.trigger_type === 'amount') return `额度超过 ¥${(cfg.min_amount || 0).toLocaleString()}`;
    } catch { /* ignore */ }
    return rule.trigger_type;
  };

  const formatScope = (rule: ReconciliationRule) => {
    if (!rule.scope_type || rule.scope_type === 'all') return '全部';
    if (rule.scope_type === 'supplier') return '供应商';
    if (rule.scope_type === 'customer') return '客户';
    return rule.scope_type;
  };

  const formatStmtFmt = (fmt: string) => {
    if (fmt === 'detail') return '交易明细';
    if (fmt === 'balance') return '余额';
    if (fmt === 'open_items') return '未清项';
    return fmt;
  };

  const formatAction = (action: string) => {
    if (action === 'notification') return '系统通知';
    if (action === 'email') return '邮件发送';
    if (action === 'both') return '通知+邮件';
    return action;
  };

  return (
    <Box>
      {/* 标题和操作按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>提醒设置</Typography>
          <Typography variant="body2" color="text.secondary">
            配置自动对账提醒规则，在指定条件触发时发送对账单
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleOpenSmtp}>
            SMTP 配置
          </Button>
          <Button variant="outlined" size="small" onClick={handleCheckNow}>
            立即执行
          </Button>
          <Button variant="contained" size="small" onClick={() => handleOpenEdit(null)}>
            新增规则
          </Button>
        </Box>
      </Box>

      {/* 消息提示 */}
      {ruleMessage && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 1, bgcolor: ruleMessage.includes('失败') || ruleMessage.includes('错误') ? 'error.50' : 'success.50' }}>
          <Typography variant="body2" color={ruleMessage.includes('失败') || ruleMessage.includes('错误') ? 'error.main' : 'success.main'}>
            {ruleMessage}
          </Typography>
        </Paper>
      )}

      {/* 规则列表 */}
      {rulesLoading ? (
        <Typography sx={{ py: 2 }}>加载中...</Typography>
      ) : rules.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">暂无规则，点击"新增规则"创建</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rules.map((rule) => (
            <Paper key={rule.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{rule.name}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      对象: {formatScope(rule)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      触发: {formatTrigger(rule)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      格式: {formatStmtFmt(rule.statement_format)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      动作: {formatAction(rule.action_type)}
                    </Typography>
                  </Box>
                  {rule.last_run_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      上次执行: {rule.last_run_at}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={rule.enabled === 1}
                    onChange={async () => {
                      try {
                        await updateReconciliationRule(rule.id, {
                          name: rule.name,
                          enabled: rule.enabled === 1 ? 0 : 1,
                          scope_type: rule.scope_type,
                          scope_ids: rule.scope_ids,
                          trigger_type: rule.trigger_type,
                          trigger_config: rule.trigger_config,
                          statement_format: rule.statement_format,
                          action_type: rule.action_type,
                          extra_emails: rule.extra_emails,
                        });
                        loadRules();
                      } catch { /* ignore */ }
                    }}
                    size="small"
                  />
                  <Button size="small" onClick={() => handleOpenEdit(rule)}>编辑</Button>
                  <Button size="small" color="error" onClick={() => handleDeleteRule(rule.id)}>删除</Button>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* 新增/编辑规则 Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? '编辑规则' : '新增规则'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="规则名称" fullWidth value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
          <TextField
            select label="对象范围" fullWidth value={ruleScopeType}
            onChange={(e) => setRuleScopeType(e.target.value)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="supplier">供应商</MenuItem>
            <MenuItem value="customer">客户</MenuItem>
          </TextField>
          {ruleScopeType !== 'all' && (
            <TextField label="指定对象 ID（逗号分隔）" fullWidth value={ruleScopeIds} onChange={(e) => setRuleScopeIds(e.target.value)} />
          )}
          <TextField
            select label="触发条件" fullWidth value={ruleTriggerType}
            onChange={(e) => setRuleTriggerType(e.target.value)}
          >
            <MenuItem value="date">按日期（每月第N日）</MenuItem>
            <MenuItem value="period">按周期（每N天）</MenuItem>
            <MenuItem value="amount">按额度（超过X元）</MenuItem>
          </TextField>
          {ruleTriggerType === 'date' && (
            <TextField label="每月第几日" type="number" fullWidth value={ruleTriggerDay}
              onChange={(e) => setRuleTriggerDay(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1, max: 28 }}
            />
          )}
          {ruleTriggerType === 'period' && (
            <TextField label="间隔天数" type="number" fullWidth value={ruleTriggerInterval}
              onChange={(e) => setRuleTriggerInterval(parseInt(e.target.value) || 7)}
              inputProps={{ min: 1 }}
            />
          )}
          {ruleTriggerType === 'amount' && (
            <TextField label="最小金额（元）" type="number" fullWidth value={ruleTriggerMinAmount}
              onChange={(e) => setRuleTriggerMinAmount(parseFloat(e.target.value) || 0)}
              inputProps={{ min: 0 }}
            />
          )}
          <TextField
            select label="对账单格式" fullWidth value={ruleStatementFormat}
            onChange={(e) => setRuleStatementFormat(e.target.value)}
          >
            <MenuItem value="detail">交易明细</MenuItem>
            <MenuItem value="balance">余额</MenuItem>
            <MenuItem value="open_items">未清项</MenuItem>
          </TextField>
          <TextField
            select label="动作" fullWidth value={ruleActionType}
            onChange={(e) => setRuleActionType(e.target.value)}
          >
            <MenuItem value="notification">系统通知</MenuItem>
            <MenuItem value="email">邮件发送</MenuItem>
            <MenuItem value="both">通知 + 邮件</MenuItem>
          </TextField>
          <TextField label="额外收件人（逗号分隔邮箱）" fullWidth value={ruleExtraEmails}
            onChange={(e) => setRuleExtraEmails(e.target.value)}
            placeholder="email1@example.com,email2@example.com"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>启用</Typography>
            <Switch checked={ruleEnabled} onChange={(e) => setRuleEnabled(e.target.checked)} />
          </Box>
          {ruleError && <Typography color="error" variant="body2">{ruleError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)} disabled={ruleSaving}>取消</Button>
          <Button variant="contained" onClick={handleSaveRule} disabled={ruleSaving}>
            {ruleSaving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SMTP 配置 Dialog */}
      <Dialog open={smtpDialogOpen} onClose={() => setSmtpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>SMTP 配置</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="发件人名称" fullWidth value={smtpFromName}
            onChange={(e) => setSmtpFromName(e.target.value)} />
          <TextField label="发件人邮箱" fullWidth value={smtpFromEmail}
            onChange={(e) => setSmtpFromEmail(e.target.value)} />
          <TextField label="SMTP 地址" fullWidth value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
          <TextField label="端口" fullWidth value={smtpPort}
            onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
          <TextField label="用户名" fullWidth value={smtpUsername}
            onChange={(e) => setSmtpUsername(e.target.value)} />
          <TextField label="密码" type="password" fullWidth value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)} placeholder="留空则不修改" />
          {smtpMessage && <Typography color={smtpMessage.includes('失败') ? 'error' : 'success'} variant="body2">{smtpMessage}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSmtpDialogOpen(false)} disabled={smtpSaving}>取消</Button>
          <Button variant="contained" onClick={handleSaveSmtp} disabled={smtpSaving}>
            {smtpSaving ? '保存中...' : '保存配置'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
