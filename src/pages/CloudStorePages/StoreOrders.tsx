import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LocalShipping as ShipIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
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
import { getCloudStore, getStoreOrders, getStoreOrder, markOrderShipped, OrderStatus, StoreOrder, CloudStore } from '../../lib/cloudStoreService';

interface StoreOrdersProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

type StatusFilter = 'all' | OrderStatus;

const ORDER_STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待付款' },
  { value: 'paid', label: '已付款' },
  { value: 'shipped', label: '已发货' },
  { value: 'delivered', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

export default function StoreOrders({
  loading, setLoading, setError, setSuccessMessage,
}: StoreOrdersProps) {
  const [store, setStore] = useState<CloudStore | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<StoreOrder[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [trackingNo, setTrackingNo] = useState('');

  const loadStore = async () => {
    try {
      const storeData = await getCloudStore();
      setStore(storeData);
      return storeData;
    } catch (err) {
      console.error('加载商城信息失败:', err);
      return null;
    }
  };

  const loadOrders = async (storeData?: CloudStore | null) => {
    const currentStore = storeData || store;
    if (!currentStore) {
      setError('请先开通云商城');
      return;
    }
    try {
      setLoading(true);
      const data = await getStoreOrders(currentStore.id);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const storeData = await loadStore();
      await loadOrders(storeData);
    };
    init();
  }, []);

  useEffect(() => { loadOrders(); }, []);

  useEffect(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    if (search) {
      result = result.filter(o =>
        o.order_no.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredOrders(result);
  }, [orders, statusFilter, search]);

  const handleViewDetail = async (order: StoreOrder) => {
    try {
      const detail = await getStoreOrder(order.id);
      setSelectedOrder(detail);
    } catch {
      setSelectedOrder(order);
    }
    setDetailOpen(true);
  };

  const handleMarkShipped = async () => {
    if (!selectedOrder) return;
    try {
      await markOrderShipped(selectedOrder.id, trackingNo || undefined);
      setSuccessMessage(`订单 ${selectedOrder.order_no} 已标记为已发货`);
      setShippingDialogOpen(false);
      setTrackingNo('');
      setDetailOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        管理云端商城订单，支持查看详情和标记发货。
      </Alert>

      {/* 筛选栏 */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="搜索订单号/客户名"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadOrders()}
          size="small"
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {ORDER_STATUS_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              clickable
              color={statusFilter === opt.value ? 'primary' : 'default'}
              variant={statusFilter === opt.value ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(opt.value)}
              size="small"
            />
          ))}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadOrders()} disabled={loading}>
          刷新
        </Button>
      </Paper>

      {/* 订单列表 */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">订单列表 ({filteredOrders.length})</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单号</TableCell>
                <TableCell>客户</TableCell>
                <TableCell align="right">金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>支付方式</TableCell>
                <TableCell>下单时间</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无订单数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: 'primary.main' }}>{order.order_no}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{order.customer_name}</Typography>
                      {order.customer_phone && (
                        <Typography variant="caption" color="text.secondary">{order.customer_phone}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700 }}>¥{order.total_amount.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(order.status)}
                        size="small"
                        color={getStatusColor(order.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.payment_method === 'wechat' ? '微信支付' : order.payment_method === 'alipay' ? '支付宝' : '-'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString('zh-CN')}</TableCell>
                    <TableCell align="center">
                      <Button size="small" startIcon={<ViewIcon />} onClick={() => handleViewDetail(order)}>
                        详情
                      </Button>
                      {order.status === 'paid' && (
                        <Button size="small" startIcon={<ShipIcon />} color="primary" onClick={() => {
                          setSelectedOrder(order);
                          setShippingDialogOpen(true);
                        }}>
                          发货
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 订单详情对话框 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>订单详情 - {selectedOrder?.order_no}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 基本信息 */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>基本信息</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Typography variant="body2">客户：{selectedOrder.customer_name}</Typography>
                    <Typography variant="body2">电话：{selectedOrder.customer_phone || '-'}</Typography>
                    <Typography variant="body2">状态：{getStatusLabel(selectedOrder.status)}</Typography>
                    <Typography variant="body2">支付：{selectedOrder.payment_method === 'wechat' ? '微信支付' : '支付宝'}</Typography>
                  </Box>
                  {selectedOrder.customer_address && (
                    <Typography variant="body2" sx={{ mt: 1 }}>地址：{selectedOrder.customer_address}</Typography>
                  )}
                </CardContent>
              </Card>

              {/* 商品明细 */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>商品明细</Typography>
                  {selectedOrder.items.map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Typography>{item.product_name} x{item.quantity}</Typography>
                      <Typography>¥{(item.price * item.quantity).toFixed(2)}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Typography variant="h6">合计：¥{selectedOrder.total_amount.toFixed(2)}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedOrder?.status === 'paid' && (
            <Button variant="contained" startIcon={<ShipIcon />} onClick={() => {
              setShippingDialogOpen(true);
            }}>
              标记发货
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 发货对话框 */}
      <Dialog open={shippingDialogOpen} onClose={() => setShippingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>标记发货</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography>订单号：{selectedOrder?.order_no}</Typography>
            <TextField
              label="物流单号（可选）"
              value={trackingNo}
              onChange={e => setTrackingNo(e.target.value)}
              fullWidth
              size="small"
              placeholder="请输入物流单号"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShippingDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleMarkShipped}>确认发货</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ========== 工具函数 ========== */

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: '待付款', paid: '已付款', shipped: '已发货', delivered: '已完成', cancelled: '已取消',
  };
  return labels[status] || status;
}

function getStatusColor(status: OrderStatus): 'warning' | 'success' | 'info' | 'default' | 'error' {
  const colors: Record<OrderStatus, 'warning' | 'success' | 'info' | 'default' | 'error'> = {
    pending: 'warning', paid: 'info', shipped: 'info', delivered: 'success', cancelled: 'error',
  };
  return colors[status] || 'default';
}
