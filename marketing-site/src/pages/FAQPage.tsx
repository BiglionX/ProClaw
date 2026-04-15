import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string;
  tags?: string[];
  is_featured?: boolean;
}

interface FAQCategory {
  category: {
    name: string;
    slug: string;
    description?: string;
  };
  questions: FAQItem[];
}

interface FAQData {
  generated_at: string;
  total_categories: number;
  total_questions: number;
  faqs: FAQCategory[];
}

const FAQPage: React.FC = () => {
  const [faqData, setFaqData] = useState<FAQData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      // 尝试从主应用API加载
      const response = await fetch('http://localhost:3000/api/faqs/export');
      if (response.ok) {
        const data = await response.json();
        setFaqData(data);
      } else {
        // 如果API不可用，使用静态数据
        loadStaticFAQs();
      }
    } catch (error) {
      console.error('Failed to load FAQs from API, using static data:', error);
      loadStaticFAQs();
    } finally {
      setLoading(false);
    }
  };

  const loadStaticFAQs = () => {
    // 默认的静态FAQ数据
    setFaqData({
      generated_at: new Date().toISOString(),
      total_categories: 3,
      total_questions: 4,
      faqs: [
        {
          category: {
            name: '入门指南',
            slug: 'getting-started',
            description: '安装、配置和基本使用',
          },
          questions: [
            {
              question: 'ProClaw 是什么？',
              answer: 'ProClaw 是一个开源的进销存管理系统，采用本地优先架构，支持AI智能决策。所有数据默认存储在本地，确保数据安全性和隐私保护。',
              is_featured: true,
            },
          ],
        },
        {
          category: {
            name: '数据管理',
            slug: 'data-management',
            description: '产品、库存、销售数据管理',
          },
          questions: [
            {
              question: '我的数据安全吗？会上传到云端吗？',
              answer: '非常安全。ProClaw 采用“本地优先”架构，所有业务数据默认加密存储在你本地的 SQLite 数据库中。除非你主动开启云同步功能，否则数据永远不会离开你的设备。',
              is_featured: true,
            },
          ],
        },
        {
          category: {
            name: '账户与订阅',
            slug: 'account-subscription',
            description: '账户管理和Token订阅',
          },
          questions: [
            {
              question: '使用 ProClaw 需要付费吗？',
              answer: 'ProClaw 桌面端应用本身是开源且免费的（GPL-3.0 协议）。但你如果使用 AI 智能体功能，需要自行配置 LLM API Key，这部分费用由模型提供商收取。',
              is_featured: true,
            },
            {
              question: '支持哪些操作系统？',
              answer: '基于 Tauri 2.0 构建，目前完美支持 Windows 10/11、macOS (Intel & Apple Silicon) 以及主流 Linux 发行版。',
            },
          ],
        },
      ],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

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

      <main className="max-w-4xl mx-auto px-4 py-16 flex-grow">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">常见问题 (FAQ)</h1>
          <p className="text-gray-600">
            {faqData && `共 ${faqData.total_questions} 个问题，更新于 ${new Date(faqData.generated_at).toLocaleDateString('zh-CN')}`}
          </p>
        </div>
        
        {faqData?.faqs.map((categoryData, catIndex) => (
          <section key={catIndex} className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">{categoryData.category.name}</h2>
              {categoryData.category.description && (
                <p className="text-gray-600">{categoryData.category.description}</p>
              )}
            </div>
            
            <div className="space-y-6">
              {categoryData.questions.map((faq, qIndex) => (
                <div
                  key={qIndex}
                  className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${
                    faq.is_featured ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {faq.is_featured && (
                      <span className="text-blue-500 text-xl">⭐</span>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                      {faq.tags && faq.tags.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {faq.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* 反馈区域 */}
        <div className="mt-12 bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">没有找到您需要的答案？</h3>
          <p className="text-gray-700 mb-4">
            欢迎通过以下方式联系我们：
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              前往{' '}
              <a
                href="https://github.com/BigLionX/ProClaw/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GitHub Issues
              </a>{' '}
              提交问题
            </li>
            <li>发送邮件至 support@proclaw.cn</li>
            <li>加入我们的社区讨论组</li>
          </ul>
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
