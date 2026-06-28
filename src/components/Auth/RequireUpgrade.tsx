/**
 * PRD v13.0 §9 增值能力拦截组件
 *
 * 用于离线访客 / 本地账号访问「云端增值能力」时给出中性引导文案，
 * 不使用错误/禁用措辞，引导到设置中心账号 Tab 完成登录。
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudIcon,
  Groups as TeamIcon,
  Token as TokenIcon,
  Language as MarketingIcon,
  Sync as SyncIcon,
  PersonAdd as InviteIcon,
  Extension as PluginIcon,
  LockOpen as UnlockIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../lib/authStore';

type Feature =
  | 'cloud-backup'
  | 'ai-team'
  | 'token'
  | 'marketing'
  | 'sync'
  | 'invitation'
  | 'plugin-store';

const FEATURE_META: Record<
  Feature,
  { title: string; subtitle: string; icon: React.ReactNode; chipLabel: string }
> = {
  'cloud-backup': {
    title: '解锁云端备份',
    subtitle: '把本地数据安全同步到云端，电脑损坏也不怕丢失',
    icon: <CloudIcon />,
    chipLabel: '云备份',
  },
  'ai-team': {
    title: '解锁 AI Team 群聊',
    subtitle: '与多个 AI Agent 协作，自动运营你的生意',
    icon: <TeamIcon />,
    chipLabel: 'AI Team',
  },
  token: {
    title: '解锁 Token 计费',
    subtitle: '充值 Token，按量使用高级 AI 能力',
    icon: <TokenIcon />,
    chipLabel: 'Token',
  },
  marketing: {
    title: '同步到营销网站',
    subtitle: '把商品 / 活动一键发布到 proclaw.cc 个人主页',
    icon: <MarketingIcon />,
    chipLabel: '营销站',
  },
  sync: {
    title: '开启多端同步',
    subtitle: '手机 / 平板 / 电脑共享数据，随时随地办公',
    icon: <SyncIcon />,
    chipLabel: '多端',
  },
  invitation: {
    title: '邀请员工 / 伙伴',
    subtitle: '给团队成员开通账号，分配权限',
    icon: <InviteIcon />,
    chipLabel: '协作',
  },
  'plugin-store': {
    title: '浏览插件商店',
    subtitle: '8 大行业插件 + 第三方 FlowHub 插件',
    icon: <PluginIcon />,
    chipLabel: '插件',
  },
};

/**
 * 拦截入口组件（用于包裹受保护 children）
 * 离线访客身份访问时：弹出对话框引导登录
 */
export function RequireUpgrade({
  feature,
  children,
  fallbackVariant = 'inline',
}: {
  feature: Feature;
  children: React.ReactNode;
  fallbackVariant?: 'inline' | 'dialog' | 'redirect';
}) {
  const { identityState, openRequireUpgrade } = useAuthStore();

  // premium / demo 已登录可访问
  if (identityState === 'premium' || identityState === 'demo') {
    return <>{children}</>;
  }

  // local 账号无云端能力，等同于 offline
  if (fallbackVariant === 'redirect') {
    // 静默跳设置中心
    if (typeof window !== 'undefined') {
      openRequireUpgrade(feature);
    }
    return null;
  }

  if (fallbackVariant === 'dialog') {
    return (
      <>
        {children}
        <UpgradeDialog feature={feature} onClose={() => {}} autoOpen />
      </>
    );
  }

  // inline 横幅
  return (
    <Box>
      <UpgradeBanner feature={feature} />
      <Box sx={{ opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(0.4)' }}>
        {children}
      </Box>
    </Box>
  );
}

/** 横幅提示（用于 inline 模式） */
function UpgradeBanner({ feature }: { feature: Feature }) {
  const meta = FEATURE_META[feature];
  const navigate = useNavigate();
  const { openRequireUpgrade } = useAuthStore();
  return (
    <Alert
      severity="info"
      icon={meta.icon}
      sx={{
        mb: 2,
        backgroundColor: '#FFF8E1',
        border: '1px solid #FFE082',
      }}
      action={
        <Button
          color="inherit"
          size="small"
          startIcon={<UnlockIcon />}
          onClick={() => {
            openRequireUpgrade(feature);
            navigate('/settings?tab=account');
          }}
        >
          立即升级
        </Button>
      }
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {meta.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {meta.subtitle}
      </Typography>
    </Alert>
  );
}

/**
 * 软提示条（页面顶部 Banner，可关闭，children 仍可见可交互）
 * PRD v13.0 §6 核心决策：离线访客可用 AI Team 本地回退，仅云端能力需登录。
 *
 * 用法：
 *   const [showBanner, setShowBanner] = useState(true);
 *   {showBanner && <SoftBanner feature="ai-team" onClose={() => setShowBanner(false)} />}
 *
 * 与 UpgradeBanner 的区别：
 *  - SoftBanner 由父组件控制可见性（避免 useEffect 循环）
 *  - children 不强制灰化（本页面仍可正常浏览本地内容）
 *  - 提供「升级」跳设置中心 + 「关闭」按钮
 */
export function SoftBanner({ feature, onClose }: { feature: Feature; onClose: () => void }) {
  const meta = FEATURE_META[feature];
  const navigate = useNavigate();
  const { openRequireUpgrade } = useAuthStore();
  return (
    <Alert
      severity="warning"
      role="alert"
      icon={meta.icon}
      sx={{
        mb: 2,
        backgroundColor: '#FFF8E1',
        border: '1px solid #FFE082',
        '& .MuiAlert-message': { width: '100%' },
      }}
      action={
        <Stack direction="row" spacing={1}>
          <Button
            color="warning"
            size="small"
            variant="contained"
            startIcon={<UnlockIcon />}
            onClick={() => {
              openRequireUpgrade(feature);
              navigate('/settings?tab=account');
            }}
          >
            升级解锁
          </Button>
          <Button color="inherit" size="small" onClick={onClose}>
            知道了
          </Button>
        </Stack>
      }
      onClose={onClose}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {meta.title}（本地回退模式）
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {meta.subtitle}。登录后可解锁云端能力，本地数据 100% 保留。
      </Typography>
    </Alert>
  );
}

/** 弹窗对话框（用于 dialog 模式 + 全局拦截） */
export function UpgradeDialog({
  feature,
  onClose,
  autoOpen = false,
}: {
  feature: Feature;
  onClose: () => void;
  autoOpen?: boolean;
}) {
  const navigate = useNavigate();
  const {
    requireUpgradeOpen,
    requireUpgradeFeature,
    closeRequireUpgrade,
    identityState,
  } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const effectiveFeature = (autoOpen ? feature : requireUpgradeFeature) as Feature | null;
  const open = autoOpen || requireUpgradeOpen;

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setLocalError(null);
      setSubmitting(false);
    }
  }, [open]);

  // 已经是 premium / demo，自动关闭
  useEffect(() => {
    if ((identityState === 'premium' || identityState === 'demo') && requireUpgradeOpen) {
      closeRequireUpgrade();
    }
  }, [identityState, requireUpgradeOpen, closeRequireUpgrade]);

  if (!effectiveFeature) return null;
  const meta = FEATURE_META[effectiveFeature];

  const handleClose = () => {
    if (autoOpen) onClose();
    else closeRequireUpgrade();
  };

  const handleQuickLogin = async () => {
    setSubmitting(true);
    setLocalError(null);
    try {
      const { login } = useAuthStore.getState();
      await login('boss', import.meta.env.VITE_MOCK_PASSWORD || 'IamBigBoss');
      handleClose();
    } catch (e: any) {
      setLocalError(e?.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setLocalError('请输入邮箱和密码');
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      const { login } = useAuthStore.getState();
      await login(email.trim(), password);
      handleClose();
    } catch (e: any) {
      setLocalError(e?.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, border: '1px solid #FFE082' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#FFF8E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF9800',
          }}
        >
          {meta.icon}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {meta.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {meta.subtitle}
          </Typography>
        </Box>
        <Chip label={meta.chipLabel} size="small" color="warning" variant="outlined" />
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <DialogContentText sx={{ mb: 2 }}>
          当前身份：<strong>离线访客</strong>。升级后所有现有数据 100% 保留，你可以随时退出增值账号回到本地使用。
        </DialogContentText>

        <Stack spacing={2}>
          <TextField
            label="邮箱"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            size="small"
            fullWidth
            disabled={submitting}
          />
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            size="small"
            fullWidth
            disabled={submitting}
          />
          {localError && <Alert severity="error">{localError}</Alert>}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={handleEmailLogin}
              disabled={submitting}
              fullWidth
            >
              {submitting ? <CircularProgress size={18} /> : '登录'}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleQuickLogin}
              disabled={submitting}
            >
              演示账号
            </Button>
          </Stack>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              handleClose();
              navigate('/settings?tab=account');
            }}
          >
            前往设置中心账号 Tab
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          稍后再说
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** 全局拦截渲染器：在 AppLayout 顶层挂载一次即可 */
export function GlobalRequireUpgradeDialog() {
  const { requireUpgradeOpen, requireUpgradeFeature, closeRequireUpgrade } = useAuthStore();
  if (!requireUpgradeOpen || !requireUpgradeFeature) return null;
  return (
    <UpgradeDialog
      feature={requireUpgradeFeature}
      onClose={closeRequireUpgrade}
    />
  );
}

export type { Feature };
