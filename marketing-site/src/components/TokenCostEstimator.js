"use strict";
// 费用估算计算器组件
// 用户输入预期用量，实时计算 Token 消耗和等效人民币
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
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var USAGE_INPUTS = [
    { key: 'product_sync', label: '月新增商品同步', unit: '个', defaultValue: 50, ptCost: 50 },
    { key: 'ai_theme', label: 'AI 主题生成', unit: '次/月', defaultValue: 1, ptCost: 5000 },
    { key: 'order_process', label: '月订单处理', unit: '单', defaultValue: 80, ptCost: 10 },
    { key: 'realtime_sync', label: '实时同步', unit: '月', defaultValue: 1, ptCost: 15000 },
    { key: 'custom_domain', label: '自定义域名', unit: '个', defaultValue: 1, ptCost: 2000 },
    { key: 'product_hosting', label: '存量商品数', unit: '个', defaultValue: 150, ptCost: 2 },
    { key: 'image_storage', label: '存量图片', unit: 'MB', defaultValue: 200, ptCost: 1 },
];
// 充值套餐参考
var RECHARGE_PACKAGES = [
    { name: '体验包', price: '¥10', pt: 10000 },
    { name: '入门包', price: '¥50', pt: 55000 },
    { name: '标准包', price: '¥200', pt: 240000 },
    { name: '专业包', price: '¥700', pt: 910000 },
    { name: '企业包', price: '¥3,000', pt: 4500000 },
];
var TokenCostEstimator = function () {
    var _a = (0, react_1.useState)(Object.fromEntries(USAGE_INPUTS.map(function (i) { return [i.key, i.defaultValue]; }))), usage = _a[0], setUsage = _a[1];
    var updateUsage = function (key, value) {
        var num = parseInt(value) || 0;
        setUsage(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[key] = Math.max(0, num), _a)));
        });
    };
    // 计算总消耗
    var totals = (0, react_1.useMemo)(function () {
        var totalPt = 0;
        var details = USAGE_INPUTS.map(function (input) {
            var qty = usage[input.key] || 0;
            var pt = input.ptCost * qty;
            totalPt += pt;
            return __assign(__assign({}, input), { quantity: qty, pt: pt, cost: pt * 0.001 });
        });
        return { totalPt: totalPt, totalCost: totalPt * 0.001, details: details };
    }, [usage]);
    // 推荐套餐
    var recommendedPackage = (0, react_1.useMemo)(function () {
        // 建议充值量为月消耗的 1.5~2 倍
        var suggested = totals.totalPt * 1.5;
        var best = RECHARGE_PACKAGES[0];
        for (var _i = 0, RECHARGE_PACKAGES_1 = RECHARGE_PACKAGES; _i < RECHARGE_PACKAGES_1.length; _i++) {
            var pkg = RECHARGE_PACKAGES_1[_i];
            if (pkg.pt >= suggested) {
                best = pkg;
                break;
            }
        }
        return best;
    }, [totals.totalPt]);
    return (<div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-2">费用估算计算器</h3>
      <p className="text-sm text-gray-500 mb-6">输入您的预期月用量，自动计算 Token 消耗和费用</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {USAGE_INPUTS.map(function (input) { return (<div key={input.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <label className="text-sm text-gray-700">
              {input.label}
              <span className="text-xs text-gray-400 ml-1">({input.unit})</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="number" value={usage[input.key]} onChange={function (e) { return updateUsage(input.key, e.target.value); }} min="0" className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-gray-900"/>
              <span className="text-xs text-gray-400 w-12">
                = {(input.ptCost * (usage[input.key] || 0)).toLocaleString()} PT
              </span>
            </div>
          </div>); })}
      </div>

      {/* 消耗汇总 */}
      <div className="bg-gray-900 text-white rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-400 mb-1">预估月消耗 PT</p>
            <p className="text-3xl font-bold">{totals.totalPt.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">等效人民币</p>
            <p className="text-3xl font-bold">¥{totals.totalCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">推荐充值</p>
            <p className="text-3xl font-bold">{recommendedPackage.name} <span className="text-lg text-gray-300">{recommendedPackage.price}</span></p>
          </div>
        </div>
      </div>

      {/* 详细清单 */}
      <details className="mb-6">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
          查看详细消耗清单
        </summary>
        <div className="mt-4 space-y-2">
          {totals.details.map(function (d) { return (<div key={d.key} className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-700">{d.label}</span>
              <span className="text-gray-900 font-medium">{d.pt.toLocaleString()} PT (¥{d.cost.toFixed(2)})</span>
            </div>); })}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg text-sm font-bold">
            <span className="text-gray-900">合计</span>
            <span className="text-gray-900">{totals.totalPt.toLocaleString()} PT (¥{totals.totalCost.toFixed(2)})</span>
          </div>
        </div>
      </details>

      {/* 对比旧套餐 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-900 mb-2">与旧套餐对比</p>
        <div className="text-sm text-blue-800 space-y-1">
          <p>免费版 (¥0) → Token 模式约 ¥{totals.totalCost.toFixed(2)}（按实际用量，不超过赠送额度则免费）</p>
          <p>基础版 (¥29/月) → Token 模式约 ¥{totals.totalCost.toFixed(2)}，{totals.totalCost <= 29 ? '节省' : '略高于'}旧套餐</p>
          <p>专业版 (¥99/月) → Token 模式约 ¥{totals.totalCost.toFixed(2)}</p>
          <p className="text-xs text-blue-600 mt-1">* 仅对实际使用的功能计费，不再为未使用的配额付费</p>
        </div>
      </div>
    </div>);
};
exports.default = TokenCostEstimator;
