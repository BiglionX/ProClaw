import {
  Add as AddIcon,
  People as CustomerIcon,
  Assignment as OrderIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
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
  CreateCustomerInput,
  Customer,
  SalesOrder,
  createCustomer,
  getCustomers,
  getSalesOrders,
} from '../lib/salesService';

export default function SalesPage() {
  const [tabValue, setTabValue] = useState(0);

  // 客户状态
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // 销售订单状态
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    customer_type: 'individual',
    tax_number: '',
    credit_limit: 0,
    notes: '',
  });

  // 加载数据
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers({ search: customerSearch || undefined });
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getSalesOrders({ search: orderSearch || undefined });
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadOrders();
  }, []);

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        setError('客户名称不能为空');
        return;
      }
      setLoading(true);
      await createCustomer(formData);
      setSuccessMessage('客户创建成功!');
      setDialogOpen(false);
      resetForm();
      loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      customer_type: 'individual',
      tax_number: '',
      credit_limit: 0,
      notes: '',
    });
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          💼 销售管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          客户管理和销售订单
        </Typography>
      </Box>

      {/* 标签页 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<CustomerIcon />} label="客户管理" />
          <Tab icon={<OrderIcon />} label="销售订单" />
        </Tabs>
      </Paper>

      {/* 客户管理标签页 */}
      {tabValue === 0 && (
        <Box>
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
              placeholder="搜索客户 (名称/编码/联系人)"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && loadCustomers()}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    onClick={loadCustomers}
                    disabled={loading}
                  >
                    <SearchIcon />
                  </Button>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              disabled={loading}
            >
              添加客户
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
            <Box
              sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CustomerIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  客户列表 ({customers.length})
                </Typography>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>客户编码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>联系人</TableCell>
                    <TableCell>电话</TableCell>
                    <TableCell>邮箱</TableCell>
                    <TableCell>信用额度</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {loading ? '加载中...' : '暂无客户数据'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map(customer => (
                      <TableRow key={customer.id} hover>
                        <TableCell>
                          <Typography
                            sx={{ fontWeight: 'bold', color: 'primary.main' }}
                          >
                            {customer.code}
                          </Typography>
                        </TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              customer.customer_type === 'company'
                                ? '企业'
                                : '个人'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{customer.contact_person || '-'}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>
                          ¥{customer.credit_limit.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color: customer.is_active
                                ? 'success.main'
                                : 'text.secondary',
                              fontWeight: 'bold',
                            }}
                          >
                            {customer.is_active ? '活跃' : '停用'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 销售订单标签页 */}
      {tabValue === 1 && (
        <Box>
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
              placeholder="搜索销售订单 (SO号/客户)"
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && loadOrders()}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                endAdornment: (
                  <Button size="small" onClick={loadOrders} disabled={loading}>
                    <SearchIcon />
                  </Button>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => alert('创建销售订单功能开发中...')}
              disabled={loading}
            >
              创建销售订单
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadOrders}
              disabled={loading}
            >
              刷新
            </Button>
          </Paper>

          {/* 销售订单列表 */}
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <OrderIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  销售订单列表 ({orders.length})
                </Typography>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>SO编号</TableCell>
                    <TableCell>客户</TableCell>
                    <TableCell>订单日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">总金额</TableCell>
                    <TableCell>付款状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {loading ? '加载中...' : '暂无销售订单'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map(order => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Typography
                            sx={{ fontWeight: 'bold', color: 'primary.main' }}
                          >
                            {order.so_number}
                          </Typography>
                        </TableCell>
                        <TableCell>{order.customer_name || '-'}</TableCell>
                        <TableCell>{order.order_date}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            size="small"
                            color={
                              order.status === 'delivered'
                                ? 'success'
                                : order.status === 'confirmed'
                                  ? 'primary'
                                  : order.status === 'shipped'
                                    ? 'info'
                                    : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 'bold' }}>
                            ¥{order.total_amount.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.payment_status}
                            size="small"
                            color={
                              order.payment_status === 'paid'
                                ? 'success'
                                : order.payment_status === 'partial'
                                  ? 'warning'
                                  : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 添加客户对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>添加客户</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="客户名称 *"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="联系人"
              value={formData.contact_person}
              onChange={e =>
                setFormData({ ...formData, contact_person: e.target.value })
              }
              fullWidth
            />
            <Box
              sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}
            >
              <TextField
                label="电话"
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                fullWidth
              />
            </Box>
            <TextField
              label="地址"
              value={formData.address}
              onChange={e =>
                setFormData({ ...formData, address: e.target.value })
              }
              multiline
              rows={2}
              fullWidth
            />
            <Box
              sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}
            >
              <TextField
                label="网站"
                value={formData.website}
                onChange={e =>
                  setFormData({ ...formData, website: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="税号"
                value={formData.tax_number}
                onChange={e =>
                  setFormData({ ...formData, tax_number: e.target.value })
                }
                fullWidth
              />
            </Box>
            <TextField
              label="信用额度"
              type="number"
              value={formData.credit_limit}
              onChange={e =>
                setFormData({
                  ...formData,
                  credit_limit: parseFloat(e.target.value) || 0,
                })
              }
              fullWidth
            />
            <TextField
              label="备注"
              value={formData.notes}
              onChange={e =>
                setFormData({ ...formData, notes: e.target.value })
              }
              multiline
              rows={3}
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

      {/* 提示消息 */}
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
