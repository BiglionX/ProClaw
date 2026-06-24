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
var supabase_1 = require("../lib/supabase");
var Navbar_1 = require("../components/Navbar");
var Footer_1 = require("../components/Footer");
var tokenService_1 = require("../lib/tokenService");
var ProfileTab_1 = require("../components/user-center/ProfileTab");
var SecurityTab_1 = require("../components/user-center/SecurityTab");
var SubscriptionTab_1 = require("../components/user-center/SubscriptionTab");
var ApiKeyTab_1 = require("../components/user-center/ApiKeyTab");
var TokenTab_1 = require("../components/user-center/TokenTab");
var CloudDataTab_1 = require("../components/user-center/CloudDataTab");
// ============================================================
// 模拟数据
// ============================================================
var MOCK_API_KEYS = [
    { id: '1', provider: 'openai', key_name: 'GPT-4 密钥', is_active: true, used_count: 1234, created_at: '2026-01-15' },
    { id: '2', provider: 'deepseek', key_name: 'DeepSeek 密钥', is_active: true, used_count: 5678, created_at: '2026-02-20' },
];
// ============================================================
// 主组件
// ============================================================
var UserCenterPage = function () {
    var _a;
    var _b = (0, authStore_1.useAuthStore)(), user = _b.user, profile = _b.profile, updateProfile = _b.updateProfile;
    var _c = (0, react_1.useState)(0), activeTab = _c[0], setActiveTab = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    // 各 Tab 数据状态
    var _e = (0, react_1.useState)(MOCK_API_KEYS), apiKeys = _e[0], setApiKeys = _e[1];
    var _f = (0, react_1.useState)({
        plan_type: 'pro', status: 'active', started_at: '2026-01-01',
        expires_at: '2026-12-31', auto_renew: true, billing_cycle: 'monthly',
    }), subscription = _f[0], setSubscription = _f[1];
    // Profile 编辑
    var _g = (0, react_1.useState)(''), editUsername = _g[0], setEditUsername = _g[1];
    var _h = (0, react_1.useState)(null), profileMsg = _h[0], setProfileMsg = _h[1];
    // 密码修改
    var _j = (0, react_1.useState)(''), oldPwd = _j[0], setOldPwd = _j[1];
    var _k = (0, react_1.useState)(''), newPwd = _k[0], setNewPwd = _k[1];
    var _l = (0, react_1.useState)(''), confirmPwd = _l[0], setConfirmPwd = _l[1];
    var _m = (0, react_1.useState)(null), pwdMsg = _m[0], setPwdMsg = _m[1];
    // Token
    var _o = (0, react_1.useState)(null), tokenBalanceData = _o[0], setTokenBalanceData = _o[1];
    var _p = (0, react_1.useState)([]), tokenPackages = _p[0], setTokenPackages = _p[1];
    var _q = (0, react_1.useState)([]), purchaseHistory = _q[0], setPurchaseHistory = _q[1];
    var _r = (0, react_1.useState)(null), setTokenConfig = _r[1];
    var _s = (0, react_1.useState)(1), consumptionPage = _s[0], setConsumptionPage = _s[1];
    var _t = (0, react_1.useState)(null), consumptionData = _t[0], setConsumptionData = _t[1];
    var _u = (0, react_1.useState)(false), tokenLoading = _u[0], setTokenLoading = _u[1];
    var _v = (0, react_1.useState)(null), buyMsg = _v[0], setBuyMsg = _v[1];
    var _w = (0, react_1.useState)(null), configMsg = _w[0], setConfigMsg = _w[1];
    var _x = (0, react_1.useState)(10000), lowBalanceThreshold = _x[0], setLowBalanceThreshold = _x[1];
    var _y = (0, react_1.useState)(0), dailyLimit = _y[0], setDailyLimit = _y[1];
    var _z = (0, react_1.useState)(false), autoRecharge = _z[0], setAutoRecharge = _z[1];
    var _0 = (0, react_1.useState)(''), autoRechargePkg = _0[0], setAutoRechargePkg = _0[1];
    var _1 = (0, react_1.useState)(true), notifyEmail = _1[0], setNotifyEmail = _1[1];
    var _2 = (0, react_1.useState)(false), notifyWechat = _2[0], setNotifyWechat = _2[1];
    var tabs = ['个人资料', '账号安全', '套餐订阅', 'API 密钥', 'Token 管理', '云数据管理'];
    (0, react_1.useEffect)(function () {
        setEditUsername((profile === null || profile === void 0 ? void 0 : profile.username) || '');
        var timer = setTimeout(function () { return setLoading(false); }, 300);
        return function () { return clearTimeout(timer); };
    }, [profile]);
    // 保存个人资料
    var handleSaveProfile = function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!editUsername.trim())
                        return [2 /*return*/];
                    setProfileMsg(null);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, updateProfile({ username: editUsername.trim() })];
                case 2:
                    _b.sent();
                    setProfileMsg({ type: 'success', text: '个人资料已更新' });
                    setTimeout(function () { return setProfileMsg(null); }, 3000);
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    setProfileMsg({ type: 'error', text: '更新失败，请重试' });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // 修改密码
    var handleChangePassword = function () { return __awaiter(void 0, void 0, void 0, function () {
        var error, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setPwdMsg(null);
                    if (!oldPwd || !newPwd || !confirmPwd) {
                        setPwdMsg({ type: 'error', text: '请填写所有密码字段' });
                        return [2 /*return*/];
                    }
                    if (newPwd !== confirmPwd) {
                        setPwdMsg({ type: 'error', text: '新密码与确认密码不一致' });
                        return [2 /*return*/];
                    }
                    if (newPwd.length < 6) {
                        setPwdMsg({ type: 'error', text: '新密码至少 6 位' });
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase_1.supabase.auth.updateUser({ password: newPwd })];
                case 2:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    setPwdMsg({ type: 'success', text: '密码已修改成功' });
                    setOldPwd('');
                    setNewPwd('');
                    setConfirmPwd('');
                    setTimeout(function () { return setPwdMsg(null); }, 3000);
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    setPwdMsg({ type: 'error', text: err_1.message || '修改失败' });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // Token 购买
    var handleBuyTokens = function (pkg) { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user)
                        return [2 /*return*/];
                    setTokenLoading(true);
                    return [4 /*yield*/, (0, tokenService_1.purchaseToken)(user.id, pkg.id)];
                case 1:
                    result = _a.sent();
                    setTokenLoading(false);
                    if (result.success) {
                        setBuyMsg({ type: 'success', text: "\u5DF2\u8D2D\u4E70 ".concat(pkg.name, "\uFF08").concat(pkg.token_amount.toLocaleString(), " Token\uFF09\uFF0C\u5B9E\u4ED8 \u00A5").concat((pkg.price * (1 - pkg.discount_percentage / 100)).toFixed(2)) });
                        loadTokenData();
                        setTimeout(function () { return setBuyMsg(null); }, 5000);
                    }
                    else {
                        setBuyMsg({ type: 'error', text: result.error || '购买失败' });
                        setTimeout(function () { return setBuyMsg(null); }, 5000);
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    // Token 数据加载
    var loadTokenData = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, balance, packages, history_1, config, consumption, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!user)
                        return [2 /*return*/];
                    setTokenLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, Promise.all([
                            (0, tokenService_1.getTokenBalanceSummary)(user.id),
                            (0, tokenService_1.getTokenPackages)(),
                            (0, tokenService_1.getPurchaseHistory)(user.id),
                            (0, tokenService_1.getUserTokenConfig)(user.id),
                            (0, tokenService_1.getTokenConsumption)(user.id, undefined, consumptionPage, 20),
                        ])];
                case 2:
                    _a = _b.sent(), balance = _a[0], packages = _a[1], history_1 = _a[2], config = _a[3], consumption = _a[4];
                    if (balance)
                        setTokenBalanceData(balance);
                    if (packages)
                        setTokenPackages(packages);
                    if (history_1)
                        setPurchaseHistory(history_1);
                    if (config) {
                        setTokenConfig(config);
                        setLowBalanceThreshold(config.low_balance_threshold);
                        setDailyLimit(config.daily_limit);
                        setAutoRecharge(config.auto_recharge_enabled);
                        setAutoRechargePkg(config.auto_recharge_package_id || '');
                        setNotifyEmail(config.notification_email);
                        setNotifyWechat(config.notification_wechat);
                    }
                    if (consumption)
                        setConsumptionData(consumption);
                    return [3 /*break*/, 5];
                case 3:
                    err_2 = _b.sent();
                    console.error('加载 Token 数据失败:', err_2);
                    return [3 /*break*/, 5];
                case 4:
                    setTokenLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [user, consumptionPage]);
    // 保存 Token 配置
    var handleSaveTokenConfig = function () { return __awaiter(void 0, void 0, void 0, function () {
        var success;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, tokenService_1.updateUserTokenConfig)(user.id, {
                            low_balance_threshold: lowBalanceThreshold,
                            daily_limit: dailyLimit,
                            auto_recharge_enabled: autoRecharge,
                            auto_recharge_package_id: autoRechargePkg || null,
                            notification_email: notifyEmail,
                            notification_wechat: notifyWechat,
                        })];
                case 1:
                    success = _a.sent();
                    if (success) {
                        setConfigMsg({ type: 'success', text: '配置已保存' });
                    }
                    else {
                        setConfigMsg({ type: 'error', text: '保存失败' });
                    }
                    setTimeout(function () { return setConfigMsg(null); }, 3000);
                    return [2 /*return*/];
            }
        });
    }); };
    // 页面加载时获取 Token 数据
    (0, react_1.useEffect)(function () {
        if (activeTab === 4 && user) {
            loadTokenData();
        }
    }, [activeTab, user, loadTokenData]);
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>);
    }
    // 渲染当前 Tab 内容
    var renderTabContent = function () {
        switch (activeTab) {
            case 0:
                return (<ProfileTab_1.default user={user} profile={profile} editUsername={editUsername} setEditUsername={setEditUsername} profileMsg={profileMsg} handleSaveProfile={handleSaveProfile}/>);
            case 1:
                return (<SecurityTab_1.default oldPwd={oldPwd} setOldPwd={setOldPwd} newPwd={newPwd} setNewPwd={setNewPwd} confirmPwd={confirmPwd} setConfirmPwd={setConfirmPwd} pwdMsg={pwdMsg} handleChangePassword={handleChangePassword}/>);
            case 2:
                return (<SubscriptionTab_1.default subscription={subscription} setSubscription={setSubscription}/>);
            case 3:
                return (<ApiKeyTab_1.default apiKeys={apiKeys} setApiKeys={setApiKeys}/>);
            case 4:
                return (<TokenTab_1.default tokenBalanceData={tokenBalanceData} tokenPackages={tokenPackages} purchaseHistory={purchaseHistory} consumptionData={consumptionData} tokenLoading={tokenLoading} consumptionPage={consumptionPage} setConsumptionPage={setConsumptionPage} buyMsg={buyMsg} configMsg={configMsg} lowBalanceThreshold={lowBalanceThreshold} setLowBalanceThreshold={setLowBalanceThreshold} dailyLimit={dailyLimit} setDailyLimit={setDailyLimit} autoRecharge={autoRecharge} setAutoRecharge={setAutoRecharge} autoRechargePkg={autoRechargePkg} setAutoRechargePkg={setAutoRechargePkg} notifyEmail={notifyEmail} setNotifyEmail={setNotifyEmail} notifyWechat={notifyWechat} setNotifyWechat={setNotifyWechat} handleBuyTokens={handleBuyTokens} handleSaveTokenConfig={handleSaveTokenConfig}/>);
            case 5:
                return (<CloudDataTab_1.default subscription={subscription} setActiveTab={setActiveTab}/>);
            default:
                return null;
        }
    };
    return (<div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar_1.default />

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {((profile === null || profile === void 0 ? void 0 : profile.username) || (user === null || user === void 0 ? void 0 : user.email) || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{(profile === null || profile === void 0 ? void 0 : profile.username) || ((_a = user === null || user === void 0 ? void 0 : user.email) === null || _a === void 0 ? void 0 : _a.split('@')[0])}</h1>
              <p className="text-sm text-gray-500">{user === null || user === void 0 ? void 0 : user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {(profile === null || profile === void 0 ? void 0 : profile.role) === 'admin' ? '管理员' : '用户'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex">
              {tabs.map(function (tab, i) { return (<button key={tab} onClick={function () { return setActiveTab(i); }} className={"px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ".concat(activeTab === i
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-700')}>
                  {tab}
                </button>); })}
            </div>
          </div>

          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      <Footer_1.default />
    </div>);
};
exports.default = UserCenterPage;
