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
  Extension as ExtensionIcon,
  AccountBalance as FinanceIcon,
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
import { IS_VIRTUAL_COMPANY, IS_INVENTORY } from '../../config/appMode';

const DRAWER_WIDTH = 240;
const TOPBAR_HEIGHT = 64;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = (() => {
  const items: NavItem[] = [
    { text: 'AI claw', icon: <AgentIcon sx={{ color: '#ff3b30' }} />, path: '/' },
  ];

  if (IS_VIRTUAL_COMPANY) {
    items.push(
      { text: 'Agent管理', icon: <ExtensionIcon />, path: '/agents' },
      { text: '财务管理', icon: <FinanceIcon />, path: '/finance-agent' },
    );
  }

  items.push(
    { text: 'AI团队', icon: <TeamsIcon />, path: '/teams' },
    { text: '联系人', icon: <ContactsIcon />, path: '/contacts' },
    { text: '消息', icon: <ChatIcon />, path: '/messages' },
    { text: '云商城', icon: <StoreIcon />, path: '/cloud-store' },
  );

  if (IS_INVENTORY) {
    items.push(
      { text: '数据中心', icon: <DataCenterIcon />, path: '/datacenter' },
      { text: '商品库', icon: <ProductsIcon />, path: '/products' },
      { text: '供应链', icon: <SupplyChainIcon />, path: '/supplychain' },
    );
  }

  return items;
})();

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

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
