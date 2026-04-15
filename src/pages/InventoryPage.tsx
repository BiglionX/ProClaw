import {
  Add as AddIcon,
  ArrowDownward as InboundIcon,
  TrendingDown as LowStockIcon,
  ArrowUpward as OutboundIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
  CreateTransactionInput,
  InventoryStats,
  InventoryTransaction,
  createInventoryTransaction,
  getInventoryStats,
  getInventoryTransactions,
} from '../lib/inventoryService';
import { Product, getProducts } from '../lib/productService';
import {
  CreateSupplierInput,
  Supplier,
  createSupplier,
  getSuppliers,
} from '../lib/purchaseService';
import {
  CreateCustomerInput,
  Customer,
  createCustomer,
  getCustomers,
} from '../lib/salesService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `inventory-tab-${index}`,
    'aria-controls': `inventory-tabpanel-${index}`,
  };
}

export default function InventoryPage() {
  const [tabValue, setTabValue] = useState(0);

  // 库存管理状态
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // 供应商管理状态
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState<CreateSupplierInput>({
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    payment_terms: '月结30天',
    tax_number: '',
    notes: '',
    is_active: true,
  });

  // 客户管理状态
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CreateCustomerInput>({
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    customer_type: 'company',
    tax_number: '',
    credit_limit: 0,
    notes: '',
    is_active: true,
  });

  // 通用状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 库存交易对话框状态
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionForm, setTransactionForm] =
    useState<CreateTransactionInput>({
      product_id: '',
      transaction_type: 'inbound',
      quantity: 0,
      reference_no: '',
      reason: '',
      notes: '',
    });

  // 加载数据
  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const [statsData, transactionsData, productsData] = await Promise.all([
        getInventoryStats(),
        getInventoryTransactions(),
        getProducts({ limit: 100 }),
      ]);
      setStats(statsData);
      setTransactions(transactionsData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载库存数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await getSuppliers({ search: supplierSearch || undefined });
      setSuppliers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载供应商失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers({ search: customerSearch || undefined });
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载客户失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadInventoryData();
    } else if (tabValue === 1) {
      loadSuppliers();
    } else if (tabValue === 2) {
      loadCustomers();
    }
  }, [tabValue]);

  // Tab 切换处理
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 库存交易表单提交
  const handleTransactionSubmit = async () => {
    try {
      if (!transactionForm.product_id) {
        setError('请选择产品');
        return;
      }
      if (transactionForm.quantity <= 0) {
        setError('数量必须大于0');
        return;
      }

      setLoading(true);
      await createInventoryTransaction(transactionForm);
      setSuccessMessage('库存交易创建成功!');
      setTransactionDialogOpen(false);
      resetTransactionForm();
      loadInventoryData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建交易失败');
    } finally {
      setLoading(false);
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      product_id: '',
      transaction_type: 'inbound',
      quantity: 0,
      reference_no: '',
      reason: '',
      notes: '',
    });
  };

  // 供应商表单提交
  const handleSupplierSubmit = async () => {
    try {
      if (!supplierForm.name) {
        setError('请输入供应商名称');
        return;
      }

      setLoading(true);
      await createSupplier(supplierForm);
      setSuccessMessage('供应商创建成功!');
      setSupplierDialogOpen(false);
      resetSupplierForm();
      loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建供应商失败');
    } finally {
      setLoading(false);
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      code: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      payment_terms: '月结30天',
      tax_number: '',
      notes: '',
      is_active: true,
    });
  };

  // 客户表单提交
  const handleCustomerSubmit = async () => {
    try {
      if (!customerForm.name) {
        setError('请输入客户名称');
        return;
      }

      setLoading(true);
      await createCustomer(customerForm);
      setSuccessMessage('客户创建成功!');
      setCustomerDialogOpen(false);
      resetCustomerForm();
      loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建客户失败');
    } finally {
      setLoading(false);
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      name: '',
      code: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      customer_type: 'company',
      tax_number: '',
      credit_limit: 0,
      notes: '',
      is_active: true,
    });
  };

  // 获取交易类型标签
  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inbound: '入库',
      outbound: '出库',
      adjustment: '调整',
      transfer: '调拨',
    };
    return labels[type] || type;
  };

  // 获取交易类型颜色
  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
      inbound: 'success',
      outbound: 'error',
      adjustment: 'warning',
      transfer: 'info',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          📊 进销存管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          库存管理、供应商管理和客户管理
        </Typography>
      </Box>

      {/* Tab 导航 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="📦 库存管理" {...a11yProps(0)} />
          <Tab label="🏢 供应商管理" {...a11yProps(1)} />
          <Tab label="👥 客户管理" {...a11yProps(2)} />
        </Tabs>
      </Paper>

      {/* Tab 0: 库存管理 */}
      <TabPanel value={tabValue} index={0}>
        {/* 统计卡片 */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{ 
                  bgcolor: 'primary.light', 
                  color: 'primary.contrastText',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: 120
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    总产品数
                  </Typography>
                  <Typography variant="h3">{stats.total_products}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{ 
                  bgcolor: 'warning.light', 
                  color: 'warning.contrastText',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: 120
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    低库存
                  </Typography>
                  <Typography variant="h3">{stats.low_stock_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{ 
                  bgcolor: 'error.light', 
                  color: 'error.contrastText',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: 120
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    零库存
                  </Typography>
                  <Typography variant="h3">{stats.zero_stock_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card 
                sx={{ 
                  bgcolor: 'info.light', 
                  color: 'info.contrastText',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: 120
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    今日交易
                  </Typography>
                  <Typography variant="h3">
                    {stats.today_transactions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card
                sx={{ 
                  bgcolor: 'success.light', 
                  color: 'success.contrastText',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: 120
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    库存总值
                  </Typography>
                  <Typography variant="h4" sx={{ wordBreak: 'break-all', lineHeight: 1.2 }}>
                    ¥{stats.total_value.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* 低库存预警 */}
        {stats && stats.low_stock_products.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              border: '1px solid',
              borderColor: 'warning.main',
              borderRadius: 2,
              bgcolor: 'warning.50',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LowStockIcon sx={{ color: 'warning.main', mr: 1 }} />
              <Typography variant="h6" color="warning.dark">
                低库存预警 ({stats.low_stock_products.length})
              </Typography>
            </Box>
            <Grid container spacing={1}>
              {stats.low_stock_products.map(product => (
                <Grid item key={product.id}>
                  <Chip
                    label={`${product.name} (${product.sku}): ${product.current_stock}/${product.min_stock}`}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* 操作栏 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTransactionDialogOpen(true)}
            disabled={loading}
          >
            新建库存交易
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadInventoryData}
            disabled={loading}
          >
            刷新
          </Button>
        </Paper>

        {/* 交易历史表格 */}
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">库存交易记录</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>交易类型</TableCell>
                  <TableCell>产品</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell>参考单号</TableCell>
                  <TableCell>原因</TableCell>
                  <TableCell>同步状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        暂无交易记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map(tx => {
                    const product = products.find(p => p.id === tx.product_id);
                    return (
                      <TableRow key={tx.id} hover>
                        <TableCell>
                          {new Date(tx.created_at).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getTransactionTypeLabel(tx.transaction_type)}
                            color={getTransactionTypeColor(tx.transaction_type)}
                            size="small"
                            icon={
                              tx.transaction_type === 'inbound' ? (
                                <InboundIcon />
                              ) : tx.transaction_type === 'outbound' ? (
                                <OutboundIcon />
                              ) : undefined
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {product
                            ? `${product.name} (${product.sku})`
                            : tx.product_id}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{
                              color:
                                tx.transaction_type === 'inbound'
                                  ? 'success.main'
                                  : tx.transaction_type === 'outbound'
                                    ? 'error.main'
                                    : 'inherit',
                              fontWeight: 'bold',
                            }}
                          >
                            {tx.transaction_type === 'inbound' ? '+' : '-'}
                            {tx.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell>{tx.reference_no || '-'}</TableCell>
                        <TableCell>{tx.reason || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              tx.sync_status === 'pending' ? '待同步' : '已同步'
                            }
                            color={
                              tx.sync_status === 'pending'
                                ? 'warning'
                                : 'success'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Tab 1: 供应商管理 */}
      <TabPanel value={tabValue} index={1}>
        {/* 操作栏 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <TextField
            placeholder="搜索供应商..."
            value={supplierSearch}
            onChange={e => setSupplierSearch(e.target.value)}
            sx={{ minWidth: 250 }}
            size="small"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setSupplierDialogOpen(true)}
            disabled={loading}
          >
            新增供应商
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSuppliers}
            disabled={loading}
          >
            刷新
          </Button>
        </Paper>

        {/* 供应商列表 */}
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>供应商名称</TableCell>
                  <TableCell>联系人</TableCell>
                  <TableCell>电话</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>地址</TableCell>
                  <TableCell>信用额度</TableCell>
                  <TableCell>账期</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        暂无供应商数据
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map(supplier => (
                    <TableRow key={supplier.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {supplier.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {supplier.code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{supplier.contact_person || '-'}</TableCell>
                      <TableCell>{supplier.phone || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell>{supplier.address || '-'}</TableCell>
                      <TableCell>{supplier.payment_terms || '-'}</TableCell>
                      <TableCell>¥0.00</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Tab 2: 客户管理 */}
      <TabPanel value={tabValue} index={2}>
        {/* 操作栏 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <TextField
            placeholder="搜索客户..."
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
            sx={{ minWidth: 250 }}
            size="small"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCustomerDialogOpen(true)}
            disabled={loading}
          >
            新增客户
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCustomers}
            disabled={loading}
          >
            刷新
          </Button>
        </Paper>

        {/* 客户列表 */}
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>客户名称</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>联系人</TableCell>
                  <TableCell>电话</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>地址</TableCell>
                  <TableCell>信用额度</TableCell>
                  <TableCell>账期</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        暂无客户数据
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map(customer => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            customer.customer_type === 'company'
                              ? '企业'
                              : '个人'
                          }
                          size="small"
                          color={
                            customer.customer_type === 'company'
                              ? 'primary'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{customer.contact_person || '-'}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>{customer.address || '-'}</TableCell>
                      <TableCell>
                        ¥{customer.credit_limit?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* 库存交易对话框 */}
      <Dialog
        open={transactionDialogOpen}
        onClose={() => setTransactionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建库存交易</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>交易类型</InputLabel>
              <Select
                value={transactionForm.transaction_type}
                label="交易类型"
                onChange={e =>
                  setTransactionForm({
                    ...transactionForm,
                    transaction_type: e.target.value as any,
                  })
                }
              >
                <MenuItem value="inbound">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InboundIcon color="success" />
                    入库
                  </Box>
                </MenuItem>
                <MenuItem value="outbound">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <OutboundIcon color="error" />
                    出库
                  </Box>
                </MenuItem>
                <MenuItem value="adjustment">库存调整</MenuItem>
                <MenuItem value="transfer">库存调拨</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>产品</InputLabel>
              <Select
                value={transactionForm.product_id}
                label="产品"
                onChange={e =>
                  setTransactionForm({
                    ...transactionForm,
                    product_id: e.target.value,
                  })
                }
              >
                {products.map(product => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - 当前库存:{' '}
                    {product.current_stock}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="数量"
              type="number"
              value={transactionForm.quantity}
              onChange={e =>
                setTransactionForm({
                  ...transactionForm,
                  quantity: parseInt(e.target.value) || 0,
                })
              }
              inputProps={{ min: 1 }}
              fullWidth
            />

            <TextField
              label="参考单号"
              value={transactionForm.reference_no}
              onChange={e =>
                setTransactionForm({
                  ...transactionForm,
                  reference_no: e.target.value,
                })
              }
              placeholder="例如: PO-2024-001"
              fullWidth
            />

            <TextField
              label="原因"
              value={transactionForm.reason}
              onChange={e =>
                setTransactionForm({
                  ...transactionForm,
                  reason: e.target.value,
                })
              }
              placeholder="例如: 采购入库、销售出库"
              fullWidth
            />

            <TextField
              label="备注"
              value={transactionForm.notes}
              onChange={e =>
                setTransactionForm({
                  ...transactionForm,
                  notes: e.target.value,
                })
              }
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleTransactionSubmit}
            variant="contained"
            disabled={loading}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>

      {/* 供应商对话框 */}
      <Dialog
        open={supplierDialogOpen}
        onClose={() => setSupplierDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增供应商</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              pt: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
            }}
          >
            <TextField
              label="供应商名称 *"
              value={supplierForm.name}
              onChange={e =>
                setSupplierForm({ ...supplierForm, name: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="供应商编码"
              value={supplierForm.code}
              onChange={e =>
                setSupplierForm({ ...supplierForm, code: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="联系人"
              value={supplierForm.contact_person}
              onChange={e =>
                setSupplierForm({
                  ...supplierForm,
                  contact_person: e.target.value,
                })
              }
              fullWidth
            />
            <TextField
              label="电话"
              value={supplierForm.phone}
              onChange={e =>
                setSupplierForm({ ...supplierForm, phone: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="邮箱"
              value={supplierForm.email}
              onChange={e =>
                setSupplierForm({ ...supplierForm, email: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="税号"
              value={supplierForm.tax_number}
              onChange={e =>
                setSupplierForm({ ...supplierForm, tax_number: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="地址"
              value={supplierForm.address}
              onChange={e =>
                setSupplierForm({ ...supplierForm, address: e.target.value })
              }
              fullWidth
              sx={{ gridColumn: 'span 2' }}
            />
            <TextField
              label="网站"
              value={supplierForm.website}
              onChange={e =>
                setSupplierForm({ ...supplierForm, website: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="税号"
              value={supplierForm.tax_number}
              onChange={e =>
                setSupplierForm({ ...supplierForm, tax_number: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="备注"
              value={supplierForm.notes}
              onChange={e =>
                setSupplierForm({ ...supplierForm, notes: e.target.value })
              }
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: 'span 2' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleSupplierSubmit}
            variant="contained"
            disabled={loading}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>

      {/* 客户对话框 */}
      <Dialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增客户</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              pt: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
            }}
          >
            <TextField
              label="客户名称 *"
              value={customerForm.name}
              onChange={e =>
                setCustomerForm({ ...customerForm, name: e.target.value })
              }
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>客户类型</InputLabel>
              <Select
                value={customerForm.customer_type}
                label="客户类型"
                onChange={e =>
                  setCustomerForm({
                    ...customerForm,
                    customer_type: e.target.value as any,
                  })
                }
              >
                <MenuItem value="company">企业</MenuItem>
                <MenuItem value="individual">个人</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="客户编码"
              value={customerForm.code}
              onChange={e =>
                setCustomerForm({ ...customerForm, code: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="联系人"
              value={customerForm.contact_person}
              onChange={e =>
                setCustomerForm({
                  ...customerForm,
                  contact_person: e.target.value,
                })
              }
              fullWidth
            />
            <TextField
              label="电话"
              value={customerForm.phone}
              onChange={e =>
                setCustomerForm({ ...customerForm, phone: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="邮箱"
              value={customerForm.email}
              onChange={e =>
                setCustomerForm({ ...customerForm, email: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="税号"
              value={customerForm.tax_number}
              onChange={e =>
                setCustomerForm({ ...customerForm, tax_number: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="地址"
              value={customerForm.address}
              onChange={e =>
                setCustomerForm({ ...customerForm, address: e.target.value })
              }
              fullWidth
              sx={{ gridColumn: 'span 2' }}
            />
            <TextField
              label="网站"
              value={customerForm.website}
              onChange={e =>
                setCustomerForm({ ...customerForm, website: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="税号"
              value={customerForm.tax_number}
              onChange={e =>
                setCustomerForm({ ...customerForm, tax_number: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="备注"
              value={customerForm.notes}
              onChange={e =>
                setCustomerForm({ ...customerForm, notes: e.target.value })
              }
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: 'span 2' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleCustomerSubmit}
            variant="contained"
            disabled={loading}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>

      {/* 错误提示 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* 成功提示 */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMessage(null)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
