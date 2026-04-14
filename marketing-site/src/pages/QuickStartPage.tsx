import React from 'react';
import { Link } from 'react-router-dom';

const QuickStartPage: React.FC = () => {
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
        <h1 className="text-4xl font-bold mb-8">快速开始指南</h1>
        
        <div className="space-y-12">
          <div className="flex gap-6">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <h2 className="text-xl font-semibold mb-2">下载并安装</h2>
              <p className="text-gray-600 mb-4">前往 GitHub Releases 页面下载适合你操作系统的安装包（Windows/macOS/Linux）。</p>
              <a href="https://github.com/BigLionX/ProClaw/releases" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">前往下载 →</a>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <h2 className="text-xl font-semibold mb-2">配置 AI 智能体</h2>
              <p className="text-gray-600 mb-4">首次启动后，进入"设置"页面，输入你的 LLM API Key（支持 OpenAI, Anthropic, 或本地模型）。</p>
              <div className="bg-gray-100 p-4 rounded-lg text-sm font-mono">
                设置 &gt; Token 管理 &gt; 添加新密钥
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <h2 className="text-xl font-semibold mb-2">开始对话经营</h2>
              <p className="text-gray-600">现在你可以尝试对 AI 说："帮我分析一下上周的销量趋势"，或者"创建一个新商品：可口可乐，进价 3 元，售价 5 元"。</p>
            </div>
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

export default QuickStartPage;
