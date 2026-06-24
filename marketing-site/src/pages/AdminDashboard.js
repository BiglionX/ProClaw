"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var authStore_1 = require("../lib/authStore");
var react_router_dom_1 = require("react-router-dom");
var notificationContext_1 = require("../lib/notificationContext");
var pluginService_1 = require("../lib/pluginService");
var recharts_1 = require("recharts");
var AdminDashboard = function () {
    var _a = (0, authStore_1.useAuthStore)(), user = _a.user, profile = _a.profile, logout = _a.logout;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _b = (0, react_1.useState)({
        totalUsers: 0,
        totalAdmins: 0,
        totalApiCalls: 0,
        totalTokensSold: 0,
        totalRevenue: 0,
        activeApiKeys: 0,
        todayNewUsers: 0,
        todayApiCalls: 0,
    }), stats = _b[0], setStats = _b[1];
    var _c = (0, react_1.useState)(true), isLoading = _c[0], setIsLoading = _c[1];
    var _d = (0, react_1.useState)(false), showNotifications = _d[0], setShowNotifications = _d[1];
    var _e = (0, react_1.useState)([]), recentPlugins = _e[0], setRecentPlugins = _e[1];
    var _f = (0, react_1.useState)([]), industryDistribution = _f[0], setIndustryDistribution = _f[1];
    var _g = (0, react_1.useState)(true), pluginStatsLoading = _g[0], setPluginStatsLoading = _g[1];
    var _h = (0, react_1.useState)([]), downloadTrend = _h[0], setDownloadTrend = _h[1];
    (0, react_1.useEffect)(function () {
        // 模拟加载数据（演示模式）
        var loadStats = function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                setIsLoading(true);
                setTimeout(function () {
                    setStats({
                        totalUsers: 1234,
                        totalAdmins: 5,
                        totalApiCalls: 567890,
                        totalTokensSold: 10000000,
                        totalRevenue: 125680.50,
                        activeApiKeys: 3456,
                        todayNewUsers: 23,
                        todayApiCalls: 12345,
                    });
                    setIsLoading(false);
                }, 500);
                // 加载插件统计
                (0, pluginService_1.getRecentPluginReleases)(5).then(setRecentPlugins).finally(function () { return setPluginStatsLoading(false); });
                (0, pluginService_1.getActiveIndustryDistribution)().then(setIndustryDistribution);
                (0, pluginService_1.getPluginDownloadTrend)(30).then(function (data) {
                    // 按日期聚合所有插件的下载量
                    var agg = {};
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var row = data_1[_i];
                        var date = row.date;
                        agg[date] = (agg[date] || 0) + row.count;
                    }
                    var trend = Object.entries(agg)
                        .map(function (_a) {
                        var date = _a[0], total = _a[1];
                        return ({ date: date, total: total });
                    })
                        .sort(function (a, b) { return a.date.localeCompare(b.date); });
                    setDownloadTrend(trend);
                });
                return [2 /*return*/];
            });
        }); };
        loadStats();
    }, []);
    var handleLogout = function () { return __awaiter(void 0, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, logout()];
                case 1:
                    _a.sent();
                    navigate('/');
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Logout error:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var adminMenuItems = [
        {
            title: '用户管理',
            description: '管理平台用户和权限',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>),
            color: 'bg-blue-50 text-blue-600',
            href: '/admin/users',
        },
        {
            title: 'Token 套餐',
            description: '配置和管理 Token 销售套餐',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>),
            color: 'bg-green-50 text-green-600',
            href: '/admin/packages',
        },
        {
            title: '订单管理',
            description: '查看和管理 Token 购买订单',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
        </svg>),
            color: 'bg-purple-50 text-purple-600',
            href: '/admin/orders',
        },
        {
            title: '集成审批',
            description: '审核和管理外部项目接口',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>),
            color: 'bg-indigo-50 text-indigo-600',
            href: '/admin/integrations',
        },
        {
            title: '使用统计',
            description: '查看平台使用和数据分析',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>),
            color: 'bg-orange-50 text-orange-600',
            href: '/admin/analytics',
        },
        {
            title: '系统设置',
            description: '配置系统参数和维护选项',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>),
            color: 'bg-gray-50 text-gray-600',
            href: '/admin/settings',
        },
        {
            title: '行业插件管理',
            description: '上架、编辑和管理行业插件',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"/>
        </svg>),
            color: 'bg-teal-50 text-teal-600',
            href: '/admin/plugins',
        },
    ];
    return (<div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">ProClaw Admin</span>
              </div>
              <div className="ml-8 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                管理员模式
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <notificationContext_1.NotificationBell onClick={function () { return setShowNotifications(true); }}/>
              <div className="text-sm text-gray-600">
                {(profile === null || profile === void 0 ? void 0 : profile.username) || (user === null || user === void 0 ? void 0 : user.email)}
              </div>
              <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理员仪表板</h1>
          <p className="mt-2 text-gray-600">监控和管理 ProClaw 平台运营</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总用户数</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : stats.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">+{stats.todayNewUsers} 今日新增</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总 API 调用</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : stats.totalApiCalls.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">+{stats.todayApiCalls.toLocaleString()} 今日</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Token 销售总量</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : (stats.totalTokensSold / 10000).toFixed(0) + '万'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总收入</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : "\u00A5".concat(stats.totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 }))}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活跃 API 密钥</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : stats.activeApiKeys.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">管理员数量</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : stats.totalAdmins}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均客单价</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : "\u00A5".concat((stats.totalRevenue / Math.max(stats.totalUsers, 1)).toFixed(2))}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 插件统计 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">行业插件统计</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 插件下载趋势图 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">插件下载趋势（近30天）</h3>
              {pluginStatsLoading ? (<div className="text-sm text-gray-400">加载中...</div>) : downloadTrend.length === 0 ? (<div className="text-sm text-gray-400">暂无数据</div>) : (<div className="h-48">
                  <recharts_1.ResponsiveContainer width="100%" height="100%">
                    <recharts_1.BarChart data={downloadTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <recharts_1.XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={function (val) { return val.slice(5); }}/>
                      <recharts_1.YAxis tick={{ fontSize: 10 }} allowDecimals={false}/>
                      <recharts_1.Tooltip formatter={function (value) { return [value, '下载量']; }} labelFormatter={function (label) { return "\u65E5\u671F: ".concat(label); }}/>
                      <recharts_1.Bar dataKey="total" fill="#14b8a6" radius={[2, 2, 0, 0]}/>
                    </recharts_1.BarChart>
                  </recharts_1.ResponsiveContainer>
                </div>)}
            </div>

            {/* 最新插件发布动态 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">最新插件发布动态</h3>
              {pluginStatsLoading ? (<div className="text-sm text-gray-400">加载中...</div>) : recentPlugins.length === 0 ? (<div className="text-sm text-gray-400">暂无数据</div>) : (<div className="space-y-3">
                  {recentPlugins.map(function (plugin) { return (<div key={plugin.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{plugin.icon || '🧩'}</span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{plugin.name}</span>
                          <span className="text-xs text-gray-400 ml-2">v{plugin.version}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {plugin.published_at ? new Date(plugin.published_at).toLocaleDateString() : ''}
                      </span>
                    </div>); })}
                </div>)}
              <react_router_dom_1.Link to="/admin/plugins" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800">
                查看全部插件 &rarr;
              </react_router_dom_1.Link>
            </div>

            {/* 活跃行业分布 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">活跃行业分布</h3>
              {pluginStatsLoading ? (<div className="text-sm text-gray-400">加载中...</div>) : industryDistribution.length === 0 ? (<div className="text-sm text-gray-400">暂无数据</div>) : (<div className="space-y-3">
                  {industryDistribution
                .sort(function (a, b) { return b.installs - a.installs; })
                .map(function (dist) {
                var total = industryDistribution.reduce(function (s, d) { return s + d.installs; }, 0);
                var pct = total > 0 ? ((dist.installs / total) * 100).toFixed(1) : '0';
                return (<div key={dist.plugin_id} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-24 truncate">{dist.name}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: "".concat(pct, "%") }}/>
                          </div>
                          <span className="text-xs text-gray-500 w-16 text-right">
                            {dist.installs} 安装
                          </span>
                        </div>);
            })}
                </div>)}
            </div>
          </div>
        </div>

        {/* Admin Menu Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">管理功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminMenuItems.map(function (item, index) { return (<react_router_dom_1.Link key={index} to={item.href} className="block p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transition-all group">
                <div className={"w-12 h-12 ".concat(item.color, " rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform")}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </react_router_dom_1.Link>); })}
          </div>
        </div>

        {/* Phase 3 Advanced Features */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">高级功能 (Phase 3)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <react_router_dom_1.Link to="/admin/reports" className="block p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">自定义报表</h3>
              <p className="text-sm text-gray-600">灵活的数据分析和报表生成</p>
            </react_router_dom_1.Link>

            <react_router_dom_1.Link to="/admin/tasks" className="block p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">自动化任务</h3>
              <p className="text-sm text-gray-600">定时任务和流程管理</p>
            </react_router_dom_1.Link>

            <react_router_dom_1.Link to="/admin/rate-limiting" className="block p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">API 限流</h3>
              <p className="text-sm text-gray-600">细粒度的速率限制配置</p>
            </react_router_dom_1.Link>

            <react_router_dom_1.Link to="/admin/audit-logs" className="block p-6 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">审计日志</h3>
              <p className="text-sm text-gray-600">完整的操作记录和追溯</p>
            </react_router_dom_1.Link>
            <react_router_dom_1.Link to="/admin/plugins" className="block p-6 bg-gradient-to-br from-teal-50 to-green-50 border border-teal-200 rounded-xl hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">行业插件管理</h3>
              <p className="text-sm text-gray-600">上架和管理行业插件</p>
            </react_router_dom_1.Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">添加管理员</p>
                <p className="text-sm text-gray-600">创建新的管理员账户</p>
              </div>
            </button>

            <button className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">生成报表</p>
                <p className="text-sm text-gray-600">导出运营数据</p>
              </div>
            </button>

            <button className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">系统配置</p>
                <p className="text-sm text-gray-600">调整平台参数</p>
              </div>
            </button>

            <button className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">告警中心</p>
                <p className="text-sm text-gray-600">查看系统告警</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Notification Panel */}
      <notificationContext_1.NotificationPanel isOpen={showNotifications} onClose={function () { return setShowNotifications(false); }}/>
    </div>);
};
exports.default = AdminDashboard;
