import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormLabel,
  TextField,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';

interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  user_type: 'internal' | 'external';
  external_type?: 'customer' | 'supplier' | 'both';
  roles: string[];
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    user_type: 'internal' | 'external';
    external_type: string;
    roles: string[];
  }>({
    name: '',
    phone: '',
    email: '',
    user_type: 'internal',
    external_type: '',
    roles: [],
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 邀请员工相关 state
  const [inviteDialogOpen, setInviteDialogOpen] = useState<boolean>(false);
  const [inviteRoles, setInviteRoles] = useState<number[]>([]);
  const [invitePhone, setInvitePhone] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteResult, setInviteResult] = useState<{
    invite_code: string;
    qr_data: string;
    role_ids: number[];
  } | null>(null);

  // 加载用户和角色数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      // const usersResponse = await apiClient.get('/api/users');
      // const rolesResponse = await apiClient.get('/api/roles');
      
      // 模拟数据
      setUsers([
        {
          id: '1',
          name: '管理员',
          phone: '13800138000',
          email: 'admin@proclaw.com',
          user_type: 'internal',
          roles: ['admin'],
          created_at: '2024-01-01',
        },
        {
          id: '2',
          name: '张三',
          phone: '13900139000',
          user_type: 'internal',
          roles: ['sales'],
          created_at: '2024-01-15',
        },
      ]);

      setRoles([
        { id: 1, name: 'admin', description: '管理员', permissions: ['*'] },
        { id: 2, name: 'sales', description: '销售员', permissions: ['sales_order:create', 'sales_order:read'] },
        { id: 3, name: 'warehouse', description: '仓库员', permissions: ['inventory:read', 'inventory:update'] },
        { id: 4, name: 'finance', description: '财务', permissions: ['finance:read', 'report:read'] },
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      showSnackbar('数据加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        phone: user.phone || '',
        email: user.email || '',
        user_type: user.user_type,
        external_type: user.external_type || '',
        roles: user.roles,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        user_type: 'internal',
        external_type: '',
        roles: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (editingUser) {
        // 更新用户
        // await apiClient.put(`/api/users/${editingUser.id}`, formData);
        showSnackbar('用户更新成功', 'success');
      } else {
        // 创建用户
        // await apiClient.post('/api/users`, formData);
        showSnackbar('用户创建成功', 'success');
      }
      
      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('Failed to save user:', error);
      showSnackbar('保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (_userId: string) => {
    if (!window.confirm('确定要删除此用户吗？')) {
      return;
    }

    try {
      setLoading(true);
      // await apiClient.delete(`/api/users/${userId}`);
      showSnackbar('用户删除成功', 'success');
      loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      showSnackbar('删除失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRoleNames = (userRoles: string[]) => {
    return userRoles
      .map(roleId => {
        const role = roles.find(r => r.name === roleId);
        return role ? role.description || role.name : roleId;
      })
      .join(', ');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon fontSize="large" />
          用户权限管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenInviteDialog}
            sx={{
              borderColor: '#6366f1',
              color: '#6366f1',
              '&:hover': {
                borderColor: '#4f46e5',
                backgroundColor: '#eef2ff',
              },
            }}
          >
            邀请员工
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
              },
            }}
          >
            添加用户
          </Button>
        </Box>
      </Box>

      {/* 用户类型说明 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        内部用户：员工账号（老板、财务、销售等）；外部用户：客户、供应商、同行
      </Alert>

      {/* 用户表格 */}
      <TableContainer component={Box} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>姓名</TableCell>
              <TableCell>电话</TableCell>
              <TableCell>邮箱</TableCell>
              <TableCell>用户类型</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Typography fontWeight={500}>{user.name}</Typography>
                </TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      backgroundColor: user.user_type === 'internal' ? '#e3f2fd' : '#fce4ec',
                      color: user.user_type === 'internal' ? '#1976d2' : '#d32f2f',
                    }}
                  >
                    {user.user_type === 'internal' ? '内部' : '外部'}
                    {user.external_type && `(${user.external_type})`}
                  </Box>
                </TableCell>
                <TableCell>{getRoleNames(user.roles)}</TableCell>
                <TableCell>{user.created_at}</TableCell>
                <TableCell align="right">
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 添加/编辑用户对话框 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? '编辑用户' : '添加用户'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingUser ? '修改用户信息' : '填写用户信息以创建新用户'}
          </DialogContentText>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>姓名 *</FormLabel>
            <TextField
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入姓名"
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>电话</FormLabel>
            <TextField
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入电话号码"
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>邮箱</FormLabel>
            <TextField
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="请输入邮箱地址"
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>用户类型 *</FormLabel>
            <Select
              value={formData.user_type}
              onChange={(e: any) => setFormData({ ...formData, user_type: e.target.value })}
            >
              <MenuItem value="internal">内部用户</MenuItem>
              <MenuItem value="external">外部用户</MenuItem>
            </Select>
          </FormControl>

          {formData.user_type === 'external' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <FormLabel>外部用户类型</FormLabel>
              <Select
                value={formData.external_type}
                onChange={(e: any) => setFormData({ ...formData, external_type: e.target.value })}
              >
                <MenuItem value="customer">客户</MenuItem>
                <MenuItem value="supplier">供应商</MenuItem>
                <MenuItem value="both">客户+供应商</MenuItem>
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>角色</FormLabel>
            <Select
              multiple
              value={formData.roles}
              onChange={(e: any) => setFormData({ ...formData, roles: e.target.value })}
            >
              {roles.map(role => (
                <MenuItem key={role.id} value={role.name}>
                  {role.description || role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 邀请员工对话框 */}
      <Dialog
        open={inviteDialogOpen}
        onClose={handleCloseInviteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeIcon sx={{ color: '#6366f1' }} />
            邀请员工
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            选择员工角色（可多选），生成邀请链接后发送给员工。员工扫码注册后将自动获得对应权限。
          </DialogContentText>

          {/* 角色选择 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>分配角色 *</FormLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {roles.map(role => (
                <Chip
                  key={role.id}
                  label={role.description || role.name}
                  clickable
                  color={inviteRoles.includes(role.id) ? 'primary' : 'default'}
                  variant={inviteRoles.includes(role.id) ? 'filled' : 'outlined'}
                  onClick={() => {
                    if (inviteRoles.includes(role.id)) {
                      setInviteRoles(inviteRoles.filter(id => id !== role.id));
                    } else {
                      setInviteRoles([...inviteRoles, role.id]);
                    }
                  }}
                  sx={{
                    ...(inviteRoles.includes(role.id) && {
                      backgroundColor: '#6366f1',
                      color: '#fff',
                      '&:hover': { backgroundColor: '#4f46e5' },
                    }),
                  }}
                />
              ))}
            </Box>
          </FormControl>

          {/* 手机号输入（可选）*/}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>员工手机号（选填）</FormLabel>
            <TextField
              fullWidth
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="填写后仅该手机号可接受邀请"
              size="small"
              sx={{ mt: 1 }}
            />
          </FormControl>

          {/* 邀请结果展示 */}
          {inviteResult && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>邀请已生成</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <QRCodeCanvas
                  value={inviteResult.qr_data}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </Box>
              <TextField
                fullWidth
                value={inviteResult.qr_data}
                InputProps={{ readOnly: true }}
                size="small"
                sx={{ mb: 1 }}
              />
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(inviteResult.qr_data);
                  showSnackbar('链接已复制', 'success');
                }}
              >
                复制邀请链接
              </Button>
            </Box>
          )}

          {/* 加载状态 */}
          {inviteLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInviteDialog}>关闭</Button>
          {!inviteResult && (
            <Button
              onClick={handleCreateInvite}
              variant="contained"
              disabled={inviteLoading || inviteRoles.length === 0}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                },
              }}
            >
              {inviteLoading ? '生成中...' : '生成邀请'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* ========== 邀请员工相关函数 ========== */

const handleOpenInviteDialog = () => {
  setInviteRoles([]);
  setInvitePhone('');
  setInviteResult(null);
  setInviteDialogOpen(true);
};

const handleCloseInviteDialog = () => {
  setInviteDialogOpen(false);
  setInviteResult(null);
};

const handleCreateInvite = async () => {
  if (inviteRoles.length === 0) {
    showSnackbar('请至少选择一个角色', 'error');
    return;
  }

  setInviteLoading(true);
  try {
    // 调用后端 API 创建员工邀请
    const response = await fetch('/api/invitations/create_employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role_ids: inviteRoles,
        target_phone: invitePhone || null,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '创建邀请失败');
    }

    setInviteResult({
      invite_code: data.invite_code,
      qr_data: data.qr_data,
      role_ids: data.role_ids,
    });
    showSnackbar('邀请已生成', 'success');
  } catch (error: any) {
    console.error('Failed to create invitation:', error);
    showSnackbar(error.message || '创建邀请失败', 'error');
  } finally {
    setInviteLoading(false);
  }
};

export default UserManagementPage;
