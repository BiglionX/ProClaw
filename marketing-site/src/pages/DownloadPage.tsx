import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/shared/PageHeader';
import TokenCostEstimator from '../components/TokenCostEstimator';
import RouteSEO from '../components/RouteSEO';
import { getPublishedPlugins } from '../lib/pluginService';
import type { IndustryPlugin } from '../types';

const productCards = [
  {
    id: 'plus',
    name: 'ProClaw Plus',
    subtitle: '进销存版',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    target: '适用于实体商户、批发商、小型工厂',
    features: [
      'AI 经营团队（CEO Agent + 多 Agent 协作）',
      '进销存核心（采购/销售/库存/报表）',
      'SPU-SKU 商品管理体系',
      '行业插件按需下载',
      '本地加密存储 (SQLCipher)',
      '离线完全可用',
    ],
    cta: '免费下载',
    ctaLink: 'https://github.com/BiglionX/ProClaw/releases/download/1.0.7/ProClaw_1.0.7_x64-setup.exe',
    platforms: 'Windows · macOS · Linux',
    highlighted: true,
    color: 'black',
  },
  {
    id: 'light',
    name: 'ProClaw Light',
    subtitle: 'AI创业版',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    target: '适用于虚拟团队、个人创业者',
    features: [
      'CEO Agent 主控官',
      '多 Agent 自动分工协作',
      '任务 / 项目管理',
      '行业插件按需下载',
      '本地加密存储 (SQLCipher)',
      '离线完全可用',
    ],
    cta: '免费下载',
    ctaLink: 'https://github.com/BiglionX/ProClaw/releases/download/1.0.7/ProClaw_1.0.7_x64-setup.exe',
    platforms: 'Windows · macOS · Linux',
    highlighted: false,
    color: 'gray',
  },
  {
    id: 'cloud',
    name: 'ProClaw Cloud',
    subtitle: '云托管版',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    target: '无需本地安装，浏览器直接使用',
    features: [
      '云商城托管（AI 生成店铺主题）',
      '自定义域名绑定',
      '在线支付集成',
      '数据统计分析',
      'Token 灵活计费',
      '新用户赠送 50,000 PT 免费体验',
    ],
    cta: '立即使用',
    ctaLink: '/register',
    platforms: '免下载，只需浏览器',
    highlighted: false,
    color: 'blue',
  },
  {
    id: 'mobile',
    name: 'ProClaw 手机端',
    subtitle: '随身管理',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    target: '随时随地管理店铺，数据实时同步',
    features: [
      '数据实时同步（桌面端 ↔ 手机）',
      '移动收银',
      '扫码盘点',
      '消息推送提醒',
    ],
    cta: '免费下载 APK',
    ctaLink: 'https://github.com/BiglionX/ProClaw/releases/download/1.0.7/proclaw-mobile-1.0.3.apk',
    platforms: 'Android 6.0+',
    highlighted: false,
    color: 'gray',
  },
];

const systemRequirements = [
  { item: '操作系统', min: 'Windows 10+ (x64)', rec: 'Windows 11' },
  { item: '内存', min: '4 GB RAM', rec: '8 GB RAM' },
  { item: '磁盘空间', min: '200 MB', rec: '500 MB (含数据)' },
  { item: '显示器', min: '1366×768', rec: '1920×1080' },
  { item: '运行时', min: 'WebView2 (Win10+ 内置)', rec: '最新版 WebView2' },
];

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
    ctaLink: '/flowhub',
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
    { item: '商城地址', value: '永久免费', desc: 'proclaw.cc/shop/商店名 格式' },
    { item: '商城页面托管', value: '永久免费', desc: '基础页面托管不收费' },
  ],
};

const pricingFaqs = [
  { q: 'AI 调用费用需要我自己承担吗？', a: '是的。ProClaw 桌面端本身免费开源。AI 功能需要您自行配置 LLM API Key（支持 OpenAI、Anthropic、DeepSeek、Ollama 本地模型等），费用由相应的模型提供商按用量收取。' },
  { q: '可以用自己的 API Key 吗？', a: '完全可以。ProClaw 不绑定任何模型提供商，您可以在设置中自由配置和切换。内置 Token 用量监控和成本控制功能，帮您管理开销。' },
  { q: '云商城的数据安全吗？', a: '非常安全。商品数据传输使用 TLS 加密，云端数据库对敏感字段加密存储。每个商户拥有独立 API Key 用于签名验证。您可以随时关闭云商城，数据保留 30 天后自动删除。' },
  { q: '支持按年付费吗？', a: '支持。按年付费可享受 8 折优惠。具体请联系我们或等待支付系统上线。' },
];

const DownloadPage: React.FC = () => {
  const [plugins, setPlugins] = useState<IndustryPlugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getPublishedPlugins();
      setPlugins(data);
      setPluginsLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <RouteSEO routeKey="download" />
      <Navbar />

      <PageHeader
        title="下载 ProClaw"
        description="ProClaw Plus / Light 桌面端 · Cloud 云商城 · 手机端 App"
        subtitle="Plus 版 v1.0.7 | Light 版 v1.0.7 | 发布日期：2026-06-24"
      />

      {/* 四产品并列卡片 */}
      <div className="flex-grow py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            选择你的 ProClaw
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            根据你的经营场景，选择最合适的版本
          </p>
          <div className="grid md:grid-cols-4 gap-5 mb-16">
            {productCards.map((card) => (
              <div
                key={card.id}
                className={`rounded-2xl p-6 border-2 relative flex flex-col ${
                  card.highlighted
                    ? 'border-black bg-white ring-4 ring-gray-100'
                    : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-md transition-all'
                }`}
              >
                {card.highlighted && (
                  <span className="absolute -top-3 left-4 px-3 py-0.5 bg-black text-white text-xs font-semibold rounded-full">
                    推荐
                  </span>
                )}

                {/* 图标 + 标题 */}
                <div className="text-center mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                    card.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'
                  }`}>
                    {card.icon}
                  </div>
                  <h3 className="font-bold text-gray-900">{card.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{card.subtitle}</p>
                </div>

                {/* 目标用户 */}
                <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">{card.target}</p>

                {/* 特性列表 */}
                <ul className="space-y-2 mb-6 flex-grow">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {card.ctaLink.startsWith('http') ? (
                  <a
                    href={card.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                      card.color === 'blue'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {card.cta}
                  </a>
                ) : (
                  <Link
                    to={card.ctaLink}
                    className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                      card.color === 'blue'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {card.cta}
                  </Link>
                )}

                {/* 平台标注 */}
                <p className="text-xs text-gray-400 text-center mt-2">{card.platforms}</p>
              </div>
            ))}
          </div>

          {/* 行业插件 */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              行业插件
            </h2>
            <p className="text-sm text-gray-500 text-center mb-8">
              安装 Plus 或 Light 版后选择行业，即可自动下载对应插件
            </p>
            {pluginsLoading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : (
              <div className="grid md:grid-cols-4 gap-4">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <div className="text-4xl mb-3">{plugin.icon || '🧩'}</div>
                    <h3 className="font-semibold text-gray-900 mb-1">{plugin.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">v{plugin.version}</p>
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      已发布
                    </span>
                  </div>
                ))}
                {/* 预留位 */}
                {[{ id: 'beauty', name: '美业版', icon: '💇' }, { id: 'pet', name: '宠物版', icon: '🐾' }].map(
                  (placeholder) => {
                    if (plugins.find((p) => p.id === placeholder.id)) return null;
                    return (
                      <div
                        key={placeholder.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 text-center opacity-60"
                      >
                        <div className="text-4xl mb-3">{placeholder.icon}</div>
                        <h3 className="font-semibold text-gray-900 mb-1">{placeholder.name}</h3>
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                          即将推出
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
            <p className="text-center text-gray-400 text-sm mt-6">
              💡 安装 Plus 或 Light 版后，选择行业即可自动下载对应插件
            </p>
          </div>

          {/* ========== 定价方案（原 PricingPage 内容） ========== */}
          <div id="pricing" className="mb-16 scroll-mt-20">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">透明定价</h2>
            <p className="text-gray-500 text-center mb-10 max-w-2xl mx-auto">
              桌面端永久免费开源。云托管商城按需订阅，无隐藏费用。
            </p>

            {/* Desktop Plans */}
            <h3 className="text-2xl font-bold text-gray-900 mb-6">桌面端</h3>
            <div className="grid md:grid-cols-2 gap-8 mb-16">
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

            {/* Cloud Token Pricing */}
            <h3 className="text-2xl font-bold text-gray-900 mb-6">云托管商城 - Token 计费</h3>

            <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl p-8 text-center mb-8">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
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

            <h3 className="text-xl font-bold text-gray-900 mb-2">Token 充值套餐</h3>
            <p className="text-sm text-gray-500 mb-6">批量购买更优惠，多买多赠</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
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

            <TokenCostEstimator />

            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mt-8 mb-12">
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

            {/* Pricing FAQ */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">常见定价问题</h3>
              <div className="space-y-6">
                {pricingFaqs.map((faq, i) => (
                  <div key={i} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h4>
                    <p className="text-gray-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Requirements */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">系统要求</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-900">项目</th>
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-900">最低配置</th>
                    <th className="py-3 text-sm font-semibold text-gray-900">推荐配置</th>
                  </tr>
                </thead>
                <tbody>
                  {systemRequirements.map((req) => (
                    <tr key={req.item} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-sm text-gray-900 font-medium">{req.item}</td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{req.min}</td>
                      <td className="py-3 text-sm text-gray-600">{req.rec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Install Steps */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">安装步骤</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">下载安装包</h3>
                  <p className="text-sm text-gray-600">从 Plus 或 Light 版选择对应平台下载安装程序。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">运行安装程序</h3>
                  <p className="text-sm text-gray-600">双击运行，按向导完成安装。首次启动 CEO Agent 将对话引导完成配置。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">开始使用</h3>
                  <p className="text-sm text-gray-600">配置 AI 模型 API Key，即可通过自然语言管理你的店铺。</p>
                </div>
              </div>
            </div>
          </div>

          {/* SHA256 Checksums */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">文件校验 (SHA256)</h2>
            <p className="text-sm text-gray-500 mb-4">
              下载后建议校验文件完整性，确保安装包未被篡改。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-900">文件</th>
                    <th className="py-3 text-sm font-semibold text-gray-900">SHA256</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-sm text-gray-900 font-medium whitespace-nowrap">ProClaw (桌面端 v1.0.7)</td>
                    <td className="py-3 text-sm text-gray-500 font-mono break-all">bb6a85e774f1a4174e9576e50336de8effc3b7b499272e6092c2c87739d4c959</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-sm text-gray-900 font-medium whitespace-nowrap">ProClaw (移动端 Android APK v1.0.3)</td>
                    <td className="py-3 text-sm text-gray-500 font-mono break-all">5117fcdd423b3ab8dc336b2af81764df4c95492b2bdeade0ddc590ed9eb34313</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Other options */}
          <div className="grid md:grid-cols-1 gap-6 max-w-sm mx-auto">
            <a
              href="https://github.com/BigLionX/ProClaw"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-black hover:shadow-md transition-all text-center"
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              <h3 className="font-semibold text-gray-900 mb-1">源码编译</h3>
              <p className="text-xs text-gray-500">从 GitHub 克隆源码自行构建</p>
            </a>
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            源码与历史版本请查看{' '}
            <a href="https://github.com/BigLionX/ProClaw/releases" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              GitHub Releases
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DownloadPage;
