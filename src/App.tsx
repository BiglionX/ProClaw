import React, { useEffect, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import { useAuthStore } from './lib/authStore';
import LoginDialog from './components/Auth/LoginDialog';
import { SetupWizard } from './components/SetupWizard';
import IncomingCallDialog from './components/Call/IncomingCallDialog';
import { useAppModeStore } from './config/appMode';

// 审计修复 SEC-P2-01: 路由懒加载，减少首屏 bundle 大小
// 所有页面组件均使用 React.lazy 动态导入
const DataCenterPage = React.lazy(() => import('./pages/DataCenterPage'));
const FAQManagementPage = React.lazy(() => import('./pages/FAQManagementPage'));
const SupplyChainPage = React.lazy(() => import('./pages/SupplyChainPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const UserCenterPage = React.lazy(() => import('./pages/UserCenterPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const SetupPage = React.lazy(() => import('./pages/SetupPage'));
const TeamsPage = React.lazy(() => import('./pages/TeamsPage'));
const TestPage = React.lazy(() => import('./pages/TestPage'));
const UnrecognizedCommandsPage = React.lazy(() => import('./pages/UnrecognizedCommandsPage'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const AISalesOrderPage = React.lazy(() => import('./pages/AISalesOrderPage'));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage'));
const SalesPage = React.lazy(() => import('./pages/SalesPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const AgentProfilePage = React.lazy(() => import('./pages/AgentProfilePage'));
const TeamProfilePage = React.lazy(() => import('./pages/TeamProfilePage'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));
const CallPage = React.lazy(() => import('./pages/CallPage'));
const CloudStorePage = React.lazy(() => import('./pages/CloudStorePage'));
const ProjectDashboardPage = React.lazy(() => import('./pages/ProjectDashboardPage'));
const AgentManagerPage = React.lazy(() => import('./pages/AgentManagerPage'));
const FinanceAgentPage = React.lazy(() => import('./pages/FinanceAgentPage'));
const AIKnowledgePage = React.lazy(() => import('./pages/AIKnowledgePage'));
const CustomerServicePage = React.lazy(() => import('./pages/CustomerServicePage'));
const PluginStorePage = React.lazy(() => import('./pages/PluginStorePage'));
const AIDemoPage = React.lazy(() => import('./pages/AIDemoPage'));
const OperationsDashboard = React.lazy(() => import('./components/OperationsCenter/OperationsDashboard'));

// 行业插件页面
const PosPage = React.lazy(() => import('./pages/pos/PosPage'));
const TablesPage = React.lazy(() => import('./pages/pos/TablesPage'));
const KitchenDisplayPage = React.lazy(() => import('./pages/kitchen/KitchenDisplayPage'));
const AppointmentsPage = React.lazy(() => import('./pages/beauty/AppointmentsPage'));
const ServicesPage = React.lazy(() => import('./pages/beauty/ServicesPage'));
const EmployeesPage = React.lazy(() => import('./pages/beauty/EmployeesPage'));
const MarketingPage = React.lazy(() => import('./pages/beauty/MarketingPage'));
const PetProfilesPage = React.lazy(() => import('./pages/pet/PetProfilesPage'));
const BoardingPage = React.lazy(() => import('./pages/pet/BoardingPage'));
const GroomingPage = React.lazy(() => import('./pages/pet/GroomingPage'));
const TokenBillingPage = React.lazy(() => import('./pages/cloud/TokenBillingPage'));
const CloudBackupPage = React.lazy(() => import('./pages/cloud/CloudBackupPage'));
const MembersPage = React.lazy(() => import('./pages/MembersPage'));
const ConveniencePosPage = React.lazy(() => import('./pages/convenience/ConveniencePosPage'));
const DailySettlementPage = React.lazy(() => import('./pages/convenience/DailySettlementPage'));
const LiquorCreditLedgerPage = React.lazy(() => import('./pages/liquor/CreditLedgerPage'));
const BatchManagePage = React.lazy(() => import('./pages/liquor/BatchManagePage'));
const QuotationsPage = React.lazy(() => import('./pages/phone/QuotationsPage'));
const DeviceModelsPage = React.lazy(() => import('./pages/phone/DeviceModelsPage'));
const FreshFoodDeliveryPage = React.lazy(() => import('./pages/freshfood/DeliveryPage'));
const RecurringOrderPage = React.lazy(() => import('./pages/freshfood/RecurringOrderPage'));
const VehicleDbPage = React.lazy(() => import('./pages/autoparts/VehicleDbPage'));
const OeSearchPage = React.lazy(() => import('./pages/autoparts/OeSearchPage'));
const HwCreditLedgerPage = React.lazy(() => import('./pages/hardware/CreditLedgerPage'));
const CuttingCalcPage = React.lazy(() => import('./pages/hardware/CuttingCalcPage'));
const DecorationProjectsPage = React.lazy(() => import('./pages/decoration/ProjectsPage'));
const MaterialBomPage = React.lazy(() => import('./pages/decoration/MaterialBomPage'));
const GroupBuyPage = React.lazy(() => import('./pages/groupbuy/GroupBuyPage'));
const PickupVerifyPage = React.lazy(() => import('./pages/groupbuy/PickupVerifyPage'));

// 演示数据新增：外贸柜台运营插件（ProClaw 1.0.0）
const ForeignCounterPage = React.lazy(() => import('./pages/ForeignCounter/ForeignCounterPage'));

// 添加启动日志
console.log('App component rendering...');

// 受保护的路由组件 - 使用 AppLayout 包装
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, checkAuth, openLoginDialog } = useAuthStore();

  useEffect(() => {
    // 如果是模拟账号,跳过 checkAuth (因为 Supabase 中没有 session)
    if (user?.id?.startsWith('mock-')) {
      return;
    }
    checkAuth();
  }, [checkAuth, user]);

  useEffect(() => {
    if (!user) {
      // 延迟打开弹窗,避免在初始化过程中闪烁
      const timer = setTimeout(() => openLoginDialog(), 100);
      return () => clearTimeout(timer);
    }
  }, [user, openLoginDialog]);

  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a1a' }} />
    );
  }

  return <AppLayout>{children}</AppLayout>;
}

function App() {
  const mode = useAppModeStore(state => state.mode);

  return (
    <HashRouter key={mode}>
      {/* 全局弹窗 */}
      <IncomingCallDialog />
      <LoginDialog />
      {/* 审计修复 SEC-P2-01: Suspense 包裹路由，支持懒加载 */}
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      }>
      <Routes>
        {/* 公开路由 */}
        {/* 安装向导 - 独立无边框窗口使用 */}
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/setup-page" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 受保护的路由 - 需要登录 */}
        <Route path="/" element={<Navigate to="/datacenter" replace />} />
        <Route
          path="/datacenter"
          element={
            <ProtectedRoute>
              <DataCenterPage />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/datacenter" replace />} />
        <Route path="/finance" element={<Navigate to="/datacenter" replace />} />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplychain"
          element={
            <ProtectedRoute>
              <SupplyChainPage />
            </ProtectedRoute>
          }
        />
        <Route path="/purchase" element={<Navigate to="/supplychain" replace />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/unrecognized-commands"
          element={
            <ProtectedRoute>
              <UnrecognizedCommandsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faq-management"
          element={
            <ProtectedRoute>
              <FAQManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-demo"
          element={
            <ProtectedRoute>
              <AIDemoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <TeamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-sales-order"
          element={
            <ProtectedRoute>
              <AISalesOrderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:contactId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent-profile/:agentId"
          element={
            <ProtectedRoute>
              <AgentProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team-profile/:teamId"
          element={
            <ProtectedRoute>
              <TeamProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/call"
          element={
            <ProtectedRoute>
              <CallPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ucenter"
          element={
            <ProtectedRoute>
              <UserCenterPage />
            </ProtectedRoute>
          }
        />

        {/* 运营中心路由 */}
        <Route
          path="/operations"
          element={
            <ProtectedRoute>
              <OperationsDashboard />
            </ProtectedRoute>
          }
        />

        {/* 云商城路由 */}
        <Route
          path="/shop/*"
          element={
            <ProtectedRoute>
              <CloudStorePage />
            </ProtectedRoute>
          }
        />

        {/* 外贸柜台运营插件路由（ProClaw 1.0.0） */}
        <Route
          path="/foreign-counter"
          element={
            <ProtectedRoute>
              <ForeignCounterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/foreign-counter/*"
          element={
            <ProtectedRoute>
              <ForeignCounterPage />
            </ProtectedRoute>
          }
        />

        {/* AI 客服管理路由 */}
        <Route
          path="/customer-service"
          element={
            <ProtectedRoute>
              <CustomerServicePage />
            </ProtectedRoute>
          }
        />

        {/* AI 知识库路由（全版本） */}
        <Route
          path="/ai-knowledge"
          element={
            <ProtectedRoute>
              <AIKnowledgePage />
            </ProtectedRoute>
          }
        />

        {/* 旧路由兼容重定向 - 三库合一路由 */}
        <Route path="/media-library" element={<Navigate to="/ai-knowledge" replace />} />
        <Route path="/qa-library" element={<Navigate to="/ai-knowledge" replace />} />
        <Route path="/knowledge-base" element={<Navigate to="/ai-knowledge" replace />} />

        {/* ========== 插件化路由（统一注册，由 PluginManager + manifest 驱动） ========== */}

        {/* Light版专属路由：由插件 manifest 的 navigation.add/remove 控制侧边栏可见性 */}
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <SalesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-teams"
          element={
            <ProtectedRoute>
              <TeamsPage />
            </ProtectedRoute>
          }
        />

        {/* 插件商店（独立路由，直接访问 /plugin-store） */}
        <Route
          path="/plugin-store"
          element={
            <ProtectedRoute>
              <PluginStorePage />
            </ProtectedRoute>
          }
        />

        {/* ProClaw Light 版专属路由：统一注册，由插件 manifest 控制导航可见性 */}
        <Route
          path="/agents"
          element={
            <ProtectedRoute>
              <AgentManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project-overview"
          element={
            <ProtectedRoute>
              <ProjectDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance-agent"
          element={
            <ProtectedRoute>
              <FinanceAgentPage />
            </ProtectedRoute>
          }
        />

        {/* ========== 行业插件路由（Phase 4 新插件） ========== */}

        {/* 餐饮行业 */}
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <PosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute>
              <TablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute>
              <KitchenDisplayPage />
            </ProtectedRoute>
          }
        />

        {/* 美业行业 */}
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing"
          element={
            <ProtectedRoute>
              <MarketingPage />
            </ProtectedRoute>
          }
        />

        {/* 宠物行业 */}
        <Route
          path="/pets"
          element={
            <ProtectedRoute>
              <PetProfilesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/boarding"
          element={
            <ProtectedRoute>
              <BoardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grooming"
          element={
            <ProtectedRoute>
              <GroomingPage />
            </ProtectedRoute>
          }
        />

        {/* Cloud 版 */}
        <Route
          path="/token-billing"
          element={
            <ProtectedRoute>
              <TokenBillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cloud-backup"
          element={
            <ProtectedRoute>
              <CloudBackupPage />
            </ProtectedRoute>
          }
        />

        {/* 共用页面 – 会员管理（餐饮 / 美业 / 宠物 通用） */}
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <MembersPage />
            </ProtectedRoute>
          }
        />

        {/* ========== 八大新行业插件路由 ========== */}

        {/* 便利店 */}
        <Route
          path="/convenience-pos"
          element={
            <ProtectedRoute>
              <ConveniencePosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-settlement"
          element={
            <ProtectedRoute>
              <DailySettlementPage />
            </ProtectedRoute>
          }
        />

        {/* 酒水批发 */}
        <Route
          path="/credit-ledger"
          element={
            <ProtectedRoute>
              <LiquorCreditLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batch-manage"
          element={
            <ProtectedRoute>
              <BatchManagePage />
            </ProtectedRoute>
          }
        />

        {/* 手机配件 */}
        <Route
          path="/quotations"
          element={
            <ProtectedRoute>
              <QuotationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/device-models"
          element={
            <ProtectedRoute>
              <DeviceModelsPage />
            </ProtectedRoute>
          }
        />

        {/* 食材配送 */}
        <Route
          path="/delivery"
          element={
            <ProtectedRoute>
              <FreshFoodDeliveryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recurring-orders"
          element={
            <ProtectedRoute>
              <RecurringOrderPage />
            </ProtectedRoute>
          }
        />

        {/* 汽车配件 */}
        <Route
          path="/vehicle-db"
          element={
            <ProtectedRoute>
              <VehicleDbPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/oe-search"
          element={
            <ProtectedRoute>
              <OeSearchPage />
            </ProtectedRoute>
          }
        />

        {/* 五金 */}
        <Route
          path="/hw-credit-ledger"
          element={
            <ProtectedRoute>
              <HwCreditLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cutting-calc"
          element={
            <ProtectedRoute>
              <CuttingCalcPage />
            </ProtectedRoute>
          }
        />

        {/* 装修材料 */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <DecorationProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/material-bom"
          element={
            <ProtectedRoute>
              <MaterialBomPage />
            </ProtectedRoute>
          }
        />

        {/* 社区团购 */}
        <Route
          path="/group-buy"
          element={
            <ProtectedRoute>
              <GroupBuyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pickup-verify"
          element={
            <ProtectedRoute>
              <PickupVerifyPage />
            </ProtectedRoute>
          }
        />

        {/* 测试页面 - 开发环境使用 */}
        <Route path="/test" element={<TestPage />} />
      </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
