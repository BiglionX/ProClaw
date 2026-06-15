import {
  SmartToy as AgentIcon,
  Hub as DataCenterIcon,

  Category as ProductsIcon,
  Groups as TeamsIcon,
  People as ContactsIcon,
  Chat as ChatIcon,
  Storefront as StoreIcon,
  AccountBalance as FinanceIcon,
  AccountCircle as UserIcon,
  ShoppingCart as ShoppingCartIcon,
  BarChart as BarChartIcon,
  MenuBook as KnowledgeIcon,
  Extension as ExtensionIcon,
  HeadsetMic as HeadsetIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  FiberManualRecord as LiveDotIcon,
  // ========== Phase 4 行业插件图标 ==========
  Restaurant as RestaurantIcon,
  DesktopWindows as DesktopWindowsIcon,
  Inventory2 as Inventory2Icon,
  CalendarMonth as CalendarMonthIcon,
  Campaign as CampaignIcon,
  Pets as PetsIcon,
  Home as HomeIcon,
  AutoAwesome as AutoAwesomeIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppModeStore, PluginNavItem } from '../../config/appMode';
// 注：用户信息已上移至 TopBar 右上角展示，Sidebar 不再直接消费 useAuthStore

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 64;
const TOPBAR_HEIGHT = 64;

/** 分组标签配置（PRD v11.0 §4.2.1） */
const GROUP_LABELS: Record<string, { icon: string; label: string }> = {
  home: { icon: '🏠', label: '首页' },
  ai: { icon: '🧠', label: 'AI 智能' },
  contact: { icon: '👥', label: '通讯' },
  account: { icon: '👤', label: '账户' },
};

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  group?: 'home' | 'ai' | 'account' | 'contact';
  badge?: number | string;
  isLive?: boolean;
}

/** 图标名称到 React 组件的映射（与 manifest 中 icon 字段对齐） */
const ICON_MAP: Record<string, React.ReactNode> = {
  'agent': <AgentIcon sx={{ color: '#ff3b30' }} />,
  'user': <UserIcon />,
  'database': <DataCenterIcon />,
  'package': <ProductsIcon />,
  'truck': <FinanceIcon />,
  'users': <TeamsIcon />,
  'book-open': <KnowledgeIcon />,
  'phone': <ContactsIcon />,
  'message-square': <ChatIcon />,
  'shopping-bag': <StoreIcon />,
  'finance': <FinanceIcon />,
  'shopping-cart': <ShoppingCartIcon />,
  'bar-chart': <BarChartIcon />,
  'table-restaurant': <RestaurantIcon />,
  'monitor': <DesktopWindowsIcon />,
  'inventory': <Inventory2Icon />,
  'calendar': <CalendarMonthIcon />,
  'megaphone': <CampaignIcon />,
  'paw': <PetsIcon />,
  'home': <HomeIcon />,
  'sparkles': <AutoAwesomeIcon />,
  'headset': <HeadsetIcon />,
};

/** 基础默认导航项（无插件时回退） */
const DEFAULT_NAV_ITEMS: (NavItem & { _group: 'home' | 'ai' | 'account' | 'contact' })[] = [
  { text: '数据中心', icon: <DataCenterIcon />, path: '/datacenter', _group: 'home', isLive: true },
  { text: '商品库', icon: <ProductsIcon />, path: '/products', _group: 'home' },
  { text: '云商城', icon: <StoreIcon />, path: '/shop', _group: 'home' },
  { text: '外贸柜台', icon: <PublicIcon />, path: '/foreign-counter', _group: 'home' },
  { text: '联系人', icon: <ContactsIcon />, path: '/contacts', _group: 'contact' },
  { text: '消息', icon: <ChatIcon />, path: '/messages', _group: 'contact' },
  { text: 'AI 团队', icon: <TeamsIcon />, path: '/teams', _group: 'ai', badge: 2 },
  { text: 'AI 知识库', icon: <KnowledgeIcon />, path: '/ai-knowledge', _group: 'ai' },
  { text: '插件商店', icon: <ExtensionIcon />, path: '/plugin-store', _group: 'ai' },
];

/** 从 localStorage / 跨页面事件读取 AI Team 数量（动态赋值给 sidebar badge） */
function useAITeamCount(): number {
  const [count, setCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem('proclaw:teams:count');
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  useEffect(() => {
    const refresh = () => {
      const raw = window.localStorage.getItem('proclaw:teams:count');
      const n = raw ? parseInt(raw, 10) : 0;
      setCount(Number.isFinite(n) && n > 0 ? n : 0);
    };
    // 监听 TeamsPage 触发的事件
    window.addEventListener('proclaw:teams-changed', refresh);
    // 监听 storage 事件（跨 tab）
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('proclaw:teams-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return count;
}

/** Plus 版本专属导航项 */
const PLUS_NAV_ITEMS: (NavItem & { _group: 'home' | 'ai' | 'account' | 'contact' })[] = [
  { text: '供应链', icon: <FinanceIcon />, path: '/supplychain', _group: 'home' },
];

/** 将 PluginNavItem[] 转换为 NavItem[]（解析 icon 字符串为组件） */
function resolvePluginNavItems(pluginItems: PluginNavItem[]): NavItem[] {
  return pluginItems.map(item => ({
    text: item.text,
    icon: ICON_MAP[item.icon] || <ExtensionIcon />,
    path: item.path,
    group: (item.group as 'home' | 'ai' | 'account') || 'home',
  }));
}

function useNavItems(): NavItem[] {
  const mode = useAppModeStore(state => state.mode);
  const pluginNavItems = useAppModeStore(state => state.getNavAddItems());
  const pluginRemovePaths = useAppModeStore(state => state.getNavRemovePaths());

  // 优先使用插件 manifest 定义的导航项
  if (pluginNavItems.length > 0) {
    let items = resolvePluginNavItems(pluginNavItems);
    // Plus 版本追加专属导航项
    if (mode === 'inventory') {
      items = [...items, ...PLUS_NAV_ITEMS];
    }
    if (pluginRemovePaths.length > 0) {
      items = items.filter(item => !pluginRemovePaths.includes(item.path));
    }
    return items;
  }

  // 无插件时使用默认导航
  const defaultItems = [...DEFAULT_NAV_ITEMS];
  // Plus 版本追加专属导航项
  if (mode === 'inventory') {
    defaultItems.push(...PLUS_NAV_ITEMS);
  }
  return defaultItems;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = useNavItems();
  const [collapsed, setCollapsed] = useState(false);
  const aiTeamCount = useAITeamCount();

  // 按分组整理导航项,并把动态 badge 注入"AI 团队"项
  const groupedItems = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const group = (item as any)._group || item.group || 'home';
    if (!acc[group]) acc[group] = [];
    if (item.path === '/teams') {
      // 动态覆盖为实时 AI Team 数量
      acc[group].push({ ...item, badge: aiTeamCount > 0 ? aiTeamCount : undefined });
    } else {
      acc[group].push(item);
    }
    return acc;
  }, {});

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  // 注：用户信息（PRD v11.0 §4.2.1 底部用户卡片）已上移至 TopBar 右上角展示，Sidebar 不再消费 useAuthStore / useAppModeStore 的用户态字段

  const renderNavItem = (item: NavItem) => {
    const selected = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    return (
      <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
        <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
          <ListItemButton
            selected={selected}
            onClick={() => navigate(item.path)}
            sx={{
              minHeight: 44,
              mx: collapsed ? 0.5 : 1,
              borderRadius: 1,
              mb: 0.25,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1 : 2,
              position: 'relative',
              // 左侧红色竖线指示器
              '&::before': selected ? {
                content: '""',
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 20,
                borderRadius: '0 2px 2px 0',
                backgroundColor: '#FF3B30',
              } : {},
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 59, 48, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 59, 48, 0.18)',
                },
                '& .MuiListItemIcon-root': {
                  color: '#FF3B30',
                },
                '& .MuiListItemText-primary': {
                  color: '#FF3B30',
                  fontWeight: 600,
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.06)',
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: selected ? '#FF3B30' : 'rgba(255,255,255,0.65)',
                minWidth: collapsed ? 0 : 40,
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: selected ? 600 : 400,
                    color: selected ? '#FF3B30' : 'rgba(255,255,255,0.85)',
                    noWrap: true,
                  }}
                />
                {/* 徽章数字 */}
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    sx={{
                      height: 20,
                      minWidth: 20,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: '#FF3B30',
                      color: '#fff',
                    }}
                  />
                )}
                {/* [LIVE] 标记 */}
                {item.isLive && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                    <LiveDotIcon sx={{ fontSize: 8, color: '#10B981' }} />
                    <Typography
                      variant="caption"
                      sx={{ color: '#10B981', fontWeight: 600, fontSize: '0.6rem' }}
                    >
                      LIVE
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#1A1A2E',
          color: '#e0e0e0',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          top: `${TOPBAR_HEIGHT}px`,
          height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
        },
      }}
    >
      {/* ---- 导航列表 ---- */}
      {/* PRD v11.0 §4.2.1：顶部品牌区与底部用户状态已移除（与 TopBar 左上角品牌名 / 右上角用户状态重叠，避免视觉重复） */}
      {Object.entries(groupedItems)
        .sort(([a], [b]) => {
          const order = ['home', 'ai', 'contact', 'account'];
          return order.indexOf(a) - order.indexOf(b);
        })
        .map(([group, items], groupIdx) => {
          const labelCfg = GROUP_LABELS[group];
          return (
            <Box key={group}>
              {/* PRD v11.0 §4.2.1：分组标签（半透明小字） */}
              {!collapsed && labelCfg && (
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    px: 2.5,
                    pt: groupIdx === 0 ? 0.5 : 2,
                    pb: 0.5,
                    color: 'rgba(255,255,255,0.35)',
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    userSelect: 'none',
                  }}
                >
                  <Box component="span" sx={{ mr: 0.75, fontSize: '0.75rem' }}>{labelCfg.icon}</Box>
                  {labelCfg.label}
                </Typography>
              )}
              <List sx={{ py: 0 }}>
                {items.map(renderNavItem)}
              </List>
            </Box>
          );
        })}

      {/* ---- 底部：折叠按钮（用户信息已上移至 TopBar 右上角，避免视觉重叠） ---- */}
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* 折叠按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            sx={{
              color: 'rgba(255,255,255,0.4)',
              '&:hover': {
                color: 'rgba(255,255,255,0.7)',
                backgroundColor: 'rgba(255,255,255,0.06)',
              },
            }}
          >
            {collapsed ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
}


