import { useNavigate } from 'react-router-dom';
import RouteSEO from '../components/RouteSEO';

const PARTNERS = [
  { name: '餐饮行业', desc: 'POS 收银、KDS 厨房显示、桌台管理', icon: '🍽️', color: '#e74c3c' },
  { name: '美业行业', desc: '预约管理、服务项目、员工排班、会员营销', icon: '💇', color: '#ec4899' },
  { name: '宠物行业', desc: '宠物档案、寄养预约、美容服务', icon: '🐾', color: '#f59e0b' },
  { name: 'Cloud 云服务', desc: 'Token 计费、云端备份、云商城托管', icon: '☁️', color: '#0ea5e9' },
];

const FEATURES = [
  {
    title: '即装即用',
    desc: '一键安装行业插件，自动添加功能模块、操作面板和 AI 经营团队，无需复杂配置。',
    icon: '⚡',
  },
  {
    title: '安全沙箱',
    desc: '每个插件运行在独立沙箱中，权限需用户确认。代码签名验证，确保来源可信。',
    icon: '🛡️',
  },
  {
    title: '版本管理',
    desc: '自动检查更新，支持灰度发布和强制更新。开发者可随时发布新版，用户平滑升级。',
    icon: '🔄',
  },
  {
    title: '开放生态',
    desc: '使用 TypeScript / Rust 开发插件，通过 manifest.json 声明能力和权限。上传到 FlowHub 即可分发。',
    icon: '🔧',
  },
  {
    title: 'AI 联动',
    desc: '插件自动向 ProClaw AI Agent 暴露上下文，Agent 能够触发插件内的业务操作，实现智能自动化。',
    icon: '🤖',
  },
  {
    title: '社区评价',
    desc: '用户可对插件评分、撰写评价，帮助其他商家选择最适合的行业方案。',
    icon: '⭐',
  },
];

const WORKFLOW = [
  { step: '01', title: '浏览插件', desc: '在插件商店中按行业、功能浏览或搜索插件。' },
  { step: '02', title: '一键安装', desc: '点击安装，查看权限声明并确认。插件自动加载功能模块和导航。' },
  { step: '03', title: '开始使用', desc: '新菜单、新面板即刻生效。AI Agent 自动感知插件能力，协同工作。' },
  { step: '04', title: '持续更新', desc: '插件自动推送更新，业务功能持续进化，永不掉队。' },
];

export default function FlowHubPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <RouteSEO routeKey="flowhub" />

      {/* ========== Hero ========== */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🔌</span>
              <span className="text-indigo-300 font-mono text-sm tracking-widest uppercase">FlowHub</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              ProClaw <span className="text-indigo-300">插件市场</span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed mb-8">
              FlowHub 是 ProClaw 的行业工作流插件生态市场。
              从餐饮 POS 到宠物店管理，发现适合你业务的插件，即装即用，无限扩展。
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/plugins')}
                className="px-8 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                浏览插件商店
              </button>
              <button
                onClick={() => navigate('/download')}
                className="px-8 py-3 border border-gray-500 text-gray-200 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                下载 ProClaw
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 行业插件 ========== */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">覆盖多个行业</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            FlowHub 为不同行业提供定制化插件，每个插件都包含专属功能模块、操作面板和 AI 经营团队。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PARTNERS.map((item) => (
            <div
              key={item.name}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all group cursor-pointer"
              onClick={() => navigate('/plugins')}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ backgroundColor: `${item.color}15` }}
              >
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {item.name}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== 核心特性 ========== */}
      <section className="bg-white border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">为什么选择 FlowHub？</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              基于 ProClaw 插件系统（PRD v10.0），为行业工作流提供原生扩展能力。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 工作流程 ========== */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">即刻上手</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            从安装到使用，只需简单几步。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {WORKFLOW.map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-indigo-600 font-bold text-lg">{item.step}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== 开发者 CTA ========== */}
      <section className="bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-5xl mb-6 block">👨‍💻</span>
            <h2 className="text-3xl font-bold mb-4">开发者专区</h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-8">
              FlowHub 欢迎第三方开发者投稿。使用 ProClaw 插件 SDK 开发行业工作流插件，
              上传到 FlowHub 进行审核上架，服务更多商户。
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://github.com/BigLionX/ProClaw/blob/main/docs/API_DOCUMENTATION.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                查看开发文档
              </a>
              <a
                href="https://github.com/BigLionX/ProClaw"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border border-gray-500 text-gray-200 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                GitHub 仓库
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 插件格式摘要 ========== */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📦</span>
              <h2 className="text-2xl font-bold text-gray-900">插件包格式</h2>
            </div>
            <p className="text-gray-500 mb-6 max-w-3xl">
              每个插件是一个签名的 ZIP 包，包含 manifest.json 元数据、前端资源、后端动态库（可选）和数据库迁移脚本。
            </p>
            <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm text-gray-600 overflow-x-auto">
              <pre>{`my-plugin/
├── manifest.json          # 元数据（ID、名称、版本、权限声明）
├── frontend/              # 前端资源（React 组件注册）
│   ├── index.js
│   └── *.css
├── backend/               # Rust 后端插件（可选）
│   └── plugin.dll         # 编译后的动态库
├── migrations/
│   ├── up.sql             # 数据库升级脚本
│   └── down.sql           # 卸载回滚脚本
└── assets/                # 图标、截图等`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">准备好扩展你的业务了吗？</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            免费下载 ProClaw 桌面端，从插件商店安装你需要的行业插件，立刻体验 AI 驱动的智能经营。
          </p>
          <button
            onClick={() => navigate('/download')}
            className="px-10 py-4 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-400 transition-colors shadow-lg text-lg"
          >
            免费下载 ProClaw
          </button>
        </div>
      </section>
    </div>
  );
}
