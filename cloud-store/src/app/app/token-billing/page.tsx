// ProClaw Cloud 托管版 - Token 计费页面 (增强版)
// 支持真实支付集成 + 支付状态轮询

'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { getTokenBalanceSummary, getTokenPricing, getTokenPackages, getTokenConsumption, type TokenBalanceSummary, type TokenPricingRule, type TokenPackage, type TokenConsumptionResult } from '@/lib/tokenApi';
import { formatTokens } from '@/lib/utils';
import { Toaster, toast } from 'react-hot-toast';

interface PaymentRecord {
  id: string;
  orderNo: string;
  amount: number;
  tokenAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  paidAt?: string;
}

export default function TokenBillingPage() {
  const { user } = useAuthStore();
  const [balanceSummary, setBalanceSummary] = useState<TokenBalanceSummary | null>(null);
  const [pricingRules, setPricingRules] = useState<TokenPricingRule[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [consumption, setConsumption] = useState<TokenConsumptionResult | null>(null);
  const [purchaseRecords, setPurchaseRecords] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'consumption' | 'records'>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mock' | 'alipay' | 'wechat'>('alipay');
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ orderNo: string; status: string } | null>(null);

  const fetchPurchaseRecords = async () => {
    if (!user?.id) return;
    try {
      const { data } = await (await fetch('/api/payment/records')).json();
      if (data) {
        setPurchaseRecords(data);
      }
    } catch {
      // 记录获取失败不影响核心功能
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    getTokenBalanceSummary(user.id).then(setBalanceSummary).catch(() => {});
    getTokenPricing().then(setPricingRules).catch(() => {});
    getTokenPackages().then(setPackages).catch(() => {});
    getTokenConsumption(user.id).then(setConsumption).catch(() => {});
    fetch('/api/payment/records').then(res => res.json()).then(result => {
      if (result.data) {
        setPurchaseRecords(result.data);
      }
    }).catch(() => {});
  }, [user?.id]);

  const handleOpenPayment = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setPaymentResult(null);
    setShowPaymentModal(true);
  };

  const handlePay = async () => {
    if (!selectedPackage || !user?.id) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPackage.id, paymentMethod }),
      });
      const result = await res.json();

      if (result.success) {
        const { orderNo, orderId } = result.data;

        if (paymentMethod === 'mock') {
          // Mock 支付：直接调用回调完成支付
          const notifyRes = await fetch('/api/payment/notify', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNo, status: 'completed' }),
          });
          const notifyResult = await notifyRes.json();

          if (notifyResult.success) {
            toast.success(`购买成功！${selectedPackage.token_amount.toLocaleString()} PT 已到账`);
            setPaymentResult({ orderNo, status: 'completed' });
            // 刷新数据
            getTokenBalanceSummary(user.id).then(setBalanceSummary);
            fetchPurchaseRecords();
          } else {
            toast.error(notifyResult.error || '支付处理失败');
          }
        } else {
          // 真实支付：显示支付二维码/跳转
          setPaymentResult({ orderNo, status: 'pending' });
          // 开始轮询支付状态
          pollPaymentStatus(orderId || orderNo);
        }
      } else {
        toast.error(result.error || '创建订单失败');
      }
    } catch {
      toast.error('支付处理失败');
    } finally {
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async (orderNo: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        toast.error('支付超时，请刷新页面查看状态');
        return;
      }

      attempts++;
      try {
        const res = await fetch(`/api/payment/query?orderNo=${orderNo}`);
        const result = await res.json();

        if (result.success) {
          if (result.data.status === 'completed') {
            toast.success('支付成功！Token 已到账');
            setPaymentResult({ orderNo, status: 'completed' });
            getTokenBalanceSummary(user?.id || '').then(setBalanceSummary);
            fetchPurchaseRecords();
            return;
          }
          if (result.data.status === 'failed') {
            toast.error('支付失败');
            setPaymentResult({ orderNo, status: 'failed' });
            return;
          }
        }
      } catch {
        // 继续轮询
      }

      setTimeout(poll, 3000);
    };

    setTimeout(poll, 3000);
  };

  const tabs = [
    { key: 'overview' as const, label: '余额概览' },
    { key: 'packages' as const, label: '充值套餐' },
    { key: 'consumption' as const, label: '消费明细' },
    { key: 'records' as const, label: '购买记录' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Toaster position="top-center" />
      <h1 className="text-2xl font-bold text-gray-900">Token 计费</h1>

      {/* Tab 导航 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 余额概览 */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">当前余额</div>
              <div className="text-3xl font-bold text-yellow-600">
                {balanceSummary ? formatTokens(balanceSummary.balance) : '--'}
              </div>
              <div className="text-xs text-gray-400 mt-2">PT (ProClaw Token)</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">今日消耗</div>
              <div className="text-3xl font-bold text-orange-600">
                {balanceSummary ? formatTokens(balanceSummary.today_used) : '--'}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                预估可用 {balanceSummary?.estimated_days ?? '--'} 天
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">日均消耗</div>
              <div className="text-3xl font-bold text-blue-600">
                {balanceSummary ? formatTokens(balanceSummary.daily_avg_30d) : '--'}
              </div>
              <div className="text-xs text-gray-400 mt-2">近 30 天平均</div>
            </div>
          </div>

          {/* 定价规则 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Token 消耗标准</h2>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">操作</th>
                      <th className="pb-2 font-medium text-right">消耗 (PT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingRules.map((rule) => (
                      <tr key={rule.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-900">
                          {rule.action_name}
                          {rule.description && (
                            <span className="text-gray-400 text-xs ml-2">({rule.description})</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-medium">{rule.pt_cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 充值套餐 */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
              <div className="mt-3">
                <span className="text-3xl font-bold text-blue-600">{formatTokens(pkg.token_amount)}</span>
                <span className="text-gray-500 text-sm ml-1">PT</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                ¥{pkg.price.toFixed(2)}
              </div>
              {pkg.discount_percentage > 0 && (
                <div className="mt-1 text-sm text-green-600">
                  优惠 {pkg.discount_percentage}%
                  <span className="text-gray-400 ml-1">
                    ({(pkg.price / pkg.token_amount * 1000).toFixed(2)} 元/千 PT)
                  </span>
                </div>
              )}
              {pkg.description && (
                <p className="mt-3 text-sm text-gray-500 flex-1">{pkg.description}</p>
              )}
              <button
                onClick={() => handleOpenPayment(pkg)}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                立即购买
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 消费明细 */}
      {activeTab === 'consumption' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">消费明细</h2>
          </div>
          <div className="p-4">
            {!consumption || consumption.items.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无消费记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">操作类型</th>
                      <th className="pb-2 font-medium text-right">消耗</th>
                      <th className="pb-2 font-medium text-right">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumption.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-900">{item.resource_type}</td>
                        <td className="py-2.5 text-right font-medium text-orange-600">
                          -{item.tokens_used} PT
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 购买记录 */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">购买记录</h2>
          </div>
          <div className="p-4">
            {purchaseRecords.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无购买记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">订单号</th>
                      <th className="pb-2 font-medium">金额</th>
                      <th className="pb-2 font-medium">Token</th>
                      <th className="pb-2 font-medium">状态</th>
                      <th className="pb-2 font-medium text-right">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-600 text-xs font-mono">{record.orderNo}</td>
                        <td className="py-2.5 text-gray-900">¥{record.amount.toFixed(2)}</td>
                        <td className="py-2.5 font-medium">{formatTokens(record.tokenAmount)} PT</td>
                        <td className="py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : record.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {record.status === 'completed' ? '已完成' : record.status === 'pending' ? '处理中' : '失败'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 支付模态框 */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => !processing && setShowPaymentModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            {paymentResult ? (
              <div className="text-center py-4">
                <div className={`text-5xl mb-4 ${paymentResult.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {paymentResult.status === 'completed' ? '✅' : '⏳'}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {paymentResult.status === 'completed' ? '支付成功' : '支付处理中'}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {paymentResult.status === 'completed'
                    ? `${selectedPackage.token_amount.toLocaleString()} PT 已到账`
                    : '请完成支付，系统将在支付成功后自动充值'}
                </p>
                {paymentResult.status === 'completed' ? (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    完成
                  </button>
                ) : (
                  <p className="text-xs text-gray-400">订单号: {paymentResult.orderNo}</p>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">确认购买</h2>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">套餐</span>
                    <span className="font-medium">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Token 数量</span>
                    <span className="font-medium">{formatTokens(selectedPackage.token_amount)} PT</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600">实付金额</span>
                    <span className="text-xl font-bold text-blue-600">
                      ¥{(selectedPackage.price * (1 - selectedPackage.discount_percentage / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 支付方式选择 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">支付方式</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod('alipay')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${
                        paymentMethod === 'alipay'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      支付宝
                    </button>
                    <button
                      onClick={() => setPaymentMethod('wechat')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${
                        paymentMethod === 'wechat'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      微信支付
                    </button>
                    <button
                      onClick={() => setPaymentMethod('mock')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${
                        paymentMethod === 'mock'
                          ? 'border-gray-500 bg-gray-100 text-gray-700'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      模拟支付
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                    disabled={processing}
                  >
                    取消
                  </button>
                  <button
                    onClick={handlePay}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                    disabled={processing}
                  >
                    {processing ? '处理中...' : '确认支付'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
