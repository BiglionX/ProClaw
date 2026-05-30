import { useState } from 'react';
import {
  Box, Typography, Grid, Chip, Button,
  Card, CardContent, CardActions, CircularProgress,
} from '@mui/material';
import {
  CheckCircle as DoneIcon, AccessTime as PendingIcon,
  LocalFireDepartment as UrgentIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';

// ============ 类型 ============
interface KdsOrder {
  id: string;
  table_id: string;
  items: string;
  status: string;
  created_at: string;
}

// ============ 模拟数据 ============
const MOCK_ORDERS: KdsOrder[] = [
  { id: 'ORD001', table_id: 'A2', items: '[{"name":"麻辣锅底","qty":1},{"name":"肥牛","qty":2},{"name":"虾滑","qty":1}]', status: 'pending', created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: 'ORD002', table_id: 'A3', items: '[{"name":"番茄锅底","qty":1},{"name":"毛肚","qty":1},{"name":"豆腐","qty":1}]', status: 'pending', created_at: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: 'ORD003', table_id: 'A5', items: '[{"name":"回锅肉","qty":1},{"name":"米饭","qty":2}]', status: 'preparing', created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'ORD004', table_id: 'V2', items: '[{"name":"水煮鱼","qty":1},{"name":"可乐","qty":3}]', status: 'preparing', created_at: new Date(Date.now() - 15 * 60000).toISOString() },
];

function getTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  return `${Math.floor(mins / 60)}小时前`;
}

function parseItems(itemsStr: string): { name: string; qty: number }[] {
  try {
    return JSON.parse(itemsStr);
  } catch {
    return [{ name: itemsStr, qty: 1 }];
  }
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KdsOrder[]>(MOCK_ORDERS);
  const [completingId, setCompletingId] = useState<string | null>(null);

  function handleMarkDone(orderId: string) {
    setCompletingId(orderId);
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setCompletingId(null);
    }, 500);
  }

  function handleRefresh() {
    setOrders([...MOCK_ORDERS]);
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing');

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a2e' }}>
      {/* 头部 */}
      <Box sx={{ p: 2, bgcolor: '#16213e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">👨‍🍳 后厨看板</Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            待制作: {pendingOrders.length} 单
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
          onClick={handleRefresh}
        >
          刷新
        </Button>
      </Box>

      {/* 订单网格 */}
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        {pendingOrders.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="h5" color="rgba(255,255,255,0.5)">
              ✅ 所有订单已完成
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {pendingOrders.map((order) => {
              const items = parseItems(order.items);
              const elapsed = Date.now() - new Date(order.created_at).getTime();
              const isUrgent = elapsed > 10 * 60000; // > 10分钟超时

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                  <Card
                    sx={{
                      bgcolor: '#16213e',
                      color: 'white',
                      border: isUrgent ? '2px solid #f44336' : '1px solid rgba(255,255,255,0.1)',
                      animation: isUrgent ? 'pulse 1.5s infinite' : undefined,
                      '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
                    }}
                  >
                    <CardContent>
                      {/* 订单头 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          🪑 {order.table_id}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {isUrgent && (
                            <Chip
                              icon={<UrgentIcon />}
                              label="催菜"
                              size="small"
                              color="error"
                              sx={{ animation: 'pulse 1s infinite' }}
                            />
                          )}
                          <Chip
                            icon={order.status === 'pending' ? <PendingIcon /> : <DoneIcon />}
                            label={order.status === 'pending' ? '待制作' : '制作中'}
                            size="small"
                            color={order.status === 'pending' ? 'warning' : 'info'}
                          />
                        </Box>
                      </Box>

                      {/* 菜品列表 */}
                      <Box sx={{ mb: 1 }}>
                        {items.map((item, idx) => (
                          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Typography variant="body1">{item.name}</Typography>
                            <Chip label={`×${item.qty}`} size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }} />
                          </Box>
                        ))}
                      </Box>

                      {/* 时间 */}
                      <Typography variant="caption" color="rgba(255,255,255,0.5)">
                        {getTimeAgo(order.created_at)}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ p: 1, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={completingId === order.id ? <CircularProgress size={20} color="inherit" /> : <DoneIcon />}
                        onClick={() => handleMarkDone(order.id)}
                        disabled={completingId === order.id}
                        sx={{ py: 1.5, fontSize: 16 }}
                      >
                        {completingId === order.id ? '完成中...' : '✅ 完成出餐'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
