"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var styles_1 = require("@mui/material/styles");
var CssBaseline_1 = require("@mui/material/CssBaseline");
var authStore_1 = require("./lib/authStore");
var notificationContext_1 = require("./lib/notificationContext");
// Pages - 首屏同步加载
var HomePage_1 = require("./pages/HomePage");
// SEO 结构化数据
var StructuredData_1 = require("./components/StructuredData");
// Pages - 懒加载
var FeaturesPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/FeaturesPage'); }); });
var DownloadPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/DownloadPage'); }); });
var ChangelogPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/ChangelogPage'); }); });
var UseCasesPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/UseCasesPage'); }); });
var FAQPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/FAQPage'); }); });
var LoginPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/LoginPage'); }); });
var RegisterPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/RegisterPage'); }); });
var UserDashboard = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/UserDashboard'); }); });
var UserCenterPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/UserCenterPage'); }); });
var AdminDashboard = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/AdminDashboard'); }); });
var AdminUsersPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminUsersPage'); }); });
var AdminPackagesPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminPackagesPage'); }); });
var AdminOrdersPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminOrdersPage'); }); });
var AdminIntegrationsPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminIntegrationsPage'); }); });
var AdminAnalyticsPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminAnalyticsPage'); }); });
var AdminSettingsPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminSettingsPage'); }); });
var AdminReportsPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminReportsPage'); }); });
var AdminTasksPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminTasksPage'); }); });
var AdminRateLimitingPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminRateLimitingPage'); }); });
var AdminAuditLogsPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminAuditLogsPage'); }); });
var AdminTokenMonitorPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminTokenMonitorPage'); }); });
var AdminPluginsPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/admin/AdminPluginsPage'); }); });
var PluginStorePage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/PluginStorePage'); }); });
var FlowHubPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/FlowHubPage'); }); });
var PluginDetailPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/PluginDetailPage'); }); });
var CateringSolutionPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/solutions/CateringSolutionPage'); }); });
var BeautySolutionPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/solutions/BeautySolutionPage'); }); });
var PetSolutionPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/solutions/PetSolutionPage'); }); });
var CloudSolutionPage = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('./pages/solutions/CloudSolutionPage'); }); });
// Loading fallback
var PageLoading = function () { return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="text-3xl mb-3 animate-pulse">&#x1F680;</div>
      <p className="text-gray-400">加载中...</p>
    </div>
  </div>); };
// Protected Route Component
var ProtectedRoute = function (_a) {
    var children = _a.children, requiredRole = _a.requiredRole;
    var _b = (0, authStore_1.useAuthStore)(), user = _b.user, profile = _b.profile, isLoading = _b.isLoading;
    if (isLoading) {
        return <div>Loading...</div>;
    }
    if (!user) {
        return <react_router_dom_1.Navigate to="/login" replace/>;
    }
    if (requiredRole && (profile === null || profile === void 0 ? void 0 : profile.role) !== requiredRole) {
        return <react_router_dom_1.Navigate to="/unauthorized" replace/>;
    }
    return <>{children}</>;
};
var theme = (0, styles_1.createTheme)({
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
    return (<styles_1.ThemeProvider theme={theme}>
      <CssBaseline_1.default />
      <notificationContext_1.NotificationProvider>
        <StructuredData_1.default />
      <react_router_dom_1.BrowserRouter>
        <react_router_dom_1.Routes>
          {/* Public Routes */}
          <react_router_dom_1.Route path="/" element={<HomePage_1.default />}/>
          <react_router_dom_1.Route path="/features" element={<react_1.default.Suspense fallback={<PageLoading />}><FeaturesPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/pricing" element={<react_router_dom_1.Navigate to="/download#pricing" replace/>}/>
          <react_router_dom_1.Route path="/download" element={<react_1.default.Suspense fallback={<PageLoading />}><DownloadPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/changelog" element={<react_1.default.Suspense fallback={<PageLoading />}><ChangelogPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/use-cases" element={<react_1.default.Suspense fallback={<PageLoading />}><UseCasesPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/flowhub" element={<react_1.default.Suspense fallback={<PageLoading />}><FlowHubPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/plugins" element={<react_1.default.Suspense fallback={<PageLoading />}><PluginStorePage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/plugins/:pluginId" element={<react_1.default.Suspense fallback={<PageLoading />}><PluginDetailPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/faq" element={<react_1.default.Suspense fallback={<PageLoading />}><FAQPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/solutions/catering" element={<react_1.default.Suspense fallback={<PageLoading />}><CateringSolutionPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/solutions/beauty" element={<react_1.default.Suspense fallback={<PageLoading />}><BeautySolutionPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/solutions/pet" element={<react_1.default.Suspense fallback={<PageLoading />}><PetSolutionPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/solutions/cloud" element={<react_1.default.Suspense fallback={<PageLoading />}><CloudSolutionPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/login" element={<react_1.default.Suspense fallback={<PageLoading />}><LoginPage /></react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/register" element={<react_1.default.Suspense fallback={<PageLoading />}><RegisterPage /></react_1.default.Suspense>}/>

          {/* User Routes - 用户中心 */}
          <react_router_dom_1.Route path="/user" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute>
                  <UserCenterPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/dashboard" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/user/*" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute>
                  <UserCenterPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>

          {/* Admin Routes */}
          <react_router_dom_1.Route path="/admin" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/users" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminUsersPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/packages" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminPackagesPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/orders" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminOrdersPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/integrations" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminIntegrationsPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/analytics" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/settings" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminSettingsPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/reports" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminReportsPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/tasks" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminTasksPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/rate-limiting" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminRateLimitingPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/audit-logs" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminAuditLogsPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/tokens" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminTokenMonitorPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>
          <react_router_dom_1.Route path="/admin/plugins" element={<react_1.default.Suspense fallback={<PageLoading />}>
                <ProtectedRoute requiredRole="admin">
                  <AdminPluginsPage />
                </ProtectedRoute>
              </react_1.default.Suspense>}/>

          {/* 404 Route */}
          <react_router_dom_1.Route path="*" element={<react_router_dom_1.Navigate to="/" replace/>}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.BrowserRouter>
      </notificationContext_1.NotificationProvider>
    </styles_1.ThemeProvider>);
}
exports.default = App;
