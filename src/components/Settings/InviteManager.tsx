import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuthStore } from '../../lib/authStore';
import {
  createInvitation,
  getInvitationStatusLabel,
  getInvitationTypeLabel,
  getInvitations,
  type InvitationData,
} from '../../lib/invitationService';
import {
  createEmployeeInvitation,
  fetchUsersAndRoles,
  type ManagedRole,
} from '../../lib/userManagementService';
import { ipcInvoke, isTauri } from '../../lib/tauri';

type InviteKind = 'business' | 'employee';

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

function inviteLink(code: string, qrData?: string): string {
  if (qrData) return qrData;
  return `proclaw://invite?code=${encodeURIComponent(code)}`;
}

async function resolveInviterId(): Promise<string> {
  if (isTauri()) {
    const current = await ipcInvoke<{ id?: string; error?: string }>('get_current_user_cmd');
    if (current?.id && !current.error) return current.id;
  }
  const userId = useAuthStore.getState().user?.id;
  if (userId) return userId;
  throw new Error('无法获取当前用户，请先登录');
}

export default function InviteManager() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [kind, setKind] = useState<InviteKind>('business');
  const [invitationType, setInvitationType] = useState<'order_share' | 'price_update'>('order_share');
  const [phone, setPhone] = useState('');
  const [businessRef, setBusinessRef] = useState('');
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [roleId, setRoleId] = useState<number | ''>('');
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const inviterId = await resolveInviterId();
      const list = await getInvitations(inviterId);
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载邀请列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (kind !== 'employee' || roles.length > 0) return;
    let cancelled = false;
    fetchUsersAndRoles()
      .then(data => {
        if (!cancelled) setRoles(data.roles);
      })
      .catch(() => {
        if (!cancelled) setError('加载角色失败');
      });
    return () => {
      cancelled = true;
    };
  }, [kind, roles.length]);

  const handleCopy = async (text: string) => {
    try {
      await copyText(text);
      setNotice('邀请链接已复制');
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制失败');
    }
  };

  const handleCreate = async () => {
    setError(null);
    setNotice(null);
    setCreatedLink(null);
    if (kind === 'business' && !businessRef.trim()) {
      setError('请填写业务单号或商品引用');
      return;
    }
    if (kind === 'employee' && roleId === '') {
      setError('请选择角色');
      return;
    }
    setCreating(true);
    try {
      if (kind === 'employee') {
        const result = await createEmployeeInvitation([roleId as number], phone.trim() || undefined);
        const link = inviteLink(result.invite_code, result.qr_data);
        setCreatedLink(link);
        setNotice('员工邀请已生成');
      } else {
        const inviterId = await resolveInviterId();
        const result = await createInvitation({
          invitation_type: invitationType,
          business_ref_id: businessRef.trim(),
          target_phone: phone.trim() || undefined,
          inviter_id: inviterId,
        });
        const link = inviteLink(result.invite_code, result.qr_data);
        setCreatedLink(link);
        setNotice('邀请已生成');
      }
      setPhone('');
      setBusinessRef('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成邀请失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            生成邀请
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            被邀请人按手机号识别。业务邀请走现有邀请接口；按角色邀请员工会生成带角色的邀请链接。
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>邀请方式</InputLabel>
              <Select
                label="邀请方式"
                value={kind}
                onChange={e => setKind(e.target.value as InviteKind)}
              >
                <MenuItem value="business">业务邀请</MenuItem>
                <MenuItem value="employee">按角色邀请员工</MenuItem>
              </Select>
            </FormControl>
            {kind === 'business' ? (
              <FormControl fullWidth>
                <InputLabel>邀请类型</InputLabel>
                <Select
                  label="邀请类型"
                  value={invitationType}
                  onChange={e => setInvitationType(e.target.value as 'order_share' | 'price_update')}
                >
                  <MenuItem value="order_share">订单分享</MenuItem>
                  <MenuItem value="price_update">价格更新</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth>
                <InputLabel>角色</InputLabel>
                <Select
                  label="角色"
                  value={roleId === '' ? '' : String(roleId)}
                  onChange={e => setRoleId(Number(e.target.value))}
                >
                  {roles.map(role => (
                    <MenuItem key={role.id} value={String(role.id)}>
                      {role.description || role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="被邀请人手机号"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="选填，用于指定被邀请人"
              fullWidth
            />
            {kind === 'business' && (
              <TextField
                label="业务单号或商品引用 *"
                value={businessRef}
                onChange={e => setBusinessRef(e.target.value)}
                placeholder="例如 PO-2024-001"
                fullWidth
                required
              />
            )}
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => void handleCreate()} disabled={creating}>
                {creating ? '生成中…' : '生成邀请'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/user-management')}>
                前往用户管理
              </Button>
            </Stack>
            {createdLink && (
              <Alert
                severity="success"
                action={
                  <Button color="inherit" size="small" startIcon={<ContentCopyIcon />} onClick={() => void handleCopy(createdLink)}>
                    复制链接
                  </Button>
                }
              >
                {createdLink}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>邀请列表</Typography>
            <Button size="small" onClick={() => void load()} disabled={loading}>
              {loading ? '加载中…' : '刷新'}
            </Button>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>被邀请人</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>时间</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">{loading ? '加载中…' : '暂无邀请'}</Typography>
                    </TableCell>
                  </TableRow>
                ) : rows.map(row => {
                  const link = inviteLink(row.invite_code);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.target_phone || '未指定'}</TableCell>
                      <TableCell>{getInvitationTypeLabel(row.invitation_type)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={getInvitationStatusLabel(row.status)} />
                      </TableCell>
                      <TableCell>{new Date(row.created_at).toLocaleString('zh-CN')}</TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => void handleCopy(link)}>
                          复制链接
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              列表中的链接由邀请码还原。刚生成的员工邀请请优先复制上方带类型参数的链接。
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
