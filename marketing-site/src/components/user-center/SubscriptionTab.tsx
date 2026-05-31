import React from 'react';

const CLOUD_PLANS = [
  { key: 'free', name: '免费版', price: '¥0', products: '20 个', orders: '10 单/月', domain: '子域名' },
  { key: 'basic', name: '基础版', price: '¥29', products: '200 个', orders: '100 单/月', domain: '自定义域名' },
  { key: 'pro', name: '专业版', price: '¥99', products: '2000 个', orders: '2000 单/月', domain: '自定义域名' },
  { key: 'enterprise', name: '企业版', price: '¥299', products: '不限', orders: '不限', domain: '自定义域名' },
];

interface Subscription {
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  billing_cycle: string;
}

interface SubscriptionTabProps {
  subscription: Subscription;
  setSubscription: React.Dispatch<React.SetStateAction<Subscription>>;
}

const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ subscription, setSubscription }) => {
  return (
    <div className="space-y-6">
      {/* 当前套餐 */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">当前套餐</h3>
            <p className="text-sm text-gray-500">
              {subscription.billing_cycle === 'monthly' ? '月付' : '年付'} · {subscription.auto_renew ? '自动续费' : '手动续费'}
            </p>
          </div>
          <span className="px-4 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-full">
            {CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.name || subscription.plan_type}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">商品上限</span>
            <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.products}</p>
          </div>
          <div>
            <span className="text-gray-500">月订单上限</span>
            <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.orders}</p>
          </div>
          <div>
            <span className="text-gray-500">域名</span>
            <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.domain}</p>
          </div>
          <div>
            <span className="text-gray-500">到期时间</span>
            <p className="font-medium text-gray-900">{subscription.expires_at || '永久'}</p>
          </div>
        </div>
      </div>

      {/* 可选套餐 */}
      <h3 className="text-lg font-semibold text-gray-900">选择套餐</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {CLOUD_PLANS.map((plan) => {
          const isCurrent = plan.key === subscription.plan_type;
          const isDowngrade = CLOUD_PLANS.findIndex(p => p.key === plan.key) < CLOUD_PLANS.findIndex(p => p.key === subscription.plan_type);
          return (
            <div
              key={plan.key}
              className={`rounded-xl p-5 border-2 ${
                isCurrent ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-400'
              } transition-colors`}
            >
              {isCurrent && <span className="inline-block px-2 py-0.5 bg-gray-900 text-white text-xs rounded-full mb-2">当前</span>}
              <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{plan.price}</p>
              <p className="text-xs text-gray-400 mb-3">月付</p>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>商品: {plan.products}</p>
                <p>订单: {plan.orders}</p>
                <p>域名: {plan.domain}</p>
              </div>
              <button
                disabled={isCurrent}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
                onClick={() => {
                  setSubscription(prev => ({ ...prev, plan_type: plan.key }));
                }}
              >
                {isCurrent ? '当前套餐' : isDowngrade ? '降级' : '升级'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionTab;
