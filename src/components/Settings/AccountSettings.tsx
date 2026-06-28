/**
 * PRD v13.0 §5.2 设置中心「账号」Tab
 *
 * 6 个子区：
 *  1. 当前身份卡片
 *  2. 登录框（邮箱密码 + OIDC + 本地账号）
 *  3. 本地账号管理（创建/切换/删除）
 *  4. 数据归属迁移（首次登录后触发）
 *  5. 会话设置（7 天免登录）
 *  6. 关于离线模式
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  LockOpen as LockOpenIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Science as ScienceIcon,
  SwapHoriz as SwapIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuthStore, IdentityState, LocalAccount } from '../../lib/authStore';
import { getPasswordStorage } from '../../lib/passwordStorage';

const STATE_META: Record<IdentityState, { label: string; bg: string; chipColor: any; description: string }> = {
  offline: { label: '离线访客', bg: '#F5F5F5', chipColor: 'default', description: '未登录，所有数据保存在本地' },
  local: { label: '本地账号', bg: '#E3F2FD', chipColor: 'primary', description: '桌面端独占凭证，不依赖云端' },
  premium: { label: '增值账号', bg: '#FFF3E0', chipColor: 'warning', description: '云端能力已解锁：云备份 / AI Team / Token / 营销站' },
  demo: { label: '演示账号', bg: '#F3E5F5', chipColor: 'secondary', description: '演示数据已注入，5 分钟可上手' },
};

const SESSION_KEY = 'proclaw:remember-login';

export default function AccountSettings() {
  const [searchParams] = useSearchParams();
  const {
    user,
    localAccount,
    identityState,
    isLoading,
    error,
    login,
    logout,
    createLocalAccount,
    switchLocalAccount,
    listLocalAccounts,
    logoutLocal,
    clearError,
  } = useAuthStore();

  // 子区 2：登录框
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 子区 3：本地账号管理
  const [newLocalUsername, setNewLocalUsername] = useState('');
  const [newLocalDisplayName, setNewLocalDisplayName] = useState('');
  // v13.1：可选密码（向后兼容 v13.0 无密码账号）
  const [newLocalPassword, setNewLocalPassword] = useState('');
  const [newLocalPasswordConfirm, setNewLocalPasswordConfirm] = useState('');
  const [showLocalPassword, setShowLocalPassword] = useState(false);
  const [localAccounts, setLocalAccounts] = useState<LocalAccount[]>([]);
  const [localFormError, setLocalFormError] = useState<string | null>(null);

  // 子区 5：会话设置
  const [rememberLogin, setRememberLogin] = useState(() => {
    return localStorage.getItem(SESSION_KEY) !== 'false';
  });

  const meta = STATE_META[identityState];

  useEffect(() => {
    setLocalAccounts(listLocalAccounts());
  }, [listLocalAccounts, identityState, localAccount]);

  // 处理 ?tab=account 自动滚动到登录框（侧边栏点击触发）
  useEffect(() => {
    if (searchParams.get('scrollTo') === 'login') {
      const el = document.getElementById('account-settings-login');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, [searchParams]);

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password) return;
    try {
      await login(email.trim(), password);
    } catch {
      /* 错误已存 store */
    }
  };

  const handleQuickDemo = async () => {
    clearError();
    try {
      await login('boss', import.meta.env.VITE_MOCK_PASSWORD || 'IamBigBoss');
    } catch {
      /* 错误已存 store */
    }
  };

  const handleCreateLocal = async () => {
    setLocalFormError(null);
    // v13.1：密码一致性校验
    if (newLocalPassword && newLocalPassword !== newLocalPasswordConfirm) {
      setLocalFormError('两次输入的密码不一致');
      return;
    }
    if (newLocalPassword && newLocalPassword.length < 4) {
      setLocalFormError('密码至少 4 位');
      return;
    }
    try {
      const acc = await createLocalAccount(
        newLocalUsername,
        newLocalPassword || undefined,
        newLocalDisplayName,
      );
      setNewLocalUsername('');
      setNewLocalDisplayName('');
      setNewLocalPassword('');
      setNewLocalPasswordConfirm('');
      setLocalAccounts(listLocalAccounts());
      // 提示：自动切到新账号
      return acc;
    } catch (e: any) {
      setLocalFormError(e?.message || '创建失败');
    }
  };

  const handleSwitchLocal = async (id: string) => {
    setLocalFormError(null);
    try {
      await switchLocalAccount(id);
    } catch (e: any) {
      setLocalFormError(e?.message || '切换失败');
    }
  };

  const handleRemoveLocal = async (id: string) => {
    setLocalAccounts(prev => {
      const next = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem('proclaw-local-accounts', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    // v13.1：同时清掉 PasswordStorage 里的 hash
    try {
      await getPasswordStorage().delete(id);
    } catch {
      /* ignore */
    }
  };

  const handleLogout = async () => {
    if (identityState === 'local') {
      await logoutLocal();
    } else {
      await logout();
    }
  };

  const handleRememberChange = (val: boolean) => {
    setRememberLogin(val);
    try {
      localStorage.setItem(SESSION_KEY, String(val));
    } catch {
      /* ignore */
    }
  };

  return (
    <Stack spacing={3}>
      {/* ========== 子区 1：当前身份卡片 ========== */}
      <Card sx={{ backgroundColor: meta.bg, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: identityState === 'offline' ? '#9E9E9E' : identityState === 'demo' ? '#9C27B0' : '#2196F3',
                fontSize: '1.5rem',
                fontWeight: 700,
              }}
            >
              {identityState === 'offline' ? <LockOpenIcon /> : <PersonIcon />}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  当前身份：{meta.label}
                </Typography>
                <Chip
                  label={meta.label}
                  size="small"
                  color={meta.chipColor}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {meta.description}
              </Typography>
              {user && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  邮箱：{user.email || user.id}
                </Typography>
              )}
              {localAccount && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  用户名：{localAccount.username}
                  {localAccount.displayName !== localAccount.username && `（${localAccount.displayName}）`}
                </Typography>
              )}
            </Box>
            {(identityState === 'premium' || identityState === 'demo' || identityState === 'local') && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                disabled={isLoading}
              >
                退出
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ========== 子区 2：登录框 ========== */}
      <Paper id="account-settings-login" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          🔐 升级为增值账号
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          登录后解锁云备份、AI Team 群聊、Token 计费、多端同步等云端能力。本地数据 100% 保留。
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="邮箱"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            size="small"
            fullWidth
            disabled={isLoading}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <TextField
            label="密码"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            size="small"
            fullWidth
            disabled={isLoading}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && <Alert severity="error" onClose={clearError}>{error}</Alert>}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={16} /> : <LoginIcon />}
              onClick={handleLogin}
              disabled={isLoading || !email || !password}
              fullWidth
            >
              登录
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ScienceIcon />}
              onClick={handleQuickDemo}
              disabled={isLoading}
            >
              演示账号
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            提示：演示账号用户名 <code>boss</code>，密码 <code>IamBigBoss</code>，登录后会自动注入测试数据。
          </Typography>
        </Stack>
      </Paper>

      {/* ========== 子区 3：本地账号管理 ========== */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          👤 本地账号管理
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          在同一台电脑上创建多个本地账号，每个账号的数据相互隔离。
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            label="用户名"
            name="local-username"
            size="small"
            value={newLocalUsername}
            onChange={e => setNewLocalUsername(e.target.value)}
            disabled={isLoading}
            sx={{ flex: 1 }}
          />
          <TextField
            label="显示名（可选）"
            name="local-displayName"
            size="small"
            value={newLocalDisplayName}
            onChange={e => setNewLocalDisplayName(e.target.value)}
            disabled={isLoading}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateLocal}
            disabled={isLoading || !newLocalUsername.trim()}
          >
            创建
          </Button>
        </Stack>

        {/* v13.1：可选密码（bcrypt 哈希后存 PasswordStorage） */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            label="密码（可选，v13.1 推荐）"
            name="local-password"
            type={showLocalPassword ? 'text' : 'password'}
            size="small"
            value={newLocalPassword}
            onChange={e => setNewLocalPassword(e.target.value)}
            disabled={isLoading}
            sx={{ flex: 1 }}
            helperText="留空则无密码（兼容 v13.0 行为）"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowLocalPassword(!showLocalPassword)}>
                    {showLocalPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="确认密码"
            name="local-password-confirm"
            type={showLocalPassword ? 'text' : 'password'}
            size="small"
            value={newLocalPasswordConfirm}
            onChange={e => setNewLocalPasswordConfirm(e.target.value)}
            disabled={isLoading}
            sx={{ flex: 1 }}
          />
        </Stack>

        {localFormError && <Alert severity="error" sx={{ mb: 2 }}>{localFormError}</Alert>}

        {localAccounts.length === 0 ? (
          <Alert severity="info">尚未创建任何本地账号</Alert>
        ) : (
          <List dense>
            {localAccounts.map(acc => {
              const isCurrent = localAccount?.id === acc.id;
              return (
                <ListItem
                  key={acc.id}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      {!isCurrent && (
                        <Tooltip title="切换到此账号">
                          <IconButton edge="end" size="small" onClick={() => handleSwitchLocal(acc.id)}>
                            <SwapIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="删除本地账号（不影响其他账号）">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveLocal(acc.id)}
                          disabled={isCurrent}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#2196F3', width: 32, height: 32 }}>
                      {acc.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {acc.username}
                        {isCurrent && <Chip label="当前" size="small" color="primary" />}
                      </Box>
                    }
                    secondary={acc.displayName !== acc.username ? acc.displayName : undefined}
                  />
                </ListItem>
              );
            })}
          </List>
        )}

        <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 2 }}>
          提示：MVP 版本本地账号数据存于浏览器 localStorage，v13.1 升级为 Tauri Keyring 加密（更安全）。
        </Alert>
      </Paper>

      {/* ========== 子区 4：数据归属迁移 ========== */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          🔄 数据归属迁移
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          首次登录为增值账号时，可选择「保留本地数据并绑定云端」或「全新云端数据」。
        </Typography>
        {identityState === 'premium' ? (
          <Alert severity="success" icon={<CheckIcon />}>
            已完成数据归属迁移。本地数据 owner_id 已绑定到 <code>{user?.email || user?.id}</code>。
          </Alert>
        ) : identityState === 'demo' ? (
          <Alert severity="info">
            演示账号下，数据归属迁移功能不可用。退出演示账号后再登录增值账号可触发迁移流程。
          </Alert>
        ) : (
          <Alert severity="info">
            暂未触发数据迁移。首次登录增值账号时会自动弹出迁移对话框。
          </Alert>
        )}
      </Paper>

      {/* ========== 子区 5：会话设置 ========== */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          🔒 会话设置
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={rememberLogin}
                onChange={e => handleRememberChange(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  记住登录 7 天
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  关闭后关闭应用即退出登录（关窗即丢 token）
                </Typography>
              </Box>
            }
          />
        </Stack>
      </Paper>

      {/* ========== 子区 6：关于离线模式 ========== */}
      <Paper sx={{ p: 3, borderRadius: 2, backgroundColor: '#FAFAFA' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          ℹ️ 关于离线模式
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          ProClaw 桌面端支持<strong>离线优先</strong>使用：商品、销售、库存、客户、媒体库、AI 助手（本地规则回退）等核心功能在未登录时即可使用。
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          登录仅用于解锁<strong>云端增值能力</strong>：云备份、AI Team 群聊、Token 计费、营销站绑定、多端同步。详细功能矩阵参见
          <a href="#" onClick={e => { e.preventDefault(); window.open('https://github.com/proclaw/proclaw/blob/main/docs/prd/architecture/%E9%9C%80%E6%B1%82%E6%96%87%E6%A1%A3%EF%BC%9AProClaw%20%E6%A1%8C%E9%9D%A2%E7%AB%AF%E7%A6%BB%E7%BA%BF%E4%BC%98%E5%85%88%E4%B8%8E%E6%9C%AC%E5%9C%B0%E8%B4%A6%E5%8F%B7%E4%BD%93%E7%B3%BB%EF%BC%88PRD%20v13.0%EF%BC%89.md', '_blank'); }}>
            {' '}PRD v13.0 文档
          </a>。
        </Typography>
      </Paper>
    </Stack>
  );
}
