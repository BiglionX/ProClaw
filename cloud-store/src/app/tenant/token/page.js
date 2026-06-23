// ProClaw Shop - Token 管理页面
'use client';
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
exports.default = TokenManagementPage;
var react_1 = require("react");
var link_1 = require("next/link");
// 资源类型中文映射
var resourceTypeNames = {
    'ai_chat': 'AI 对话',
    'ai_product_query': '商品智能查询',
    'ai_order_ocr': '订单 OCR 识别',
    'ai_order_recognition': '订单智能识别',
    'data_export': '数据导出',
    'data_sync': '数据同步',
    'chat_message': '客服消息',
    'other': '其他',
};
function TokenManagementPage() {
    var _this = this;
    var _a = (0, react_1.useState)({ balance: 0, used: 0, plan: 'trial' }), tokenInfo = _a[0], setTokenInfo = _a[1];
    var _b = (0, react_1.useState)([]), usageRecords = _b[0], setUsageRecords = _b[1];
    var _c = (0, react_1.useState)({ today: 0, week: 0, month: 0, total: 0 }), usageSummary = _c[0], setUsageSummary = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    (0, react_1.useEffect)(function () {
        // 数据获取逻辑
        var loadData = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, tokenRes, usageRes, tokenData, usageData, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, 5, 6]);
                        return [4 /*yield*/, Promise.all([
                                fetch('/api/tenant/token'),
                                fetch('/api/tenant/usage')
                            ])];
                    case 1:
                        _a = _b.sent(), tokenRes = _a[0], usageRes = _a[1];
                        return [4 /*yield*/, tokenRes.json()];
                    case 2:
                        tokenData = _b.sent();
                        return [4 /*yield*/, usageRes.json()];
                    case 3:
                        usageData = _b.sent();
                        if (tokenData.success)
                            setTokenInfo(tokenData.data);
                        if (usageData.success) {
                            setUsageRecords(usageData.data.records || []);
                            setUsageSummary(usageData.data.summary || { today: 0, week: 0, month: 0, total: 0 });
                        }
                        return [3 /*break*/, 6];
                    case 4:
                        error_1 = _b.sent();
                        console.error('Failed to fetch data:', error_1);
                        return [3 /*break*/, 6];
                    case 5:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        loadData();
    }, []);
    var getResourceName = function (type) {
        return resourceTypeNames[type] || type;
    };
    var formatDate = function (dateStr) {
        var date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    if (loading) {
        return (<div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"/>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <link_1.default href="/tenant/dashboard" className="text-gray-500 hover:text-gray-900">
                &larr; 返回
              </link_1.default>
              <h1 className="text-xl font-bold text-gray-900">Token 管理</h1>
            </div>
            <span className="text-sm text-gray-500">
              余额: <span className="font-bold text-purple-600">{tokenInfo.balance}</span> PT
            </span>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Token 余额卡片 */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-200 text-sm mb-1">当前余额</div>
              <div className="text-4xl font-bold mb-2">{tokenInfo.balance} <span className="text-xl">PT</span></div>
              <div className="text-purple-200 text-sm">已使用 {tokenInfo.used} PT | 套餐: {tokenInfo.plan === 'trial' ? '试用' : '正式'}</div>
            </div>
            <button className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors" onClick={function () { return alert('充值功能即将上线，请联系客服'); }}>
              立即充值
            </button>
          </div>
        </div>

        {/* 用量统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">今日消耗</div>
            <div className="text-2xl font-bold text-red-500">{usageSummary.today}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">本周消耗</div>
            <div className="text-2xl font-bold text-orange-500">{usageSummary.week}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">本月消耗</div>
            <div className="text-2xl font-bold text-blue-500">{usageSummary.month}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">累计消耗</div>
            <div className="text-2xl font-bold text-gray-700">{usageSummary.total}</div>
          </div>
        </div>

        {/* 消费记录 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">消费记录</h2>
          </div>
          <div className="overflow-x-auto">
            {usageRecords.length > 0 ? (<table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">消耗 PT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">接口</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usageRecords.map(function (record) { return (<tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getResourceName(record.resource_type)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-red-500">
                        -{record.tokens_used}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                        {record.endpoint || '-'}
                      </td>
                    </tr>); })}
                </tbody>
              </table>) : (<div className="p-12 text-center text-gray-500">
                暂无消费记录
              </div>)}
          </div>
        </div>

        {/* 定价说明 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Token 定价说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">AI 对话</span>
              <span className="font-medium text-purple-600">1 PT / 次</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">商品智能查询</span>
              <span className="font-medium text-purple-600">2 PT / 次</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">订单 OCR 识别</span>
              <span className="font-medium text-purple-600">5 PT / 次</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">数据导出</span>
              <span className="font-medium text-purple-600">10 PT / 次</span>
            </div>
          </div>
        </div>
      </main>
    </div>);
}
