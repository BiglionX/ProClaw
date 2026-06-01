import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/shared/PageHeader';

interface FAQItem {
  question: string;
  answer: string;
  featured?: boolean;
}

interface FAQCategory {
  name: string;
  questions: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    name: '入门指南',
    questions: [
      {
        question: 'ProClaw 是什么？',
        answer: 'ProClaw 是一个开源的 AI 驱动商户经营操作系统。它不仅仅是进销存软件，更集成了 AI 经营团队（7 个专业 Agent）、CEO 主控官、云托管商城、Agent 生态、移动端 App 等完整能力，帮助中小商户实现智能化经营。',
        featured: true,
      },
      {
        question: 'ProClaw Plus 和 ProClaw Light 怎么选？',
        answer: 'ProClaw Plus 面向实体商户，提供完整的产品库管理、采购销售、库存跟踪功能。ProClaw Light 面向创业团队、自由职业者、虚拟组织，剥离进销存模块，以 Agent 化架构为基础，内置财务管理 Agent，支持从 Agent 市场安装其他能力（任务管理、CRM、文档协作等）。如果两者都需要，可以分别安装使用。',
      },
      {
        question: '支持哪些操作系统？',
        answer: '基于 Tauri 2.0 构建，目前完美支持 Windows 10/11 (x64)、macOS (Intel & Apple Silicon) 以及主流 Linux 发行版。Windows 安装包已发布，macOS 和 Linux 即将推出。移动端 App (Expo) 支持 iOS 和 Android。',
      },
    ],
  },
  {
    name: 'AI 与 Agent',
    questions: [
      {
        question: 'CEO Agent 和普通 AI 聊天有什么区别？',
        answer: 'CEO Agent 是 ProClaw 的核心创新。普通 AI 聊天只是一问一答，而 CEO Agent 作为"主控官"，具备项目上下文协议 (PCP) 能力。它会自动捕获你的宏观决策，维护公司愿景、目标、约束、里程碑等结构化知识。更重要的是，CEO Agent 可以主动分派任务给合适的子 Agent（如财务 Agent、营销 Agent），审查执行结果，并向你汇报进展。你可以使用 /task list、/context show、/report daily 等快捷命令进行管理。',
        featured: true,
      },
      {
        question: '支持哪些 AI 模型？如何配置 API Key？',
        answer: 'ProClaw 不绑定任何模型提供商。支持 OpenAI (GPT 系列)、Anthropic (Claude)、DeepSeek、以及通过 Ollama 运行的本地模型。在桌面端"设置 > Token 管理"中添加 API Key 即可。内置 Token 用量监控和成本控制功能，帮你管理开销。',
      },
      {
        question: '可以自己开发 Agent 吗？怎么发布？',
        answer: '可以。ProClaw 提供完整的 Agent 开发 SDK，使用 TypeScript/JavaScript 即可编写。Agent 以 ZIP 包形式分发，包含 manifest.json 声明权限和能力，前端资源独立运行在沙箱 (WebWorker/iframe) 中。开发完成后上传到 Agent 市场 (nvwa.proclaw.cc) 供其他用户安装。详见贡献指南。',
      },
    ],
  },
  {
    name: '数据与安全',
    questions: [
      {
        question: '我的数据安全吗？会上传到云端吗？',
        answer: '非常安全。ProClaw 采用"本地优先"架构，所有业务数据默认使用 SQLCipher AES-256 加密存储在你本地的 SQLite 数据库中。除非你主动开启 Supabase 云同步功能，否则数据永远不会离开你的设备。云同步也是加密传输，你可以随时关闭。',
        featured: true,
      },
    ],
  },
  {
    name: '定价与费用',
    questions: [
      {
        question: '使用 ProClaw 需要付费吗？',
        answer: 'ProClaw 桌面端应用（ProClaw Plus 和 ProClaw Light）均永久免费开源 (GPL-3.0)。如果你使用 AI 功能，需要自行配置 LLM API Key，费用由模型提供商按用量收取。云托管商城是可选增值服务，提供免费版（20 商品/10 单月）和付费套餐（29元起）。详见定价页。',
        featured: true,
      },
      {
        question: 'AI 调用费用需要我自己承担吗？',
        answer: '是的。ProClaw 软件本身免费。AI 对话、分析等功能依赖的大模型 API 调用费用，由你选择的模型提供商（如 OpenAI、Anthropic、DeepSeek）按用量收取。你也可以使用 Ollama 等本地部署的模型，完全免费。ProClaw 内置了 Token 用量监控，方便你控制成本。',
      },
    ],
  },
  {
    name: '云商城',
    questions: [
      {
        question: '云商城和桌面端数据如何同步？',
        answer: '桌面端作为数据源，通过 HTTPS API 将商品数据（名称、价格、图片、库存）加密推送到云端。支持初始全量同步和后续增量同步（仅变更字段）。商城生成的订单会自动回调桌面端，生成销售单并扣减本地库存。如果库存不足，订单会标记为"待确认"并通知你。',
      },
    ],
  },
  {
    name: '移动端',
    questions: [
      {
        question: '移动端 App 什么时候能用？',
        answer: '移动端 App 基于 Expo (React Native) 开发，支持 iOS 和 Android。目前 Android APK 即将推出，iOS 版本在后续计划中。移动端可与桌面端通过 WebSocket 实时同步数据，支持扫码配对设备和 WebRTC 语音/视频通话。',
      },
    ],
  },
  {
    name: '反馈与支持',
    questions: [
      {
        question: '如何反馈 Bug 或提交建议？',
        answer: '欢迎前往 GitHub Issues 提交反馈，我们非常重视社区的每一条建议。也可以在 GitHub 上 Star 项目，参与讨论和贡献代码。',
      },
    ],
  },
];

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggleQuestion = (catIdx: number, qIdx: number) => {
    const key = `${catIdx}-${qIdx}`;
    setOpenIndex(openIndex === key ? null : key);
  };

  const totalQuestions = faqData.reduce((sum, cat) => sum + cat.questions.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <PageHeader
        title="常见问题"
        description={`共 ${totalQuestions} 个问题，帮你快速了解 ProClaw`}
      />

      {/* FAQ Content */}
      <div className="flex-grow py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqData.map((category, catIdx) => (
            <section key={catIdx} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                {category.name}
              </h2>
              <div className="space-y-3">
                {category.questions.map((faq, qIdx) => {
                  const key = `${catIdx}-${qIdx}`;
                  const isOpen = openIndex === key;
                  return (
                    <div
                      key={qIdx}
                      className={`bg-white rounded-xl border transition-all cursor-pointer ${
                        isOpen ? 'border-black shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleQuestion(catIdx, qIdx)}
                    >
                      <div className="p-5 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {faq.featured && (
                            <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 pr-8">{faq.question}</h3>
                            {isOpen && (
                              <p className="mt-3 text-gray-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">没有找到你需要的答案？</h3>
          <p className="text-gray-600 mb-4">
            前往{' '}
            <a
              href="https://github.com/BigLionX/ProClaw/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GitHub Issues
            </a>{' '}
            提交问题，或发送邮件至 support@proclaw.cc
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQPage;
