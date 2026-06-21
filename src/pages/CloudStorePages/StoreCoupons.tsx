import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
import type { StoreCoupon } from '../../lib/cloudStoreExtras';
import { useInvalidateCloudStore, useStoreCoupons } from '../../lib/hooks/useCloudStore';

interface StoreCouponsProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

export default function StoreCoupons({
  loading: _parentLoading, setLoading, setError, setSuccessMessage,
}: StoreCouponsProps) {
  const { data: coupons = [], isLoading, refetch } = useStoreCoupons();
  const invalidateCloudStore = useInvalidateCloudStore();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<StoreCoupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'fixed' as 'fixed' | 'percentage',
    discount_value: '',
    min_amount: '',
    max_uses: '',
    start_time: '',
    end_time: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const loading = isLoading || submitting;

  useEffect(() => {
    setLoading(isLoading || submitting);
  }, [isLoading, submitting, setLoading]);

  const loadCoupons = () => {
    invalidateCloudStore();
    refetch();
  };

  const handleOpenDialog = (coupon?: StoreCoupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value.toString(),
        min_amount: coupon.min_amount.toString(),
        max_uses: coupon.max_uses.toString(),
        start_time: new Date(coupon.start_time).toISOString().slice(0, 16),
        end_time: new Date(coupon.end_time).toISOString().slice(0, 16),
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        discount_type: 'fixed',
        discount_value: '',
        min_amount: '',
        max_uses: '',
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setError('请输入优惠码');
      return;
    }
    if (!formData.discount_value || Number(formData.discount_value) <= 0) {
      setError('请输入有效的优惠金额');
      return;
    }

    try {
      setSubmitting(true);
      setSuccessMessage(editingCoupon ? '优惠券更新成功！' : '优惠券创建成功！');
      setOpenDialog(false);
      loadCoupons();
      
      // 后续对接真实 API
      // if (editingCoupon) {
      //   await invoke('update_coupon_status', {
      //     couponId: editingCoupon.id,
      //     status: formData.status,
      //   });
      // } else {
      //   await invoke('create_coupon', {
      //     storeId: store?.id,
      //     code: formData.code,
      //     discountType: formData.discount_type,
      //     discountValue: Number(formData.discount_value),
      //     minAmount: Number(formData.min_amount) || 0,
      //     maxUses: Number(formData.max_uses) || 0,
      //     startTime: new Date(formData.start_time).getTime(),
      //     endTime: new Date(formData.end_time).getTime(),
      //   });
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (coupon: StoreCoupon) => {
    if (!confirm(`确定要删除优惠码 "${coupon.code}" 吗？`)) {
      return;
    }
    try {
      setSubmitting(true);
      setSuccessMessage('优惠券删除成功！');
      loadCoupons();
      
      // 后续对接真实 API
      // await invoke('delete_coupon', {
      //   couponId: coupon.id,
      // });
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: '生效中',
      inactive: '已停用',
      expired: '已过期',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'default' | 'warning'> = {
      active: 'success',
      inactive: 'default',
      expired: 'warning',
    };
    return colors[status] || 'default';
  };

  const formatDiscount = (coupon: StoreCoupon) => {
    if (coupon.discount_type === 'fixed') {
      return `¥${coupon.discount_value.toFixed(2)}`;
    } else {
      return `${coupon.discount_value}%`;
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        管理优惠券，设置折扣吸引客户。
      </Alert>

      {/* 操作栏 */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          创建优惠券
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadCoupons} disabled={loading}>
          刷新
        </Button>
      </Paper>

      {/* 优惠券列表 */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">优惠券列表 ({coupons.length})</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>优惠码</TableCell>
                <TableCell>折扣</TableCell>
                <TableCell>最低消费</TableCell>
                <TableCell>使用次数</TableCell>
                <TableCell>有效期</TableCell>
                <TableCell>状态</TableCell>
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
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无优惠券数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map(coupon => (
                  <TableRow key={coupon.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {coupon.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatDiscount(coupon)}
                        color={coupon.discount_type === 'fixed' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {coupon.min_amount > 0 ? `¥${coupon.min_amount.toFixed(2)}` : '无限制'}
                    </TableCell>
                    <TableCell>
                      {coupon.max_uses > 0
                        ? `${coupon.used_count} / ${coupon.max_uses}`
                        : `${coupon.used_count} / 无限制`}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {new Date(coupon.start_time).toLocaleDateString('zh-CN')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        至 {new Date(coupon.end_time).toLocaleDateString('zh-CN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(coupon.status)}
                        color={getStatusColor(coupon.status)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(coupon)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(coupon)}
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 创建/编辑对话框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCoupon ? '编辑优惠券' : '创建优惠券'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="优惠码"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="如：WELCOME10"
              fullWidth
              required
              helperText="客户结算时输入此优惠码"
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="折扣类型"
                  value={formData.discount_type}
                  onChange={e => setFormData({ ...formData, discount_type: e.target.value as 'fixed' | 'percentage' })}
                  select
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  <option value="fixed">固定金额</option>
                  <option value="percentage">折扣百分比</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={formData.discount_type === 'fixed' ? '优惠金额 (¥)' : '折扣 (%)'}
                  value={formData.discount_value}
                  onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                  type="number"
                  fullWidth
                  required
                  InputProps={{ inputProps: { min: 0, max: formData.discount_type === 'percentage' ? 100 : undefined } }}
                />
              </Grid>
            </Grid>
            <TextField
              label="最低消费金额 (¥)"
              value={formData.min_amount}
              onChange={e => setFormData({ ...formData, min_amount: e.target.value })}
              type="number"
              fullWidth
              helperText="0 表示无限制"
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              label="最大使用次数"
              value={formData.max_uses}
              onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
              type="number"
              fullWidth
              helperText="0 表示无限制"
              InputProps={{ inputProps: { min: 0 } }}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="开始时间"
                  value={formData.start_time}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  type="datetime-local"
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="结束时间"
                  value={formData.end_time}
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  type="datetime-local"
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : (editingCoupon ? '更新' : '创建')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
