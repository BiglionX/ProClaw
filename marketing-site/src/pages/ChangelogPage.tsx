import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/shared/PageHeader';

interface Release {
  version: string;
  date: string;
  title: string;
  sections: {
    type: 'added' | 'changed' | 'fixed' | 'technical';
    label: string;
    color: string;
    items: string[];
  }[];
}

const releases: Release[] = [
  {
    version: 'v0.1.0',
    date: '2026-05-26',
    title: '首个桌面安装包发布',
    sections: [
      {
        type: 'added',
        label: '新增',
        color: 'bg-green-100 text-green-800',
        items: [
          '首个桌面安装包: Windows x64 NSIS 安装程序 (~6.8 MB)',
          'AI 经营团队: 内置 7 个专业 Agent（库存、销售、数据分析、采购、财务、客服、AI 智能找图）',
          'AI 智能找图 Agent: 有产品时自动推荐，作为第 7 个内置 Agent',
          'AI 团队管理：创建/编辑/删除/导入/导出，发布到市场',
          'Phase 8: 测试与文档 - 全面质量保证',
          '前端服务单元测试 (15 个测试模块, ~200+ 测试用例)',
          'AI 团队推荐服务单元测试 (10 个测试用例)',
          'Rust 后端单元测试: permissions (22), key_manager (5), types (8), crypto (3), database (2)',
          'E2E 测试增强 (9 个 spec 文件): 采购、财务、库存、设置',
          '用户手册: 部署与使用指南 (10 章节) + Pro 版开通指南 (6 章节)',
          '打包配置优化: 增强 Windows 构建脚本, 多平台目标配置准备',
        ],
      },
      {
        type: 'changed',
        label: '优化',
        color: 'bg-blue-100 text-blue-800',
        items: [
          'TeamsPage: 使用 safeInvoke 替代裸 invoke，修复浏览器 dev 模式崩溃',
          'TeamsPage: Card 样式从暗色改为自适应主题背景',
          'tauri.ts: 警告去重，同一命令仅提示一次',
          '完善权限模块测试覆盖',
        ],
      },
      {
        type: 'fixed',
        label: '修复',
        color: 'bg-yellow-100 text-yellow-800',
        items: [
          '修复 TeamsPage 在浏览器 dev 模式下崩溃',
          '修复 TeamsPage 卡片暗色背景与浅色主题不搭配',
        ],
      },
      {
        type: 'technical',
        label: '技术',
        color: 'bg-purple-100 text-purple-800',
        items: [
          '前端测试覆盖率目标 > 60%',
          'Rust 测试覆盖: auth, utils, types 模块',
          'E2E 测试覆盖: 登录、仪表盘、产品、销售、采购、财务、库存、设置、双模式库',
          '测试框架: Vitest + Playwright + Rust #[test]',
          '新增 build:tauri npm script',
        ],
      },
    ],
  },
  {
    version: 'v1.0.0-beta.1',
    date: '2026-04-13',
    title: '初始版本发布',
    sections: [
      {
        type: 'added',
        label: '新增',
        color: 'bg-green-100 text-green-800',
        items: [
          'Tauri 2.0 + React 18 桌面应用框架',
          '经营智能体主界面',
          '产品库管理模块 (简单模式 + SPU-SKU 电商模式)',
          '进销存 AI 模块',
          '技能商店基础架构',
          'SQLite 本地数据库 + Supabase 云端同步',
          'MUI + Tailwind CSS UI 系统',
          '离线优先架构',
          '数据加密 (SQLCipher)',
          '仪表盘页面功能（实时数据、图表、预警）',
          '仪表盘单元测试',
        ],
      },
      {
        type: 'changed',
        label: '优化',
        color: 'bg-blue-100 text-blue-800',
        items: [
          '从 ProCYC 单体项目中提取',
          '独立为开源项目',
          '重构 DashboardPage 组件，从占位符升级为完整功能页面',
          '优化数据加载性能（并行请求）',
        ],
      },
      {
        type: 'technical',
        label: '技术',
        color: 'bg-purple-100 text-purple-800',
        items: [
          '3,000+ 行 TypeScript 代码',
          '完整的类型定义',
          '模块化架构设计',
        ],
      },
    ],
  },
];

const ChangelogPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <PageHeader
        title="发布日志"
        description="跟踪 ProClaw 的每个版本更新与改进。"
      />

      {/* Release List */}
      <div className="flex-grow py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {releases.map((release) => (
            <div key={release.version} className="mb-12">
              {/* Version Header */}
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{release.version}</h2>
                <span className="text-gray-400 text-sm">{release.date}</span>
              </div>
              <p className="text-lg text-gray-700 mb-6 font-medium">{release.title}</p>

              {/* Sections */}
              <div className="space-y-6">
                {release.sections.map((section) => (
                  <div key={section.type}>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${section.color}`}>
                      {section.label}
                    </span>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-gray-300 mt-1">-</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <hr className="mt-10 border-gray-200" />
            </div>
          ))}

          <p className="text-center text-gray-400 text-sm mt-4">
            完整更新历史请查看{' '}
            <a
              href="https://github.com/BigLionX/ProClaw/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              CHANGELOG.md on GitHub
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ChangelogPage;
