import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
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
              <Link to="/" className="text-gray-600 hover:text-black font-semibold">首页</Link>
              <Link to="/quick-start" className="text-gray-600 hover:text-black font-semibold">快速开始</Link>
              <Link to="/use-cases" className="text-gray-600 hover:text-black font-semibold">应用场景</Link>
              <Link to="/faq" className="text-gray-600 hover:text-black font-semibold">常见问题</Link>
              <Link to="/login" className="text-gray-600 hover:text-black font-semibold">登录</Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center md:text-left">
              <div className="inline-block px-4 py-2 bg-red-100 text-red-600 rounded-full text-sm font-semibold mb-6">
                🚀 开源免费 · 本地优先 · AI 驱动
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                <span className="block text-gray-900">ProClaw</span>
                <span className="block text-3xl md:text-4xl mt-2 bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400">智能商户经营操作系统</span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                专为中小商户打造的下一代智能业务系统。通过 AI 智能体，用自然语言即可完成进销存管理、数据分析、财务统计等复杂操作。
              </p>
              <ul className="mt-6 space-y-3 text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>数据 100% 本地存储，隐私完全掌控</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>AI 智能体对话式操作，零学习成本</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>跨平台支持 Windows / macOS / Linux</span>
                </li>
              </ul>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a href="https://github.com/BigLionX/ProClaw/releases/latest" target="_blank" rel="noopener noreferrer"
                   className="px-8 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    立即下载 v1.0 Beta
                  </span>
                </a>
                <a href="https://github.com/BigLionX/ProClaw" target="_blank" rel="noopener noreferrer"
                   className="px-8 py-4 border-2 border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
                    查看源码
                  </span>
                </a>
              </div>
              <div className="mt-6 flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  GitHub Stars 500+
                </span>
                <span>•</span>
                <span>Downloads 10k+</span>
              </div>
            </div>

            {/* Right Image/Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-8 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-xl p-6 shadow-inner">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">AI 智能助手</div>
                        <div className="text-xs text-gray-500">在线</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-100 rounded-lg p-3 text-sm">
                        <p className="text-gray-700">💬 帮我分析上周销量最好的商品</p>
                      </div>
                      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 text-sm">
                        <p className="text-gray-800 font-medium">📊 上周销售分析：</p>
                        <ul className="mt-2 space-y-1 text-gray-600 text-xs">
                          <li>• 可口可乐 - 售出 156 瓶</li>
                          <li>• 薯片组合 - 售出 98 包</li>
                          <li>• 矿泉水 - 售出 234 瓶</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-400 rounded-full opacity-20 blur-xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-16 bg-white flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">核心特性</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <a href="#local-first-detail" className="block p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">本地优先 (Local-First)</h3>
              <p className="text-gray-500">默认使用加密 SQLite 数据库，数据 100% 存储在您的设备上，离线也能流畅运行。</p>
              <span className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700">了解更多 →</span>
            </a>
            <a href="#ai-native-detail" className="block p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI 原生架构</h3>
              <p className="text-gray-500">深度集成 LLM 与 Dify 工作流，通过自然语言即可完成进销存管理与数据分析。</p>
              <span className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700">了解更多 →</span>
            </a>
            <a href="#skills-detail" className="block p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">技能生态 (Skills)</h3>
              <p className="text-gray-500">可扩展的插件系统，支持财务管理、电商对接等技能的自由安装与定制。</p>
              <span className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700">了解更多 →</span>
            </a>
          </div>
        </div>
      </div>

      {/* Feature Details Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          
          {/* Local-First Detail */}
          <div id="local-first-detail" className="scroll-mt-20">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-4">本地优先 (Local-First) 架构</h3>
                <div className="space-y-4 text-gray-600">
                  <p>ProClaw 采用先进的本地优先设计理念，所有业务数据默认存储在您本地的加密 SQLite 数据库中。这意味着：</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>完全数据主权：</strong>您的销售数据、库存信息、客户资料 100% 掌握在自己手中，无需担心云端泄露风险。</li>
                    <li><strong>离线可用：</strong>即使在没有网络的环境下，您依然可以正常使用所有核心功能，包括商品管理、销售记录、库存查询等。</li>
                    <li><strong>极速响应：</strong>本地数据库操作毫秒级响应，告别网络延迟带来的卡顿体验。</li>
                    <li><strong>可选云同步：</strong>如果您需要多设备协同，可以主动开启 Supabase 云同步功能，数据加密传输，安全可控。</li>
                  </ul>
                  <p className="mt-4 text-sm text-gray-500 italic">技术实现：基于 Tauri 2.0 + SQLite + SQLCipher 加密，确保数据安全与性能的最佳平衡。</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Native Detail */}
          <div id="ai-native-detail" className="scroll-mt-20">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-4">AI 原生架构设计</h3>
                <div className="space-y-4 text-gray-600">
                  <p>ProClaw 从底层架构就将 AI 能力作为核心组件，而非事后附加功能。您可以像与助手对话一样管理店铺：</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>自然语言交互：</strong>直接说"帮我分析一下上周销量最好的前 10 个商品"或"创建新商品：可口可乐，进价 3 元，售价 5 元"，AI 自动执行操作。</li>
                    <li><strong>智能数据分析：</strong>AI 自动识别销售趋势、库存异常、利润波动，并给出 actionable 的经营建议。</li>
                    <li><strong>Dify 工作流集成：</strong>支持连接 Dify 平台，自定义复杂的 AI 业务流程，如自动化采购建议、智能定价策略等。</li>
                    <li><strong>多模型支持：</strong>兼容 OpenAI、Anthropic Claude、本地部署的大模型（如 Ollama），您可以根据需求自由选择。</li>
                  </ul>
                  <p className="mt-4 text-sm text-gray-500 italic">注意：AI 功能需要配置有效的 API Key，费用由模型提供商收取，ProClaw 本身不收取额外费用。</p>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Detail */}
          <div id="skills-detail" className="scroll-mt-20">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-4">技能生态系统 (Skills)</h3>
                <div className="space-y-4 text-gray-600">
                  <p>ProClaw 提供开放的插件式技能系统，让您可以按需扩展应用功能，打造专属的业务操作系统：</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>财务管理技能：</strong>自动生成财务报表、税务计算、成本分析等专业财务功能。</li>
                    <li><strong>电商对接技能：</strong>支持与淘宝、京东、拼多多等电商平台的数据同步，统一管理线上线下库存。</li>
                    <li><strong>会员管理技能：</strong>积分系统、会员等级、优惠券发放等客户关系管理功能。</li>
                    <li><strong>开发者友好：</strong>提供完整的 SDK 和文档，开发者可以使用 TypeScript/JavaScript 编写自定义技能，并通过社区分享。</li>
                  </ul>
                  <p className="mt-4 text-sm text-gray-500 italic">开源贡献：欢迎在 GitHub 上提交您的技能插件，共同构建 ProClaw 生态。</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">&copy; 2026 ProClaw Team. Released under GPL-3.0 License.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
