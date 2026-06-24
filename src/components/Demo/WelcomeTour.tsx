/**
 * 演示账号欢迎引导 (ProClaw 1.0.0)
 *
 * 演示账号首次登录（或重置演示数据后）弹出一次性提示，
 * 列出已预置的产品 / 云商城 / AI Team / 插件清单。
 */
import { useEffect, useState } from 'react';
import { APP_VERSION } from '../../lib/appVersion';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ScienceIcon from '@mui/icons-material/Science';
import InventoryIcon from '@mui/icons-material/Inventory2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupsIcon from '@mui/icons-material/Groups';
import ExtensionIcon from '@mui/icons-material/Extension';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useNavigate } from 'react-router-dom';
import { isDemoAccountContext, isDemoDataInitialized, readDemoFlag } from '../../lib/demoFlag';

const TOUR_DISMISSED_KEY = 'proclaw_demo_tour_dismissed_v1';

interface PresetItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: { label: string; path: string };
}

export default function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDemoAccountContext()) return;
    // 已初始化过数据且用户没主动关闭过 -> 不弹
    if (isDemoDataInitialized() && localStorage.getItem(TOUR_DISMISSED_KEY) === '1') {
      return;
    }
    // 延迟 600ms 让 TopBar/路由先渲染完成
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(TOUR_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const handleJump = (path: string) => {
    handleClose();
    navigate(path);
  };

  const flag = readDemoFlag();
  const productCount = flag?.productsCount ?? 20;
  const storeSub = flag?.cloudStoreSubdomain ?? 'demo';
  const teamNames = flag?.teamNames ?? [
    'AI 经营团队',
    '国内社媒运营团队',
    '海外社媒运营团队',
  ];
  const pluginIds = flag?.pluginIds ?? ['ma_foreign_counter'];

  const presetItems: PresetItem[] = [
    {
      icon: <InventoryIcon sx={{ color: '#0EA5E9' }} />,
      title: `${productCount} 个 iPhone 电池 SPU 产品`,
      desc: '可在「商品库」查看，预置了库存、价格、S 三级信息',
      action: { label: '前往商品库', path: '/products' },
    },
    {
      icon: <StorefrontIcon sx={{ color: '#F59E0B' }} />,
      title: `已开通云商城（proclaw.cc/shop/${storeSub}）`,
      desc: '点击「预览」按钮即可访问，支持 8 个管理 Tab',
      action: { label: '查看云商城', path: '/shop' },
    },
    {
      icon: <GroupsIcon sx={{ color: '#10B981' }} />,
      title: `${teamNames.length} 个 AI 团队（已从 Nvwax 下载）`,
      desc: teamNames.join('、'),
      action: { label: '查看 AI 团队', path: '/teams' },
    },
    {
      icon: <ExtensionIcon sx={{ color: '#6366F1' }} />,
      title: `${pluginIds.length} 个行业插件：外贸柜台运营助手`,
      desc: '多语言 / 国际物流 / 海关申报 一体化',
      action: { label: '打开外贸柜台', path: '/foreign-counter' },
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1E1E2E 0%, #2A2A3E 100%)',
          color: '#fff',
          overflow: 'hidden',
        },
      }}
    >
      {/* 顶部装饰条 */}
      <Box
        sx={{
          height: 4,
          background: 'linear-gradient(90deg, #FF3B30 0%, #6366F1 50%, #10B981 100%)',
        }}
      />

      <DialogTitle sx={{ pt: 3, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <RocketLaunchIcon sx={{ color: '#FF3B30', fontSize: 28 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {`欢迎使用 ProClaw ${APP_VERSION}`}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              当前账号为演示账号，已预置以下数据包
            </Typography>
          </Box>
          <Chip
            icon={<ScienceIcon sx={{ fontSize: 14 }} />}
            label="演示数据"
            size="small"
            sx={{
              bgcolor: 'rgba(255, 59, 48, 0.15)',
              color: '#FF8060',
              borderColor: '#FF3B30',
              fontWeight: 600,
            }}
            variant="outlined"
          />
          <IconButton size="small" onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <DialogContent sx={{ pt: 2 }}>
        <List dense sx={{ py: 0 }}>
          {presetItems.map((item, idx) => (
            <ListItem
              key={idx}
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                mb: 1,
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'background 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
              }}
              secondaryAction={
                item.action ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleJump(item.action!.path)}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      '&:hover': {
                        borderColor: '#FF3B30',
                        bgcolor: 'rgba(255,59,48,0.08)',
                      },
                    }}
                  >
                    {item.action.label}
                  </Button>
                ) : null
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                    {item.title}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                    {item.desc}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>

        {/* 提示条 */}
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <CheckCircleIcon sx={{ color: '#818CF8', fontSize: 18, mt: 0.2 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            如需重新初始化演示数据（恢复出厂状态），可在「设置 → 数据管理」中点击「重置为演示数据」按钮。
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>
          下次再说
        </Button>
        <Button
          variant="contained"
          onClick={() => handleJump('/datacenter')}
          sx={{
            bgcolor: '#FF3B30',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: '#D32F2F' },
          }}
        >
          开始体验
        </Button>
      </DialogActions>
    </Dialog>
  );
}
