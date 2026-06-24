"use strict";
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
var react_router_dom_1 = require("react-router-dom");
var AdminSettingsPage = function () {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)({
        rateLimitPerMinute: 60,
        rateLimitPerDay: 10000,
        lowBalanceThreshold: 10000,
        maintenanceMode: false,
        allowRegistration: true,
        requireEmailVerification: true,
        maxApiKeysPerUser: 5,
        tokenExpiryDays: 365,
        enableNotifications: true,
        supportEmail: 'support@proclaw.cc',
        pluginCdnUrl: 'https://cdn.proclaw.cc/plugins',
        pluginPublicKey: '',
        pluginAutoUpdate: 'auto',
    }), settings = _a[0], setSettings = _a[1];
    var _b = (0, react_1.useState)(false), isSaving = _b[0], setIsSaving = _b[1];
    var _c = (0, react_1.useState)(false), saveSuccess = _c[0], setSaveSuccess = _c[1];
    var handleSettingChange = function (key, value) {
        setSettings(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[key] = value, _a)));
        });
        setSaveSuccess(false);
    };
    var handleSave = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            setIsSaving(true);
            // 模拟保存操作
            setTimeout(function () {
                setIsSaving(false);
                setSaveSuccess(true);
                setTimeout(function () { return setSaveSuccess(false); }, 3000);
            }, 1000);
            return [2 /*return*/];
        });
    }); };
    var SettingSection = function (_a) {
        var title = _a.title, description = _a.description, children = _a.children;
        return (<div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
      {children}
    </div>);
    };
    var ToggleSwitch = function (_a) {
        var enabled = _a.enabled, onChange = _a.onChange, label = _a.label, description = _a.description;
        return (<div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
      </div>
      <button onClick={function () { return onChange(!enabled); }} className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors ".concat(enabled ? 'bg-blue-600' : 'bg-gray-200')}>
        <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform ".concat(enabled ? 'translate-x-6' : 'translate-x-1')}/>
      </button>
    </div>);
    };
    return (<div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button onClick={function () { return navigate('/admin'); }} className="mr-4 text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
            </div>
            <div className="flex items-center space-x-3">
              {saveSuccess && (<span className="text-sm text-green-600">✓ 设置已保存</span>)}
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                {isSaving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Rate Limiting */}
        <SettingSection title="API 速率限制" description="配置用户 API 调用的频率限制">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每分钟请求限制
              </label>
              <input type="number" value={settings.rateLimitPerMinute} onChange={function (e) { return handleSettingChange('rateLimitPerMinute', parseInt(e.target.value) || 0); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" min="1"/>
              <p className="text-xs text-gray-500 mt-1">每个用户每分钟最多允许的 API 调用次数</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每日请求限制
              </label>
              <input type="number" value={settings.rateLimitPerDay} onChange={function (e) { return handleSettingChange('rateLimitPerDay', parseInt(e.target.value) || 0); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" min="1"/>
              <p className="text-xs text-gray-500 mt-1">每个用户每天最多允许的 API 调用次数</p>
            </div>
          </div>
        </SettingSection>

        {/* Token Settings */}
        <SettingSection title="Token 管理" description="配置 Token 余额和过期策略">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                低余额提醒阈值
              </label>
              <input type="number" value={settings.lowBalanceThreshold} onChange={function (e) { return handleSettingChange('lowBalanceThreshold', parseInt(e.target.value) || 0); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" min="0"/>
              <p className="text-xs text-gray-500 mt-1">当用户 Token 余额低于此值时发送提醒</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token 过期天数
              </label>
              <input type="number" value={settings.tokenExpiryDays} onChange={function (e) { return handleSettingChange('tokenExpiryDays', parseInt(e.target.value) || 0); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" min="0"/>
              <p className="text-xs text-gray-500 mt-1">购买的 Token 在多少天后过期（0 表示永不过期）</p>
            </div>
          </div>
        </SettingSection>

        {/* User Management */}
        <SettingSection title="用户管理" description="控制用户注册和账户相关设置">
          <div className="divide-y divide-gray-200">
            <ToggleSwitch enabled={settings.allowRegistration} onChange={function (value) { return handleSettingChange('allowRegistration', value); }} label="允许新用户注册" description="关闭后将禁止新用户注册账户"/>
            <ToggleSwitch enabled={settings.requireEmailVerification} onChange={function (value) { return handleSettingChange('requireEmailVerification', value); }} label="需要邮箱验证" description="新用户注册后必须验证邮箱才能使用服务"/>
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每个用户最大 API Key 数量
              </label>
              <input type="number" value={settings.maxApiKeysPerUser} onChange={function (e) { return handleSettingChange('maxApiKeysPerUser', parseInt(e.target.value) || 0); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" min="1" max="20"/>
              <p className="text-xs text-gray-500 mt-1">限制每个用户可以创建的 API Key 数量</p>
            </div>
          </div>
        </SettingSection>

        {/* System Maintenance */}
        <SettingSection title="系统维护" description="控制系统维护和通知设置">
          <div className="divide-y divide-gray-200">
            <ToggleSwitch enabled={settings.maintenanceMode} onChange={function (value) { return handleSettingChange('maintenanceMode', value); }} label="维护模式" description="开启后所有 API 将返回维护中状态，用户无法使用服务"/>
            <ToggleSwitch enabled={settings.enableNotifications} onChange={function (value) { return handleSettingChange('enableNotifications', value); }} label="启用系统通知" description="向用户发送系统公告和重要通知"/>
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支持邮箱
              </label>
              <input type="email" value={settings.supportEmail} onChange={function (e) { return handleSettingChange('supportEmail', e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"/>
              <p className="text-xs text-gray-500 mt-1">显示给用户的支持联系邮箱</p>
            </div>
          </div>
        </SettingSection>

        {/* 插件仓库配置 */}
        <SettingSection title="插件仓库配置" description="配置行业插件的 CDN 分发和签名验证">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CDN 地址
              </label>
              <input type="text" value={settings.pluginCdnUrl} onChange={function (e) { return handleSettingChange('pluginCdnUrl', e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="https://cdn.proclaw.cc/plugins"/>
              <p className="text-xs text-gray-500 mt-1">插件包的 CDN 分发地址，桌面端从此域名下载插件</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                插件签名公钥 (Ed25519)
              </label>
              <textarea value={settings.pluginPublicKey} onChange={function (e) { return handleSettingChange('pluginPublicKey', e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-mono text-sm" rows={3} placeholder="粘贴 Ed25519 公钥，用于验证插件包签名"/>
              <p className="text-xs text-gray-500 mt-1">插件包的数字签名公钥，防止篡改。如不设置则跳过签名验证</p>
            </div>
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自动更新策略
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="pluginAutoUpdate" checked={settings.pluginAutoUpdate === 'auto'} onChange={function () { return handleSettingChange('pluginAutoUpdate', 'auto'); }} className="text-gray-900"/>
                  自动更新
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="pluginAutoUpdate" checked={settings.pluginAutoUpdate === 'manual'} onChange={function () { return handleSettingChange('pluginAutoUpdate', 'manual'); }} className="text-gray-900"/>
                  手动更新
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">自动更新：桌面端启动时自动检查并安装插件更新。手动更新：仅提示用户有可用更新</p>
            </div>
          </div>
        </SettingSection>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">危险操作</h3>
          <p className="text-sm text-red-700 mb-4">以下操作不可撤销，请谨慎使用</p>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
              清除所有 API 使用日志
            </button>
            <button className="w-full px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
              重置所有用户 Token 余额
            </button>
          </div>
        </div>
      </main>
    </div>);
};
exports.default = AdminSettingsPage;
