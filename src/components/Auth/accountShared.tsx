/**
 * v13.1.1 本地账号模块共享工具与组件
 *
 * 三个页面（NoUserWelcome / SidebarAccount / SettingsAccountTab / RegisterPage）
 * 都需要：role 标签、暗黑输入框样式、账号列表卡、创建账号表单
 * 抽到此处统一维护，避免重复
 */

import { useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemButton, ListItemText, TextField, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useAuthStore, LocalUser, deleteLocalAccount } from '../../lib/authStore';
import { isDemoAccountUser, isTestJunkAccount } from './loginAccounts';

// ========== 角色标签（多角色支持）==========

/**
 * 把 GROUP_CONCAT 返回的 "boss|user" 这类多角色字符串转成展示文案
 * 未来扩展多角色时不用改 UI
 */
export const roleLabel = (role: string): string => {
  if (!role) return '本地用户';
  return role
    .split('|')
    .filter(Boolean)
    .map(r => (r === 'boss' ? '老板' : '本地用户'))
    .join(' / ');
};

/** 角色是否含 'boss'（用于头像/Chip 着色） */
export const isBoss = (role: string): boolean =>
  role.split('|').filter(Boolean).includes('boss');

// ========== 共享样式 ==========

export const darkFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.05)',
    '& fieldset': { borderColor: '#444' },
    '&:hover fieldset': { borderColor: '#666' },
    '&.Mui-focused fieldset': { borderColor: '#ff3b30' },
  },
  '& .MuiInputBase-input': { color: '#fff', fontSize: '15px' },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
};

export const lightFieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'white',
    '& fieldset': { borderColor: '#ddd' },
    '&:hover fieldset': { borderColor: '#999' },
    '&.Mui-focused fieldset': { borderColor: '#666' },
  },
  '& .MuiInputBase-input': { color: '#333', fontSize: '15px' },
};

// ========== 密码强度 ==========

export interface PasswordCheck {
  ok: boolean;
  level: 'weak' | 'medium' | 'strong';
  hint: string;
}

/**
 * 前端弱校验（≥8 位 + 含数字 + 含字母）
 * 实际安全靠 Rust 端 argon2 + keyring OS 保护
 */
export function checkPasswordStrength(pwd: string): PasswordCheck {
  if (!pwd) return { ok: false, level: 'weak', hint: '' };
  if (pwd.length < 6) return { ok: false, level: 'weak', hint: '密码至少 6 位' };
  const hasLetter = /[A-Za-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
  if (pwd.length < 8 || !hasLetter || !hasDigit) {
    return { ok: false, level: 'weak', hint: '建议 ≥8 位且含字母+数字' };
  }
  if (pwd.length >= 12 && hasLetter && hasDigit && hasSymbol) {
    return { ok: true, level: 'strong', hint: '强' };
  }
  return { ok: true, level: 'medium', hint: '中' };
}

// ========== 账号列表卡 ==========

interface AccountListCardProps {
  /** null 表示"无当前账号（首次启动场景）" */
  currentUserId: string | null;
  accounts: LocalUser[];
  isLoading?: boolean;
  onSwitch: (accountId: string) => void;
  /** 留空则不渲染删除按钮 */
  onDelete?: (accountId: string, displayName: string) => void;
  /** 是否显示"管理账号"标题（v13.1.1 首次启动时隐藏） */
  showHeader?: boolean;
}

export function AccountListCard({
  currentUserId,
  accounts,
  isLoading,
  onSwitch,
  onDelete,
  showHeader = true,
}: AccountListCardProps) {
  const [showTests, setShowTests] = useState(false);
  const demoAccounts = accounts.filter(isDemoAccountUser);
  const primaryAccounts = accounts.filter(
    account => !isDemoAccountUser(account) && !isTestJunkAccount(account),
  );
  const testAccounts = accounts.filter(isTestJunkAccount);
  const visibleAccounts = [
    ...demoAccounts,
    ...primaryAccounts,
    ...(showTests ? testAccounts : []),
  ];

  return (
    <Card sx={{ mb: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
      <CardContent>
        {showHeader && (
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            切换账号（{accounts.length} 个）
          </Typography>
        )}
        {accounts.length === 0 ? (
          <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255,255,255,0.4)' }}>
            加载中...
          </Typography>
        ) : (
          <List sx={{ mt: showHeader ? 1 : 0 }}>
            {visibleAccounts.map(acc => {
              const isCurrent = acc.id === currentUserId;
              return (
                <ListItem
                  key={acc.id}
                  disablePadding
                  secondaryAction={
                    isCurrent ? (
                      <CheckCircleIcon sx={{ color: '#10B981' }} />
                    ) : onDelete ? (
                      <Button
                        size="small"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={e => {
                          e.stopPropagation();
                          const name = acc.name || acc.email || acc.id;
                          if (window.confirm(`确认删除本地账号「${name}」？\n该操作不可撤销（密码会从系统凭据库移除）。`)) {
                            onDelete(acc.id, name);
                          }
                        }}
                        sx={{
                          color: '#ef4444',
                          minWidth: 0,
                          px: 1,
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
                        }}
                      >
                        删除
                      </Button>
                    ) : null
                  }
                >
                  <ListItemButton
                    onClick={() => !isCurrent && onSwitch(acc.id)}
                    disabled={isCurrent || isLoading}
                    sx={{
                      borderRadius: 1,
                      pr: onDelete ? 8 : 2,
                      '&:hover': { bgcolor: isCurrent ? 'transparent' : 'rgba(255,255,255,0.04)' },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: isBoss(acc.role) ? '#FF3B30' : '#6366F1',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                        }}
                      >
                        {(acc.name || acc.email || acc.id).charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={acc.name || acc.email || acc.id}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={roleLabel(acc.role)}
                            size="small"
                            sx={{
                              bgcolor: isBoss(acc.role)
                                ? 'rgba(255,59,48,0.15)'
                                : 'rgba(99,102,241,0.15)',
                              color: isBoss(acc.role) ? '#ff8a80' : '#a5b4fc',
                              fontSize: '0.65rem',
                              height: 18,
                            }}
                          />
                          {isDemoAccountUser(acc) && (
                            <Chip
                              label="演示"
                              size="small"
                              sx={{
                                bgcolor: 'rgba(255,59,48,0.2)',
                                color: '#ff8a80',
                                fontSize: '0.65rem',
                                height: 18,
                              }}
                            />
                          )}
                          {acc.email && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              {acc.email}
                            </Typography>
                          )}
                        </Box>
                      }
                      primaryTypographyProps={{ fontSize: '0.9rem', color: '#fff' }}
                      // MUI 默认把 secondary 渲染为 <p>（Typography body2），里面含 <Chip>（div）会触发
                      // validateDOMNesting "div cannot appear as a descendant of p"。改用 div 元素消除警告。
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    {!isCurrent && <SwapHorizIcon sx={{ color: 'rgba(255,255,255,0.4)', ml: 1 }} />}
                  </ListItemButton>
                </ListItem>
              );
            })}
            {testAccounts.length > 0 && !showTests && (
              <ListItem>
                <Button
                  size="small"
                  onClick={() => setShowTests(true)}
                  sx={{ color: 'rgba(255,255,255,0.55)', textTransform: 'none' }}
                >
                  当前有 {testAccounts.length} 个测试账号，点击展开
                </Button>
              </ListItem>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 创建账号表单 ==========

interface CreateAccountFormProps {
  /** 暗黑底（侧栏/设置）还是亮底（LoginPage） */
  theme?: 'dark' | 'light';
  /** 显示名字段是否隐藏（NoUserWelcome 模式隐藏，节省一栏） */
  showDisplayName?: boolean;
}

export function CreateAccountForm({
  theme = 'dark',
  showDisplayName = true,
}: CreateAccountFormProps) {
  const { registerLocal, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const fieldSx = theme === 'dark' ? darkFieldSx : lightFieldSx;
  const pwdCheck = checkPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('请填写邮箱和密码');
      return;
    }
    if (!pwdCheck.ok) {
      setLocalError(pwdCheck.hint);
      return;
    }

    try {
      await registerLocal(email, password, displayName || undefined);
      setEmail('');
      setPassword('');
      setDisplayName('');
      // 不需手动 navigate：registerLocal 已 set user，父级 React 会自动重渲染
      //   - ProtectedRoute 包裹的页面：路由切到目标页
      //   - PUBLIC 页面（LoginPage）：因 P0-2 修复，已被 Navigate 替换
    } catch (err: any) {
      setLocalError(err?.message || '创建账号失败');
    }
  };

  return (
    <>
      {(error || localError) && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => {
            clearError();
            setLocalError(null);
          }}
        >
          {error || localError}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="邮箱"
          type="email"
          required
          size="small"
          value={email}
          onChange={e => setEmail(e.target.value)}
          sx={{ mb: 2, ...fieldSx }}
        />
        <TextField
          fullWidth
          label="密码（≥ 8 位，含字母+数字）"
          type="password"
          required
          size="small"
          value={password}
          onChange={e => setPassword(e.target.value)}
          helperText={
            password && pwdCheck.hint
              ? `强度：${pwdCheck.level === 'weak' ? '弱' : pwdCheck.level === 'medium' ? '中' : '强'} · ${pwdCheck.hint}`
              : ' '
          }
          FormHelperTextProps={{
            sx: {
              color: !password
                ? 'rgba(255,255,255,0.4)'
                : pwdCheck.level === 'weak'
                ? '#ef4444'
                : pwdCheck.level === 'medium'
                ? '#fbbf24'
                : '#10B981',
              fontSize: '0.7rem',
            },
          }}
          sx={{ mb: showDisplayName ? 1 : 3, ...fieldSx }}
        />
        {showDisplayName && (
          <TextField
            fullWidth
            label="显示名（可选）"
            size="small"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            sx={{ mb: 3, ...fieldSx }}
          />
        )}
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<AddCircleOutlineIcon />}
          disabled={isLoading}
          fullWidth
          sx={{
            bgcolor: '#ff3b30',
            '&:hover': { bgcolor: '#d32f2f' },
            '&.Mui-disabled': { bgcolor: '#555' },
            textTransform: 'none',
            fontWeight: 600,
            py: 1.2,
          }}
        >
          {isLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : '创建并激活'}
        </Button>
      </form>
    </>
  );
}

// ========== 删除账号（统一入口）==========

/**
 * 删除账号：SQLite + keyring + store 列表 + 必要时的活跃账号清理
 * 给 UI 层用，内部已包含 catch
 */
export async function handleDeleteAccount(
  accountId: string,
  displayName: string,
  onAfter?: () => void,
): Promise<void> {
  try {
    await deleteLocalAccount(accountId);
    if (onAfter) onAfter();
  } catch (err: any) {
    window.alert(`删除「${displayName}」失败：${err?.message || err}`);
  }
}
