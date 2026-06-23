// ProClaw Cloud 托管版 - 库存管理页面
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InventoryPage;
var react_1 = require("react");
function InventoryPage() {
    var _a = (0, react_1.useState)('summary'), activeTab = _a[0], setActiveTab = _a[1];
    var _b = (0, react_1.useState)([]), stockData = _b[0], setStockData = _b[1];
    var _c = (0, react_1.useState)([]), transactions = _c[0], setTransactions = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    var _e = (0, react_1.useState)(1), txPage = _e[0], setTxPage = _e[1];
    var _f = (0, react_1.useState)(0), txTotal = _f[0], setTxTotal = _f[1];
    var pageSize = 50;
    var loadSummary = function () {
        setLoading(true);
        fetch('/api/inventory?type=summary')
            .then(function (res) { return res.ok ? res.json() : { data: [] }; })
            .then(function (data) { setStockData(data.data || []); setLoading(false); })
            .catch(function () { return setLoading(false); });
    };
    var loadTransactions = function (p) {
        if (p === void 0) { p = 1; }
        setLoading(true);
        fetch("/api/inventory?type=transactions&page=".concat(p, "&pageSize=").concat(pageSize))
            .then(function (res) { return res.ok ? res.json() : { data: [], total: 0 }; })
            .then(function (data) { setTransactions(data.data || []); setTxTotal(data.total || 0); setTxPage(p); setLoading(false); })
            .catch(function () { return setLoading(false); });
    };
    (0, react_1.useEffect)(function () { (0, react_1.startTransition)(function () { loadSummary(); }); }, []);
    (0, react_1.useEffect)(function () {
        (0, react_1.startTransition)(function () {
            if (activeTab === 'transactions')
                loadTransactions();
            else
                loadSummary();
        });
    }, [activeTab]);
    var txTotalPages = Math.ceil(txTotal / pageSize);
    var lowStockItems = stockData.filter(function (s) { return s.current_stock <= s.min_stock; });
    return (<div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">库存管理</h1>

      {/* 低库存预警 */}
      {lowStockItems.length > 0 && activeTab === 'summary' && (<div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <span className="text-lg">⚠</span>
            <span>低库存预警（{lowStockItems.length} 个商品库存不足）</span>
          </div>
          <div className="text-sm text-red-600 space-y-1">
            {lowStockItems.slice(0, 5).map(function (s) {
                var _a;
                return (<div key={s.id} className="flex justify-between">
                <span>{(_a = s.products_spu) === null || _a === void 0 ? void 0 : _a.name} {s.spec_text ? "(".concat(s.spec_text, ")") : ''}</span>
                <span className="font-medium">库存: {s.current_stock} / 最低: {s.min_stock}</span>
              </div>);
            })}
            {lowStockItems.length > 5 && (<div className="text-red-500">...还有 {lowStockItems.length - 5} 个商品库存不足</div>)}
          </div>
        </div>)}

      {/* Tab */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={function () { return setActiveTab('summary'); }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors ".concat(activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900')}>库存概况</button>
        <button onClick={function () { return setActiveTab('transactions'); }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors ".concat(activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900')}>交易记录</button>
      </div>

      {activeTab === 'summary' && (<>
          {loading ? (<div className="text-center py-12 text-gray-500">加载中...</div>) : stockData.length === 0 ? (<div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">🏭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无库存数据</h3>
              <p className="text-gray-500">请先创建商品</p>
            </div>) : (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">商品名称</th>
                      <th className="px-4 py-3 font-medium">规格</th>
                      <th className="px-4 py-3 font-medium">SKU编码</th>
                      <th className="px-4 py-3 font-medium text-right">当前库存</th>
                      <th className="px-4 py-3 font-medium text-right">最低库存</th>
                      <th className="px-4 py-3 font-medium text-right">成本价</th>
                      <th className="px-4 py-3 font-medium text-right">售价</th>
                      <th className="px-4 py-3 font-medium text-center">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.map(function (s) {
                    var _a, _b, _c;
                    var isLow = s.current_stock <= s.min_stock;
                    return (<tr key={s.id} className={"border-t border-gray-100 hover:bg-gray-50 ".concat(isLow ? 'bg-red-50' : '')}>
                          <td className="px-4 py-3 text-gray-900 font-medium">{((_a = s.products_spu) === null || _a === void 0 ? void 0 : _a.name) || '--'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{s.spec_text || '--'}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.sku_code}</td>
                          <td className={"px-4 py-3 text-right font-medium ".concat(isLow ? 'text-red-600' : 'text-gray-900')}>
                            {s.current_stock}
                            {isLow && <span className="text-red-500 ml-1">⚠</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">{s.min_stock}</td>
                          <td className="px-4 py-3 text-right text-gray-600">¥{(_b = s.cost_price) === null || _b === void 0 ? void 0 : _b.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">¥{(_c = s.sell_price) === null || _c === void 0 ? void 0 : _c.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium ".concat(s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                              {s.status === 'active' ? '正常' : '停用'}
                            </span>
                          </td>
                        </tr>);
                })}
                  </tbody>
                </table>
              </div>
            </div>)}
        </>)}

      {activeTab === 'transactions' && (<>
          {loading ? (<div className="text-center py-12 text-gray-500">加载中...</div>) : transactions.length === 0 ? (<div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无交易记录</h3>
            </div>) : (<>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-4 py-3 font-medium">类型</th>
                        <th className="px-4 py-3 font-medium text-right">数量</th>
                        <th className="px-4 py-3 font-medium">参考单号</th>
                        <th className="px-4 py-3 font-medium">原因</th>
                        <th className="px-4 py-3 font-medium">备注</th>
                        <th className="px-4 py-3 font-medium">时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(function (tx) { return (<tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium ".concat(tx.transaction_type === 'in' ? 'bg-green-100 text-green-700' :
                        tx.transaction_type === 'out' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700')}>
                              {tx.transaction_type === 'in' ? '入库' : tx.transaction_type === 'out' ? '出库' : '盘点'}
                            </span>
                          </td>
                          <td className={"px-4 py-3 text-right font-medium ".concat(tx.transaction_type === 'in' ? 'text-green-600' : 'text-red-600')}>
                            {tx.transaction_type === 'in' ? '+' : '-'}{tx.quantity}
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{tx.reference_no || '--'}</td>
                          <td className="px-4 py-3 text-gray-600">{tx.reason || '--'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-50 truncate">{tx.notes || '--'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(tx.created_at).toLocaleString('zh-CN')}</td>
                        </tr>); })}
                    </tbody>
                  </table>
                </div>
              </div>
              {txTotalPages > 1 && (<div className="flex justify-center items-center gap-2">
                  <button onClick={function () { return loadTransactions(txPage - 1); }} disabled={txPage === 1} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">上一页</button>
                  <span className="text-sm text-gray-600">第 {txPage} / {txTotalPages} 页</span>
                  <button onClick={function () { return loadTransactions(txPage + 1); }} disabled={txPage === txTotalPages} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">下一页</button>
                </div>)}
            </>)}
        </>)}
    </div>);
}
