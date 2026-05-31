import React from 'react';
import type {
  TokenBalanceSummary,
  TokenConsumptionResult,
} from '../../types';

interface TokenPackage {
  id: string;
  name: string;
  token_amount: number;
  price: number;
  discount_percentage: number;
}

interface TokenSale {
  id: string;
  amount: number;
  price: number;
  status: string;
  created_at: string;
}

interface TokenTabProps {
  tokenBalanceData: TokenBalanceSummary | null;
  tokenPackages: TokenPackage[];
  purchaseHistory: TokenSale[];
  consumptionData: TokenConsumptionResult | null;
  tokenLoading: boolean;
  consumptionPage: number;
  setConsumptionPage: (p: number | ((p: number) => number)) => void;
  buyMsg: { type: 'success' | 'error'; text: string } | null;
  configMsg: { type: 'success' | 'error'; text: string } | null;
  lowBalanceThreshold: number;
  setLowBalanceThreshold: (v: number) => void;
  dailyLimit: number;
  setDailyLimit: (v: number) => void;
  autoRecharge: boolean;
  setAutoRecharge: (v: boolean) => void;
  autoRechargePkg: string;
  setAutoRechargePkg: (v: string) => void;
  notifyEmail: boolean;
  setNotifyEmail: (v: boolean) => void;
  notifyWechat: boolean;
  setNotifyWechat: (v: boolean) => void;
  handleBuyTokens: (pkg: TokenPackage) => void;
  handleSaveTokenConfig: () => void;
}

const TokenTab: React.FC<TokenTabProps> = ({
  tokenBalanceData,
  tokenPackages,
  purchaseHistory,
  consumptionData,
  tokenLoading,
  consumptionPage,
  setConsumptionPage,
  buyMsg,
  configMsg,
  lowBalanceThreshold,
  setLowBalanceThreshold,
  dailyLimit,
  setDailyLimit,
  autoRecharge,
  setAutoRecharge,
  autoRechargePkg,
  setAutoRechargePkg,
  notifyEmail,
  setNotifyEmail,
  notifyWechat,
  setNotifyWechat,
  handleBuyTokens,
  handleSaveTokenConfig,
}) => {
  return (
    <div className="space-y-6">
      {/* 加载中 */}
      {tokenLoading && (
        <div className="text-center py-8 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
          加载中...
        </div>
      )}

      {!tokenLoading && (
        <>
          {/* 余额概览 */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-300">当前 Token 余额</p>
              {tokenBalanceData && (
                <span className="text-xs text-gray-400" title="余额 / 近30天日均消耗">
                  预估可用 {tokenBalanceData.estimated_days} 天
                </span>
              )}
            </div>
            <p className="text-4xl font-bold mb-3">
              {tokenBalanceData ? tokenBalanceData.balance.toLocaleString() : '---'}
              <span className="text-lg text-gray-300 ml-2">PT</span>
            </p>
            <div className="flex gap-6 text-sm text-gray-300">
              <span>今日消耗: {tokenBalanceData ? tokenBalanceData.today_used.toLocaleString() : '---'} PT</span>
              <span>近30日日均: {tokenBalanceData ? tokenBalanceData.daily_avg_30d.toLocaleString() : '---'} PT</span>
            </div>
            {dailyLimit > 0 && tokenBalanceData && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>日消耗上限: {dailyLimit.toLocaleString()} PT</span>
                  <span>{Math.min(Math.round((tokenBalanceData.today_used / dailyLimit) * 100), 100)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (tokenBalanceData.today_used / dailyLimit) > 0.8
                        ? 'bg-red-500'
                        : (tokenBalanceData.today_used / dailyLimit) > 0.5
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((tokenBalanceData.today_used / dailyLimit) * 100, 100)}%` }}
                  />
                </div>
                {tokenBalanceData.today_used >= dailyLimit && (
                  <p className="text-xs text-red-400 mt-1">已到达每日消耗上限</p>
                )}
              </div>
            )}
          </div>

          {/* 消息提示 */}
          {buyMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              buyMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>{buyMsg.text}</div>
          )}

          {configMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              configMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>{configMsg.text}</div>
          )}

          {/* Token 套餐购买 */}
          <h3 className="text-lg font-semibold text-gray-900">购买 Token</h3>
          <p className="text-xs text-gray-400 mb-3">1 PT = ¥0.001（即 1,000 PT = ¥1）</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {tokenPackages.map((pkg) => {
              const finalPrice = pkg.price * (1 - pkg.discount_percentage / 100);
              return (
                <div key={pkg.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors flex flex-col">
                  <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                  <p className="text-2xl font-bold text-gray-900 mt-1">¥{finalPrice.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">
                    {pkg.discount_percentage > 0 && <span className="line-through mr-1">¥{pkg.price}</span>}
                    {pkg.discount_percentage > 0 && <span className="text-red-500">-{Math.round(pkg.discount_percentage)}%</span>}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{pkg.token_amount.toLocaleString()} PT</p>
                  <p className="text-xs text-gray-400 mt-1">
                    单价 {(pkg.price / pkg.token_amount * 1000).toFixed(2)} 元/千PT
                  </p>
                  <div className="flex-grow"></div>
                  <button
                    onClick={() => handleBuyTokens(pkg)}
                    disabled={tokenLoading}
                    className="mt-3 w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {tokenLoading ? '处理中...' : '购买'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 消费明细 */}
          <h3 className="text-lg font-semibold text-gray-900 pt-4">消费明细</h3>
          <div className="space-y-2">
            {consumptionData && consumptionData.items.length > 0 ? (
              consumptionData.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 text-xs">
                      {new Date(item.created_at).toLocaleString('zh-CN')}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {item.resource_type}
                    </span>
                  </div>
                  <span className="font-medium text-orange-600">-{item.tokens_used} PT</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无消费记录</p>
            )}
            {consumptionData && consumptionData.total > 20 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setConsumptionPage((p: number) => Math.max(1, p - 1))}
                  disabled={consumptionPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:text-gray-300"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm text-gray-500">
                  第 {consumptionPage} 页 / 共 {Math.ceil(consumptionData.total / 20)} 页
                </span>
                <button
                  onClick={() => setConsumptionPage((p: number) => p + 1)}
                  disabled={consumptionPage * 20 >= consumptionData.total}
                  className="px-3 py-1 text-sm border rounded disabled:text-gray-300"
                >
                  下一页
                </button>
              </div>
            )}
          </div>

          {/* 充值记录 */}
          <h3 className="text-lg font-semibold text-gray-900 pt-4">充值记录</h3>
          <div className="space-y-2">
            {purchaseHistory.length > 0 ? (
              purchaseHistory.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900">
                      {new Date(sale.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="text-green-600 font-medium">+{sale.amount.toLocaleString()} PT</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">¥{sale.price.toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      sale.status === 'completed' ? 'bg-green-50 text-green-700' :
                      sale.status === 'refunded' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {sale.status === 'completed' ? '已完成' :
                       sale.status === 'refunded' ? '已退款' : '处理中'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无充值记录</p>
            )}
          </div>

          {/* 余额预警配置 */}
          <h3 className="text-lg font-semibold text-gray-900 pt-4">余额预警配置</h3>
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">低余额提醒阈值 (PT)</label>
                <input
                  type="number"
                  value={lowBalanceThreshold}
                  onChange={e => setLowBalanceThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-gray-400 mt-1">余额低于此值时发送提醒</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">每日消耗上限 (PT, 0=不限)</label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={e => setDailyLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  min="0"
                  step="1000"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={autoRecharge}
                onChange={e => setAutoRecharge(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label className="text-sm text-gray-700">启用自动充值</label>
              {autoRecharge && (
                <select
                  value={autoRechargePkg}
                  onChange={e => setAutoRechargePkg(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                >
                  <option value="">选择自动充值套餐</option>
                  {tokenPackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} className="rounded border-gray-300" />
                邮件通知
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={notifyWechat} onChange={e => setNotifyWechat(e.target.checked)} className="rounded border-gray-300" />
                微信通知
              </label>
            </div>
            <button
              onClick={handleSaveTokenConfig}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              保存配置
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TokenTab;
