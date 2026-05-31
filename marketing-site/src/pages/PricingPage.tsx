import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/shared/PageHeader';
import TokenCostEstimator from '../components/TokenCostEstimator';

const desktopPlans = [
  {
    name: 'ProClaw 基础桌面端',
    price: '免费',
    period: '',
    description: '统一构建，适配所有行业。插件按需下载。',
    features: [
      'AI 经营底座（CEO Agent + 多 Agent 协作）',
      '进销存核心（采购/销售/库存/报表）',
      'SPU-SKU 商品管理体系',
      '行业插件免费按需下载',
      '本地加密存储 (SQLCipher)',
      '离线完全可用',
      '可选 Supabase 云同步',
      '设备直连通信（语音/视频）',
    ],
    cta: '免费下载',
    ctaLink: '/download',
    highlighted: true,
  },
  {
    name: '高级行业插件',
    price: '即将推出',
    period: '',
    description: '含行业专属 AI 模型和数据预训练',
    features: [
      '餐饮版：菜品识别 AI + 智能菜单优化',
      '零售版：销量预测 + 自动补货',
      '美业版：客资管理 + 智能排班',
      '按 token 计费或订阅制',
    ],
    cta: '了解详情',
    ctaLink: '/download',
    highlighted: false,
  },
];

const cloudTokenPricing = {
  pricing: [
    { category: '操作类', items: [
      { action: '商品同步', cost: '50 PT/个', desc: '单个商品从桌面端同步到云端' },
      { action: '订单处理', cost: '10 PT/单', desc: '每笔商城订单的创建和处理' },
      { action: 'AI 主题生成', cost: '5,000 PT/次', desc: 'AI 生成商城主题和样式' },
      { action: 'AI 主题微调', cost: '1,000 PT/次', desc: '对已有主题的单项调整' },
    ]},
    { category: 'API 调用', items: [
      { action: 'API 写操作', cost: '5 PT/次', desc: '创建商品、更新订单等' },
      { action: 'API 读操作', cost: '1 PT/次', desc: '查询商品、订单等' },
      { action: '数据导出', cost: '100 PT/次', desc: '导出为 CSV/Excel' },
    ]},
    { category: '月租类', items: [
      { action: '自定义域名', cost: '2,000 PT/月', desc: '绑定自定义域名' },
      { action: '实时同步保活', cost: '500 PT/天', desc: '桌面端实时同步通道' },
      { action: '商城页面托管', cost: '500 PT/月', desc: '基础页面托管' },
    ]},
    { category: '存量月租类', items: [
      { action: '商品数据托管', cost: '2 PT/个/月', desc: '按月底商品 SKU 数量计费' },
      { action: '图片/CDN 存储', cost: '1 PT/MB/月', desc: '按实际占用空间计费' },
      { action: '订单数据留存', cost: '1 PT/百单/月', desc: '超 1000 单部分计费' },
    ]},
  ],
  packages: [
    { name: '体验包', price: '¥10', pt: '10,000', unitPrice: '¥10.00/万PT', discount: '—' },
    { name: '入门包', price: '¥50', pt: '55,000', unitPrice: '¥9.09/万PT', discount: '赠 10%' },
    { name: '标准包', price: '¥200', pt: '240,000', unitPrice: '¥8.33/万PT', discount: '赠 20%' },
    { name: '专业包', price: '¥700', pt: '910,000', unitPrice: '¥7.69/万PT', discount: '赠 30%' },
    { name: '企业包', price: '¥3,000', pt: '4,500,000', unitPrice: '¥6.67/万PT', discount: '赠 50%' },
  ],
  freeAllowance: [
    { item: '注册赠送 PT', value: '50,000 PT（≈¥50）', desc: '新用户注册即赠送' },
    { item: '商品免费同步', value: '前 20 个', desc: '免费体验商城基础功能' },
    { item: '商品免月租', value: '20 个永久免费', desc: '与免费同步配套' },
    { item: '图片免存储', value: '100 MB 永久免费', desc: '覆盖基础商品图片需求' },
    { item: '子域名', value: '永久免费', desc: 'xxx.proclaw.cc 格式' },
    { item: '商城页面托管', value: '永久免费', desc: '基础页面托管不收费' },
  ],
};

const faqs = [
  { q: 'AI 调用费用需要我自己承担吗？', a: '是的。ProClaw 桌面端本身免费开源。AI 功能需要您自行配置 LLM API Key（支持 OpenAI、Anthropic、DeepSeek、Ollama 本地模型等），费用由相应的模型提供商按用量收取。' },
  { q: '可以用自己的 API Key 吗？', a: '完全可以。ProClaw 不绑定任何模型提供商，您可以在设置中自由配置和切换。内置 Token 用量监控和成本控制功能，帮您管理开销。' },
  { q: '云商城的数据安全吗？', a: '非常安全。商品数据传输使用 TLS 加密，云端数据库对敏感字段加密存储。每个商户拥有独立 API Key 用于签名验证。您可以随时关闭云商城，数据保留 30 天后自动删除。' },
  { q: '支持按年付费吗？', a: '支持。按年付费可享受 8 折优惠。具体请联系我们或等待支付系统上线。' },
];

const PricingPage: React.FC = () => {
  const [billingTab, setBillingTab] = useState<'desktop' | 'cloud'>('desktop');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <PageHeader
        title="透明定价"
        description="桌面端永久免费开源。云托管商城按需订阅，无隐藏费用。"
      />

      {/* Billing Tab Switch */}
      <div className="flex justify-center mt-10 mb-6">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingTab('desktop')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingTab === 'desktop' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            桌面端
          </button>
          <button
            onClick={() => setBillingTab('cloud')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingTab === 'cloud' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            云托管商城
          </button>
        </div>
      </div>

      {/* Desktop Plans */}
      {billingTab === 'desktop' && (
        <div className="flex-grow pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {desktopPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-8 border-2 ${
                    plan.highlighted
                      ? 'border-black bg-white ring-4 ring-gray-100'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="inline-block px-3 py-1 bg-black text-white text-xs font-semibold rounded-full mb-4">
                      推荐
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={plan.ctaLink}
                    className={`block w-full text-center py-3 rounded-lg font-medium transition-all ${
                      plan.highlighted
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mt-8">
              开源协议：GPL-3.0 | 源代码完全开放 | 可自行定制和扩展
            </p>
          </div>
        </div>
      )}

      {/* Cloud Plans - Token 计费模式 */}
      {billingTab === 'cloud' && (
        <div className="flex-grow pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

            {/* Token 计费说明 */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Token 计费，按需付费</h2>
              <p className="text-gray-300 mb-4">
                告别固定月费，只为实际使用的功能付费。
                <br/>新用户注册即赠送 <strong className="text-white">50,000 PT（≈¥50）</strong> 免费体验。
              </p>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-6 py-2 text-sm">
                <span className="text-gray-300">1 PT = ¥0.001</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-300">1,000 PT = ¥1</span>
              </div>
            </div>

            {/* 消耗定价表 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Token 消耗定价表</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cloudTokenPricing.pricing.map((group) => (
                  <div key={group.category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900 text-sm">{group.category}</h4>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.items.map((item) => (
                        <div key={item.action} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{item.action}</span>
                            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900 whitespace-nowrap ml-4">{item.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 充值套餐 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Token 充值套餐</h3>
              <p className="text-sm text-gray-500 mb-6">批量购买更优惠，多买多赠</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {cloudTokenPricing.packages.map((pkg) => (
                  <div key={pkg.name} className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:border-gray-400 transition-colors">
                    <h4 className="font-bold text-gray-900 text-lg">{pkg.name}</h4>
                    <p className="text-3xl font-extrabold text-gray-900 mt-2">{pkg.price}</p>
                    <p className="text-sm text-gray-600 mt-2">{pkg.pt} PT</p>
                    <p className="text-xs text-gray-400 mt-1">{pkg.unitPrice}</p>
                    <span className="inline-block mt-3 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                      {pkg.discount}
                    </span>
                    <button className="mt-4 w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                      立即购买
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 费用估算计算器 */}
            <TokenCostEstimator />

            {/* 免费额度说明 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">新用户免费额度</h3>
              <p className="text-sm text-gray-500 mb-6">注册即享以下免费权益，零成本体验云商城核心功能</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cloudTokenPricing.freeAllowance.map((item) => (
                  <div key={item.item} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-900">{item.item}</p>
                    <p className="text-lg font-bold text-green-600 mt-1">{item.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Pricing FAQ */}
      <div className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-10">常见定价问题</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PricingPage;
