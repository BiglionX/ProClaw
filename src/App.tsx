import { useEffect } from 'react';
import { Box } from '@mui/material';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import { useAuthStore } from './lib/authStore';
import AIDemoPage from './pages/AIDemoPage';
import DataCenterPage from './pages/DataCenterPage';
import FAQManagementPage from './pages/FAQManagementPage';
import SupplyChainPage from './pages/SupplyChainPage';
import LoginPage from './pages/LoginPage';
import LoginDialog from './components/Auth/LoginDialog';
import ProductsPage from './pages/ProductsPage';
import RegisterPage from './pages/RegisterPage';
import UserCenterPage from './pages/UserCenterPage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import { SetupWizard } from './components/SetupWizard';
import TeamsPage from './pages/TeamsPage';
import TestPage from './pages/TestPage';
import UnrecognizedCommandsPage from './pages/UnrecognizedCommandsPage';
import UserManagementPage from './pages/UserManagementPage';
import AISalesOrderPage from './pages/AISalesOrderPage';
import ContactsPage from './pages/ContactsPage';
import SalesPage from './pages/SalesPage';
import InventoryPage from './pages/InventoryPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import MessagesPage from './pages/MessagesPage';
import CallPage from './pages/CallPage';
import IncomingCallDialog from './components/Call/IncomingCallDialog';
import CloudStorePage from './pages/CloudStorePage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import AgentManagerPage from './pages/AgentManagerPage';
import FinanceAgentPage from './pages/FinanceAgentPage';
import AIKnowledgePage from './pages/AIKnowledgePage';
import CustomerServicePage from './pages/CustomerServicePage';
import { useAppModeStore } from './config/appMode';
import OperationsDashboard from './components/OperationsCenter/OperationsDashboard';

// ========== 行业插件页面（Phase 4 新插件） ==========
// 餐饮行业
import PosPage from './pages/pos/PosPage';
import TablesPage from './pages/pos/TablesPage';
import KitchenDisplayPage from './pages/kitchen/KitchenDisplayPage';
// 美业行业
import AppointmentsPage from './pages/beauty/AppointmentsPage';
import ServicesPage from './pages/beauty/ServicesPage';
import EmployeesPage from './pages/beauty/EmployeesPage';
import MarketingPage from './pages/beauty/MarketingPage';
// 宠物行业
import PetProfilesPage from './pages/pet/PetProfilesPage';
import BoardingPage from './pages/pet/BoardingPage';
import GroomingPage from './pages/pet/GroomingPage';
// Cloud 版
import TokenBillingPage from './pages/cloud/TokenBillingPage';
import CloudBackupPage from './pages/cloud/CloudBackupPage';
// 共用页面
import MembersPage from './pages/MembersPage';

// ========== 八大新行业插件占位页面 ==========
// 便利店
import ConveniencePosPage from './pages/convenience/ConveniencePosPage';
import DailySettlementPage from './pages/convenience/DailySettlementPage';
// 酒水批发
import LiquorCreditLedgerPage from './pages/liquor/CreditLedgerPage';
import BatchManagePage from './pages/liquor/BatchManagePage';
// 手机配件
import QuotationsPage from './pages/phone/QuotationsPage';
import DeviceModelsPage from './pages/phone/DeviceModelsPage';
// 食材配送
import FreshFoodDeliveryPage from './pages/freshfood/DeliveryPage';
import RecurringOrderPage from './pages/freshfood/RecurringOrderPage';
// 汽车配件
import VehicleDbPage from './pages/autoparts/VehicleDbPage';
import OeSearchPage from './pages/autoparts/OeSearchPage';
// 五金
import HwCreditLedgerPage from './pages/hardware/CreditLedgerPage';
import CuttingCalcPage from './pages/hardware/CuttingCalcPage';
// 装修材料
import DecorationProjectsPage from './pages/decoration/ProjectsPage';
import MaterialBomPage from './pages/decoration/MaterialBomPage';
// 社区团购
import GroupBuyPage from './pages/groupbuy/GroupBuyPage';
import PickupVerifyPage from './pages/groupbuy/PickupVerifyPage';

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
          path="/cloud-store/*"
          element={
            <ProtectedRoute>
              <CloudStorePage />
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
    </HashRouter>
  );
}

export default App;
