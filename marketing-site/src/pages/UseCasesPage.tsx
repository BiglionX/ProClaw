import React from 'react';
import { Link } from 'react-router-dom';

const UseCasesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <img src="/proclaw-logo.png" alt="ProClaw Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold tracking-tight hover:text-gray-600">ProClaw</span>
            </Link>
            <div className="space-x-4">
              <Link to="/" className="text-gray-600 hover:text-black">首页</Link>
              <Link to="/quick-start" className="text-gray-600 hover:text-black">快速开始</Link>
              <Link to="/use-cases" className="text-gray-600 hover:text-black">应用场景</Link>
              <Link to="/faq" className="text-gray-600 hover:text-black">常见问题</Link>
              <Link to="/login" className="text-gray-600 hover:text-black">登录</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-16 flex-grow">
        <h1 className="text-4xl font-bold mb-12 text-center">ProClaw 能帮谁解决问题？</h1>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4">🏪 便利店/超市老板</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• <strong>智能补货：</strong>AI 根据历史销量预测下周进货量。</li>
              <li>• <strong>临期预警：</strong>自动提醒即将过期的商品，减少损耗。</li>
              <li>• <strong>快速收银：</strong>语音录入商品，解放双手。</li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4">🏢 连锁店管理者</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• <strong>多店汇总：</strong>一句话查看 10 家分店的今日总营收。</li>
              <li>• <strong>库存调拨：</strong>AI 建议从 A 店调货给缺货的 B 店。</li>
              <li>• <strong>统一配置：</strong>一键同步所有门店的商品价格策略。</li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4">💻 开发者/极客</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• <strong>技能开发：</strong>使用 SDK 编写自定义业务插件。</li>
              <li>• <strong>数据自主：</strong>基于本地 SQLite 数据库进行二次分析。</li>
              <li>• <strong>开源贡献：</strong>参与 GitHub 社区，共建商业 OS。</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 text-center mt-auto">
        <p className="text-gray-400">&copy; 2026 ProClaw Team.</p>
      </footer>
    </div>
  );
};

export default UseCasesPage;
