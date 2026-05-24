import {
  Add as AddIcon,
  ArrowDownward as InboundIcon,
  TrendingDown as LowStockIcon,
  ArrowUpward as OutboundIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Assignment as OrderIcon,
  People as CustomerIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  PointOfSale as SalesIcon,
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
import { ProductSPU, getProductSPUs } from '../lib/productService';
import {
  CreateSupplierInput,
  PurchaseOrder,
  Supplier,
  createSupplier,
  getPurchaseOrders,
  getSuppliers,
  generateSupplierCode,
} from '../lib/purchaseService';
import {
  CreateCustomerInput,
  Customer,
  SalesOrder,
  createCustomer,
  getCustomers,
  getSalesOrders,
  generateCustomerCode,
} from '../lib/salesService';

/* ========== 工具函数 ========== */

const getTransactionTypeLabel = (type: string) => {
  const labels: Record<string, string> = { inbound: '入库', outbound: '出库', adjustment: '调整', transfer: '调拨' };
  return labels[type] || type;
};

const getTransactionTypeColor = (type: string) => {
  const colors: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
    inbound: 'success', outbound: 'error', adjustment: 'warning', transfer: 'info',
  };
  return colors[type] || 'default';
};

/* ========== 库存管理 Tab ========== */

function InventoryTab({
  loading, setLoading, setError, setSuccessMessage,
}: {
  loading: boolean; setLoading: (v: boolean) => void;
  setError: (e: string | null) => void; setSuccessMessage: (e: string | null) => void;
}) {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<ProductSPU[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateTransactionInput>({
    product_id: '', transaction_type: 'inbound', quantity: 0, reference_no: '', reason: '', notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, txData, prodData] = await Promise.all([
        getInventoryStats(), getInventoryTransactions(), getProductSPUs({ limit: 100 }),
      ]);
      setStats(statsData);
      setTransactions(txData);
      setProducts(prodData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载库存数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    if (!form.product_id) { setError('请选择产品'); return; }
    if (form.quantity <= 0) { setError('数量必须大于0'); return; }
    try {
      setLoading(true);
      await createInventoryTransaction(form);
      setSuccessMessage('库存交易创建成功!');
      setDialogOpen(false);
      setForm({ product_id: '', transaction_type: 'inbound', quantity: 0, reference_no: '', reason: '', notes: '' });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建交易失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* 统计卡片 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: '总产品数', value: stats.total_products, color: 'primary' },
            { label: '低库存', value: stats.low_stock_count, color: 'warning' },
            { label: '零库存', value: stats.zero_stock_count, color: 'error' },
            { label: '今日交易', value: stats.today_transactions, color: 'info' },
          ].map(item => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <Card sx={{ bgcolor: `${item.color}.light`, color: `${item.color}.contrastText`, height: '100%', minHeight: 120 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{item.label}</Typography>
                  <Typography variant="h3">{item.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText', height: '100%', minHeight: 120 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>库存总值</Typography>
                <Typography variant="h4" sx={{ wordBreak: 'break-all', lineHeight: 1.2 }}>
                  ¥{stats?.total_value.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 低库存预警 */}
      {stats && stats.low_stock_products.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'warning.main', borderRadius: 2, bgcolor: 'warning.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LowStockIcon sx={{ color: 'warning.main', mr: 1 }} />
            <Typography variant="h6" color="warning.dark">低库存预警 ({stats.low_stock_products.length})</Typography>
          </Box>
          <Grid container spacing={1}>
            {stats.low_stock_products.map(p => (
              <Grid item key={p.id}>
                <Chip label={`${p.name} (SPU: ${p.spu_code}): ${p.total_stock}/${p.min_stock} (${p.sku_count}个SKU)`}
                  color="warning" variant="outlined" size="small" />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* 操作栏 */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} disabled={loading}>
          新建库存交易
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>刷新</Button>
      </Paper>

      {/* 交易记录表 */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">库存交易记录</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>时间</TableCell><TableCell>交易类型</TableCell><TableCell>产品</TableCell>
                <TableCell align="right">数量</TableCell><TableCell>参考单号</TableCell><TableCell>原因</TableCell><TableCell>同步状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">暂无交易记录</Typography></TableCell></TableRow>
              ) : (
                transactions.map(tx => {
                  const product = products.find(p => p.id === tx.product_id);
                  return (
                    <TableRow key={tx.id} hover>
                      <TableCell>{new Date(tx.created_at).toLocaleString('zh-CN')}</TableCell>
                      <TableCell>
                        <Chip label={getTransactionTypeLabel(tx.transaction_type)} color={getTransactionTypeColor(tx.transaction_type)}
                          size="small" icon={tx.transaction_type === 'inbound' ? <InboundIcon /> : tx.transaction_type === 'outbound' ? <OutboundIcon /> : undefined} />
                      </TableCell>
                      <TableCell>{product ? `${product.name} (SPU: ${product.spu_code})` : tx.product_id}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: tx.transaction_type === 'inbound' ? 'success.main' : tx.transaction_type === 'outbound' ? 'error.main' : 'inherit', fontWeight: 'bold' }}>
                          {tx.transaction_type === 'inbound' ? '+' : '-'}{tx.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>{tx.reference_no || '-'}</TableCell>
                      <TableCell>{tx.reason || '-'}</TableCell>
                      <TableCell>
                        <Chip label={tx.sync_status === 'pending' ? '待同步' : '已同步'}
                          color={tx.sync_status === 'pending' ? 'warning' : 'success'} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 新建交易对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建库存交易</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>交易类型</InputLabel>
              <Select value={form.transaction_type} label="交易类型" onChange={e => setForm({ ...form, transaction_type: e.target.value as any })}>
                <MenuItem value="inbound"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><InboundIcon color="success" />入库</Box></MenuItem>
                <MenuItem value="outbound"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><OutboundIcon color="error" />出库</Box></MenuItem>
                <MenuItem value="adjustment">库存调整</MenuItem>
                <MenuItem value="transfer">库存调拨</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>产品</InputLabel>
              <Select value={form.product_id} label="产品" onChange={e => setForm({ ...form, product_id: e.target.value })}>
                {products.map(product => {
                  const totalStock = product.skus?.reduce((sum, sku) => sum + sku.current_stock, 0) || 0;
                  return <MenuItem key={product.id} value={product.id}>{product.name} (SPU: {product.spu_code}) - 总库存: {totalStock}</MenuItem>;
                })}
              </Select>
            </FormControl>
            <TextField label="数量" type="number" value={form.quantity}
              onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} inputProps={{ min: 1 }} fullWidth />
            <TextField label="参考单号" value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} placeholder="例如: PO-2024-001" fullWidth />
            <TextField label="原因" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="例如: 采购入库、销售出库" fullWidth />
            <TextField label="备注" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>确认</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ========== 采购管理 Tab ========== */

function PurchaseTab({
  loading, setLoading, setError, setSuccessMessage,
}: {
  loading: boolean; setLoading: (v: boolean) => void;
  setError: (e: string | null) => void; setSuccessMessage: (e: string | null) => void;
}) {
  const [subTab, setSubTab] = useState(0);
  // 供应商
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // 采购订单
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  // 对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '', code: generateSupplierCode(), contact_person: '', phone: '', email: '',
    address: '', website: '', payment_terms: '月结30天', tax_number: '', notes: '', is_active: true,
  });

  useEffect(() => { loadSuppliers(); loadOrders(); }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setSuppliers(await getSuppliers({ search: searchTerm || undefined }));
    } catch (err) { setError(err instanceof Error ? err.message : '加载供应商失败'); }
    finally { setLoading(false); }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setOrders(await getPurchaseOrders({ search: orderSearch || undefined }));
    } catch (err) { setError(err instanceof Error ? err.message : '加载采购订单失败'); }
    finally { setLoading(false); }
  };

  const handleSupplierSubmit = async () => {
    if (!formData.name) { setError('供应商名称不能为空'); return; }
    try {
      setLoading(true);
      await createSupplier(formData);
      setSuccessMessage('供应商创建成功!');
      setDialogOpen(false);
      setFormData({ name: '', code: generateSupplierCode(), contact_person: '', phone: '', email: '',
        address: '', website: '', payment_terms: '月结30天', tax_number: '', notes: '', is_active: true });
      loadSuppliers();
    } catch (err) { setError(err instanceof Error ? err.message : '创建供应商失败'); }
    finally { setLoading(false); }
  };

  const openSupplierDialog = () => {
    setFormData({ name: '', code: generateSupplierCode(), contact_person: '', phone: '', email: '',
      address: '', website: '', payment_terms: '月结30天', tax_number: '', notes: '', is_active: true });
    setDialogOpen(true);
  };

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} variant="fullWidth">
          <Tab icon={<BusinessIcon />} label="供应商管理" />
          <Tab icon={<OrderIcon />} label="采购订单" />
        </Tabs>
      </Paper>

      {/* 供应商管理 */}
      {subTab === 0 && (
        <Box>
          <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField placeholder="搜索供应商 (名称/编码/联系人)" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadSuppliers()}
              size="small" sx={{ minWidth: 300 }}
              InputProps={{ endAdornment: <Button size="small" onClick={loadSuppliers} disabled={loading}><SearchIcon /></Button> }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openSupplierDialog} disabled={loading}>添加供应商</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadSuppliers} disabled={loading}>刷新</Button>
          </Paper>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}><BusinessIcon sx={{ mr: 1, color: 'primary.main' }} /><Typography variant="h6">供应商列表 ({suppliers.length})</Typography></Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>供应商编码</TableCell><TableCell>名称</TableCell><TableCell>联系人</TableCell>
                    <TableCell>电话</TableCell><TableCell>邮箱</TableCell><TableCell>付款条件</TableCell><TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无供应商数据'}</Typography></TableCell></TableRow>
                  ) : suppliers.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{s.code}</Typography></TableCell>
                      <TableCell>{s.name}</TableCell><TableCell>{s.contact_person || '-'}</TableCell>
                      <TableCell>{s.phone || '-'}</TableCell><TableCell>{s.email || '-'}</TableCell>
                      <TableCell>{s.payment_terms || '-'}</TableCell>
                      <TableCell><Typography sx={{ color: s.is_active ? 'success.main' : 'text.secondary', fontWeight: 'bold' }}>{s.is_active ? '活跃' : '停用'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 采购订单 */}
      {subTab === 1 && (
        <Box>
          <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField placeholder="搜索采购订单 (PO号/供应商)" value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadOrders()}
              size="small" sx={{ minWidth: 300 }}
              InputProps={{ endAdornment: <Button size="small" onClick={loadOrders} disabled={loading}><SearchIcon /></Button> }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => alert('创建采购订单功能开发中...')} disabled={loading}>创建采购订单</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadOrders} disabled={loading}>刷新</Button>
          </Paper>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}><OrderIcon sx={{ mr: 1, color: 'primary.main' }} /><Typography variant="h6">采购订单列表 ({orders.length})</Typography></Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>PO编号</TableCell><TableCell>供应商</TableCell><TableCell>订单日期</TableCell>
                    <TableCell>状态</TableCell><TableCell align="right">总金额</TableCell><TableCell>付款状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无采购订单'}</Typography></TableCell></TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{o.po_number}</Typography></TableCell>
                      <TableCell>{o.supplier_name || '-'}</TableCell><TableCell>{o.order_date}</TableCell>
                      <TableCell><Chip label={o.status} size="small" color={o.status === 'received' ? 'success' : o.status === 'confirmed' ? 'primary' : o.status === 'shipped' ? 'info' : 'default'} /></TableCell>
                      <TableCell align="right"><Typography sx={{ fontWeight: 'bold' }}>¥{o.total_amount.toFixed(2)}</Typography></TableCell>
                      <TableCell><Chip label={o.payment_status} size="small" color={o.payment_status === 'paid' ? 'success' : o.payment_status === 'partial' ? 'warning' : 'default'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 添加供应商对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>添加供应商</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="供应商名称 *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required fullWidth />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField label="供应商编码（自动生成）" value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })} fullWidth size="small" helperText="格式: SUP-日期-随机码" />
              <Button variant="outlined" size="small" onClick={() => setFormData({ ...formData, code: generateSupplierCode() })} sx={{ whiteSpace: 'nowrap' }}>重新生成</Button>
            </Box>
            <TextField label="联系人" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} fullWidth />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="电话" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} fullWidth />
              <TextField label="邮箱" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} fullWidth />
            </Box>
            <TextField label="地址" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} multiline rows={2} fullWidth />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="网站" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://example.com" fullWidth />
              <TextField label="税号" value={formData.tax_number} onChange={e => setFormData({ ...formData, tax_number: e.target.value })} fullWidth />
            </Box>
            <TextField label="付款条件" value={formData.payment_terms} onChange={e => setFormData({ ...formData, payment_terms: e.target.value })} placeholder="例如: Net 30, COD" fullWidth />
            <TextField label="备注" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} multiline rows={3} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSupplierSubmit} variant="contained" disabled={loading}>确认</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ========== 销售管理 Tab ========== */

function SalesTab({
  loading, setLoading, setError, setSuccessMessage,
}: {
  loading: boolean; setLoading: (v: boolean) => void;
  setError: (e: string | null) => void; setSuccessMessage: (e: string | null) => void;
}) {
  const [subTab, setSubTab] = useState(0);
  // 客户
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custSearch, setCustSearch] = useState('');
  // 销售订单
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  // 对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '', code: generateCustomerCode(), contact_person: '', phone: '', email: '',
    address: '', website: '', customer_type: 'company', tax_number: '', credit_limit: 0, notes: '', is_active: true,
  });

  useEffect(() => { loadCustomers(); loadOrders(); }, []);

  const loadCustomers = async () => {
    try { setLoading(true); setCustomers(await getCustomers({ search: custSearch || undefined })); }
    catch (err) { setError(err instanceof Error ? err.message : '加载客户失败'); }
    finally { setLoading(false); }
  };

  const loadOrders = async () => {
    try { setLoading(true); setOrders(await getSalesOrders({ search: orderSearch || undefined })); }
    catch (err) { setError(err instanceof Error ? err.message : '加载销售订单失败'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.name) { setError('客户名称不能为空'); return; }
    try {
      setLoading(true);
      await createCustomer(formData);
      setSuccessMessage('客户创建成功!');
      setDialogOpen(false);
      setFormData({ name: '', code: generateCustomerCode(), contact_person: '', phone: '', email: '',
        address: '', website: '', customer_type: 'company', tax_number: '', credit_limit: 0, notes: '', is_active: true });
      loadCustomers();
    } catch (err) { setError(err instanceof Error ? err.message : '创建客户失败'); }
    finally { setLoading(false); }
  };

  const openDialog = () => {
    setFormData({ name: '', code: generateCustomerCode(), contact_person: '', phone: '', email: '',
      address: '', website: '', customer_type: 'company', tax_number: '', credit_limit: 0, notes: '', is_active: true });
    setDialogOpen(true);
  };

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} variant="fullWidth">
          <Tab icon={<CustomerIcon />} label="客户管理" />
          <Tab icon={<OrderIcon />} label="销售订单" />
        </Tabs>
      </Paper>

      {/* 客户管理 */}
      {subTab === 0 && (
        <Box>
          <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField placeholder="搜索客户 (名称/编码/联系人)" value={custSearch}
              onChange={e => setCustSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadCustomers()}
              size="small" sx={{ minWidth: 300 }}
              InputProps={{ endAdornment: <Button size="small" onClick={loadCustomers} disabled={loading}><SearchIcon /></Button> }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog} disabled={loading}>添加客户</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadCustomers} disabled={loading}>刷新</Button>
          </Paper>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}><CustomerIcon sx={{ mr: 1, color: 'primary.main' }} /><Typography variant="h6">客户列表 ({customers.length})</Typography></Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>客户编码</TableCell><TableCell>名称</TableCell><TableCell>类型</TableCell><TableCell>联系人</TableCell>
                    <TableCell>电话</TableCell><TableCell>邮箱</TableCell><TableCell>信用额度</TableCell><TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无客户数据'}</Typography></TableCell></TableRow>
                  ) : customers.map(c => (
                    <TableRow key={c.id} hover>
                      <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{c.code}</Typography></TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell><Chip label={c.customer_type === 'company' ? '企业' : '个人'} size="small" /></TableCell>
                      <TableCell>{c.contact_person || '-'}</TableCell><TableCell>{c.phone || '-'}</TableCell>
                      <TableCell>{c.email || '-'}</TableCell><TableCell>¥{c.credit_limit.toFixed(2)}</TableCell>
                      <TableCell><Typography sx={{ color: c.is_active ? 'success.main' : 'text.secondary', fontWeight: 'bold' }}>{c.is_active ? '活跃' : '停用'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 销售订单 */}
      {subTab === 1 && (
        <Box>
          <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField placeholder="搜索销售订单 (SO号/客户)" value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadOrders()}
              size="small" sx={{ minWidth: 300 }}
              InputProps={{ endAdornment: <Button size="small" onClick={loadOrders} disabled={loading}><SearchIcon /></Button> }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => alert('创建销售订单功能开发中...')} disabled={loading}>创建销售订单</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadOrders} disabled={loading}>刷新</Button>
          </Paper>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}><OrderIcon sx={{ mr: 1, color: 'primary.main' }} /><Typography variant="h6">销售订单列表 ({orders.length})</Typography></Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>SO编号</TableCell><TableCell>客户</TableCell><TableCell>订单日期</TableCell>
                    <TableCell>状态</TableCell><TableCell align="right">总金额</TableCell><TableCell>付款状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无销售订单'}</Typography></TableCell></TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{o.so_number}</Typography></TableCell>
                      <TableCell>{o.customer_name || '-'}</TableCell><TableCell>{o.order_date}</TableCell>
                      <TableCell><Chip label={o.status} size="small" color={o.status === 'delivered' ? 'success' : o.status === 'confirmed' ? 'primary' : o.status === 'shipped' ? 'info' : 'default'} /></TableCell>
                      <TableCell align="right"><Typography sx={{ fontWeight: 'bold' }}>¥{o.total_amount.toFixed(2)}</Typography></TableCell>
                      <TableCell><Chip label={o.payment_status} size="small" color={o.payment_status === 'paid' ? 'success' : o.payment_status === 'partial' ? 'warning' : 'default'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 添加客户对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>添加客户</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="客户名称 *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required fullWidth />
            <FormControl fullWidth>
              <InputLabel>客户类型</InputLabel>
              <Select value={formData.customer_type} label="客户类型" onChange={e => setFormData({ ...formData, customer_type: e.target.value as any })}>
                <MenuItem value="company">企业</MenuItem>
                <MenuItem value="individual">个人</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField label="客户编码（自动生成）" value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })} fullWidth size="small" helperText="格式: CUS-日期-随机码" />
              <Button variant="outlined" size="small" onClick={() => setFormData({ ...formData, code: generateCustomerCode() })} sx={{ whiteSpace: 'nowrap' }}>重新生成</Button>
            </Box>
            <TextField label="联系人" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} fullWidth />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="电话" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} fullWidth />
              <TextField label="邮箱" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} fullWidth />
            </Box>
            <TextField label="地址" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} multiline rows={2} fullWidth />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="网站" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} fullWidth />
              <TextField label="税号" value={formData.tax_number} onChange={e => setFormData({ ...formData, tax_number: e.target.value })} fullWidth />
            </Box>
            <TextField label="信用额度" type="number" value={formData.credit_limit} onChange={e => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })} fullWidth />
            <TextField label="备注" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} multiline rows={3} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>确认</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ========== 主页面 ========== */

export default function SupplyChainPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          供应链管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          库存管理、采购管理与销售管理
          <Typography component="span" sx={{ ml: 1, color: '#ff3b30', fontSize: '0.9em' }}>🦞</Typography>
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab icon={<InventoryIcon />} label="库存管理" />
          <Tab icon={<PurchaseIcon />} label="采购管理" />
          <Tab icon={<SalesIcon />} label="销售管理" />
        </Tabs>
      </Paper>

      {tabValue === 0 && <InventoryTab loading={loading} setLoading={setLoading} setError={setError} setSuccessMessage={setSuccessMessage} />}
      {tabValue === 1 && <PurchaseTab loading={loading} setLoading={setLoading} setError={setError} setSuccessMessage={setSuccessMessage} />}
      {tabValue === 2 && <SalesTab loading={loading} setLoading={setLoading} setError={setError} setSuccessMessage={setSuccessMessage} />}

      {/* 共享错误提示 */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>

      {/* 共享成功提示 */}
      <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>{successMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
