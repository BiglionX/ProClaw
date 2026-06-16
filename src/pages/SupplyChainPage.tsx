import {
  Add as AddIcon,
  ArrowDownward as InboundIcon,
  Close as CloseIcon,
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
  SmartToy as SmartToyIcon,
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
  IconButton,
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
import PaymentDialog from '../components/PaymentDialog';
import MicroStocktakingPrompt from '../components/Inventory/MicroStocktakingPrompt';
import {
  shouldTriggerPostSalesCalibration,
  shouldTriggerPostPurchaseCalibration,
  type PostSalesCheckResult,
  type PostPurchaseCheckResult,
} from '../lib/inventoryCalibrationService';
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
  PurchaseOrderDetail,
  Supplier,
  createSupplier,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderDetail,
  getSuppliers,
  generateSupplierCode,
  receivePurchaseOrder,
  deletePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
} from '../lib/purchaseService';
import {
  CreateCustomerInput,
  Customer,
  SalesOrder,
  SalesOrderDetail,
  createCustomer,
  createSalesOrder,
  getCustomers,
  getSalesOrders,
  getSalesOrderDetail,
  generateCustomerCode,
  submitSalesOrder,
  deleteSalesOrder,
  cancelSalesOrder,
  markSalesShipped,
  markSalesDelivered,
} from '../lib/salesService';
import {
  PurchaseReturn,
  PurchaseReturnDetail,
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnDetail,
  confirmPurchaseReturn,
  cancelPurchaseReturn,
} from '../lib/purchaseReturnService';
import {
  SalesReturn,
  SalesReturnDetail,
  createSalesReturn,
  getSalesReturns,
  getSalesReturnDetail,
  confirmSalesReturn,
  cancelSalesReturn,
} from '../lib/salesReturnService';

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

/* ========== PRD v12.0 灵活库存：模块级辅助函数 ========== */

type CalibrationPromptSetter = React.Dispatch<React.SetStateAction<{
  open: boolean;
  productId: string;
  productName: string;
  currentStock: number;
  salesResult: PostSalesCheckResult | null;
  purchaseResult: PostPurchaseCheckResult | null;
}>>;

/**
 * 销售出库后检查每个明细商品是否需要微盘点
 * 触发条件：3天未校准 + 热销 + 收银间隔>3秒
 */
async function maybePromptPostSalesCalibration(
  detail: any,
  setCalibrationPrompt: CalibrationPromptSetter
) {
  const items = detail?.items || [];
  for (const item of items) {
    const productId = item.product_id || item.sku_id;
    if (!productId) continue;
    try {
      const result = await shouldTriggerPostSalesCalibration(productId);
      if (result.should_trigger) {
        setCalibrationPrompt({
          open: true,
          productId,
          productName: item.product_name || item.sku_name || '',
          currentStock: item.current_stock || 0,
          salesResult: result,
          purchaseResult: null,
        });
        // 一次只提示一个，避免过多弹窗
        return;
      }
    } catch {
      // 静默失败
    }
  }
}

/**
 * 进货完成后检查每个明细商品是否需要微盘点
 * 触发条件：进货后库存仍为负
 */
async function maybePromptPostPurchaseCalibration(
  detail: any,
  setCalibrationPrompt: CalibrationPromptSetter
) {
  const items = detail?.items || [];
  for (const item of items) {
    const productId = item.product_id || item.sku_id;
    if (!productId) continue;
    try {
      const result = await shouldTriggerPostPurchaseCalibration(productId);
      if (result.should_trigger) {
        setCalibrationPrompt({
          open: true,
          productId,
          productName: item.product_name || item.sku_name || '',
          currentStock: result.current_stock,
          salesResult: null,
          purchaseResult: result,
        });
        return;
      }
    } catch {
      // 静默失败
    }
  }
}

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
  const [products, setProducts] = useState<ProductSPU[]>([]);
  // 对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '', code: generateSupplierCode(), contact_person: '', phone: '', email: '',
    address: '', website: '', payment_terms: '月结30天', tax_number: '', notes: '', is_active: true,
  });

  useEffect(() => { loadSuppliers(); loadOrders(); loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await getProductSPUs({ limit: 100 });
      setProducts(data);
    } catch (err) {
      console.error('加载产品失败', err);
    }
  };

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

  // 采购订单创建
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [createOrderLoading, setCreateOrderLoading] = useState(false);
  const [orderForm, setOrderForm] = useState<{
    supplier_id: string;
    order_date: string;
    expected_delivery_date: string;
    notes: string;
  }>({
    supplier_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>>([]);

  // 采购订单详情
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<PurchaseOrderDetail | null>(null);
  // 付款记录
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // PRD v12.0 灵活库存：微盘点弹窗
  const [calibrationPrompt, setCalibrationPrompt] = useState<{
    open: boolean;
    productId: string;
    productName: string;
    currentStock: number;
    salesResult: PostSalesCheckResult | null;
    purchaseResult: PostPurchaseCheckResult | null;
  }>({
    open: false,
    productId: '',
    productName: '',
    currentStock: 0,
    salesResult: null,
    purchaseResult: null,
  });

  const openCreateOrderDialog = () => {
    setOrderForm({
      supplier_id: '',
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: '',
      notes: '',
    });
    setOrderItems([]);
    setOrderDialogOpen(true);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async () => {
    if (!orderForm.supplier_id) { setError('请选择供应商'); return; }
    if (orderItems.length === 0) { setError('请至少添加一个商品'); return; }
    for (const item of orderItems) {
      if (!item.product_id) { setError('请选择商品'); return; }
      if (item.quantity <= 0) { setError('数量必须大于0'); return; }
      if (item.unit_price < 0) { setError('单价不能为负数'); return; }
    }
    try {
      setCreateOrderLoading(true);
      const result = await createPurchaseOrder({
        supplier_id: orderForm.supplier_id,
        order_date: orderForm.order_date,
        expected_delivery_date: orderForm.expected_delivery_date || undefined,
        notes: orderForm.notes || undefined,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      setSuccessMessage(`采购订单 ${result.po_number} 创建成功!`);
      setOrderDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建采购订单失败');
    } finally {
      setCreateOrderLoading(false);
    }
  };

  const loadOrderDetail = async (orderId: string) => {
    try {
      setLoading(true);
      const detail = await getPurchaseOrderDetail(orderId);
      setSelectedOrderDetail(detail);
      // 加载付款历史
      const { getPaymentHistory } = await import('../lib/paymentService');
      const history = await getPaymentHistory(orderId);
      setPaymentHistory(history);
      setDetailDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (result: any) => {
    setSuccessMessage(`付款记录成功! 已付: ¥${result.paid_amount.toFixed(2)}`);
    // 刷新详情和付款历史
    if (selectedOrderDetail) {
      loadOrderDetail(selectedOrderDetail.order.id);
    }
  };

  // 采购订单状态操作
  const handleConfirmOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await confirmPurchaseOrder(orderId);
      setSuccessMessage('采购订单已确认!');
      setDetailDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await receivePurchaseOrder(orderId);
      setSuccessMessage('收货成功，库存已更新!');
      setDetailDialogOpen(false);
      loadOrders();
      // PRD v12.0 灵活库存：进货后检查是否需要微盘点
      if (selectedOrderDetail) {
        await maybePromptPostPurchaseCalibration(selectedOrderDetail, setCalibrationPrompt);
      }
      // 通知库存页面刷新
      window.dispatchEvent(new CustomEvent('proclaw:products-changed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '收货失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await cancelPurchaseOrder(orderId);
      setSuccessMessage('采购订单已取消!');
      setDetailDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await deletePurchaseOrder(orderId);
      setSuccessMessage('采购订单已删除!');
      setDetailDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除订单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF3B30',
              height: 2,
            },
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'rgba(0,0,0,0.5)',
              '&.Mui-selected': {
                color: '#FF3B30',
                fontWeight: 600,
              },
            },
            '& .MuiTab-iconWrapper': {
              mr: 0.5,
            },
          }}
        >
          <Tab icon={<BusinessIcon sx={{ fontSize: 16 }} />} label="供应商管理" iconPosition="start" />
          <Tab icon={<OrderIcon sx={{ fontSize: 16 }} />} label="采购订单" iconPosition="start" />
          <Tab icon={<InboundIcon sx={{ fontSize: 16 }} />} label="采购退货" iconPosition="start" />
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
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateOrderDialog} disabled={loading}>创建采购订单</Button>
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
                    <TableCell>状态</TableCell><TableCell align="right">总金额</TableCell><TableCell>付款状态</TableCell><TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无采购订单'}</Typography></TableCell></TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => loadOrderDetail(o.id)}>
                      <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{o.po_number}</Typography></TableCell>
                      <TableCell>{o.supplier_name || '-'}</TableCell><TableCell>{o.order_date}</TableCell>
                      <TableCell><Chip label={o.status} size="small" color={o.status === 'received' ? 'success' : o.status === 'confirmed' ? 'primary' : o.status === 'shipped' ? 'info' : 'default'} /></TableCell>
                      <TableCell align="right"><Typography sx={{ fontWeight: 'bold' }}>¥{o.total_amount.toFixed(2)}</Typography></TableCell>
                      <TableCell><Chip label={o.payment_status} size="small" color={o.payment_status === 'paid' ? 'success' : o.payment_status === 'partial' ? 'warning' : 'default'} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" variant="outlined" color="info" onClick={e => { e.stopPropagation(); loadOrderDetail(o.id); }}>
                            详情
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 采购退货 */}
      {subTab === 2 && (
        <PurchaseReturnTab loading={loading} setLoading={setLoading} setError={setError} setSuccessMessage={setSuccessMessage} />
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

      {/* 创建采购订单对话框 */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建采购订单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>供应商 *</InputLabel>
              <Select value={orderForm.supplier_id} label="供应商 *"
                onChange={e => setOrderForm({ ...orderForm, supplier_id: e.target.value })}>
                {suppliers.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name} ({s.code})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="订单日期" type="date" value={orderForm.order_date}
              onChange={e => setOrderForm({ ...orderForm, order_date: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="预计交货日期" type="date" value={orderForm.expected_delivery_date}
              onChange={e => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="备注" value={orderForm.notes}
              onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} multiline rows={2} fullWidth />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>订单明细</Typography>
            {orderItems.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>商品</InputLabel>
                  <Select value={item.product_id} label="商品"
                    onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      const newItems = [...orderItems];
                      newItems[idx].product_id = e.target.value;
                      newItems[idx].product_name = prod ? prod.name : '';
                      setOrderItems(newItems);
                    }}>
                    {products.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name} (SPU: {p.spu_code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="数量" type="number" size="small" sx={{ width: 100 }}
                  value={item.quantity}
                  onChange={e => {
                    const newItems = [...orderItems];
                    newItems[idx].quantity = parseInt(e.target.value) || 0;
                    setOrderItems(newItems);
                  }}
                  inputProps={{ min: 1 }} />
                <TextField label="单价" type="number" size="small" sx={{ width: 120 }}
                  value={item.unit_price}
                  onChange={e => {
                    const newItems = [...orderItems];
                    newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                    setOrderItems(newItems);
                  }}
                  inputProps={{ min: 0, step: 0.01 }} />
                <Typography sx={{ minWidth: 80, textAlign: 'right', fontWeight: 600 }}>
                  ¥{(item.quantity * item.unit_price).toFixed(2)}
                </Typography>
                <IconButton size="small" color="error" onClick={() => removeOrderItem(idx)} disabled={orderItems.length <= 1}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addOrderItem} size="small">添加商品行</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateOrder} variant="contained" disabled={createOrderLoading}>
            {createOrderLoading ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 采购订单详情对话框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">采购订单详情</Typography>
            {selectedOrderDetail && (
              <Chip label={selectedOrderDetail.order.status}
                color={selectedOrderDetail.order.status === 'received' ? 'success' : selectedOrderDetail.order.status === 'confirmed' ? 'primary' : selectedOrderDetail.order.status === 'shipped' ? 'info' : 'default'} />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrderDetail && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Typography variant="body2"><b>PO编号：</b>{selectedOrderDetail.order.po_number}</Typography>
                <Typography variant="body2"><b>供应商：</b>{selectedOrderDetail.order.supplier_name || '-'}</Typography>
                <Typography variant="body2"><b>订单日期：</b>{selectedOrderDetail.order.order_date}</Typography>
                <Typography variant="body2"><b>预计交货：</b>{selectedOrderDetail.order.expected_delivery_date || '-'}</Typography>
                <Typography variant="body2"><b>总金额：</b>¥{selectedOrderDetail.order.total_amount.toFixed(2)}</Typography>
                <Typography variant="body2"><b>付款状态：</b>{selectedOrderDetail.order.payment_status}</Typography>
              </Box>
              <Typography variant="body2"><b>备注：</b>{selectedOrderDetail.order.notes || '无'}</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>明细列表</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>商品</TableCell><TableCell align="right">数量</TableCell>
                      <TableCell align="right">单价</TableCell><TableCell align="right">小计</TableCell>
                      <TableCell align="right">已收数量</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrderDetail.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name || item.product_id}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">¥{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell align="right">¥{(item.total_price || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">{item.received_quantity || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* 付款记录 */}
              {paymentHistory.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>付款记录</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>日期</TableCell>
                          <TableCell align="right">金额</TableCell>
                          <TableCell>方式</TableCell>
                          <TableCell>凭证号</TableCell>
                          <TableCell>备注</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentHistory.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.transaction_date}</TableCell>
                            <TableCell align="right">¥{p.amount.toFixed(2)}</TableCell>
                            <TableCell>{p.payment_method || '-'}</TableCell>
                            <TableCell>{p.voucher_no || '-'}</TableCell>
                            <TableCell>{p.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', width: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedOrderDetail && selectedOrderDetail.order.status === 'draft' && (
                <>
                  <Button variant="contained" color="primary" onClick={() => handleConfirmOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>确认订单</Button>
                  <Button variant="outlined" color="error" onClick={() => handleDeleteOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>删除</Button>
                </>
              )}
              {selectedOrderDetail && selectedOrderDetail.order.status === 'confirmed' && (
                <>
                  <Button variant="contained" color="success" onClick={() => handleReceiveOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>确认收货</Button>
                  <Button variant="outlined" color="warning" onClick={() => handleCancelOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>取消订单</Button>
                </>
              )}
              {selectedOrderDetail && selectedOrderDetail.order.status === 'shipped' && (
                <Button variant="contained" color="success" onClick={() => handleReceiveOrder(selectedOrderDetail.order.id)}
                  disabled={loading}>确认收货</Button>
              )}
              {selectedOrderDetail && selectedOrderDetail.order.status === 'cancelled' && (
                <Button variant="outlined" color="error" onClick={() => handleDeleteOrder(selectedOrderDetail.order.id)}
                  disabled={loading}>删除</Button>
              )}
              {/* 付款按钮 */}
              {selectedOrderDetail && selectedOrderDetail.order.status !== 'cancelled' && selectedOrderDetail.order.payment_status !== 'paid' && (
                <Button variant="contained" color="secondary" onClick={() => setPaymentDialogOpen(true)} disabled={loading}>
                  记录付款
                </Button>
              )}
            </Box>
            <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* 付款对话框 */}
      {selectedOrderDetail && (
        <PaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          orderId={selectedOrderDetail.order.id}
          orderType="purchase"
          totalAmount={selectedOrderDetail.order.total_amount}
          paidAmount={selectedOrderDetail.order.paid_amount}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* 灵活库存微盘点建议（PRD v12.0） */}
      <MicroStocktakingPrompt
        open={calibrationPrompt.open}
        onClose={() => setCalibrationPrompt(prev => ({ ...prev, open: false }))}
        salesResult={calibrationPrompt.salesResult}
        purchaseResult={calibrationPrompt.purchaseResult}
        productId={calibrationPrompt.productId}
        productName={calibrationPrompt.productName}
        currentStock={calibrationPrompt.currentStock}
        onCalibrated={() => {
          setCalibrationPrompt(prev => ({ ...prev, open: false }));
          loadOrders();
          window.dispatchEvent(new CustomEvent('proclaw:inventory-calibrated'));
        }}
      />
    </Box>
  );
}

/* ========== 采购退货 Tab ========== */

function PurchaseReturnTab({
  loading, setLoading, setError, setSuccessMessage,
}: {
  loading: boolean; setLoading: (v: boolean) => void;
  setError: (e: string | null) => void; setSuccessMessage: (e: string | null) => void;
}) {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [orders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState('');
  // 创建对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [returnForm, setReturnForm] = useState<{
    purchase_order_id: string;
    return_date: string;
    reason: string;
    notes: string;
  }>({ purchase_order_id: '', return_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
  const [returnItems, setReturnItems] = useState<Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    max_quantity?: number;
  }>>([]);
  // 详情对话框
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<PurchaseReturnDetail | null>(null);

  const loadReturns = async () => {
    try { setLoading(true); setReturns(await getPurchaseReturns({ search: search || undefined })); }
    catch (err) { setError(err instanceof Error ? err.message : '加载采购退货单失败'); }
    finally { setLoading(false); }
  };

  const openCreateDialog = () => {
    setReturnForm({ purchase_order_id: '', return_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
    setReturnItems([]);
    setCreateDialogOpen(true);
  };

  const handleSelectPO = (poId: string) => {
    setReturnForm({ ...returnForm, purchase_order_id: poId });
    // 获取PO详情，自动带出商品
    getPurchaseOrderDetail(poId).then(detail => {
      const items = detail.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        quantity: 0,
        unit_price: item.unit_price,
        max_quantity: item.quantity,
      }));
      setReturnItems(items);
    }).catch(err => setError(err instanceof Error ? err.message : '加载订单详情失败'));
  };

  const updateReturnItem = (index: number, field: string, value: any) => {
    const newItems = [...returnItems];
    (newItems[index] as any)[field] = value;
    setReturnItems(newItems);
  };

  const handleCreate = async () => {
    if (!returnForm.purchase_order_id) { setError('请选择原采购订单'); return; }
    // 校验退货数量不超过原订单数量
    for (const item of returnItems) {
      if (item.quantity > 0 && item.max_quantity !== undefined && item.quantity > item.max_quantity) {
        setError(`「${item.product_name || item.product_id}」退货数量(${item.quantity})不能超过原订单数量(${item.max_quantity})`);
        return;
      }
    }
    const validItems = returnItems.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) { setError('请至少填写一个商品的退货数量'); return; }
    const selectedOrder = orders.find(o => o.id === returnForm.purchase_order_id);
    if (!selectedOrder) { setError('订单不存在'); return; }
    try {
      setCreateLoading(true);
      const result = await createPurchaseReturn({
        purchase_order_id: returnForm.purchase_order_id,
        supplier_id: selectedOrder.supplier_id,
        return_date: returnForm.return_date,
        reason: returnForm.reason || undefined,
        notes: returnForm.notes || undefined,
        items: validItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      setSuccessMessage(`采购退货单 ${result.pr_number} 创建成功!`);
      setCreateDialogOpen(false);
      loadReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建采购退货单失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const loadDetail = async (returnId: string) => {
    try {
      setLoading(true);
      const detail = await getPurchaseReturnDetail(returnId);
      setSelectedDetail(detail);
      setDetailDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载退货单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (returnId: string) => {
    try {
      setLoading(true);
      await confirmPurchaseReturn(returnId);
      setSuccessMessage('退货确认成功，库存已扣减!');
      loadReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认退货失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (returnId: string) => {
    try {
      setLoading(true);
      await cancelPurchaseReturn(returnId);
      setSuccessMessage('退货单已取消');
      loadReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消退货单失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'primary' | 'info' | 'default' | 'error'> = {
      draft: 'default', confirmed: 'primary', completed: 'success', cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { draft: '草稿', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };
    return labels[status] || status;
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField placeholder="搜索退货单 (PR号/PO号/供应商)" value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadReturns()}
          size="small" sx={{ minWidth: 300 }}
          InputProps={{ endAdornment: <Button size="small" onClick={loadReturns} disabled={loading}><SearchIcon /></Button> }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} disabled={loading}>创建采购退货</Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadReturns} disabled={loading}>刷新</Button>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">采购退货单列表 ({returns.length})</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>PR编号</TableCell><TableCell>原PO号</TableCell><TableCell>供应商</TableCell>
                <TableCell>退货日期</TableCell><TableCell>状态</TableCell><TableCell align="right">总金额</TableCell><TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无采购退货单'}</Typography></TableCell></TableRow>
              ) : returns.map(r => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => loadDetail(r.id)}>
                  <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{r.pr_number}</Typography></TableCell>
                  <TableCell>{r.po_number || '-'}</TableCell>
                  <TableCell>{r.supplier_name || '-'}</TableCell>
                  <TableCell>{r.return_date}</TableCell>
                  <TableCell><Chip label={getStatusLabel(r.status)} size="small" color={getStatusColor(r.status)} /></TableCell>
                  <TableCell align="right"><Typography sx={{ fontWeight: 'bold' }}>¥{r.total_amount.toFixed(2)}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" variant="outlined" color="info" onClick={e => { e.stopPropagation(); loadDetail(r.id); }}>详情</Button>
                      {r.status === 'draft' && (
                        <Button size="small" variant="contained" color="primary" onClick={e => { e.stopPropagation(); handleConfirm(r.id); }} disabled={loading}>确认退货</Button>
                      )}
                      {(r.status === 'draft' || r.status === 'confirmed') && (
                        <Button size="small" variant="outlined" color="error" onClick={e => { e.stopPropagation(); handleCancel(r.id); }} disabled={loading}>取消</Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 创建采购退货对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建采购退货单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>关联采购订单 *</InputLabel>
              <Select value={returnForm.purchase_order_id} label="关联采购订单 *"
                onChange={e => handleSelectPO(e.target.value)}>
                {orders.map(o => (
                  <MenuItem key={o.id} value={o.id}>{o.po_number} - {o.supplier_name || ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="退货日期" type="date" value={returnForm.return_date}
              onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="退货原因" value={returnForm.reason}
              onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })} fullWidth />
            <TextField label="备注" value={returnForm.notes}
              onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} multiline rows={2} fullWidth />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>退货明细（输入数量 {'>'} 0 的将被提交）</Typography>
            {returnItems.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography sx={{ minWidth: 200, fontSize: '0.9rem' }}>{item.product_name || item.product_id}</Typography>
                <TextField label="退货数量" type="number" size="small" sx={{ width: 120 }}
                  value={item.quantity || ''}
                  onChange={e => updateReturnItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: item.max_quantity }}
                  helperText={item.max_quantity ? `最多 ${item.max_quantity}` : ''}
                  FormHelperTextProps={{ sx: { fontSize: '0.7rem' } }} />
                <TextField label="单价" type="number" size="small" sx={{ width: 120 }}
                  value={item.unit_price}
                  onChange={e => updateReturnItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }} />
                <Typography sx={{ minWidth: 80, textAlign: 'right', fontWeight: 600 }}>
                  ¥{(item.quantity * item.unit_price).toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreate} variant="contained" disabled={createLoading}>
            {createLoading ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 采购退货详情对话框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">采购退货单详情</Typography>
            {selectedDetail && (
              <Chip label={getStatusLabel(selectedDetail.return.status)} color={getStatusColor(selectedDetail.return.status)} />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDetail && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Typography variant="body2"><b>PR编号：</b>{selectedDetail.return.pr_number}</Typography>
                <Typography variant="body2"><b>原PO号：</b>{selectedDetail.return.po_number || '-'}</Typography>
                <Typography variant="body2"><b>供应商：</b>{selectedDetail.return.supplier_name || '-'}</Typography>
                <Typography variant="body2"><b>退货日期：</b>{selectedDetail.return.return_date}</Typography>
                <Typography variant="body2"><b>总金额：</b>¥{selectedDetail.return.total_amount.toFixed(2)}</Typography>
                <Typography variant="body2"><b>已退款：</b>¥{selectedDetail.return.refund_amount.toFixed(2)}</Typography>
              </Box>
              <Typography variant="body2"><b>退货原因：</b>{selectedDetail.return.reason || '无'}</Typography>
              <Typography variant="body2"><b>备注：</b>{selectedDetail.return.notes || '无'}</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>明细列表</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>商品</TableCell><TableCell align="right">数量</TableCell>
                      <TableCell align="right">单价</TableCell><TableCell align="right">小计</TableCell><TableCell>原因</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedDetail.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name || item.product_id}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">¥{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell align="right">¥{(item.total_price || 0).toFixed(2)}</TableCell>
                        <TableCell>{item.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
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

  const [products, setProducts] = useState<ProductSPU[]>([]);

  useEffect(() => { loadCustomers(); loadOrders(); loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await getProductSPUs({ limit: 100 });
      setProducts(data);
    } catch (err) {
      console.error('加载产品失败', err);
    }
  };

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

  // 销售订单创建
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [createOrderLoading, setCreateOrderLoading] = useState(false);
  const [orderForm, setOrderForm] = useState<{
    customer_id: string;
    order_date: string;
    expected_delivery_date: string;
    shipping_address: string;
    notes: string;
  }>({
    customer_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '',
    shipping_address: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>>([]);

  // 销售订单详情
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SalesOrderDetail | null>(null);
  // 收款记录
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // PRD v12.0 灵活库存：微盘点弹窗
  const [calibrationPrompt, setCalibrationPrompt] = useState<{
    open: boolean;
    productId: string;
    productName: string;
    currentStock: number;
    salesResult: PostSalesCheckResult | null;
    purchaseResult: PostPurchaseCheckResult | null;
  }>({
    open: false,
    productId: '',
    productName: '',
    currentStock: 0,
    salesResult: null,
    purchaseResult: null,
  });

  const openCreateOrderDialog = () => {
    setOrderForm({
      customer_id: '',
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: '',
      shipping_address: '',
      notes: '',
    });
    setOrderItems([]);
    setOrderDialogOpen(true);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async () => {
    if (!orderForm.customer_id) { setError('请选择客户'); return; }
    if (orderItems.length === 0) { setError('请至少添加一个商品'); return; }
    for (const item of orderItems) {
      if (!item.product_id) { setError('请选择商品'); return; }
      if (item.quantity <= 0) { setError('数量必须大于0'); return; }
      if (item.unit_price < 0) { setError('单价不能为负数'); return; }
    }
    try {
      setCreateOrderLoading(true);
      const result = await createSalesOrder({
        customer_id: orderForm.customer_id,
        order_date: orderForm.order_date,
        expected_delivery_date: orderForm.expected_delivery_date || undefined,
        shipping_address: orderForm.shipping_address || undefined,
        notes: orderForm.notes || undefined,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      setSuccessMessage(`销售订单 ${result.so_number} 创建成功!`);
      setOrderDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建销售订单失败');
    } finally {
      setCreateOrderLoading(false);
    }
  };

  const loadOrderDetail = async (orderId: string) => {
    try {
      setLoading(true);
      const detail = await getSalesOrderDetail(orderId);
      setSelectedOrderDetail(detail);
      // 加载收款历史
      const { getPaymentHistory } = await import('../lib/paymentService');
      const history = await getPaymentHistory(orderId);
      setPaymentHistory(history);
      setDetailDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (result: any) => {
    setSuccessMessage(`收款记录成功! 已收: ¥${result.paid_amount.toFixed(2)}`);
    if (selectedOrderDetail) {
      loadOrderDetail(selectedOrderDetail.order.id);
    }
  };

  // 销售订单状态操作
  const handleSubmitOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await submitSalesOrder(orderId);
      setSuccessMessage('销售订单已确认出库，库存已扣减!');
      setDetailDialogOpen(false);
      loadOrders();
      // PRD v12.0 灵活库存：检查每个明细商品是否需要微盘点
      if (selectedOrderDetail) {
        await maybePromptPostSalesCalibration(selectedOrderDetail, setCalibrationPrompt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认出库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await cancelSalesOrder(orderId);
      setSuccessMessage('销售订单已取消!');
      setDetailDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkShipped = async (orderId: string) => {
    try {
      setLoading(true);
      await markSalesShipped(orderId);
      setSuccessMessage('已标记为已发货!');
      setDetailDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '标记发货失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      setLoading(true);
      await markSalesDelivered(orderId);
      setSuccessMessage('已标记为已送达!');
      setDetailDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '标记送达失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setLoading(true);
      await deleteSalesOrder(orderId);
      setSuccessMessage('销售订单已删除!');
      setDetailDialogOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除订单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF3B30',
              height: 2,
            },
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'rgba(0,0,0,0.5)',
              '&.Mui-selected': {
                color: '#FF3B30',
                fontWeight: 600,
              },
            },
            '& .MuiTab-iconWrapper': {
              mr: 0.5,
            },
          }}
        >
          <Tab icon={<CustomerIcon sx={{ fontSize: 16 }} />} label="客户管理" iconPosition="start" />
          <Tab icon={<OrderIcon sx={{ fontSize: 16 }} />} label="销售订单" iconPosition="start" />
          <Tab icon={<OutboundIcon sx={{ fontSize: 16 }} />} label="销售退货" iconPosition="start" />
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
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateOrderDialog} disabled={loading}>创建销售订单</Button>
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
                    <TableCell>状态</TableCell><TableCell align="right">总金额</TableCell><TableCell>付款状态</TableCell><TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无销售订单'}</Typography></TableCell></TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => loadOrderDetail(o.id)}>
                      <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{o.so_number}</Typography></TableCell>
                      <TableCell>{o.customer_name || '-'}</TableCell><TableCell>{o.order_date}</TableCell>
                      <TableCell><Chip label={o.status} size="small" color={o.status === 'delivered' ? 'success' : o.status === 'confirmed' ? 'primary' : o.status === 'shipped' ? 'info' : 'default'} /></TableCell>
                      <TableCell align="right"><Typography sx={{ fontWeight: 'bold' }}>¥{o.total_amount.toFixed(2)}</Typography></TableCell>
                      <TableCell><Chip label={o.payment_status} size="small" color={o.payment_status === 'paid' ? 'success' : o.payment_status === 'partial' ? 'warning' : 'default'} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" variant="outlined" color="info" onClick={e => { e.stopPropagation(); loadOrderDetail(o.id); }}>
                            详情
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 销售退货 */}
      {subTab === 2 && (
        <SalesReturnTab loading={loading} setLoading={setLoading} setError={setError} setSuccessMessage={setSuccessMessage} />
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

      {/* 创建销售订单对话框 */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建销售订单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>客户 *</InputLabel>
              <Select value={orderForm.customer_id} label="客户 *"
                onChange={e => setOrderForm({ ...orderForm, customer_id: e.target.value })}>
                {customers.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="订单日期" type="date" value={orderForm.order_date}
              onChange={e => setOrderForm({ ...orderForm, order_date: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="预计交货日期" type="date" value={orderForm.expected_delivery_date}
              onChange={e => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="收货地址" value={orderForm.shipping_address}
              onChange={e => setOrderForm({ ...orderForm, shipping_address: e.target.value })} multiline rows={2} fullWidth />
            <TextField label="备注" value={orderForm.notes}
              onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} multiline rows={2} fullWidth />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>订单明细</Typography>
            {orderItems.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>商品</InputLabel>
                  <Select value={item.product_id} label="商品"
                    onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      const newItems = [...orderItems];
                      newItems[idx].product_id = e.target.value;
                      newItems[idx].product_name = prod ? prod.name : '';
                      setOrderItems(newItems);
                    }}>
                    {products.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name} (SPU: {p.spu_code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="数量" type="number" size="small" sx={{ width: 100 }}
                  value={item.quantity}
                  onChange={e => {
                    const newItems = [...orderItems];
                    newItems[idx].quantity = parseInt(e.target.value) || 0;
                    setOrderItems(newItems);
                  }}
                  inputProps={{ min: 1 }} />
                <TextField label="单价" type="number" size="small" sx={{ width: 120 }}
                  value={item.unit_price}
                  onChange={e => {
                    const newItems = [...orderItems];
                    newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                    setOrderItems(newItems);
                  }}
                  inputProps={{ min: 0, step: 0.01 }} />
                <Typography sx={{ minWidth: 80, textAlign: 'right', fontWeight: 600 }}>
                  ¥{(item.quantity * item.unit_price).toFixed(2)}
                </Typography>
                <IconButton size="small" color="error" onClick={() => removeOrderItem(idx)} disabled={orderItems.length <= 1}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addOrderItem} size="small">添加商品行</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateOrder} variant="contained" disabled={createOrderLoading}>
            {createOrderLoading ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 销售订单详情对话框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">销售订单详情</Typography>
            {selectedOrderDetail && (
              <Chip label={selectedOrderDetail.order.status}
                color={selectedOrderDetail.order.status === 'delivered' ? 'success' : selectedOrderDetail.order.status === 'confirmed' ? 'primary' : selectedOrderDetail.order.status === 'shipped' ? 'info' : 'default'} />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrderDetail && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Typography variant="body2"><b>SO编号：</b>{selectedOrderDetail.order.so_number}</Typography>
                <Typography variant="body2"><b>客户：</b>{selectedOrderDetail.order.customer_name || '-'}</Typography>
                <Typography variant="body2"><b>订单日期：</b>{selectedOrderDetail.order.order_date}</Typography>
                <Typography variant="body2"><b>预计交货：</b>{selectedOrderDetail.order.expected_delivery_date || '-'}</Typography>
                <Typography variant="body2"><b>总金额：</b>¥{selectedOrderDetail.order.total_amount.toFixed(2)}</Typography>
                <Typography variant="body2"><b>付款状态：</b>{selectedOrderDetail.order.payment_status}</Typography>
                <Typography variant="body2" sx={{ gridColumn: '1 / -1' }}><b>收货地址：</b>{selectedOrderDetail.order.shipping_address || '无'}</Typography>
              </Box>
              <Typography variant="body2"><b>备注：</b>{selectedOrderDetail.order.notes || '无'}</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>明细列表</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>商品</TableCell><TableCell align="right">数量</TableCell>
                      <TableCell align="right">单价</TableCell><TableCell align="right">小计</TableCell>
                      <TableCell align="right">已发数量</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrderDetail.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name || item.product_id}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">¥{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell align="right">¥{(item.total_price || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">{item.shipped_quantity || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* 收款记录 */}
              {paymentHistory.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>收款记录</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>日期</TableCell>
                          <TableCell align="right">金额</TableCell>
                          <TableCell>方式</TableCell>
                          <TableCell>凭证号</TableCell>
                          <TableCell>备注</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentHistory.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.transaction_date}</TableCell>
                            <TableCell align="right">¥{p.amount.toFixed(2)}</TableCell>
                            <TableCell>{p.payment_method || '-'}</TableCell>
                            <TableCell>{p.voucher_no || '-'}</TableCell>
                            <TableCell>{p.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', width: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedOrderDetail && selectedOrderDetail.order.status === 'draft' && (
                <>
                  <Button variant="contained" color="primary" onClick={() => handleSubmitOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>确认出库</Button>
                  <Button variant="outlined" color="error" onClick={() => handleDeleteOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>删除</Button>
                </>
              )}
              {selectedOrderDetail && selectedOrderDetail.order.status === 'confirmed' && (
                <>
                  <Button variant="contained" color="info" onClick={() => handleMarkShipped(selectedOrderDetail.order.id)}
                    disabled={loading}>标记发货</Button>
                  <Button variant="outlined" color="warning" onClick={() => handleCancelOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>取消订单</Button>
                </>
              )}
              {selectedOrderDetail && selectedOrderDetail.order.status === 'shipped' && (
                <>
                  <Button variant="contained" color="success" onClick={() => handleMarkDelivered(selectedOrderDetail.order.id)}
                    disabled={loading}>标记送达</Button>
                  <Button variant="outlined" color="warning" onClick={() => handleCancelOrder(selectedOrderDetail.order.id)}
                    disabled={loading}>取消订单</Button>
                </>
              )}
              {selectedOrderDetail && selectedOrderDetail.order.status === 'cancelled' && (
                <Button variant="outlined" color="error" onClick={() => handleDeleteOrder(selectedOrderDetail.order.id)}
                  disabled={loading}>删除</Button>
              )}
              {/* 收款按钮 */}
              {selectedOrderDetail && selectedOrderDetail.order.status !== 'cancelled' && selectedOrderDetail.order.payment_status !== 'paid' && (
                <Button variant="contained" color="secondary" onClick={() => setPaymentDialogOpen(true)} disabled={loading}>
                  记录收款
                </Button>
              )}
            </Box>
            <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* 收款对话框 */}
      {selectedOrderDetail && (
        <PaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          orderId={selectedOrderDetail.order.id}
          orderType="sales"
          totalAmount={selectedOrderDetail.order.total_amount}
          paidAmount={selectedOrderDetail.order.paid_amount}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* 灵活库存微盘点建议（PRD v12.0） */}
      <MicroStocktakingPrompt
        open={calibrationPrompt.open}
        onClose={() => setCalibrationPrompt(prev => ({ ...prev, open: false }))}
        salesResult={calibrationPrompt.salesResult}
        purchaseResult={calibrationPrompt.purchaseResult}
        productId={calibrationPrompt.productId}
        productName={calibrationPrompt.productName}
        currentStock={calibrationPrompt.currentStock}
        onCalibrated={() => {
          setCalibrationPrompt(prev => ({ ...prev, open: false }));
          loadOrders();
          window.dispatchEvent(new CustomEvent('proclaw:inventory-calibrated'));
        }}
      />
    </Box>
  );
}

/* ========== 销售退货 Tab ========== */

function SalesReturnTab({
  loading, setLoading, setError, setSuccessMessage,
}: {
  loading: boolean; setLoading: (v: boolean) => void;
  setError: (e: string | null) => void; setSuccessMessage: (e: string | null) => void;
}) {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [returnForm, setReturnForm] = useState<{
    sales_order_id: string;
    return_date: string;
    reason: string;
    notes: string;
  }>({ sales_order_id: '', return_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
  const [returnItems, setReturnItems] = useState<Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    max_quantity?: number;
  }>>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SalesReturnDetail | null>(null);

  useEffect(() => { loadReturns(); loadShippedOrders(); }, []);

  const loadReturns = async () => {
    try { setLoading(true); setReturns(await getSalesReturns({ search: search || undefined })); }
    catch (err) { setError(err instanceof Error ? err.message : '加载销售退货单失败'); }
    finally { setLoading(false); }
  };

  const loadShippedOrders = async () => {
    try {
      const allOrders = await getSalesOrders({});
      setOrders(allOrders.filter(o => o.status === 'confirmed' || o.status === 'shipped' || o.status === 'delivered'));
    } catch (err) { console.error('加载销售订单失败', err); }
  };

  const openCreateDialog = () => {
    setReturnForm({ sales_order_id: '', return_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
    setReturnItems([]);
    setCreateDialogOpen(true);
  };

  const handleSelectSO = (soId: string) => {
    setReturnForm({ ...returnForm, sales_order_id: soId });
    getSalesOrderDetail(soId).then(detail => {
      const items = detail.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        quantity: 0,
        unit_price: item.unit_price,
        max_quantity: item.shipped_quantity || item.quantity,
      }));
      setReturnItems(items);
    }).catch(err => setError(err instanceof Error ? err.message : '加载订单详情失败'));
  };

  const updateReturnItem = (index: number, field: string, value: any) => {
    const newItems = [...returnItems];
    (newItems[index] as any)[field] = value;
    setReturnItems(newItems);
  };

  const handleCreate = async () => {
    if (!returnForm.sales_order_id) { setError('请选择原销售订单'); return; }
    // 校验退货数量不超过原订单数量
    for (const item of returnItems) {
      if (item.quantity > 0 && item.max_quantity !== undefined && item.quantity > item.max_quantity) {
        setError(`「${item.product_name || item.product_id}」退货数量(${item.quantity})不能超过原发货数量(${item.max_quantity})`);
        return;
      }
    }
    const validItems = returnItems.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) { setError('请至少填写一个商品的退货数量'); return; }
    const selectedOrder = orders.find(o => o.id === returnForm.sales_order_id);
    if (!selectedOrder) { setError('订单不存在'); return; }
    try {
      setCreateLoading(true);
      const result = await createSalesReturn({
        sales_order_id: returnForm.sales_order_id,
        customer_id: selectedOrder.customer_id,
        return_date: returnForm.return_date,
        reason: returnForm.reason || undefined,
        notes: returnForm.notes || undefined,
        items: validItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      setSuccessMessage(`销售退货单 ${result.sr_number} 创建成功!`);
      setCreateDialogOpen(false);
      loadReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建销售退货单失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const loadDetail = async (returnId: string) => {
    try {
      setLoading(true);
      const detail = await getSalesReturnDetail(returnId);
      setSelectedDetail(detail);
      setDetailDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载退货单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (returnId: string) => {
    try {
      setLoading(true);
      await confirmSalesReturn(returnId);
      setSuccessMessage('退货确认成功，库存已恢复!');
      loadReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认退货失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (returnId: string) => {
    try {
      setLoading(true);
      await cancelSalesReturn(returnId);
      setSuccessMessage('退货单已取消');
      loadReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消退货单失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'primary' | 'info' | 'default' | 'error'> = {
      draft: 'default', confirmed: 'primary', completed: 'success', cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { draft: '草稿', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };
    return labels[status] || status;
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField placeholder="搜索退货单 (SR号/SO号/客户)" value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadReturns()}
          size="small" sx={{ minWidth: 300 }}
          InputProps={{ endAdornment: <Button size="small" onClick={loadReturns} disabled={loading}><SearchIcon /></Button> }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} disabled={loading}>创建销售退货</Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadReturns} disabled={loading}>刷新</Button>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">销售退货单列表 ({returns.length})</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SR编号</TableCell><TableCell>原SO号</TableCell><TableCell>客户</TableCell>
                <TableCell>退货日期</TableCell><TableCell>状态</TableCell><TableCell align="right">总金额</TableCell><TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{loading ? '加载中...' : '暂无销售退货单'}</Typography></TableCell></TableRow>
              ) : returns.map(r => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => loadDetail(r.id)}>
                  <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{r.sr_number}</Typography></TableCell>
                  <TableCell>{r.so_number || '-'}</TableCell>
                  <TableCell>{r.customer_name || '-'}</TableCell>
                  <TableCell>{r.return_date}</TableCell>
                  <TableCell><Chip label={getStatusLabel(r.status)} size="small" color={getStatusColor(r.status)} /></TableCell>
                  <TableCell align="right"><Typography sx={{ fontWeight: 'bold' }}>¥{r.total_amount.toFixed(2)}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" variant="outlined" color="info" onClick={e => { e.stopPropagation(); loadDetail(r.id); }}>详情</Button>
                      {r.status === 'draft' && (
                        <Button size="small" variant="contained" color="primary" onClick={e => { e.stopPropagation(); handleConfirm(r.id); }} disabled={loading}>确认退货</Button>
                      )}
                      {(r.status === 'draft' || r.status === 'confirmed') && (
                        <Button size="small" variant="outlined" color="error" onClick={e => { e.stopPropagation(); handleCancel(r.id); }} disabled={loading}>取消</Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 创建销售退货对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建销售退货单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>关联销售订单 *</InputLabel>
              <Select value={returnForm.sales_order_id} label="关联销售订单 *"
                onChange={e => handleSelectSO(e.target.value)}>
                {orders.map(o => (
                  <MenuItem key={o.id} value={o.id}>{o.so_number} - {o.customer_name || ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="退货日期" type="date" value={returnForm.return_date}
              onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="退货原因" value={returnForm.reason}
              onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })} fullWidth />
            <TextField label="备注" value={returnForm.notes}
              onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} multiline rows={2} fullWidth />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>退货明细（输入数量 {'>'} 0 的将被提交）</Typography>
            {returnItems.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography sx={{ minWidth: 200, fontSize: '0.9rem' }}>{item.product_name || item.product_id}</Typography>
                <TextField label="退货数量" type="number" size="small" sx={{ width: 120 }}
                  value={item.quantity || ''}
                  onChange={e => updateReturnItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: item.max_quantity }}
                  helperText={item.max_quantity ? `最多 ${item.max_quantity}` : ''}
                  FormHelperTextProps={{ sx: { fontSize: '0.7rem' } }} />
                <TextField label="单价" type="number" size="small" sx={{ width: 120 }}
                  value={item.unit_price}
                  onChange={e => updateReturnItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }} />
                <Typography sx={{ minWidth: 80, textAlign: 'right', fontWeight: 600 }}>
                  ¥{(item.quantity * item.unit_price).toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreate} variant="contained" disabled={createLoading}>
            {createLoading ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 销售退货详情对话框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">销售退货单详情</Typography>
            {selectedDetail && (
              <Chip label={getStatusLabel(selectedDetail.return.status)} color={getStatusColor(selectedDetail.return.status)} />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDetail && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Typography variant="body2"><b>SR编号：</b>{selectedDetail.return.sr_number}</Typography>
                <Typography variant="body2"><b>原SO号：</b>{selectedDetail.return.so_number || '-'}</Typography>
                <Typography variant="body2"><b>客户：</b>{selectedDetail.return.customer_name || '-'}</Typography>
                <Typography variant="body2"><b>退货日期：</b>{selectedDetail.return.return_date}</Typography>
                <Typography variant="body2"><b>总金额：</b>¥{selectedDetail.return.total_amount.toFixed(2)}</Typography>
                <Typography variant="body2"><b>已退款：</b>¥{selectedDetail.return.refund_amount.toFixed(2)}</Typography>
              </Box>
              <Typography variant="body2"><b>退货原因：</b>{selectedDetail.return.reason || '无'}</Typography>
              <Typography variant="body2"><b>备注：</b>{selectedDetail.return.notes || '无'}</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>明细列表</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>商品</TableCell><TableCell align="right">数量</TableCell>
                      <TableCell align="right">单价</TableCell><TableCell align="right">小计</TableCell><TableCell>原因</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedDetail.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name || item.product_id}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">¥{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell align="right">¥{(item.total_price || 0).toFixed(2)}</TableCell>
                        <TableCell>{item.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            供应链管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            库存管理、采购管理与销售管理
            <Typography component="span" sx={{ ml: 1, color: '#ff3b30', fontSize: '0.9em' }}>🦞</Typography>
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<SmartToyIcon />}
          size="small"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('proclaw:open-ai-chat', {
              detail: { message: '分析供应链数据，给出优化建议' },
            }));
          }}
          sx={{
            borderColor: 'rgba(99,102,241,0.3)',
            color: '#6366F1',
            '&:hover': {
              borderColor: '#6366F1',
              backgroundColor: 'rgba(99,102,241,0.06)',
            },
          }}
        >
          🤖 AI 助手
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF3B30',
              height: 2,
            },
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'rgba(0,0,0,0.5)',
              '&.Mui-selected': {
                color: '#FF3B30',
                fontWeight: 600,
              },
            },
            '& .MuiTab-iconWrapper': {
              mr: 0.5,
            },
          }}
        >
          <Tab icon={<InventoryIcon sx={{ fontSize: 16 }} />} label="库存管理" iconPosition="start" />
          <Tab icon={<PurchaseIcon sx={{ fontSize: 16 }} />} label="采购管理" iconPosition="start" />
          <Tab icon={<SalesIcon sx={{ fontSize: 16 }} />} label="销售管理" iconPosition="start" />
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
