import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RouteSEO from '../components/RouteSEO';

const modeCards = [
  {
    id: 'standard',
    title: 'ProClaw Plus',
    subtitle: '完整进销存 + AI 团队',
    desc: '完整进销存管理 + AI 经营团队 + 行业插件。适合需要多岗位协作的成长型商户。',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    link: '/features',
  },
  {
    id: 'virtual',
    title: 'ProClaw Light',
    subtitle: 'CEO 主控官 + Agent 生态',
    desc: 'CEO Agent 主控官模式，搭配 Agent 生态，适合模拟经营与 AI 协作探索。',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    badge: 'bg-purple-100 text-purple-700',
    link: '/features#agent-eco',
  },
  {
    id: 'cloud',
    title: 'ProClaw Cloud',
    subtitle: '无需本地安装',
    desc: '浏览器直接使用，无需下载安装。适合不想管 IT 只想用 AI 管店上云的商户。',
    color: 'bg-cyan-50 border-cyan-200 hover:border-cyan-400',
    badge: 'bg-cyan-100 text-cyan-700',
    link: '/features#cloud-store',
  },
];

const featureCards = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    ),
    title: 'AI CEO 主控官',
    desc: '你跟它说目标，它自己安排怎么干。25+ AI 助手自动分好工、做完了给你汇报。',
    link: '/features#ai-team',
    tags: [] as string[],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
    ),
    title: '行业插件',
    desc: '一个基础桌面端统一构建，安装后按需下载行业插件。餐饮 POS/KDS、美业预约/营销、宠物寄养/美容，覆盖更多商家场景。',
    link: '/solutions/catering',
    tags: ['#餐饮', '#美业', '#宠物'],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
      </svg>
    ),
    title: '云托管商城',
    desc: '想开网店？跟它说一声就帮你建好。商品自动上架，客户下单自动帮你记账扣库存。',
    link: '/features#cloud-store',
    tags: [] as string[],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
    ),
    title: '全栈生态',
    desc: '电脑管店、手机查店、网上卖货。数据全相通，在哪都能做买卖。Android App 即将推出。',
    link: '/download',
    tags: [] as string[],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
    title: 'ProClaw Plus 简化模式',
    desc: '无需复杂配置，打开就能用，永远免费。极简进销存，个体商户 3 分钟上手。',
    link: '/download',
    tags: ['#免费', '#极简'],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
      </svg>
    ),
    title: '设备直连通信',
    desc: '手机扫个码就跟电脑连上了。实时语音视频通话，仓库和前台沟通不用吼。',
    link: '/features#collaboration',
    tags: [] as string[],
  },
];

const industryLinks = [
  { slug: 'catering', label: '餐饮方案', emoji: '\uD83C\uDF7D\uFE0F' },
  { slug: 'beauty', label: '美业方案', emoji: '\uD83D\uDC87' },
  { slug: 'pet', label: '宠物方案', emoji: '\uD83D\uDC3E' },
  { slug: 'cloud', label: '云商城方案', emoji: '\u2601\uFE0F' },
];

const testimonialCards = [
  {
    quote: '以前用 Excel 记账，月底对账头疼死。现在每天打开 ProClaw 跟 CEO Agent 说句话，进销存全自动。',
    role: '社区便利店老板',
    industry: '零售',
    emoji: '\uD83C\uDFEA',
  },
  {
    quote: '寄养预约再也不用手写本子了。客户微信上就能查档期、预约，效率高了一大截。',
    role: '宠物店店主',
    industry: '宠物',
    emoji: '\uD83D\uDC3E',
  },
  {
    quote: '会员充值和员工提成以前每个月都要算半天，现在 AI 自动出报表，一目了然。',
    role: '美发店老板',
    industry: '美业',
    emoji: '\uD83D\uDC87',
  },
];

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <RouteSEO routeKey="home" />
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center md:text-left">
              <div className="inline-flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">零技术门槛</span>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">一个软件，所有行业</span>
                <span className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full text-sm font-semibold">ProClaw 产品家族</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                <span className="block text-gray-900">ProClaw</span>
                <span className="block text-2xl md:text-3xl mt-2 text-gray-600 font-semibold">
                  {'一个软件，所有行业——餐饮·零售·美业·宠物'}
                </span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed max-w-lg">
                不用懂技术，不用配服务器。下载安装，跟它聊天，它帮你管店。
                {'双模式可选：ProClaw Plus / ProClaw Light，搭配 ProClaw Cloud 无需安装直接使用。数据 100% 在你电脑里。'}
              </p>
              <ul className="mt-6 space-y-3 text-gray-600">
                {[
                  '你一个人，配了 25+ 个不领工资的 AI 帮手',
                  '数据全在你电脑里，谁也拿不走',
                  'Windows / macOS / Linux 都能用',
                  '想开网店？跟它说一声就帮你建好',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link
                  to="/download"
                  className="px-8 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    先下载用用看（免费）
                  </span>
                </Link>
                <Link
                  to="/solutions/catering"
                  className="px-8 py-4 border-2 border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  看看行业方案
                </Link>
              </div>
              {/* Three Mode Selection Cards */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {modeCards.map((mode) => (
                  <Link
                    key={mode.id}
                    to={mode.link}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-1 hover:shadow-md ${mode.color}`}
                  >
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${mode.badge}`}>
                      {mode.subtitle}
                    </span>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{mode.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{mode.desc}</p>
                  </Link>
                ))}
              </div>
              {/* Social proof */}
              <div className="mt-8 flex items-center justify-center md:justify-start gap-6 text-sm text-gray-500">
                <a
                  href="https://github.com/BigLionX/ProClaw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                  </svg>
                  GitHub
                </a>
                <a
                  href="https://github.com/BigLionX/ProClaw/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  v1.0.0-beta.2
                </a>
              </div>
            </div>

            {/* Right: AI Chat Demo */}
            <div className="relative hidden md:block">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-3 text-xs text-gray-400 font-mono">CEO Agent - 25+ AI 团队在线</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-red-600 rounded-lg px-4 py-2 text-sm text-white max-w-[80%]">
                      帮我分析上周销量最好的商品，并给出补货建议
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-200">
                    <p className="font-semibold text-gray-100 mb-2">上周销售分析报告：</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span>可口可乐 330ml</span>
                        <span className="text-green-400">售出 156 瓶</span>
                      </div>
                      <div className="flex justify-between">
                        <span>乐事薯片 原味</span>
                        <span className="text-green-400">售出 98 包</span>
                      </div>
                      <div className="flex justify-between">
                        <span>农夫山泉 550ml</span>
                        <span className="text-green-400">售出 234 瓶</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-yellow-400 text-xs font-medium">建议：</p>
                      <p className="text-xs mt-1">可口可乐库存偏低（剩余 42 瓶），建议本周补货 200 瓶。</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['/task list', '/context show', '/report'].map((cmd) => (
                      <span key={cmd} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400 font-mono">{cmd}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">为什么选择 ProClaw？</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              不只是进销存软件——而是一个完整的 AI 驱动业务操作系统。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                to={card.link}
                className="group block p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 text-gray-700 group-hover:text-red-600 transition-colors shadow-sm">
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {card.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Industry Quick Links */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">行业场景速览</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {industryLinks.map((item) => (
              <Link
                key={item.slug}
                to={`/solutions/${item.slug}`}
                className="px-6 py-3 bg-white rounded-xl border border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-600 hover:shadow-sm transition-all text-sm font-medium"
              >
                {item.emoji} {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials / Social Proof */}
      <div className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">他们都在用</h2>
            <p className="text-gray-500">听听真实商户的故事</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonialCards.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all">
                <div className="text-3xl mb-3">{t.emoji}</div>
                <p className="text-gray-600 text-sm leading-relaxed italic mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{t.role}</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{t.industry}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tech Stack Trust */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-6">基于可靠的现代技术栈</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {['Tauri 2.11', 'React 18', 'Rust', 'TypeScript', 'Supabase', 'LangChain', 'Next.js 16', 'Expo 52'].map((tech) => (
              <span key={tech} className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-gray-600 shadow-sm border border-gray-100">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            先下载用用看，免费且开源
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            ProClaw Plus / ProClaw Light 免费下载安装，ProClaw Cloud 浏览器直接使用。CEO Agent 对话引导选择行业插件。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/download"
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              免费下载桌面端
            </Link>
            <a
              href="https://cloud.proclaw.com"
              className="px-8 py-4 border-2 border-cyan-500 text-cyan-400 hover:border-cyan-400 hover:text-cyan-300 font-medium rounded-lg transition-all"
            >
              体验 Cloud 版
            </a>
            <Link
              to="/solutions/catering"
              className="px-8 py-4 border-2 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all"
            >
              查看行业方案
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HomePage;
