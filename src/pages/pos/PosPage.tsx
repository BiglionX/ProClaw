import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button, IconButton, Chip,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab,
  List, ListItem, ListItemButton, ListItemText,
} from '@mui/material';
import {
  Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon,
  TableRestaurant as TableIcon, ShoppingCart as CartIcon,
  Payment as PaymentIcon, Search as SearchIcon,
  Coffee as CoffeeIcon, LunchDining as FoodIcon,
  LocalBar as DrinkIcon, SetMeal as SetMealIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

// ============ 类型定义 ============
interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface PosTable {
  id: string;
  area: string;
  name: string;
  capacity: number;
  status: 'vacant' | 'occupied' | 'reserved' | 'cleaning';
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

// ============ 模拟数据 ============
const CATEGORY_LABELS: Record<string, string> = {
  cat_hotpot: '火锅',
  cat_appetizer: '凉菜',
  cat_main: '热菜',
  cat_drink: '饮品',
  cat_dessert: '甜品',
  cat_rice: '主食',
};

const MOCK_MENU_ITEMS: MenuItem[] = [
  { id: 'm1', category_id: 'cat_hotpot', name: '麻辣锅底', price: 68, is_available: true },
  { id: 'm2', category_id: 'cat_hotpot', name: '番茄锅底', price: 58, is_available: true },
  { id: 'm3', category_id: 'cat_hotpot', name: '菌汤锅底', price: 48, is_available: true },
  { id: 'm4', category_id: 'cat_appetizer', name: '拍黄瓜', price: 18, is_available: true },
  { id: 'm5', category_id: 'cat_appetizer', name: '口水鸡', price: 28, is_available: true },
  { id: 'm6', category_id: 'cat_appetizer', name: '皮蛋豆腐', price: 16, is_available: true },
  { id: 'm7', category_id: 'cat_main', name: '回锅肉', price: 38, is_available: true },
  { id: 'm8', category_id: 'cat_main', name: '鱼香肉丝', price: 32, is_available: true },
  { id: 'm9', category_id: 'cat_main', name: '宫保鸡丁', price: 35, is_available: true },
  { id: 'm10', category_id: 'cat_main', name: '麻婆豆腐', price: 22, is_available: true },
  { id: 'm11', category_id: 'cat_main', name: '水煮鱼', price: 58, is_available: true },
  { id: 'm12', category_id: 'cat_drink', name: '可乐', price: 5, is_available: true },
  { id: 'm13', category_id: 'cat_drink', name: '雪碧', price: 5, is_available: true },
  { id: 'm14', category_id: 'cat_drink', name: '酸梅汤', price: 8, is_available: true },
  { id: 'm15', category_id: 'cat_dessert', name: '冰粉', price: 12, is_available: true },
  { id: 'm16', category_id: 'cat_dessert', name: '红糖糍粑', price: 18, is_available: true },
  { id: 'm17', category_id: 'cat_rice', name: '米饭', price: 2, is_available: true },
  { id: 'm18', category_id: 'cat_rice', name: '炒面', price: 15, is_available: true },
  { id: 'm19', category_id: 'cat_rice', name: '炒饭', price: 15, is_available: true },
];

const MOCK_TABLES: PosTable[] = [
  { id: 't1', area: '大厅', name: 'A1', capacity: 4, status: 'vacant' },
  { id: 't2', area: '大厅', name: 'A2', capacity: 4, status: 'occupied' },
  { id: 't3', area: '大厅', name: 'A3', capacity: 6, status: 'occupied' },
  { id: 't4', area: '大厅', name: 'A5', capacity: 8, status: 'reserved' },
  { id: 't5', area: '包间', name: 'V1', capacity: 10, status: 'vacant' },
  { id: 't6', area: '包间', name: 'V2', capacity: 12, status: 'vacant' },
  { id: 't7', area: '包间', name: 'V3', capacity: 8, status: 'cleaning' },
  { id: 't8', area: '包间', name: 'V5', capacity: 16, status: 'occupied' },
  { id: 't9', area: '大厅', name: 'A6', capacity: 4, status: 'vacant' },
  { id: 't10', area: '大厅', name: 'A7', capacity: 4, status: 'vacant' },
  { id: 't11', area: '大厅', name: 'A8', capacity: 6, status: 'vacant' },
  { id: 't12', area: '包间', name: 'V6', capacity: 20, status: 'vacant' },
];

const STATIC_CATEGORY_ICONS: Record<string, React.ReactElement> = {
  'cat_appetizer': <FoodIcon />,
  'cat_main': <SetMealIcon />,
  'cat_drink': <DrinkIcon />,
  'cat_dessert': <CoffeeIcon />,
  'cat_rice': <SetMealIcon />,
  'cat_hotpot': <SetMealIcon />,
};

function getCategoryIcon(catId: string): React.ReactElement {
  return STATIC_CATEGORY_ICONS[catId] || <FoodIcon />;
}

function getTableStatusColor(status: PosTable['status']): string {
  switch (status) {
    case 'vacant': return '#4caf50';
    case 'occupied': return '#f44336';
    case 'reserved': return '#ff9800';
    case 'cleaning': return '#9e9e9e';
  }
}

function getTableStatusLabel(status: PosTable['status']): string {
  switch (status) {
    case 'vacant': return '空闲';
    case 'occupied': return '已占用';
    case 'reserved': return '已预订';
    case 'cleaning': return '清洁中';
  }
}

// ============ 支付对话框 ============
interface PaymentDialogProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (method: string, amount: number) => void;
}

function PaymentDialog({ open, total, onClose, onConfirm }: PaymentDialogProps) {
  const [method, setMethod] = useState('cash');
  const [received, setReceived] = useState(total);
  const change = Math.max(0, received - total);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#e74c3c', color: 'white' }}>
        💳 收银结算
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h3" color="error" fontWeight="bold">
            ¥{total.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">应收金额</Typography>
        </Box>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>支付方式</InputLabel>
          <Select value={method} label="支付方式" onChange={(e) => setMethod(e.target.value)}>
            <MenuItem value="cash">💰 现金</MenuItem>
            <MenuItem value="wechat">💚 微信支付</MenuItem>
            <MenuItem value="alipay">💙 支付宝</MenuItem>
            <MenuItem value="card">💳 银行卡</MenuItem>
            <MenuItem value="voucher">🎫 团购券</MenuItem>
          </Select>
        </FormControl>
        {method === 'cash' && (
          <TextField
            fullWidth
            label="实收金额"
            type="number"
            value={received}
            onChange={(e) => setReceived(Number(e.target.value))}
            sx={{ mb: 2 }}
          />
        )}
        {method === 'cash' && received > total && (
          <Alert severity="info">找零：¥{change.toFixed(2)}</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          sx={{ bgcolor: '#e74c3c' }}
          onClick={() => onConfirm(method, received)}
        >
          确认收款 ¥{total.toFixed(2)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Alert({ severity, children }: { severity: 'info' | 'success' | 'warning' | 'error'; children: React.ReactNode }) {
  const colors = { info: '#2196f3', success: '#4caf50', warning: '#ff9800', error: '#f44336' };
  return (
    <Paper sx={{ p: 1.5, bgcolor: colors[severity] + '15', border: `1px solid ${colors[severity]}40`, borderRadius: 1 }}>
      <Typography variant="body2" sx={{ color: colors[severity] }}>{children}</Typography>
    </Paper>
  );
}

// ============ 主页面 ============
export default function PosPage() {
  const [selectedTable, setSelectedTable] = useState<PosTable | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderHistory, setOrderHistory] = useState<{ id: string; table: string; total: number; method: string; time: string }[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MOCK_MENU_ITEMS);
  const [tables, setTables] = useState<PosTable[]>(MOCK_TABLES);

  const loadCatalog = useCallback(async () => {
    try {
      const [menuRes, tableRes] = await Promise.all([
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('catering_get_menu_items', {}),
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('catering_get_tables', {}),
      ]);
      const items = menuRes?.data ?? [];
      if (items.length > 0) {
        setMenuItems(items.map((row) => ({
          id: String(row.id ?? ''),
          category_id: String(row.category_id ?? ''),
          name: String(row.name ?? ''),
          price: Number(row.price ?? 0),
          is_available: row.is_available !== false,
        })));
      }
      const tableRows = tableRes?.data ?? [];
      if (tableRows.length > 0) {
        setTables(tableRows.map((row) => ({
          id: String(row.id ?? ''),
          area: String(row.area ?? ''),
          name: String(row.name ?? ''),
          capacity: Number(row.capacity ?? 0),
          status: (String(row.status ?? 'vacant') as PosTable['status']),
        })));
      }
    } catch {
      /* keep MOCK in browser dev */
    }
  }, []);

  const loadOrderHistory = useCallback(async () => {
    try {
      const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>('catering_get_pos_orders', {});
      const rows = res?.data ?? [];
      setOrderHistory(rows.map((o) => ({
        id: String(o.id ?? ''),
        table: String(o.table_id ?? 'takeout'),
        total: Number(o.total_amount ?? 0),
        method: String(o.payment_method ?? '-'),
        time: String(o.created_at ?? ''),
      })));
    } catch {
      /* keep local state in browser dev */
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadOrderHistory();
  }, [loadCatalog, loadOrderHistory]);

  const categories = useMemo(() => {
    const ids = [...new Set(menuItems.map((item) => item.category_id))];
    return [
      { id: 'all', name: '全部', icon: 'all' },
      ...ids.map((id) => ({
        id,
        name: CATEGORY_LABELS[id] ?? id,
        icon: id.replace('cat_', ''),
      })),
    ];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems.filter((item) => item.is_available);
    if (activeCategory !== 'all') {
      items = items.filter((item) => item.category_id === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, activeCategory, searchQuery]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  function handleAddItem(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function handleRemoveItem(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((ci) =>
          ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci
        );
      }
      return prev.filter((ci) => ci.menuItem.id !== itemId);
    });
  }

  function handleDeleteItem(itemId: string) {
    setCart((prev) => prev.filter((ci) => ci.menuItem.id !== itemId));
  }

  function handleClearCart() {
    setCart([]);
  }

  async function handlePayment(method: string, _amount: number) {
    const items = cart.map((ci) => ({
      name: ci.menuItem.name,
      price: ci.menuItem.price,
      quantity: ci.quantity,
    }));
    try {
      const created = await safeInvoke<{ id?: string }>('catering_create_pos_order', {
        tableId: selectedTable?.id ?? 'takeout',
        items,
        paymentMethod: method,
      });
      if (created?.id) {
        await safeInvoke('catering_settle_pos_order', {
          orderId: created.id,
          paymentMethod: method,
          amount: cartTotal,
        });
        await loadOrderHistory();
      } else {
        setOrderHistory((prev) => [{
          id: `ORD${Date.now()}`,
          table: selectedTable?.name || 'takeout',
          total: cartTotal,
          method,
          time: new Date().toLocaleString('zh-CN'),
        }, ...prev]);
      }
    } catch {
      setOrderHistory((prev) => [{
        id: `ORD${Date.now()}`,
        table: selectedTable?.name || 'takeout',
        total: cartTotal,
        method,
        time: new Date().toLocaleString('zh-CN'),
      }, ...prev]);
    }
    setCart([]);
    setPaymentOpen(false);
  }

  const groupedByArea = useMemo(() => {
    const groups: Record<string, PosTable[]> = {};
    tables.forEach((t) => {
      if (!groups[t.area]) groups[t.area] = [];
      groups[t.area].push(t);
    });
    return groups;
  }, [tables]);

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* 顶栏 - 桌台选择 + 搜索 */}
      <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Button
          variant="outlined"
          startIcon={<TableIcon />}
          onClick={() => setTableDialogOpen(true)}
          sx={{ minWidth: 140, borderColor: selectedTable ? '#e74c3c' : undefined }}
        >
          {selectedTable ? `${selectedTable.area} - ${selectedTable.name}` : '选择桌台'}
        </Button>
        <TextField
          size="small"
          placeholder="搜索菜品..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ minWidth: 200 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          icon={<CartIcon />}
          label={`已选 ${totalItems} 项 · ¥${cartTotal.toFixed(2)}`}
          color="error"
          variant={cart.length > 0 ? 'filled' : 'outlined'}
        />
      </Paper>

      {/* 主体 */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧 - 分类 + 菜品网格 */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 分类侧栏 */}
          <Paper sx={{ width: 80, overflow: 'auto', borderRadius: 0 }} elevation={1}>
            <List dense disablePadding>
              {categories.map((cat) => (
                <ListItem key={cat.id} disablePadding>
                  <ListItemButton
                    selected={activeCategory === cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    sx={{
                      flexDirection: 'column', py: 1.5, gap: 0.5,
                      '&.Mui-selected': { bgcolor: '#e74c3c15', borderRight: '3px solid #e74c3c' },
                    }}
                  >
                    {getCategoryIcon(cat.id)}
                    <ListItemText
                      primary={cat.name}
                      primaryTypographyProps={{ fontSize: 11, textAlign: 'center' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* 菜品网格 */}
          <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
            <Grid container spacing={1.5}>
              {filteredItems.map((item) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={item.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                      border: '1px solid #e0e0e0',
                    }}
                    onClick={() => handleAddItem(item)}
                  >
                    <CardContent sx={{ p: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body1" fontWeight="bold" noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="h6" color="error" sx={{ mt: 0.5 }}>
                        ¥{item.price}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {filteredItems.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                    暂无菜品
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </Box>

        {/* 右侧 - 购物车面板 */}
        <Paper
          sx={{
            width: 340, display: 'flex', flexDirection: 'column', borderRadius: 0,
            borderLeft: '1px solid #e0e0e0',
          }}
          elevation={2}
        >
          {/* 购物车标题 */}
          <Box sx={{ p: 1.5, bgcolor: '#e74c3c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              🛒 当前订单
            </Typography>
            {cart.length > 0 && (
              <Button size="small" sx={{ color: 'white' }} onClick={handleClearCart}>
                清空
              </Button>
            )}
          </Box>

          {/* 选择桌台 */}
          {!selectedTable && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                请先选择桌台
              </Typography>
              <Button variant="outlined" size="small" sx={{ mt: 1 }} onClick={() => setTableDialogOpen(true)}>
                选择桌台
              </Button>
            </Box>
          )}

          {/* 购物车列表 */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
            {cart.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                点击左侧菜品添加至订单
              </Typography>
            ) : (
              cart.map((item) => (
                <Paper key={item.menuItem.id} sx={{ p: 1, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{item.menuItem.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ¥{item.menuItem.price} × {item.quantity}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold" color="error" sx={{ minWidth: 50, textAlign: 'right' }}>
                    ¥{(item.menuItem.price * item.quantity).toFixed(2)}
                  </Typography>
                  <IconButton size="small" onClick={() => handleRemoveItem(item.menuItem.id)}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleAddItem(item.menuItem)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteItem(item.menuItem.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))
            )}
          </Box>

          {/* 底部结算 */}
          <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">合计 ({totalItems} 项)</Typography>
              <Typography variant="h6" color="error" fontWeight="bold">
                ¥{cartTotal.toFixed(2)}
              </Typography>
            </Box>
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={cart.length === 0}
              startIcon={<PaymentIcon />}
              sx={{ bgcolor: '#e74c3c', '&:hover': { bgcolor: '#c0392b' }, py: 1.5 }}
              onClick={() => setPaymentOpen(true)}
            >
              结算 - ¥{cartTotal.toFixed(2)}
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* 桌台选择对话框 */}
      <Dialog open={tableDialogOpen} onClose={() => setTableDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e74c3c', color: 'white' }}>
          🪑 选择桌台
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {Object.entries(groupedByArea).map(([area, tables]) => (
            <Box key={area} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                {area}
              </Typography>
              <Grid container spacing={1.5}>
                {tables.map((table) => (
                  <Grid item key={table.id}>
                    <Paper
                      sx={{
                        p: 2, textAlign: 'center', cursor: 'pointer', minWidth: 100,
                        border: selectedTable?.id === table.id ? '2px solid #e74c3c' : '1px solid #e0e0e0',
                        bgcolor: selectedTable?.id === table.id ? '#e74c3c10' : undefined,
                        '&:hover': { boxShadow: 2 },
                      }}
                      onClick={() => { setSelectedTable(table); setTableDialogOpen(false); }}
                    >
                      <Typography variant="h5">{table.name}</Typography>
                      <Chip
                        label={getTableStatusLabel(table.status)}
                        size="small"
                        sx={{
                          mt: 0.5, color: 'white',
                          bgcolor: getTableStatusColor(table.status),
                        }}
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {table.capacity} 位
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelectedTable(null); setTableDialogOpen(false); }}>
            外带/不选桌台
          </Button>
          <Button onClick={() => setTableDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 支付对话框 */}
      <PaymentDialog
        open={paymentOpen}
        total={cartTotal}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handlePayment}
      />

      {/* 订单记录 */}
      <Paper sx={{ borderRadius: 0 }} elevation={0}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="点餐" />
          <Tab label={`订单记录 (${orderHistory.length})`} />
        </Tabs>
      </Paper>
      {tabValue === 1 && (
        <Box sx={{ maxHeight: 180, overflow: 'auto', bgcolor: 'white', p: 1 }}>
          {orderHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
              暂无订单记录
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>订单号</TableCell>
                    <TableCell>桌台</TableCell>
                    <TableCell>金额</TableCell>
                    <TableCell>支付方式</TableCell>
                    <TableCell>时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderHistory.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.table}</TableCell>
                      <TableCell>¥{order.total.toFixed(2)}</TableCell>
                      <TableCell>{order.method}</TableCell>
                      <TableCell>{order.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
}
