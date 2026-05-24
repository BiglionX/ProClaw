import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import { useAuthStore } from './lib/authStore';
import AgentPage from './pages/AgentPage';
import AIDemoPage from './pages/AIDemoPage';
import DataCenterPage from './pages/DataCenterPage';
import FAQManagementPage from './pages/FAQManagementPage';
import SupplyChainPage from './pages/SupplyChainPage';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import TeamsPage from './pages/TeamsPage';
import TestPage from './pages/TestPage';
import UnrecognizedCommandsPage from './pages/UnrecognizedCommandsPage';
import UserManagementPage from './pages/UserManagementPage';
import DevicePairingPage from './pages/DevicePairingPage';
import AISalesOrderPage from './pages/AISalesOrderPage';
import ContactsPage from './pages/ContactsPage';
import ChatPage from './pages/ChatPage';
import MessagesPage from './pages/MessagesPage';
import CallPage from './pages/CallPage';
import IncomingCallDialog from './components/Call/IncomingCallDialog';

// 添加启动日志
console.log('App component rendering...');

// 受保护的路由组件 - 使用 AppLayout 包装
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    // 如果是模拟账号,跳过 checkAuth (因为 Supabase 中没有 session)
    if (user?.id?.startsWith('mock-')) {
      return;
    }
    checkAuth();
  }, [checkAuth, user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function App() {
  return (
    <HashRouter>
      {/* 全局来电弹窗 */}
      <IncomingCallDialog />
      <Routes>
        {/* 公开路由 */}
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 受保护的路由 - 需要登录 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AgentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datacenter"
          element={
            <ProtectedRoute>
              <DataCenterPage />
            </ProtectedRoute>
          }
        />
        {/* 旧路由重定向 */}
        <Route path="/dashboard" element={<Navigate to="/datacenter" replace />} />
        <Route path="/analytics" element={<Navigate to="/datacenter" replace />} />
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
        {/* 旧路由重定向 */}
        <Route path="/inventory" element={<Navigate to="/supplychain" replace />} />
        <Route path="/purchase" element={<Navigate to="/supplychain" replace />} />
        <Route path="/sales" element={<Navigate to="/supplychain" replace />} />
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
          path="/device-pairing"
          element={
            <ProtectedRoute>
              <DevicePairingPage />
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

        {/* 测试页面 - 开发环境使用 */}
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
