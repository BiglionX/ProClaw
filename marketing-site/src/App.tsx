import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './lib/authStore';
import { NotificationProvider } from './lib/notificationContext';

// Pages - 首屏同步加载
import HomePage from './pages/HomePage';

// SEO 结构化数据
import StructuredData from './components/StructuredData';

// Pages - 懒加载
const FeaturesPage = React.lazy(() => import('./pages/FeaturesPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const DownloadPage = React.lazy(() => import('./pages/DownloadPage'));
const ChangelogPage = React.lazy(() => import('./pages/ChangelogPage'));
const UseCasesPage = React.lazy(() => import('./pages/UseCasesPage'));
const FAQPage = React.lazy(() => import('./pages/FAQPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const UserDashboard = React.lazy(() => import('./pages/UserDashboard'));
const UserCenterPage = React.lazy(() => import('./pages/UserCenterPage'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminPackagesPage = React.lazy(() => import('./pages/admin/AdminPackagesPage'));
const AdminOrdersPage = React.lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminIntegrationsPage = React.lazy(() => import('./pages/admin/AdminIntegrationsPage'));
const AdminAnalyticsPage = React.lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminReportsPage = React.lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminTasksPage = React.lazy(() => import('./pages/admin/AdminTasksPage'));
const AdminRateLimitingPage = React.lazy(() => import('./pages/admin/AdminRateLimitingPage'));
const AdminAuditLogsPage = React.lazy(() => import('./pages/admin/AdminAuditLogsPage'));
const AdminTokenMonitorPage = React.lazy(() => import('./pages/admin/AdminTokenMonitorPage'));
const AdminPluginsPage = React.lazy(() => import('./pages/admin/AdminPluginsPage'));
const PluginStorePage = React.lazy(() => import('./pages/PluginStorePage'));
const FlowHubPage = React.lazy(() => import('./pages/FlowHubPage'));
const PluginDetailPage = React.lazy(() => import('./pages/PluginDetailPage'));
const CateringSolutionPage = React.lazy(() => import('./pages/solutions/CateringSolutionPage'));
const BeautySolutionPage = React.lazy(() => import('./pages/solutions/BeautySolutionPage'));
const PetSolutionPage = React.lazy(() => import('./pages/solutions/PetSolutionPage'));
const CloudSolutionPage = React.lazy(() => import('./pages/solutions/CloudSolutionPage'));

// Loading fallback
const PageLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="text-3xl mb-3 animate-pulse">&#x1F680;</div>
      <p className="text-gray-400">加载中...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'user' | 'admin' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#111827',
    },
    secondary: {
      main: '#6b7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <StructuredData />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<React.Suspense fallback={<PageLoading />}><FeaturesPage /></React.Suspense>} />
          <Route path="/pricing" element={<React.Suspense fallback={<PageLoading />}><PricingPage /></React.Suspense>} />
          <Route path="/download" element={<React.Suspense fallback={<PageLoading />}><DownloadPage /></React.Suspense>} />
          <Route path="/changelog" element={<React.Suspense fallback={<PageLoading />}><ChangelogPage /></React.Suspense>} />
          <Route path="/use-cases" element={<React.Suspense fallback={<PageLoading />}><UseCasesPage /></React.Suspense>} />
          <Route path="/flowhub" element={<React.Suspense fallback={<PageLoading />}><FlowHubPage /></React.Suspense>} />
          <Route path="/plugins" element={<React.Suspense fallback={<PageLoading />}><PluginStorePage /></React.Suspense>} />
          <Route path="/plugins/:pluginId" element={<React.Suspense fallback={<PageLoading />}><PluginDetailPage /></React.Suspense>} />
          <Route path="/faq" element={<React.Suspense fallback={<PageLoading />}><FAQPage /></React.Suspense>} />
          <Route path="/solutions/catering" element={<React.Suspense fallback={<PageLoading />}><CateringSolutionPage /></React.Suspense>} />
          <Route path="/solutions/beauty" element={<React.Suspense fallback={<PageLoading />}><BeautySolutionPage /></React.Suspense>} />
          <Route path="/solutions/pet" element={<React.Suspense fallback={<PageLoading />}><PetSolutionPage /></React.Suspense>} />
          <Route path="/solutions/cloud" element={<React.Suspense fallback={<PageLoading />}><CloudSolutionPage /></React.Suspense>} />
          <Route path="/login" element={<React.Suspense fallback={<PageLoading />}><LoginPage /></React.Suspense>} />
          <Route path="/register" element={<React.Suspense fallback={<PageLoading />}><RegisterPage /></React.Suspense>} />

          {/* User Routes - 用户中心 */}
          <Route
            path="/user"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute>
                  <UserCenterPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/user/*"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute>
                  <UserCenterPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/users"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminUsersPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/packages"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminPackagesPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminOrdersPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/integrations"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminIntegrationsPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminSettingsPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminReportsPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/tasks"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminTasksPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/rate-limiting"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminRateLimitingPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminAuditLogsPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/tokens"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminTokenMonitorPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />
          <Route
            path="/admin/plugins"
            element={
              <React.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminPluginsPage />
                </ProtectedRoute>
              </React.Suspense>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
