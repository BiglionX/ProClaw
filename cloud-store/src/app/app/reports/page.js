// ProClaw Shop - 数据报表中心
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
exports.default = ReportsPage;
var react_1 = require("react");
var react_hot_toast_1 = require("react-hot-toast");
var reportTypes = [
    { key: 'sales', label: '销售报表', icon: '📈', color: 'blue' },
    { key: 'inventory', label: '库存报表', icon: '📦', color: 'green' },
    { key: 'finance', label: '财务报表', icon: '💰', color: 'yellow' },
    { key: 'customer', label: '客户分析', icon: '👥', color: 'purple' },
];
var periods = [
    { key: 'today', label: '今天' },
    { key: 'week', label: '近7天' },
    { key: 'month', label: '近30天' },
    { key: 'quarter', label: '近90天' },
    { key: 'year', label: '近1年' },
];
function ReportsPage() {
    var _this = this;
    var _a = (0, react_1.useState)('sales'), reportType = _a[0], setReportType = _a[1];
    var _b = (0, react_1.useState)('month'), period = _b[0], setPeriod = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(null), data = _d[0], setData = _d[1];
    var isFirstRender = (0, react_1.useRef)(true);
    // 加载报表数据
    var loadReport = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var res, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch("/api/reports?type=".concat(reportType, "&period=").concat(period))];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _b.sent();
                    if (result.success) {
                        setData(result.data);
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || '加载报表失败');
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('加载报表失败');
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [reportType, period]);
    // 初始加载
    (0, react_1.useEffect)(function () {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            loadReport();
        }
    }, [loadReport]);
    // 当报表类型或周期变化时重新加载
    (0, react_1.useEffect)(function () {
        if (!isFirstRender.current) {
            loadReport();
        }
    }, [reportType, period, loadReport]);
    // 格式化金额
    var formatMoney = function (amount) {
        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2,
        }).format(amount);
    };
    // 格式化数量
    var formatNumber = function (num) {
        return new Intl.NumberFormat('zh-CN').format(num);
    };
    // 渲染销售报表
    var renderSalesReport = function () {
        if (!(data === null || data === void 0 ? void 0 : data.summary))
            return null;
        var summary = data.summary;
        return (<div className="space-y-6">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">订单总数</div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalOrders)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">销售总额</div>
            <div className="text-2xl font-bold text-blue-600">{formatMoney(summary.totalAmount)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">已收款</div>
            <div className="text-2xl font-bold text-green-600">{formatMoney(summary.paidAmount)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">平均客单价</div>
            <div className="text-2xl font-bold text-purple-600">{formatMoney(summary.averageOrderValue)}</div>
          </div>
        </div>

        {/* 订单状态分布 */}
        {data.byStatus && (<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4">订单状态分布</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data.byStatus).map(function (_a) {
                    var status = _a[0], count = _a[1];
                    return (<div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{status}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>);
                })}
            </div>
          </div>)}

        {/* 畅销商品 */}
        {data.topProducts && data.topProducts.length > 0 && (<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4">畅销商品 TOP 10</h3>
            <div className="space-y-3">
              {data.topProducts.map(function (item, index) { return (<div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-sm text-gray-500">销量: {item.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatMoney(item.amount)}</div>
                  </div>
                </div>); })}
            </div>
          </div>)}
      </div>);
    };
    // 渲染库存报表
    var renderInventoryReport = function () {
        if (!(data === null || data === void 0 ? void 0 : data.summary))
            return null;
        var summary = data.summary;
        return (<div className="space-y-6">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">商品种类</div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalSKUs)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">库存总量</div>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(summary.totalStock)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">库存价值</div>
            <div className="text-2xl font-bold text-green-600">{formatMoney(summary.inventoryValue)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">缺货商品</div>
            <div className="text-2xl font-bold text-red-600">{summary.outOfStockCount}</div>
          </div>
        </div>

        {/* 库存预警 */}
        {data.lowStockItems && data.lowStockItems.length > 0 && (<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4">库存不足预警</h3>
            <div className="space-y-3">
              {data.lowStockItems.map(function (item) { return (<div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.sku_code || '未知'}</div>
                    <div className="text-sm text-gray-500">当前库存: {item.current_stock} / 最低: {item.min_stock}</div>
                  </div>
                  <span className="text-red-600 font-medium">需补货</span>
                </div>); })}
            </div>
          </div>)}

        {/* 库存分布 */}
        {data.stockDistribution && (<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4">库存健康度</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-sm text-gray-600">正常 ({data.stockDistribution.normal})</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-sm text-gray-600">偏低 ({data.stockDistribution.low})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-sm text-gray-600">缺货 ({data.stockDistribution.out})</span>
                </div>
              </div>
            </div>
          </div>)}
      </div>);
    };
    // 渲染财务报表
    var renderFinanceReport = function () {
        if (!(data === null || data === void 0 ? void 0 : data.summary))
            return null;
        var summary = data.summary;
        return (<div className="space-y-6">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">销售收入</div>
            <div className="text-2xl font-bold text-blue-600">{formatMoney(summary.salesRevenue)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">采购成本</div>
            <div className="text-2xl font-bold text-orange-600">{formatMoney(summary.purchaseCost)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">预计利润</div>
            <div className="text-2xl font-bold text-green-600">{formatMoney(summary.estimatedProfit)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">利润率</div>
            <div className="text-2xl font-bold text-purple-600">{summary.profitMargin.toFixed(1)}%</div>
          </div>
        </div>

        {/* 收支明细 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4">收入明细</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">已收款</span>
                <span className="font-medium text-green-600">{formatMoney(summary.receivedPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">待收款</span>
                <span className="font-medium text-yellow-600">{formatMoney(summary.pendingPayment)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4">支出明细</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">已付款</span>
                <span className="font-medium text-green-600">{formatMoney(summary.paidPurchase)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">待付款</span>
                <span className="font-medium text-yellow-600">{formatMoney(summary.pendingPurchase)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>);
    };
    // 渲染客户分析报表
    var renderCustomerReport = function () {
        if (!(data === null || data === void 0 ? void 0 : data.summary))
            return null;
        var summary = data.summary;
        return (<div className="space-y-6">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">客户总数</div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalCustomers)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">活跃客户</div>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(summary.activeCustomers)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">新客户</div>
            <div className="text-2xl font-bold text-green-600">{formatNumber(summary.newCustomers)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm mb-1">平均客单价</div>
            <div className="text-2xl font-bold text-purple-600">{formatMoney(summary.avgOrderValue)}</div>
          </div>
        </div>

        {/* 优质客户 */}
        {data.topCustomers && data.topCustomers.length > 0 && (<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4">优质客户 TOP 10</h3>
            <div className="space-y-3">
              {data.topCustomers.map(function (item, index) { return (<div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-medium text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-sm text-gray-500">订单数: {item.orderCount}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatMoney(item.totalAmount)}</div>
                    <div className="text-xs text-gray-500">客单价: {formatMoney(item.avgOrderValue)}</div>
                  </div>
                </div>); })}
            </div>
          </div>)}
      </div>);
    };
    // 渲染对应的报表
    var renderReport = function () {
        switch (reportType) {
            case 'sales':
                return renderSalesReport();
            case 'inventory':
                return renderInventoryReport();
            case 'finance':
                return renderFinanceReport();
            case 'customer':
                return renderCustomerReport();
            default:
                return null;
        }
    };
    return (<div className="max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据报表</h1>
        <p className="text-sm text-gray-500 mt-1">查看经营数据分析，深入了解业务状况</p>
      </div>

      {/* 报表类型切换 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {reportTypes.map(function (type) { return (<button key={type.key} onClick={function () { return setReportType(type.key); }} className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ".concat(reportType === type.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>); })}
        </div>

        {/* 时间范围选择 */}
        <div className="flex flex-wrap gap-2">
          {periods.map(function (p) { return (<button key={p.key} onClick={function () { return setPeriod(p.key); }} className={"px-3 py-1.5 rounded-lg text-sm transition-colors ".concat(period === p.key
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
              {p.label}
            </button>); })}
        </div>
      </div>

      {/* 日期范围显示 */}
      {(data === null || data === void 0 ? void 0 : data.dateRange) && (<div className="text-sm text-gray-500 mb-4">
          数据范围: {data.dateRange.start} 至 {data.dateRange.end}
          {loading && <span className="ml-2 text-blue-600">加载中...</span>}
        </div>)}

      {/* 报表内容 */}
      <div className="min-h-96">
        {!data && !loading ? (<div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <p>选择报表类型查看数据</p>
            </div>
          </div>) : (renderReport())}
      </div>

      {/* Token 消耗提示 */}
      <div className="mt-6 text-center text-sm text-gray-400">
        每次查看报表消耗 10 Token
      </div>
    </div>);
}
