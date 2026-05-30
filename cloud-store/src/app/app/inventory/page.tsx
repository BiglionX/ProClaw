// ProClaw Cloud 托管版 - 库存管理页面
'use client';

import { useEffect, useState, startTransition } from 'react';

interface SkuStock {
  id: string;
  sku_code: string;
  spec_text: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  cost_price: number;
  sell_price: number;
  spu_id: string;
  status: string;
  products_spu: {
    name: string;
    spu_code: string;
  };
}

interface Transaction {
  id: string;
  product_id: string;
  sku_id: string;
  transaction_type: string;
  quantity: number;
  reference_no: string;
  reason: string;
  notes: string;
  created_at: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');
  const [stockData, setStockData] = useState<SkuStock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const pageSize = 50;

  const loadSummary = () => {
    setLoading(true);
    fetch('/api/inventory?type=summary')
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => { setStockData(data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadTransactions = (p = 1) => {
    setLoading(true);
    fetch(`/api/inventory?type=transactions&page=${p}&pageSize=${pageSize}`)
      .then(res => res.ok ? res.json() : { data: [], total: 0 })
      .then(data => { setTransactions(data.data || []); setTxTotal(data.total || 0); setTxPage(p); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { startTransition(() => { loadSummary(); }); }, []);

  useEffect(() => {
    startTransition(() => {
      if (activeTab === 'transactions') loadTransactions();
      else loadSummary();
    });
  }, [activeTab]);

  const txTotalPages = Math.ceil(txTotal / pageSize);

  const lowStockItems = stockData.filter(s => s.current_stock <= s.min_stock);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">库存管理</h1>

      {/* 低库存预警 */}
      {lowStockItems.length > 0 && activeTab === 'summary' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <span className="text-lg">⚠</span>
            <span>低库存预警（{lowStockItems.length} 个商品库存不足）</span>
          </div>
          <div className="text-sm text-red-600 space-y-1">
            {lowStockItems.slice(0, 5).map(s => (
              <div key={s.id} className="flex justify-between">
                <span>{s.products_spu?.name} {s.spec_text ? `(${s.spec_text})` : ''}</span>
                <span className="font-medium">库存: {s.current_stock} / 最低: {s.min_stock}</span>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <div className="text-red-500">...还有 {lowStockItems.length - 5} 个商品库存不足</div>
            )}
          </div>
        </div>
      )}

      {/* Tab */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>库存概况</button>
        <button onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>交易记录</button>
      </div>

      {activeTab === 'summary' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : stockData.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">🏭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无库存数据</h3>
              <p className="text-gray-500">请先创建商品</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                    {stockData.map((s) => {
                      const isLow = s.current_stock <= s.min_stock;
                      return (
                        <tr key={s.id} className={`border-t border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 text-gray-900 font-medium">{s.products_spu?.name || '--'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{s.spec_text || '--'}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.sku_code}</td>
                          <td className={`px-4 py-3 text-right font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                            {s.current_stock}
                            {isLow && <span className="text-red-500 ml-1">⚠</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">{s.min_stock}</td>
                          <td className="px-4 py-3 text-right text-gray-600">¥{s.cost_price?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">¥{s.sell_price?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {s.status === 'active' ? '正常' : '停用'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'transactions' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : transactions.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无交易记录</h3>
            </div>
          ) : (
            <>
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
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              tx.transaction_type === 'in' ? 'bg-green-100 text-green-700' :
                              tx.transaction_type === 'out' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {tx.transaction_type === 'in' ? '入库' : tx.transaction_type === 'out' ? '出库' : '盘点'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${tx.transaction_type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.transaction_type === 'in' ? '+' : '-'}{tx.quantity}
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{tx.reference_no || '--'}</td>
                          <td className="px-4 py-3 text-gray-600">{tx.reason || '--'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-50 truncate">{tx.notes || '--'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(tx.created_at).toLocaleString('zh-CN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {txTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <button onClick={() => loadTransactions(txPage - 1)} disabled={txPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">上一页</button>
                  <span className="text-sm text-gray-600">第 {txPage} / {txTotalPages} 页</span>
                  <button onClick={() => loadTransactions(txPage + 1)} disabled={txPage === txTotalPages}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">下一页</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
