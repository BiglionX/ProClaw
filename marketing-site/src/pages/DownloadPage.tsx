import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getPublishedPlugins } from '../lib/pluginService';
import type { IndustryPlugin } from '../types';

const platforms = [
  {
    name: 'Windows',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.6h9.75v9.45L0 20.699V12.6zm10.5-9.498L24 0v11.4H10.5V3.102zM24 12.6v11.4l-13.5-1.902V12.6H24z"/>
      </svg>
    ),
    file: 'ProClaw_0.1.0_x64-setup.exe',
    size: '~6.8 MB',
    arch: 'x64',
    available: true,
    downloadUrl: 'https://github.com/BigLionX/ProClaw/releases/latest',
  },
  {
    name: 'macOS',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M12.99 4.57c.7-.85 1.16-2.04 1.03-3.23-.99.04-2.2.66-2.91 1.49-.64.74-1.2 1.93-1.05 3.07 1.1.08 2.24-.56 2.93-1.33"/>
      </svg>
    ),
    file: '即将推出',
    size: '-',
    arch: 'Universal',
    available: false,
    downloadUrl: '#',
  },
  {
    name: 'Linux',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021a6.01 6.01 0 0 0 .963.044c3.314 0 6 2.686 6 6 0 1.712-.493 3.213-1.39 4.515l-.002-.003c.224.406.409.82.556 1.247.19-.586.28-1.195.28-1.815 0-3.314-2.686-6-6-6-.716 0-1.384.184-1.966.504h-.002A5.836 5.836 0 0 1 12.504 0zM8.143 4.457c-.276 0-.551.034-.82.09C5.2 4.995 3.64 6.752 3.64 8.855c0 .832.25 1.603.667 2.24.207-.847.487-2.638.487-2.638s.603 1.384.978 2.29c.72 1.74 1.163 2.876 1.163 2.876s1.09-1.78 2.098-3.013c.947-1.16 2.448-3.325 2.448-3.325l.001-.003c-.365-.016-.76.003-1.15.125-.174.054-.374.087-.569.087-.38 0-.733-.115-1.036-.313a2.847 2.847 0 0 0-1.291-.345h-.002a2.7 2.7 0 0 0-.393.024z"/>
      </svg>
    ),
    file: '即将推出',
    size: '-',
    arch: 'x64 / ARM64',
    available: false,
    downloadUrl: '#',
  },
];

const systemRequirements = [
  { item: '操作系统', min: 'Windows 10+ (x64)', rec: 'Windows 11' },
  { item: '内存', min: '4 GB RAM', rec: '8 GB RAM' },
  { item: '磁盘空间', min: '200 MB', rec: '500 MB (含数据)' },
  { item: '显示器', min: '1366×768', rec: '1920×1080' },
  { item: '运行时', min: 'WebView2 (Win10+ 内置)', rec: '最新版 WebView2' },
];

const DownloadPage: React.FC = () => {
  const [plugins, setPlugins] = useState<IndustryPlugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getPublishedPlugins();
      setPlugins(data);
      setPluginsLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">下载 ProClaw</h1>
          <p className="text-xl text-gray-500">
            基础桌面端统一构建 · 按需下载行业插件
          </p>
          <p className="text-sm text-gray-400 mt-2">
            当前版本：v0.1.0 | 发布日期：2026-05-26
          </p>
        </div>
      </div>

      {/* Platform Cards - 基础桌面端 */}
      <div className="flex-grow py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ProClaw 基础桌面端
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            适用所有行业，插件按需下载
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className={`rounded-2xl p-8 border-2 text-center ${
                  platform.available
                    ? 'border-gray-200 bg-white hover:border-black hover:shadow-lg transition-all'
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex justify-center mb-4 text-gray-700">{platform.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{platform.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{platform.file}</p>
                <p className="text-xs text-gray-400 mb-4">{platform.size} | {platform.arch}</p>
                {platform.available ? (
                  <a
                    href={platform.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    下载安装包
                  </a>
                ) : (
                  <span className="inline-block px-6 py-3 bg-gray-200 text-gray-500 font-medium rounded-lg cursor-not-allowed">
                    即将推出
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 行业插件 */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              行业插件
            </h2>
            <p className="text-sm text-gray-500 text-center mb-8">
              安装桌面端后选择行业，即可自动下载对应插件
            </p>
            {pluginsLoading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : (
              <div className="grid md:grid-cols-4 gap-4">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <div className="text-4xl mb-3">{plugin.icon || '🧩'}</div>
                    <h3 className="font-semibold text-gray-900 mb-1">{plugin.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">v{plugin.version}</p>
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      已发布
                    </span>
                  </div>
                ))}
                {/* 预留位 */}
                {[{ id: 'beauty', name: '美业版', icon: '💇' }, { id: 'pet', name: '宠物版', icon: '🐾' }].map(
                  (placeholder) => {
                    if (plugins.find((p) => p.id === placeholder.id)) return null;
                    return (
                      <div
                        key={placeholder.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 text-center opacity-60"
                      >
                        <div className="text-4xl mb-3">{placeholder.icon}</div>
                        <h3 className="font-semibold text-gray-900 mb-1">{placeholder.name}</h3>
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                          即将推出
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
            <p className="text-center text-gray-400 text-sm mt-6">
              💡 安装后选择行业即可自动下载对应插件
            </p>
          </div>

          {/* System Requirements */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">系统要求</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-900">项目</th>
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-900">最低配置</th>
                    <th className="py-3 text-sm font-semibold text-gray-900">推荐配置</th>
                  </tr>
                </thead>
                <tbody>
                  {systemRequirements.map((req) => (
                    <tr key={req.item} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-sm text-gray-900 font-medium">{req.item}</td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{req.min}</td>
                      <td className="py-3 text-sm text-gray-600">{req.rec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Install Steps */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">安装步骤</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">下载安装包</h3>
                  <p className="text-sm text-gray-600">从上方选择对应平台下载安装程序。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">运行安装程序</h3>
                  <p className="text-sm text-gray-600">双击运行，按向导完成安装。首次启动 CEO Agent 将对话引导完成配置。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">开始使用</h3>
                  <p className="text-sm text-gray-600">配置 AI 模型 API Key，即可通过自然语言管理你的店铺。</p>
                </div>
              </div>
            </div>
          </div>

          {/* Other options */}
          <div className="grid md:grid-cols-3 gap-6">
            <a
              href="https://github.com/BigLionX/ProClaw"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-black hover:shadow-md transition-all text-center"
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              <h3 className="font-semibold text-gray-900 mb-1">源码编译</h3>
              <p className="text-xs text-gray-500">从 GitHub 克隆源码自行构建</p>
            </a>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center opacity-60">
              <svg className="w-8 h-8 mx-auto mb-3 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 2.264c.937 1.235 1.431 2.722 1.477 4.268h-4.922c.048-1.546.489-3.034 1.351-4.268.402-.576 1.12-.564 2.094 0zM19.9 8.532c.216 1.125.216 2.307.216 3.6 0 1.905-.108 3.336-.324 4.536-.216 1.2-.648 2.1-1.188 2.7-.54.6-1.188.9-1.836.9-.648 0-1.296-.3-1.836-.9-.54-.6-.972-1.5-1.188-2.7-.216-1.2-.324-2.631-.324-4.536 0-1.293 0-2.475.216-3.6H19.9zM9.1 8.532c.216 1.125.216 2.307.216 3.6 0 1.905-.108 3.336-.324 4.536-.216 1.2-.648 2.1-1.188 2.7-.54.6-1.188.9-1.836.9-.648 0-1.296-.3-1.836-.9-.54-.6-.972-1.5-1.188-2.7-.216-1.2-.324-2.631-.324-4.536 0-1.293 0-2.475.216-3.6H9.1z"/>
              </svg>
              <h3 className="font-semibold text-gray-900 mb-1">移动端 App</h3>
              <p className="text-xs text-gray-500">Android APK 即将推出</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center opacity-60">
              <svg className="w-8 h-8 mx-auto mb-3 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M12.99 4.57c.7-.85 1.16-2.04 1.03-3.23-.99.04-2.2.66-2.91 1.49-.64.74-1.2 1.93-1.05 3.07 1.1.08 2.24-.56 2.93-1.33"/>
              </svg>
              <h3 className="font-semibold text-gray-900 mb-1">iOS App</h3>
              <p className="text-xs text-gray-500">即将推出</p>
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            源码与历史版本请查看{' '}
            <a href="https://github.com/BigLionX/ProClaw/releases" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              GitHub Releases
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DownloadPage;
