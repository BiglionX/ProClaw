import React, { Suspense, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import AppLayout from '../components/Layout/AppLayout';
import { useAuthStore } from '../lib/authStore';
import { SetupWizard } from '../components/SetupWizard';
import NoUserWelcome from '../components/Auth/NoUserWelcome';

export function LazyPage({ loader }: { loader: () => Promise<{ default: React.ComponentType }> }) {
  const ComponentRef = useRef<React.LazyExoticComponent<React.ComponentType> | null>(null);
  if (!ComponentRef.current) {
    ComponentRef.current = React.lazy(loader);
  }
  const Component = ComponentRef.current;
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    }>
      <Component />
    </Suspense>
  );
}

/**
 * v13.1.1 本地账号无登录模式：未登录不再强弹窗
 * - 启动时 checkAuth() 会从 localStorage 恢复 activeAccountId → user 自动填充
 * - 若真没用户（首次启动），渲染轻量引导页（NoUserWelcome）
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    const { hasInitialized, user: currentUser, checkAuth } = useAuthStore.getState();
    if (hasInitialized) return;

    // E2E 旁路:URL 带 ?e2e=1 时,只用一个临时 user 跳过 ProtectedRoute,
    // 仅用于浏览器内 Playwright 自检,生产构建中 import.meta.env.DEV 仍为 true。
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('e2e') === '1' &&
      !currentUser
    ) {
      const fakeUser = {
        id: 'e2e-fake-user',
        email: 'e2e@proclaw.local',
        displayName: 'E2E Tester',
        role: 'boss',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      useAuthStore.setState({
        user: fakeUser as any,
        session: {
          access_token: 'e2e-token',
          refresh_token: 'e2e-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: 'bearer',
          user: fakeUser as any,
        },
        hasInitialized: true,
      });
      return;
    }
    void checkAuth();
    // 只在挂载时跑一次。user 每次 initialize 都是新对象，放进 deps 会无限循环。
  }, []);

  if (!user) {
    return <NoUserWelcome />;
  }

  return (
    <AppLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppLayout>
  );
}

type RouteLoader = () => Promise<{ default: React.ComponentType }>;

/** 旧版云商城路径 /cloud-store → /shop（兼容插件 manifest 历史路径） */
function CloudStoreRedirect() {
  const location = useLocation();
  const suffix = location.pathname.replace(/^\/cloud-store\/?/, '');
  const target = suffix ? `/shop/${suffix}` : '/shop';
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}

export const REDIRECT_ROUTES: Array<{ from: string; to: string }> = [
  { from: '/cloud-store', to: '/shop' },
  { from: '/', to: '/datacenter' },
  { from: '/dashboard', to: '/datacenter' },
  { from: '/finance', to: '/datacenter' },
  { from: '/purchase', to: '/supplychain' },
  { from: '/media-library', to: '/ai-knowledge' },
  { from: '/qa-library', to: '/ai-knowledge' },
  { from: '/knowledge-base', to: '/ai-knowledge' },
  { from: '/customers', to: '/contacts' },
  { from: '/ai-teams', to: '/teams' },
];

export const PUBLIC_ROUTES: Array<{ path: string; loader: RouteLoader }> = [
  { path: '/setup-page', loader: () => import('../pages/SetupPage') },
  { path: '/login', loader: () => import('../pages/LoginPage') },
  { path: '/register', loader: () => import('../pages/RegisterPage') },
  // v13.1.1：/welcome 复用 NoUserWelcome，作为 LoginPage 跳转到的"创建新本地账号"页
  { path: '/welcome', loader: () => import('../components/Auth/NoUserWelcome') },
];

export const PROTECTED_ROUTES: Array<{ path: string; loader: RouteLoader }> = [
  { path: '/datacenter', loader: () => import('../pages/DataCenterPage') },
  { path: '/products', loader: () => import('../pages/ProductsPage') },
  { path: '/supplychain', loader: () => import('../pages/SupplyChainPage') },
  { path: '/settings', loader: () => import('../pages/SettingsPage') },
  { path: '/unrecognized-commands', loader: () => import('../pages/UnrecognizedCommandsPage') },
  { path: '/faq-management', loader: () => import('../pages/FAQManagementPage') },
  { path: '/ai-demo', loader: () => import('../pages/AIDemoPage') },
  { path: '/teams', loader: () => import('../pages/TeamsPage') },
  { path: '/user-management', loader: () => import('../pages/UserManagementPage') },
  { path: '/ai-sales-order', loader: () => import('../pages/AISalesOrderPage') },
  { path: '/contacts', loader: () => import('../pages/ContactsPage') },
  { path: '/messages', loader: () => import('../pages/MessagesPage') },
  { path: '/chat/:contactId', loader: () => import('../pages/ChatPage') },
  { path: '/agent-profile/:agentId', loader: () => import('../pages/AgentProfilePage') },
  { path: '/team-profile/:teamId', loader: () => import('../pages/TeamProfilePage') },
  { path: '/call', loader: () => import('../pages/CallPage') },
  { path: '/ucenter', loader: () => import('../pages/UserCenterPage') },
  { path: '/operations', loader: () => import('../components/OperationsCenter/OperationsDashboard') },
  { path: '/shop/*', loader: () => import('../pages/CloudStorePage') },
  { path: '/foreign-counter', loader: () => import('../pages/ForeignCounter/ForeignCounterPage') },
  { path: '/customer-service', loader: () => import('../pages/CustomerServicePage') },
  { path: '/ai-knowledge', loader: () => import('../pages/AIKnowledgePage') },
  { path: '/sales', loader: () => import('../pages/SalesPage') },
  { path: '/inventory', loader: () => import('../pages/InventoryPage') },
  { path: '/analytics', loader: () => import('../pages/AnalyticsPage') },
  { path: '/plugin-store', loader: () => import('../pages/PluginStorePage') },
  { path: '/agents', loader: () => import('../pages/AgentManagerPage') },
  { path: '/project-overview', loader: () => import('../pages/ProjectDashboardPage') },
  { path: '/finance-agent', loader: () => import('../pages/FinanceAgentPage') },
  { path: '/pos', loader: () => import('../pages/pos/PosPage') },
  { path: '/tables', loader: () => import('../pages/pos/TablesPage') },
  { path: '/kitchen', loader: () => import('../pages/kitchen/KitchenDisplayPage') },
  { path: '/appointments', loader: () => import('../pages/beauty/AppointmentsPage') },
  { path: '/services', loader: () => import('../pages/beauty/ServicesPage') },
  { path: '/employees', loader: () => import('../pages/beauty/EmployeesPage') },
  { path: '/marketing', loader: () => import('../pages/beauty/MarketingPage') },
  { path: '/pets', loader: () => import('../pages/pet/PetProfilesPage') },
  { path: '/boarding', loader: () => import('../pages/pet/BoardingPage') },
  { path: '/grooming', loader: () => import('../pages/pet/GroomingPage') },
  { path: '/token-billing', loader: () => import('../pages/cloud/TokenBillingPage') },
  { path: '/cloud-backup', loader: () => import('../pages/cloud/CloudBackupPage') },
  { path: '/members', loader: () => import('../pages/MembersPage') },
  { path: '/convenience-pos', loader: () => import('../pages/convenience/ConveniencePosPage') },
  { path: '/daily-settlement', loader: () => import('../pages/convenience/DailySettlementPage') },
  { path: '/credit-ledger', loader: () => import('../pages/liquor/CreditLedgerPage') },
  { path: '/batch-manage', loader: () => import('../pages/liquor/BatchManagePage') },
  { path: '/quotations', loader: () => import('../pages/phone/QuotationsPage') },
  { path: '/device-models', loader: () => import('../pages/phone/DeviceModelsPage') },
  { path: '/delivery', loader: () => import('../pages/freshfood/DeliveryPage') },
  { path: '/recurring-orders', loader: () => import('../pages/freshfood/RecurringOrderPage') },
  { path: '/vehicle-db', loader: () => import('../pages/autoparts/VehicleDbPage') },
  { path: '/oe-search', loader: () => import('../pages/autoparts/OeSearchPage') },
  { path: '/hw-credit-ledger', loader: () => import('../pages/hardware/CreditLedgerPage') },
  { path: '/cutting-calc', loader: () => import('../pages/hardware/CuttingCalcPage') },
  { path: '/projects', loader: () => import('../pages/decoration/ProjectsPage') },
  { path: '/material-bom', loader: () => import('../pages/decoration/MaterialBomPage') },
  { path: '/group-buy', loader: () => import('../pages/groupbuy/GroupBuyPage') },
  { path: '/pickup-verify', loader: () => import('../pages/groupbuy/PickupVerifyPage') },
  { path: '/import-center', loader: () => import('../components/ImportCenter/ImportCenterPage') },
  { path: '/import-center/new', loader: () => import('../components/ImportCenter/ImportWizardPage') },
  { path: '/import-center/:batchId', loader: () => import('../components/ImportCenter/ImportWizardPage') },
  { path: '/hermes-skills', loader: () => import('../pages/HermesSkillsPage') },
  { path: '/test', loader: () => import('../pages/TestPage') },
];

export function renderAppRoutes() {
  return (
    <>
      <Route path="/setup" element={<SetupWizard />} />
      {REDIRECT_ROUTES.map(({ from, to }) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="/cloud-store/*" element={<CloudStoreRedirect />} />
      {PUBLIC_ROUTES.map(({ path, loader }) => (
        <Route key={path} path={path} element={<LazyPage loader={loader} />} />
      ))}
      {PROTECTED_ROUTES.map(({ path, loader }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute>
              <LazyPage loader={loader} />
            </ProtectedRoute>
          }
        />
      ))}
    </>
  );
}
