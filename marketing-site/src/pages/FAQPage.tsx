import React from 'react';
import { Link } from 'react-router-dom';

const FAQPage: React.FC = () => {
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

      <main className="max-w-3xl mx-auto px-4 py-16 flex-grow">
        <h1 className="text-4xl font-bold mb-12">常见问题 (FAQ)</h1>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">我的数据安全吗？会上传到云端吗？</h3>
            <p className="text-gray-600">非常安全。ProClaw 采用"本地优先"架构，所有业务数据默认加密存储在你本地的 SQLite 数据库中。除非你主动开启云同步功能，否则数据永远不会离开你的设备。</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">使用 ProClaw 需要付费吗？</h3>
            <p className="text-gray-600">ProClaw 桌面端应用本身是开源且免费的（GPL-3.0 协议）。但你如果使用 AI 智能体功能，需要自行配置 LLM API Key，这部分费用由模型提供商收取。</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">支持哪些操作系统？</h3>
            <p className="text-gray-600">基于 Tauri 2.0 构建，目前完美支持 Windows 10/11、macOS (Intel & Apple Silicon) 以及主流 Linux 发行版。</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">如何反馈 Bug 或提交建议？</h3>
            <p className="text-gray-600">欢迎前往我们的 <a href="https://github.com/BigLionX/ProClaw/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Issues</a> 页面提交反馈。我们非常重视社区的每一条建议。</p>
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

export default FAQPage;
