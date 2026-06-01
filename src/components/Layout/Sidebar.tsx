import {
  SmartToy as AgentIcon,
  Hub as DataCenterIcon,
  Inventory as SupplyChainIcon,
  Settings as SettingsIcon,
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
  // ========== Phase 4 行业插件图标 ==========
  Restaurant as RestaurantIcon,
  DesktopWindows as DesktopWindowsIcon,
  Inventory2 as Inventory2Icon,
  CalendarMonth as CalendarMonthIcon,
  Campaign as CampaignIcon,
  Pets as PetsIcon,
  Home as HomeIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import {
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppModeStore, PluginNavItem } from '../../config/appMode';

const DRAWER_WIDTH = 240;
const TOPBAR_HEIGHT = 64;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

/** 图标名称到 React 组件的映射（与 manifest 中 icon 字段对齐） */
const ICON_MAP: Record<string, React.ReactNode> = {
  'agent': <AgentIcon sx={{ color: '#ff3b30' }} />,
  'user': <UserIcon />,
  'database': <DataCenterIcon />,
  'package': <ProductsIcon />,
  'truck': <SupplyChainIcon />,
  'users': <TeamsIcon />,
  'book-open': <KnowledgeIcon />,
  'phone': <ContactsIcon />,
  'message-square': <ChatIcon />,
  'shopping-bag': <StoreIcon />,
  'finance': <FinanceIcon />,
  'shopping-cart': <ShoppingCartIcon />,
  'bar-chart': <BarChartIcon />,
  // ========== Phase 4 行业插件图标 ==========
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
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { text: 'AI claw', icon: <AgentIcon sx={{ color: '#ff3b30' }} />, path: '/' },
  { text: '用户中心', icon: <UserIcon />, path: '/ucenter' },
  { text: 'AI团队', icon: <TeamsIcon />, path: '/teams' },
  { text: 'AI 知识库', icon: <KnowledgeIcon />, path: '/ai-knowledge' },
  { text: '联系人', icon: <ContactsIcon />, path: '/contacts' },
  { text: '消息', icon: <ChatIcon />, path: '/messages' },
  { text: '数据中心', icon: <DataCenterIcon />, path: '/datacenter' },
  { text: '商品库', icon: <ProductsIcon />, path: '/products' },
  { text: '供应链', icon: <SupplyChainIcon />, path: '/supplychain' },
  { text: '云商城', icon: <StoreIcon />, path: '/cloud-store' },
  { text: 'AI 客服', icon: <HeadsetIcon />, path: '/customer-service' },
];

/** 将 PluginNavItem[] 转换为 NavItem[]（解析 icon 字符串为组件） */
function resolvePluginNavItems(pluginItems: PluginNavItem[]): NavItem[] {
  return pluginItems.map(item => ({
    text: item.text,
    icon: ICON_MAP[item.icon] || <ExtensionIcon />,
    path: item.path,
  }));
}

function useNavItems(): NavItem[] {
  const pluginNavItems = useAppModeStore(state => state.getNavAddItems());
  const pluginRemovePaths = useAppModeStore(state => state.getNavRemovePaths());

  // 优先使用插件 manifest 定义的导航项
  if (pluginNavItems.length > 0) {
    let items = resolvePluginNavItems(pluginNavItems);
    // 应用插件声明的隐藏路径
    if (pluginRemovePaths.length > 0) {
      items = items.filter(item => !pluginRemovePaths.includes(item.path));
    }
    return items;
  }

  // 无插件时使用默认导航（回退行为）
  return DEFAULT_NAV_ITEMS;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = useNavItems();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#242424',
          color: '#e0e0e0',
          borderRight: '1px solid #333',
          top: `${TOPBAR_HEIGHT}px`,
          height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
        },
      }}
    >
      <List sx={{ pt: 2 }}>
        {navItems.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 1,
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 'auto' }} />

      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate('/settings')}
            sx={{
              mx: 1,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary="设置"
              primaryTypographyProps={{ fontSize: '0.9rem' }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}
