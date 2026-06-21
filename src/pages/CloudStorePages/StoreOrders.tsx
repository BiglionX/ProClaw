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
import { useEffect, useMemo, useState } from 'react';
import { getStoreOrder, markOrderShipped, OrderStatus, StoreOrder } from '../../lib/cloudStoreService';
import { useCloudStore, useInvalidateCloudStore, useStoreOrders } from '../../lib/hooks/useCloudStore';

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
  loading: _parentLoading, setLoading, setError, setSuccessMessage,
}: StoreOrdersProps) {
  const { data: store } = useCloudStore();
  const {
    data: orders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useStoreOrders(store?.id, undefined, !!store);
  const invalidateCloudStore = useInvalidateCloudStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [trackingNo, setTrackingNo] = useState('');

  useEffect(() => {
    setLoading(ordersLoading);
  }, [ordersLoading, setLoading]);

  useEffect(() => {
    if (!store) setError('请先开通云商城');
  }, [store, setError]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (search) {
      result = result.filter(
        (o) =>
          o.order_no.toLowerCase().includes(search.toLowerCase()) ||
          o.customer_name.toLowerCase().includes(search.toLowerCase()),
      );
    }
    return result;
  }, [orders, statusFilter, search]);

  const refreshOrders = () => {
    invalidateCloudStore();
    refetchOrders();
  };

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
      refreshOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        管理云端商城订单，支持查看详情和标记发货。
      </Alert>

      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="搜索订单号/客户名"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {ORDER_STATUS_OPTIONS.map((opt) => (
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
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshOrders} disabled={ordersLoading}>
          刷新
        </Button>
      </Paper>

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
              {ordersLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">暂无订单</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.order_no}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell align="right">¥{order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={order.status} size="small" />
                    </TableCell>
                    <TableCell>{order.payment_method || '-'}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString('zh-CN')}</TableCell>
                    <TableCell align="center">
                      <Button size="small" startIcon={<ViewIcon />} onClick={() => handleViewDetail(order)}>
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>订单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" gutterBottom>订单号: {selectedOrder.order_no}</Typography>
              <Typography variant="body2" gutterBottom>客户: {selectedOrder.customer_name}</Typography>
              <Typography variant="body2" gutterBottom>金额: ¥{selectedOrder.total_amount.toFixed(2)}</Typography>
              <Typography variant="body2" gutterBottom>状态: {selectedOrder.status}</Typography>
              {selectedOrder.items?.length > 0 && (
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>商品明细</Typography>
                    {selectedOrder.items.map((item, idx) => (
                      <Typography key={idx} variant="body2">
                        {item.product_name} x{item.quantity} — ¥{item.price}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedOrder?.status === 'paid' && (
            <Button startIcon={<ShipIcon />} variant="contained" onClick={() => setShippingDialogOpen(true)}>
              标记发货
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={shippingDialogOpen} onClose={() => setShippingDialogOpen(false)}>
        <DialogTitle>标记发货</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="物流单号（可选）"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShippingDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleMarkShipped}>确认发货</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
