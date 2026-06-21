import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import { useAuthStore } from '../lib/authStore';
import { SetupWizard } from '../components/SetupWizard';

export function LazyPage({ loader }: { loader: () => Promise<{ default: React.ComponentType }> }) {
  const Component = React.lazy(loader);
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

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, checkAuth, openLoginDialog } = useAuthStore();

  React.useEffect(() => {
    if (user?.id?.startsWith('mock-')) return;
    checkAuth();
  }, [checkAuth, user]);

  React.useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => openLoginDialog(), 100);
      return () => clearTimeout(timer);
    }
  }, [user, openLoginDialog]);

  if (!user) {
    return <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a1a' }} />;
  }

  return <AppLayout>{children}</AppLayout>;
}

type RouteLoader = () => Promise<{ default: React.ComponentType }>;

export const REDIRECT_ROUTES: Array<{ from: string; to: string }> = [
  { from: '/', to: '/datacenter' },
  { from: '/dashboard', to: '/datacenter' },
  { from: '/finance', to: '/datacenter' },
  { from: '/purchase', to: '/supplychain' },
  { from: '/media-library', to: '/ai-knowledge' },
  { from: '/qa-library', to: '/ai-knowledge' },
  { from: '/knowledge-base', to: '/ai-knowledge' },
];

export const PUBLIC_ROUTES: Array<{ path: string; loader: RouteLoader }> = [
  { path: '/setup-page', loader: () => import('../pages/SetupPage') },
  { path: '/login', loader: () => import('../pages/LoginPage') },
  { path: '/register', loader: () => import('../pages/RegisterPage') },
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
  { path: '/foreign-counter/*', loader: () => import('../pages/ForeignCounter/ForeignCounterPage') },
  { path: '/customer-service', loader: () => import('../pages/CustomerServicePage') },
  { path: '/ai-knowledge', loader: () => import('../pages/AIKnowledgePage') },
  { path: '/sales', loader: () => import('../pages/SalesPage') },
  { path: '/inventory', loader: () => import('../pages/InventoryPage') },
  { path: '/customers', loader: () => import('../pages/ContactsPage') },
  { path: '/analytics', loader: () => import('../pages/AnalyticsPage') },
  { path: '/ai-teams', loader: () => import('../pages/TeamsPage') },
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
  { path: '/test', loader: () => import('../pages/TestPage') },
];

export function renderAppRoutes() {
  return (
    <>
      <Route path="/setup" element={<SetupWizard />} />
      {REDIRECT_ROUTES.map(({ from, to }) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
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
