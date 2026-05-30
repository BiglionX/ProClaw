import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

type VersionFilter = 'all' | 'plus' | 'virtual';

interface UseCase {
  id: string;
  title: string;
  role: string;
  story: string;
  keyNarrative: string;
  version: VersionFilter[];
  versionLabel: string;
  icon: React.ReactNode;
}

const useCases: UseCase[] = [
  {
    id: 'student',
    title: '职业学校学生',
    role: '零成本创业实践',
    story: '有创业想法但没本钱，学校要求交创业方案，不知道从哪开始。想试电商但没有商品、不懂建站、注册公司太贵太麻烦，同学协作全靠微信群消息乱飞。',
    keyNarrative: '不用注册公司、不用投一分钱。下载 ProClaw 虚拟公司版，你就是 CEO，AI 是你的员工。课堂上学的理论，这里直接实操。',
    version: ['virtual'],
    versionLabel: '推荐：虚拟公司版',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    id: 'mom-pop',
    title: '个体户 / 夫妻店',
    role: '从手工记账到 AI 管店',
    story: '开店 3-5 年，所有账本用手写或 Excel，库存靠眼睛看+脑子记。想开网店但觉得太复杂，月底算不清赚了多少亏了多少，进货全凭经验经常压货或缺货。',
    keyNarrative: '不用学 Excel，不用请会计。跟它聊天就能把账算清楚。想开网店？跟它说一声，店就建好了。',
    version: ['plus'],
    versionLabel: '推荐：ProClaw Plus',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'wholesale-counter',
    title: '外贸柜台小老板',
    role: '多品类精细化管控',
    story: '在批发市场租柜台卖电子产品/配件，SKU 几百个，颜色/规格/型号组合多。手工记录容易出错，客户报价时查不准库存，赊账客户对账头疼。',
    keyNarrative: '几百个 SKU？不用怕。ProClaw 的 SPU-SKU 模式专门处理多规格商品，颜色、尺寸、批次自动归类。客户欠了多少钱，AI 比你记得清楚。',
    version: ['plus'],
    versionLabel: '推荐：ProClaw Plus',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: 'wholesale-exporter',
    title: '外贸批发商',
    role: '快速建站 + AI 运营',
    story: '有稳定工厂货源，主要客户是海外小批发商。请人建外贸站报价几万、建好也不会运营，商品上新频率高每次都要找人更新，时差导致客户沟通不及时。',
    keyNarrative: '外贸独立站？AI 帮你建、帮你管。你在桌面端管商品，网店自动更新。客户半夜下单，你睡醒就看见销售单了。',
    version: ['plus'],
    versionLabel: '推荐：ProClaw Plus + 云商城',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    id: 'property',
    title: '物业 / 市场管理方',
    role: '服务业主 + 内部管理',
    story: '管理 3-5 个小区的物业公司或批发市场管理办公室。业主报修靠电话/微信容易漏，收费凭手工记录，通知群发效率低，内部任务分配没有系统。',
    keyNarrative: '不用花几十万买物业管理系统。ProClaw 虚拟公司版，任务 Agent 管报修、财务 Agent 管收费。一个软件搞定业主服务和内部管理。',
    version: ['virtual'],
    versionLabel: '推荐：虚拟公司版',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'community-leader',
    title: '社区团长 / 微商',
    role: '把微信群生意管明白',
    story: '在社区做团购或朋友圈卖货，客户几百个全在微信里。订单手写或复制粘贴，经常发错货、漏收款。想分析什么产品卖得好全靠感觉。',
    keyNarrative: '几百个客户在微信里？不用慌。ProClaw 帮你记着谁买了什么、谁还没付钱。月末自动出报表，该补什么货一目了然。',
    version: ['virtual'],
    versionLabel: '推荐：虚拟公司版',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'factory',
    title: '小型工厂 / 作坊',
    role: '原材料到成品全链路',
    story: '小型加工厂或家庭作坊，原材料采购到半成品到成品，客户以代工为主。库存混在一起分不清，代工订单进度靠脑子记，交货期经常延误，成本核算复杂。',
    keyNarrative: '原材料 + 半成品 + 成品，三种库存分开管。AI 帮你盯进度、算成本、提醒补货。再也不会因为少算一箱料而误了交货期。',
    version: ['plus'],
    versionLabel: '推荐：ProClaw Plus',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

const UseCasesPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<VersionFilter>('all');

  const filteredCases = useCases.filter((uc) =>
    activeFilter === 'all' ? true : uc.version.includes(activeFilter)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            选对你的场景，看看 ProClaw 能帮什么忙
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto">
            7 个真实场景，看看哪个说的是你
          </p>
        </div>
      </div>

      {/* Version Filter Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center gap-2">
            {[
              { key: 'all' as VersionFilter, label: '全部场景' },
              { key: 'plus' as VersionFilter, label: 'ProClaw Plus' },
              { key: 'virtual' as VersionFilter, label: '虚拟公司版' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === tab.key
                    ? 'bg-black text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
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
                        {uc.versionLabel}
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
              <p className="text-gray-400 text-lg">该版本下暂无线索吗？试试切换到另一个版本看看。</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">不确定选哪个版本？下载试试，两个版本都免费</h2>
          <p className="text-gray-400 mb-8">
            安装时 CEO Agent 会引导你选择版本，不满意随时切换。
          </p>
          <Link
            to="/download"
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all inline-block shadow-lg hover:shadow-xl"
          >
            免费下载桌面端
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UseCasesPage;
