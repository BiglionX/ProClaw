import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Star as StarIcon,
  AttachMoney as MoneyIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
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
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import apiClient from '../lib/apiClient';

// ==================== 类型定义 ====================

interface Member {
  id: string;
  name: string;
  code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  customer_type: 'individual' | 'vip' | 'enterprise';
  tax_number?: string;
  credit_limit: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MemberFormData {
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  customer_type: 'individual' | 'vip' | 'enterprise';
  credit_limit: number;
  notes: string;
  is_active: boolean;
}

// ==================== 工具 ====================

const CUSTOMER_TYPE_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'warning' | 'success' }> = {
  individual: { label: '普通会员', color: 'default' },
  vip: { label: 'VIP 会员', color: 'warning' },
  enterprise: { label: '企业会员', color: 'primary' },
};

const formatMoney = (v: number) =>
  v >= 10000 ? `¥${(v / 10000).toFixed(1)}万` : `¥${v.toFixed(2)}`;

const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString('zh-CN') : '-');

const buildEmptyForm = (): MemberFormData => ({
  name: '',
  code: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  customer_type: 'individual',
  credit_limit: 0,
  notes: '',
  is_active: true,
});

// ==================== 主页面 ====================

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(buildEmptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null);

  // ==================== 数据加载 ====================

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Member[]; total: number }>(
        '/api/customers',
        { params: { search: searchText || undefined } }
      );
      const list = Array.isArray(response?.data) ? response.data : [];
      setMembers(list);
    } catch (error: any) {
      console.error('[MembersPage] load failed:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || '加载会员列表失败',
        severity: 'error',
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadMembers, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // ==================== 统计 ====================

  const stats = useMemo(() => {
    const total = members.length;
    const vip = members.filter(m => m.customer_type === 'vip').length;
    const enterprise = members.filter(m => m.customer_type === 'enterprise').length;
    const totalCredit = members.reduce((sum, m) => sum + (m.credit_limit || 0), 0);
    return { total, vip, enterprise, totalCredit };
  }, [members]);

  // ==================== 过滤 ====================

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (typeFilter !== 'all' && m.customer_type !== typeFilter) return false;
      if (statusFilter === 'active' && !m.is_active) return false;
      if (statusFilter === 'inactive' && m.is_active) return false;
      return true;
    });
  }, [members, typeFilter, statusFilter]);

  const paginatedMembers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredMembers.slice(start, start + rowsPerPage);
  }, [filteredMembers, page, rowsPerPage]);

  // ==================== 表单 ====================

  const openCreateDialog = () => {
    setEditingMember(null);
    setFormData(buildEmptyForm());
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      code: member.code || '',
      contact_person: member.contact_person || '',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      customer_type: member.customer_type || 'individual',
      credit_limit: member.credit_limit || 0,
      notes: member.notes || '',
      is_active: member.is_active ?? true,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setEditingMember(null);
    setFormError(null);
  };

  const handleFormChange = <K extends keyof MemberFormData>(key: K, value: MemberFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('请输入会员名称');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError('邮箱格式不正确');
      return;
    }
    if (formData.credit_limit < 0) {
      setFormError('授信额度不能为负数');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        contact_person: formData.contact_person.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        customer_type: formData.customer_type,
        credit_limit: formData.credit_limit,
        notes: formData.notes.trim() || undefined,
        is_active: formData.is_active,
      };

      if (editingMember) {
        await apiClient.put(`/api/customers/${editingMember.id}`, payload);
        setSnackbar({ open: true, message: '会员信息已更新', severity: 'success' });
      } else {
        await apiClient.post('/api/customers', payload);
        setSnackbar({ open: true, message: '会员创建成功', severity: 'success' });
      }

      setDialogOpen(false);
      setEditingMember(null);
      await loadMembers();
    } catch (error: any) {
      console.error('[MembersPage] submit failed:', error);
      setFormError(error?.response?.data?.error || error?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiClient.delete(`/api/customers/${deleteConfirm.id}`);
      setSnackbar({ open: true, message: `已删除会员：${deleteConfirm.name}`, severity: 'success' });
      setDeleteConfirm(null);
      await loadMembers();
    } catch (error: any) {
      console.error('[MembersPage] delete failed:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || '删除失败',
        severity: 'error',
      });
    }
  };

  // ==================== 渲染 ====================

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PersonIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              会员管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              会员档案 · 充值消费 · 积分管理 · 会员营销
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="刷新">
            <IconButton onClick={loadMembers} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{
              background: 'linear-gradient(135deg, #FF3B30 0%, #6366F1 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #D32F2F 0%, #4F46E5 100%)' },
            }}
          >
            新增会员
          </Button>
        </Box>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">会员总数</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {loading ? <Skeleton width={60} /> : stats.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <StarIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">VIP 会员</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {loading ? <Skeleton width={60} /> : stats.vip}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <MoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">企业会员</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {loading ? <Skeleton width={60} /> : stats.enterprise}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <MoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">总授信额度</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {loading ? <Skeleton width={80} /> : formatMoney(stats.totalCredit)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 过滤栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="按名称、编码、联系人搜索"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setPage(0); }}
            sx={{ minWidth: 280, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>会员类型</InputLabel>
            <Select
              value={typeFilter}
              label="会员类型"
              onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="all">全部类型</MenuItem>
              <MenuItem value="individual">普通会员</MenuItem>
              <MenuItem value="vip">VIP 会员</MenuItem>
              <MenuItem value="enterprise">企业会员</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="inactive">停用</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* 会员列表 */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>会员编码</TableCell>
                <TableCell>会员名称</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>联系方式</TableCell>
                <TableCell>类型</TableCell>
                <TableCell align="right">授信额度</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">
                      暂无会员数据，点击右上角"新增会员"开始添加
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map(member => {
                  const typeCfg = CUSTOMER_TYPE_LABELS[member.customer_type] || CUSTOMER_TYPE_LABELS.individual;
                  return (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {member.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 14 }}>
                            {member.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{member.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{member.contact_person || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {member.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}>
                              <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              {member.phone}
                            </Box>
                          )}
                          {member.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}>
                              <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              {member.email}
                            </Box>
                          )}
                          {!member.phone && !member.email && '-'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={typeCfg.label}
                          color={typeCfg.color}
                          variant={member.customer_type === 'vip' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {formatMoney(member.credit_limit || 0)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={member.is_active ? '启用' : '停用'}
                          color={member.is_active ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(member.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="编辑">
                          <IconButton size="small" onClick={() => openEditDialog(member)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteConfirm(member)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredMembers.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
        />
      </Paper>

      {/* 新增/编辑对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editingMember ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
          {editingMember ? '编辑会员' : '新增会员'}
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="会员名称"
                value={formData.name}
                onChange={e => handleFormChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="会员编码"
                placeholder="留空将自动生成"
                value={formData.code}
                onChange={e => handleFormChange('code', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="联系人"
                value={formData.contact_person}
                onChange={e => handleFormChange('contact_person', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="联系电话"
                value={formData.phone}
                onChange={e => handleFormChange('phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={e => handleFormChange('email', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>会员类型</InputLabel>
                <Select
                  value={formData.customer_type}
                  label="会员类型"
                  onChange={e => handleFormChange('customer_type', e.target.value as MemberFormData['customer_type'])}
                >
                  <MenuItem value="individual">普通会员</MenuItem>
                  <MenuItem value="vip">VIP 会员</MenuItem>
                  <MenuItem value="enterprise">企业会员</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="授信额度"
                value={formData.credit_limit}
                onChange={e => handleFormChange('credit_limit', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.is_active ? 'active' : 'inactive'}
                  label="状态"
                  onChange={e => handleFormChange('is_active', e.target.value === 'active')}
                >
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="inactive">停用</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="地址"
                value={formData.address}
                onChange={e => handleFormChange('address', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="备注"
                value={formData.notes}
                onChange={e => handleFormChange('notes', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog} disabled={submitting}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? '保存中…' : (editingMember ? '保存修改' : '创建会员')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除会员 <b>{deleteConfirm?.name}</b> 吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
