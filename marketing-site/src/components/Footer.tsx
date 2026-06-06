import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* 产品 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">产品</h4>
            <ul className="space-y-2">
              <li><Link to="/features" className="text-gray-400 hover:text-white text-sm transition-colors">功能全景</Link></li>
              <li><Link to="/use-cases" className="text-gray-400 hover:text-white text-sm transition-colors">应用场景</Link></li>
              <li><Link to="/download#pricing" className="text-gray-400 hover:text-white text-sm transition-colors">定价</Link></li>
              <li><Link to="/download" className="text-gray-400 hover:text-white text-sm transition-colors">下载</Link></li>
              <li><Link to="/flowhub" className="text-gray-400 hover:text-white text-sm transition-colors">FlowHub 插件市场</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white text-sm transition-colors">常见问题</Link></li>
            </ul>
          </div>

          {/* 行业方案 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">行业方案</h4>
            <ul className="space-y-2">
              <li><Link to="/solutions/catering" className="text-gray-400 hover:text-white text-sm transition-colors">餐饮</Link></li>
              <li><Link to="/solutions/beauty" className="text-gray-400 hover:text-white text-sm transition-colors">美业</Link></li>
              <li><Link to="/solutions/pet" className="text-gray-400 hover:text-white text-sm transition-colors">宠物</Link></li>
              <li><Link to="/solutions/cloud" className="text-gray-400 hover:text-white text-sm transition-colors">Cloud 托管</Link></li>
            </ul>
          </div>

          {/* 资源 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">资源</h4>
            <ul className="space-y-2">
              <li><a href="https://github.com/BigLionX/ProClaw" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">文档</a></li>
              <li><a href="https://github.com/BigLionX/ProClaw/blob/main/docs/API_DOCUMENTATION.md" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">API 文档</a></li>
              <li><Link to="/changelog" className="text-gray-400 hover:text-white text-sm transition-colors">发布日志</Link></li>
              <li><a href="https://github.com/BigLionX/ProClaw/blob/main/docs/guides/INSTALLATION_GUIDE.md" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">安装指南</a></li>
              <li><Link to="/flowhub" className="text-gray-400 hover:text-white text-sm transition-colors">FlowHub 插件市场</Link></li>
              <li><a href="https://skillhub.proclaw.cc" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">技能仓库</a></li>
              <li><a href="https://nvwax.proclaw.cc" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">智能体工厂</a></li>
            </ul>
          </div>

          {/* 社区 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">社区</h4>
            <ul className="space-y-2">
              <li><a href="https://github.com/BigLionX/ProClaw" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">GitHub</a></li>
              <li><a href="https://github.com/BigLionX/ProClaw/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">Issue 反馈</a></li>
              <li><a href="https://github.com/BigLionX/ProClaw/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">贡献指南</a></li>
            </ul>
          </div>

          {/* 法律 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">法律</h4>
            <ul className="space-y-2">
              <li><span className="text-gray-400 text-sm">隐私政策</span></li>
              <li><span className="text-gray-400 text-sm">服务条款</span></li>
              <li><a href="https://github.com/BigLionX/ProClaw/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">许可证 (GPL-3.0)</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/proclaw-logo.png" alt="ProClaw Logo" className="h-6 w-auto opacity-70" />
            <span className="text-gray-400 text-sm">&copy; 2026 ProClaw Team. Released under GPL-3.0 License.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/BigLionX/ProClaw" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
            </a>
            {/* 微信公众号占位 */}
            <span className="text-gray-500 hover:text-gray-400 transition-colors cursor-default" title="微信公众号：即将推出">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.26c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.585.928a.31.31 0 0 0 .14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.05a.49.49 0 0 1 .177-.554C23.063 18.48 24 16.82 24 14.98c0-3.21-2.931-5.952-7.062-6.122zm-2.18 2.769c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/></svg>
            </span>
            <span className="text-gray-600 text-xs">ICP 备案号：待备案</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
