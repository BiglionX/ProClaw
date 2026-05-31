import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import type { SolutionData } from '../lib/solutionData';

interface SolutionPageProps {
  data: SolutionData;
}

const SolutionPage: React.FC<SolutionPageProps> = ({ data }) => {
  useEffect(() => {
    document.title = data.seoTitle;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', data.seoDescription);
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', data.seoKeywords);
    }

    return () => {
      document.title = 'ProClaw - AI 驱动的商户经营操作系统';
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className={`bg-gradient-to-br ${data.heroGradient} text-white`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-6xl mb-6">{data.icon}</div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{data.heroTitle}</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">{data.heroDescription}</p>
          <div className="mt-8">
            <Link
              to="/download"
              className="inline-block px-8 py-4 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
            >
              免费下载桌面端
            </Link>
          </div>
        </div>
      </div>

      {/* Pain Points & Solutions */}
      <div className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">痛点与解法</h2>
          <p className="text-gray-500 text-center mb-10">{data.name}常见问题，ProClaw 一站式解决</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.painPoints.map((item, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">!</span>
                  <h3 className="font-semibold text-gray-900 text-sm">痛点</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{item.problem}</p>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">&#10003;</span>
                    <h3 className="font-semibold text-gray-900 text-sm">ProClaw 解法</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">功能亮点</h2>
          <p className="text-gray-500 text-center mb-10">{data.name}专属功能，精准匹配行业需求</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Agents */}
      <div className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">AI 赋能</h2>
          <p className="text-gray-500 text-center mb-10">{data.name}专属 AI Agent，24 小时在线待命</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.aiAgents.map((agent, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-sm mb-4">
                  AI
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{agent.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{agent.desc}</p>
                <span className="text-xs text-gray-400 font-mono bg-gray-200 px-2 py-1 rounded">{agent.agentId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">定价</h2>
          <p className="text-gray-500 text-center mb-10">桌面端免费使用，高级功能按需付费</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.pricing.map((item, idx) => (
              <div key={idx} className={`bg-white rounded-2xl border-2 p-6 text-center ${idx === 0 ? 'border-green-300' : idx === 1 ? 'border-gray-200' : 'border-blue-200'}`}>
                <h3 className="font-bold text-gray-900 mb-1">{item.planName}</h3>
                <p className="text-3xl font-extrabold text-gray-900 mb-3">{item.price}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">准备好开始了吗？</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">{data.ctaText}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/download"
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              免费下载桌面端
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-4 border-2 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all"
            >
              查看完整定价
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SolutionPage;
