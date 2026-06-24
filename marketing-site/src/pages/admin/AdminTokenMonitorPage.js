"use strict";
// Admin Token 监控面板
// 全局 Token 消耗概览、异常告警、定价规则管理
// @ts-nocheck
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var supabase_1 = require("../../lib/supabase");
var tokenService_1 = require("../../lib/tokenService");
var AdminTokenMonitorPage = function () {
    var _a = (0, react_1.useState)({
        total_consumed_today: 0,
        total_consumed_month: 0,
        total_revenue: 0,
        total_purchased: 0,
        active_users_today: 0,
        low_balance_users: 0,
    }), stats = _a[0], setStats = _a[1];
    var _b = (0, react_1.useState)([]), pricingRules = _b[0], setPricingRules = _b[1];
    var _c = (0, react_1.useState)([]), packages = _c[0], setPackages = _c[1];
    var _d = (0, react_1.useState)(true), isLoading = _d[0], setIsLoading = _d[1];
    var _e = (0, react_1.useState)(null), error = _e[0], setError = _e[1];
    var _f = (0, react_1.useState)(null), editingRule = _f[0], setEditingRule = _f[1];
    var _g = (0, react_1.useState)(false), showNewRuleForm = _g[0], setShowNewRuleForm = _g[1];
    var _h = (0, react_1.useState)([]), anomalyUsers = _h[0], setAnomalyUsers = _h[1];
    var _j = (0, react_1.useState)([]), debtUsers = _j[0], setDebtUsers = _j[1];
    var _k = (0, react_1.useState)('overview'), activeSection = _k[0], setActiveSection = _k[1];
    // 加载统计数据
    (0, react_1.useEffect)(function () {
        var loadStats = function () { return __awaiter(void 0, void 0, void 0, function () {
            var todayData, todayTotal, monthStart, monthData, monthTotal, revenueData, totalRevenue, purchasedData, totalPurchased, activeToday, lowBalanceData_1, balanceData, lowBalanceCount, _a, rules, pkgs, anomalyData, debtData, err_1;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        setIsLoading(true);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 12, 13, 14]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('api_usage_logs')
                                .select('tokens_used', { count: 'exact' })
                                .gte('created_at', new Date().toISOString().split('T')[0])];
                    case 2:
                        todayData = (_c.sent()).data;
                        todayTotal = (todayData === null || todayData === void 0 ? void 0 : todayData.reduce(function (sum, r) { return sum + (r.tokens_used || 0); }, 0)) || 0;
                        monthStart = new Date();
                        monthStart.setDate(1);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('api_usage_logs')
                                .select('tokens_used')
                                .gte('created_at', monthStart.toISOString().split('T')[0])];
                    case 3:
                        monthData = (_c.sent()).data;
                        monthTotal = (monthData === null || monthData === void 0 ? void 0 : monthData.reduce(function (sum, r) { return sum + (r.tokens_used || 0); }, 0)) || 0;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('token_sales')
                                .select('price')
                                .eq('status', 'completed')];
                    case 4:
                        revenueData = (_c.sent()).data;
                        totalRevenue = (revenueData === null || revenueData === void 0 ? void 0 : revenueData.reduce(function (sum, r) { return sum + (r.price || 0); }, 0)) || 0;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('token_sales')
                                .select('amount')
                                .eq('status', 'completed')];
                    case 5:
                        purchasedData = (_c.sent()).data;
                        totalPurchased = (purchasedData === null || purchasedData === void 0 ? void 0 : purchasedData.reduce(function (sum, r) { return sum + (r.amount || 0); }, 0)) || 0;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('api_usage_logs')
                                .select('*', { count: 'exact', head: true })
                                .gte('created_at', new Date().toISOString().split('T')[0])];
                    case 6:
                        activeToday = (_c.sent()).count;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('user_token_config')
                                .select('user_id')
                                .lte('low_balance_threshold', 10000)];
                    case 7:
                        lowBalanceData_1 = (_c.sent()).data;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('token_balances')
                                .select('user_id, balance')
                                .in('user_id', (lowBalanceData_1 === null || lowBalanceData_1 === void 0 ? void 0 : lowBalanceData_1.map(function (c) { return c.user_id; })) || [])];
                    case 8:
                        balanceData = (_c.sent()).data;
                        lowBalanceCount = (balanceData === null || balanceData === void 0 ? void 0 : balanceData.filter(function (b) {
                            var config = lowBalanceData_1 === null || lowBalanceData_1 === void 0 ? void 0 : lowBalanceData_1.find(function (c) { return c.user_id === b.user_id; });
                            return config && b.balance < 10000;
                        }).length) || 0;
                        setStats({
                            total_consumed_today: todayTotal,
                            total_consumed_month: monthTotal,
                            total_revenue: totalRevenue,
                            total_purchased: totalPurchased,
                            active_users_today: activeToday || 0,
                            low_balance_users: lowBalanceCount,
                        });
                        return [4 /*yield*/, Promise.all([
                                (0, tokenService_1.getTokenPricingRules)(),
                                (0, tokenService_1.getTokenPackages)(),
                            ])];
                    case 9:
                        _a = _c.sent(), rules = _a[0], pkgs = _a[1];
                        setPricingRules(rules);
                        setPackages(pkgs);
                        return [4 /*yield*/, loadAnomalyUsersInternal()];
                    case 10:
                        anomalyData = _c.sent();
                        setAnomalyUsers(anomalyData);
                        return [4 /*yield*/, loadDebtUsersInternal()];
                    case 11:
                        debtData = _c.sent();
                        setDebtUsers(debtData);
                        return [3 /*break*/, 14];
                    case 12:
                        err_1 = _c.sent();
                        console.error('加载 Token 监控数据失败:', err_1);
                        if (!((_b = import.meta.env.VITE_SUPABASE_URL) === null || _b === void 0 ? void 0 : _b.startsWith('http'))) {
                            setError('演示模式：Supabase 未配置，无法加载实时数据');
                        }
                        else {
                            setError(err_1.message || '加载失败');
                        }
                        return [3 /*break*/, 14];
                    case 13:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 14: return [2 /*return*/];
                }
            });
        }); };
        loadStats();
    }, []);
    // =====================
    // 辅助函数：异常消耗检测
    // =====================
    function loadAnomalyUsersInternal() {
        return __awaiter(this, void 0, void 0, function () {
            var sevenDaysAgo, recentLogs, userMap, _i, recentLogs_1, log, entry, day, recentSales, recentlyRecharged, today, anomalies, _a, _b, _c, userId, data, daysWithData, dailyAvg, todayConsumed, err_2;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 3, , 4]);
                        sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('api_usage_logs')
                                .select('user_id, tokens_used, created_at')
                                .gte('created_at', sevenDaysAgo.toISOString())];
                    case 1:
                        recentLogs = (_e.sent()).data;
                        if (!recentLogs || recentLogs.length === 0)
                            return [2 /*return*/, []];
                        userMap = new Map();
                        for (_i = 0, recentLogs_1 = recentLogs; _i < recentLogs_1.length; _i++) {
                            log = recentLogs_1[_i];
                            if (!userMap.has(log.user_id)) {
                                userMap.set(log.user_id, { dailyTotals: new Map(), total: 0 });
                            }
                            entry = userMap.get(log.user_id);
                            day = ((_d = log.created_at) === null || _d === void 0 ? void 0 : _d.slice(0, 10)) || 'unknown';
                            entry.dailyTotals.set(day, (entry.dailyTotals.get(day) || 0) + (log.tokens_used || 0));
                            entry.total += log.tokens_used || 0;
                        }
                        return [4 /*yield*/, supabase_1.supabase
                                .from('token_sales')
                                .select('user_id')
                                .gte('created_at', sevenDaysAgo.toISOString())
                                .eq('status', 'completed')];
                    case 2:
                        recentSales = (_e.sent()).data;
                        recentlyRecharged = new Set((recentSales === null || recentSales === void 0 ? void 0 : recentSales.map(function (s) { return s.user_id; })) || []);
                        today = new Date().toISOString().slice(0, 10);
                        anomalies = [];
                        for (_a = 0, _b = userMap.entries(); _a < _b.length; _a++) {
                            _c = _b[_a], userId = _c[0], data = _c[1];
                            daysWithData = data.dailyTotals.size;
                            if (daysWithData < 2)
                                continue;
                            dailyAvg = data.total / daysWithData;
                            todayConsumed = data.dailyTotals.get(today) || 0;
                            if (todayConsumed > dailyAvg * 3 && todayConsumed > 5000) {
                                anomalies.push({
                                    user_id: userId,
                                    today_consumed: todayConsumed,
                                    daily_avg_7d: Math.round(dailyAvg),
                                    ratio: Math.round((todayConsumed / (dailyAvg || 1)) * 10) / 10,
                                    last_recharge_days: recentlyRecharged.has(userId) ? 0 : 8,
                                    risk: todayConsumed > dailyAvg * 5 ? 'high' : 'medium',
                                });
                            }
                        }
                        return [2 /*return*/, anomalies.sort(function (a, b) { return b.ratio - a.ratio; }).slice(0, 20)];
                    case 3:
                        err_2 = _e.sent();
                        console.error('加载异常消耗数据失败:', err_2);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function loadDebtUsersInternal() {
        return __awaiter(this, void 0, void 0, function () {
            var debtData, userIds, failLogs, failMap_1, _i, failLogs_1, log, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('token_balances')
                                .select('user_id, balance')
                                .lte('balance', 0)];
                    case 1:
                        debtData = (_a.sent()).data;
                        if (!debtData || debtData.length === 0)
                            return [2 /*return*/, []];
                        userIds = debtData.map(function (d) { return d.user_id; });
                        return [4 /*yield*/, supabase_1.supabase
                                .from('api_usage_logs')
                                .select('user_id, created_at')
                                .in('user_id', userIds)
                                .eq('endpoint', 'insufficient_balance')
                                .order('created_at', { ascending: false })];
                    case 2:
                        failLogs = (_a.sent()).data;
                        failMap_1 = new Map();
                        if (failLogs) {
                            for (_i = 0, failLogs_1 = failLogs; _i < failLogs_1.length; _i++) {
                                log = failLogs_1[_i];
                                if (!failMap_1.has(log.user_id)) {
                                    failMap_1.set(log.user_id, log.created_at);
                                }
                            }
                        }
                        return [2 /*return*/, debtData.map(function (d) {
                                var lastFail = failMap_1.get(d.user_id);
                                var daysOverdue = lastFail
                                    ? Math.round((Date.now() - new Date(lastFail).getTime()) / (1000 * 60 * 60 * 24))
                                    : 0;
                                var status = 'warning';
                                if (daysOverdue > 30)
                                    status = 'archived';
                                else if (daysOverdue > 7)
                                    status = 'suspended';
                                else if (daysOverdue > 3)
                                    status = 'readonly';
                                return {
                                    user_id: d.user_id,
                                    balance: d.balance,
                                    status: status,
                                    days_overdue: daysOverdue,
                                    last_active: lastFail || null,
                                };
                            })];
                    case 3:
                        err_3 = _a.sent();
                        console.error('加载欠费用户数据失败:', err_3);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    // =====================
    // 状态标签辅助函数
    // =====================
    function DebtStatusBadge(_a) {
        var status = _a.status;
        var styles = {
            warning: 'bg-yellow-50 text-yellow-700',
            readonly: 'bg-orange-50 text-orange-700',
            suspended: 'bg-red-50 text-red-700',
            archived: 'bg-gray-100 text-gray-500',
        };
        var labels = {
            warning: '警告',
            readonly: '只读',
            suspended: '停服',
            archived: '归档',
        };
        return (<span className={"px-2 py-0.5 rounded-full text-xs ".concat(styles[status] || 'bg-gray-50 text-gray-600')}>
      {labels[status] || status}
    </span>);
    }
    function RiskBadge(_a) {
        var risk = _a.risk;
        var styles = {
            high: 'bg-red-50 text-red-700',
            medium: 'bg-yellow-50 text-yellow-700',
            low: 'bg-green-50 text-green-700',
        };
        var labels = {
            high: '高风险',
            medium: '中风险',
            low: '低风险',
        };
        return (<span className={"px-2 py-0.5 rounded-full text-xs font-medium ".concat(styles[risk] || '')}>
      {labels[risk] || risk}
    </span>);
    }
    // =====================
    // 定价规则编辑弹窗
    // =====================
    var EditPricingRuleModal = function (_a) {
        var _b;
        var rule = _a.rule, onClose = _a.onClose, onSave = _a.onSave;
        var isNew = !rule;
        var _c = (0, react_1.useState)({
            resource_type: (rule === null || rule === void 0 ? void 0 : rule.resource_type) || '',
            action_name: (rule === null || rule === void 0 ? void 0 : rule.action_name) || '',
            description: (rule === null || rule === void 0 ? void 0 : rule.description) || '',
            pt_cost: (rule === null || rule === void 0 ? void 0 : rule.pt_cost) || 0,
            unit: (rule === null || rule === void 0 ? void 0 : rule.unit) || 'per_request',
            is_active: (_b = rule === null || rule === void 0 ? void 0 : rule.is_active) !== null && _b !== void 0 ? _b : true,
        }), form = _c[0], setForm = _c[1];
        var _d = (0, react_1.useState)(false), saving = _d[0], setSaving = _d[1];
        var handleSave = function () { return __awaiter(void 0, void 0, void 0, function () {
            var err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setSaving(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, 7, 8]);
                        if (!isNew) return [3 /*break*/, 3];
                        return [4 /*yield*/, supabase_1.supabase.from('token_pricing_rules').insert({
                                resource_type: form.resource_type,
                                action_name: form.action_name,
                                description: form.description,
                                pt_cost: form.pt_cost,
                                unit: form.unit,
                                is_active: form.is_active,
                                sort_order: 99,
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        if (!rule) return [3 /*break*/, 5];
                        return [4 /*yield*/, supabase_1.supabase
                                .from('token_pricing_rules')
                                .update({
                                resource_type: form.resource_type,
                                action_name: form.action_name,
                                description: form.description,
                                pt_cost: form.pt_cost,
                                unit: form.unit,
                                is_active: form.is_active,
                                updated_at: new Date().toISOString(),
                            })
                                .eq('id', rule.id)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        onSave();
                        onClose();
                        return [3 /*break*/, 8];
                    case 6:
                        err_4 = _a.sent();
                        console.error('保存定价规则失败:', err_4);
                        alert('保存失败: ' + (err_4.message || '未知错误'));
                        return [3 /*break*/, 8];
                    case 7:
                        setSaving(false);
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        }); };
        var handleToggleActive = function () { return __awaiter(void 0, void 0, void 0, function () {
            var err_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!rule || isNew)
                            return [2 /*return*/];
                        setSaving(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('token_pricing_rules')
                                .update({ is_active: !rule.is_active, updated_at: new Date().toISOString() })
                                .eq('id', rule.id)];
                    case 2:
                        _a.sent();
                        onSave();
                        onClose();
                        return [3 /*break*/, 5];
                    case 3:
                        err_5 = _a.sent();
                        console.error('切换状态失败:', err_5);
                        return [3 /*break*/, 5];
                    case 4:
                        setSaving(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        return (<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={function (e) { return e.stopPropagation(); }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{isNew ? '新建定价规则' : '编辑定价规则'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">资源类型 (resource_type)</label>
            <input type="text" value={form.resource_type} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { resource_type: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900" placeholder="例如: product_sync"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作名称</label>
            <input type="text" value={form.action_name} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { action_name: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">说明</label>
            <input type="text" value={form.description} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { description: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消耗 PT</label>
              <input type="number" value={form.pt_cost} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { pt_cost: Math.max(0, parseInt(e.target.value) || 0) })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900" min="0"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">计费单位</label>
              <select value={form.unit} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { unit: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="per_request">per_request</option>
                <option value="per_item">per_item</option>
                <option value="per_month">per_month</option>
                <option value="per_day">per_day</option>
                <option value="per_mb_month">per_mb_month</option>
                <option value="per_item_month">per_item_month</option>
                <option value="per_hundred_month">per_hundred_month</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div>
            {!isNew && (<button onClick={handleToggleActive} className={"px-4 py-2 rounded-lg text-sm font-medium ".concat(form.is_active
                    ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                {form.is_active ? '停用此规则' : '启用此规则'}
              </button>)}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              取消
            </button>
            <button onClick={handleSave} disabled={saving || !form.resource_type || !form.action_name} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>);
    };
    if (isLoading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>);
    }
    return (<div className="space-y-8">
      {/* 错误提示 */}
      {error && (<div className="px-4 py-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
          {error}
        </div>)}

      {/* 概览统计 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Token 消耗概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">今日消耗</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_consumed_today.toLocaleString()}</p>
            <p className="text-xs text-gray-400">PT</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">本月消耗</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_consumed_month.toLocaleString()}</p>
            <p className="text-xs text-gray-400">PT</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">总收入</p>
            <p className="text-2xl font-bold text-green-600">¥{stats.total_revenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400">Token 销售</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">已售 Token</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_purchased.toLocaleString()}</p>
            <p className="text-xs text-gray-400">PT</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">今日活跃用户</p>
            <p className="text-2xl font-bold text-blue-600">{stats.active_users_today}</p>
            <p className="text-xs text-gray-400">有操作记录</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">低余额用户</p>
            <p className="text-2xl font-bold text-orange-600">{stats.low_balance_users}</p>
            <p className="text-xs text-gray-400">余额 &lt; 阈值</p>
          </div>
        </div>
      </div>

      {/* 功能区域 Tab */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 -mb-px">
          {[
            { key: 'overview', label: '概览' },
            { key: 'pricing', label: "\u5B9A\u4EF7\u89C4\u5219 (".concat(pricingRules.length, ")") },
            { key: 'anomalies', label: "\u5F02\u5E38\u544A\u8B66 (".concat(anomalyUsers.length, ")") },
            { key: 'debt', label: "\u6B20\u8D39\u7528\u6237 (".concat(debtUsers.length, ")") },
        ].map(function (tab) { return (<button key={tab.key} onClick={function () { return setActiveSection(tab.key); }} className={"pb-3 text-sm font-medium transition-colors ".concat(activeSection === tab.key
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-400 hover:text-gray-600')}>
              {tab.label}
            </button>); })}
        </div>
      </div>

      {/* 定价规则管理 */}
      {activeSection === 'pricing' && (<div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Token 消耗定价规则</h2>
            <button onClick={function () { return setShowNewRuleForm(true); }} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              + 新建规则
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">操作类型</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">名称</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">说明</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">消耗 PT</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">计费单位</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pricingRules.map(function (rule) { return (<tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{rule.resource_type}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{rule.action_name}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{rule.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{rule.pt_cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{rule.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={"px-2 py-0.5 rounded-full text-xs ".concat(rule.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {rule.is_active ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={function () { return setEditingRule(rule); }} className="text-xs text-gray-500 hover:text-gray-900 underline">
                        编辑
                      </button>
                    </td>
                  </tr>); })}
                {pricingRules.length === 0 && (<tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      暂无定价规则数据
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* 异常消耗告警 */}
      {activeSection === 'anomalies' && (<div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">异常消耗告警</h2>
          <p className="text-sm text-gray-500 mb-4">检测今日消耗突增超过近7天日均消耗3倍以上的用户</p>
          {anomalyUsers.length > 0 ? (<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">用户 ID</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">今日消耗</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">近7日日均</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">突增倍数</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">风险等级</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">近7天充值</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {anomalyUsers.map(function (user) { return (<tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{user.user_id.slice(0, 12)}...</td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600">{user.today_consumed.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{user.daily_avg_7d.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{user.ratio}x</td>
                      <td className="px-4 py-3 text-center"><RiskBadge risk={user.risk}/></td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {user.last_recharge_days > 7 ? "".concat(user.last_recharge_days, "\u5929\u65E0\u5145\u503C") : '有充值'}
                      </td>
                    </tr>); })}
                </tbody>
              </table>
            </div>) : (<div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="text-lg mb-1">暂无异常消耗</p>
              <p className="text-sm">所有用户今日消耗均在正常范围内</p>
            </div>)}
        </div>)}

      {/* 欠费用户列表 */}
      {activeSection === 'debt' && (<div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">欠费用户列表</h2>
          {debtUsers.length > 0 ? (<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">用户 ID</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">余额</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">逾期天数</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">最后活跃</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {debtUsers.map(function (user) { return (<tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{user.user_id.slice(0, 12)}...</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{user.balance}</td>
                      <td className="px-4 py-3 text-center"><DebtStatusBadge status={user.status}/></td>
                      <td className="px-4 py-3 text-right text-gray-600">{user.days_overdue} 天</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">
                        {user.last_active ? new Date(user.last_active).toLocaleString('zh-CN') : '无记录'}
                      </td>
                    </tr>); })}
                </tbody>
              </table>
            </div>) : (<div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="text-lg mb-1">暂无欠费用户</p>
              <p className="text-sm">所有用户账户状态正常</p>
            </div>)}
        </div>)}

      {/* Token 套餐管理 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Token 充值套餐</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {packages.map(function (pkg) {
            var finalPrice = pkg.price * (1 - pkg.discount_percentage / 100);
            return (<div key={pkg.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                <p className="text-lg font-bold text-gray-900 mt-1">¥{finalPrice.toFixed(0)}</p>
                <p className="text-xs text-gray-400">
                  {pkg.discount_percentage > 0 && <span className="line-through mr-1">¥{pkg.price}</span>}
                  {pkg.discount_percentage > 0 && <span className="text-red-500">-{pkg.discount_percentage}%</span>}
                </p>
                <p className="text-sm text-gray-600 mt-1">{pkg.token_amount.toLocaleString()} PT</p>
                <p className="text-xs text-gray-400 mt-1">
                  单价 {(pkg.price / pkg.token_amount * 1000).toFixed(2)} 元/千PT
                </p>
              </div>);
        })}
        </div>
      </div>

      {/* 最新消耗记录（Top 20） */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">最新 Token 消耗</h2>
        <LatestConsumptionLogs />
      </div>

      {/* 编辑弹窗 */}
      {(editingRule || showNewRuleForm) && (<EditPricingRuleModal rule={editingRule} onClose={function () { setEditingRule(null); setShowNewRuleForm(false); }} onSave={function () { return __awaiter(void 0, void 0, void 0, function () {
                var rules, anomalyData, debtData;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, tokenService_1.getTokenPricingRules)()];
                        case 1:
                            rules = _a.sent();
                            setPricingRules(rules);
                            return [4 /*yield*/, loadAnomalyUsersInternal()];
                        case 2:
                            anomalyData = _a.sent();
                            setAnomalyUsers(anomalyData);
                            return [4 /*yield*/, loadDebtUsersInternal()];
                        case 3:
                            debtData = _a.sent();
                            setDebtUsers(debtData);
                            return [2 /*return*/];
                    }
                });
            }); }}/>)}
    </div>);
};
// =====================
// 最新消耗记录子组件
// =====================
var LatestConsumptionLogs = function () {
    var _a = (0, react_1.useState)([]), logs = _a[0], setLogs = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    (0, react_1.useEffect)(function () {
        var loadLogs = function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, data, error, err_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, 3, 4]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('api_usage_logs')
                                .select('id, user_id, resource_type, tokens_used, created_at')
                                .order('created_at', { ascending: false })
                                .limit(20)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        setLogs(data || []);
                        return [3 /*break*/, 4];
                    case 2:
                        err_6 = _b.sent();
                        console.error('加载消耗记录失败:', err_6);
                        return [3 /*break*/, 4];
                    case 3:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        loadLogs();
    }, []);
    if (loading) {
        return <div className="text-sm text-gray-400">加载中...</div>;
    }
    return (<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-medium text-gray-600">用户 ID</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">资源类型</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">消耗 PT</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">时间</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map(function (log) {
            var _a;
            return (<tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{(_a = log.user_id) === null || _a === void 0 ? void 0 : _a.slice(0, 8)}...</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{log.resource_type || '-'}</span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-orange-600">{log.tokens_used}</td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs">
                {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}
              </td>
            </tr>);
        })}
          {logs.length === 0 && (<tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                暂无消耗记录
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>);
};
exports.default = AdminTokenMonitorPage;
