import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/shared/PageHeader';
import CTASection from '../components/shared/CTASection';
import { getPublishedPlugins } from '../lib/pluginService';

type IndustryFilter = 'all' | string;

interface UseCase {
  id: string;
  title: string;
  role: string;
  story: string;
  keyNarrative: string;
  industry: string;
  industryLabel: string;
  icon: React.ReactNode;
  iconEmoji: string;
}

const defaultUseCases: UseCase[] = [
  {
    id: 'catering',
    title: '餐饮行业',
    role: '从手工记账到 AI 管店',
    story: '开店 3-5 年的中小餐馆老板，所有账本用手写或 Excel，库存靠眼睛看+脑子记。想开网店但觉得太复杂，月底算不清赚了多少亏了多少，进货全凭经验经常压货或缺货。',
    keyNarrative: '不用学 Excel，不用请会计。跟它聊天就能把账算清楚。扫码点餐、后厨打印、团购对接，一个软件全搞定。',
    industry: 'catering',
    industryLabel: '餐饮',
    iconEmoji: '🍽️',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
  {
    id: 'retail',
    title: '零售行业',
    role: '多品类精细化管控',
    story: '批发市场租柜台卖电子产品/配件，SKU 几百个，颜色/规格/型号组合多。手工记录容易出错，客户报价时查不准库存，赊账客户对账头疼。',
    keyNarrative: '几百个 SKU？不用怕。SPU-SKU 模式专门处理多规格商品，颜色、尺寸、批次自动归类。客户欠了多少钱，AI 比你记得清楚。',
    industry: 'retail',
    industryLabel: '零售',
    iconEmoji: '🛍️',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'beauty',
    title: '美业行业',
    role: '客户管理与预约系统',
    story: '美容院/美发店老板，客户预约靠电话或微信，经常撞时间。会员充值记录混乱，员工提成算不清。想搞营销活动但不知道从哪里下手。',
    keyNarrative: '预约自动排班，会员充值一目了然。AI 帮你分析哪些项目最受欢迎，自动推送营销活动给沉睡客户。',
    industry: 'beauty',
    industryLabel: '美业',
    iconEmoji: '💇',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: 'pet',
    title: '宠物行业',
    role: '宠物店经营管理系统',
    story: '宠物店老板，商品种类多（食品/用品/活体），有效期管理复杂。寄养服务需要跟踪每只宠物的健康状况和主人要求。会员充值和服务预约经常搞混。',
    keyNarrative: '商品有效期自动提醒，寄养服务入住/离店流程化管理。会员充值和消费记录自动对账，再也不会亏钱。',
    industry: 'pet',
    industryLabel: '宠物',
    iconEmoji: '🐾',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const UseCasesPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<IndustryFilter>('all');

  useEffect(() => {
    getPublishedPlugins().then(() => {});
  }, []);

  // 从默认场景合并生成筛选标签
  const industryFilters: { key: IndustryFilter; label: string; emoji?: string }[] = [
    { key: 'all' as IndustryFilter, label: '全部场景' },
    ...defaultUseCases
      .filter((uc, i, arr) => arr.findIndex((u) => u.industry === uc.industry) === i)
      .map((uc) => ({
        key: uc.industry as IndustryFilter,
        label: uc.industryLabel,
        emoji: uc.iconEmoji,
      })),
  ];

  const filteredCases = defaultUseCases.filter((uc) =>
    activeFilter === 'all' ? true : uc.industry === activeFilter
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <PageHeader
        title="选对你的场景，看看 ProClaw 能帮什么忙"
        description="4 个行业场景，看看哪个说的是你"
      />

      {/* Industry Filter Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center gap-2 flex-wrap">
            {industryFilters.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === tab.key
                    ? 'bg-black text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.emoji ? `${tab.emoji} ${tab.label}` : tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Use Case Cards */}
      <div className="flex-grow py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {filteredCases.map((uc) => (
              <div
                key={uc.id}
                className="bg-white rounded-2xl border border-gray-200 p-8 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                      {uc.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{uc.title}</h2>
                      <span className="text-sm text-gray-500">/</span>
                      <span className="text-sm text-gray-500 font-medium">{uc.role}</span>
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
                        {uc.industryLabel}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-4">{uc.story}</p>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <p className="text-gray-800 text-sm leading-relaxed italic">
                        &ldquo;{uc.keyNarrative}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredCases.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">该行业下暂无线索？试试切换到其他行业看看。</p>
            </div>
          )}
        </div>
      </div>

      <CTASection
        title="一个软件，所有行业"
        description="下载基础桌面端，安装时选择行业即可自动下载对应插件。免费使用，无需承诺。"
        primaryButtonText="免费下载桌面端"
        primaryButtonLink="/download"
      />

      <Footer />
    </div>
  );
};

export default UseCasesPage;
