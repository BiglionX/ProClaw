import {
  Add as AddIcon,
  ArrowDownward as InboundIcon,
  ArrowUpward as OutboundIcon,
  TrendingDown as LowStockIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Product, getProducts } from '../lib/productService';
import {
  CreateTransactionInput,
  InventoryStats,
  InventoryTransaction,
  createInventoryTransaction,
  getInventoryStats,
  getInventoryTransactions,
} from '../lib/inventoryService';

export default function InventoryPage() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTransactionInput>({
    product_id: '',
    transaction_type: 'inbound',
    quantity: 0,
    reference_no: '',
    reason: '',
    notes: '',
  });

  // 加载数据
  const loadData = async () => {
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
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      if (!formData.product_id) {
        setError('请选择产品');
        return;
      }
      if (formData.quantity <= 0) {
        setError('数量必须大于0');
        return;
      }

      setLoading(true);
      await createInventoryTransaction(formData);
      setSuccessMessage('库存交易创建成功!');
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建交易失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      transaction_type: 'inbound',
      quantity: 0,
      reference_no: '',
      reason: '',
      notes: '',
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
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
          库存管理、入库/出库操作和交易记录
        </Typography>
      </Box>

      {/* 统计卡片 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  总产品数
                </Typography>
                <Typography variant="h3">{stats.total_products}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  低库存
                </Typography>
                <Typography variant="h3">{stats.low_stock_count}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  零库存
                </Typography>
                <Typography variant="h3">{stats.zero_stock_count}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  今日交易
                </Typography>
                <Typography variant="h3">{stats.today_transactions}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  库存总值
                </Typography>
                <Typography variant="h5">¥{stats.total_value.toFixed(2)}</Typography>
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
            {stats.low_stock_products.map((product) => (
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
          onClick={handleOpenDialog}
          disabled={loading}
        >
          新建库存交易
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
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
                    <Typography color="text.secondary">暂无交易记录</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const product = products.find((p) => p.id === tx.product_id);
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
                        {product ? `${product.name} (${product.sku})` : tx.product_id}
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
                          label={tx.sync_status === 'pending' ? '待同步' : '已同步'}
                          color={tx.sync_status === 'pending' ? 'warning' : 'success'}
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

      {/* 新建交易对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建库存交易</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 交易类型 */}
            <FormControl fullWidth>
              <InputLabel>交易类型</InputLabel>
              <Select
                value={formData.transaction_type}
                label="交易类型"
                onChange={(e) =>
                  setFormData({ ...formData, transaction_type: e.target.value as any })
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

            {/* 产品选择 */}
            <FormControl fullWidth>
              <InputLabel>产品</InputLabel>
              <Select
                value={formData.product_id}
                label="产品"
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - 当前库存: {product.current_stock}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 数量 */}
            <TextField
              label="数量"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              inputProps={{ min: 1 }}
              fullWidth
            />

            {/* 参考单号 */}
            <TextField
              label="参考单号"
              value={formData.reference_no}
              onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
              placeholder="例如: PO-2024-001"
              fullWidth
            />

            {/* 原因 */}
            <TextField
              label="原因"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="例如: 采购入库、销售出库"
              fullWidth
            />

            {/* 备注 */}
            <TextField
              label="备注"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
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
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
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
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
