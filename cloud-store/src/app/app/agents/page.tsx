// ProClaw Cloud 托管版 - AI Agent 框架页面
'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Agent {
  key: string;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  capabilities: string[];
  welcome: string;
}

// Agent 框架：8 个专业 Agent，覆盖经营全流程
const AGENTS: Agent[] = [
  {
    key: 'ceo',
    name: 'CEO Agent',
    subtitle: 'CEO 主控官',
    icon: '🤖',
    description: '战略决策、项目统筹、任务分派',
    capabilities: [
      '分析整体经营状况',
      '制定战略决策与规划',
      '协调各部门工作任务',
    ],
    welcome:
      '我是 CEO Agent，您的经营主控官。我可以帮您分析经营状况、制定战略决策、协调各部门工作。请问有什么需要我帮您处理的？',
  },
  {
    key: 'inventory',
    name: 'Inventory Agent',
    subtitle: '库存管理',
    icon: '📦',
    description: '库存分析、补货建议、库存报表',
    capabilities: [
      '监控库存水平与预警',
      '生成智能补货建议',
      '分析库存周转率',
    ],
    welcome:
      '我是库存管理 Agent。我可以帮您监控库存水平、生成补货建议、分析库存周转率。请告诉我您想了解什么？',
  },
  {
    key: 'finance',
    name: 'Finance Agent',
    subtitle: '财务管理',
    icon: '💰',
    description: '财务分析、预算控制、利润报表',
    capabilities: [
      '分析财务状况与成本',
      '控制预算与支出',
      '生成财务报表',
    ],
    welcome:
      '我是财务管理 Agent。我可以帮您分析财务状况、控制预算、生成财务报表。请问您需要什么帮助？',
  },
  {
    key: 'sales',
    name: 'Sales Agent',
    subtitle: '销售预测',
    icon: '�',
    description: '销售趋势、客户洞察、收入预测',
    capabilities: [
      '分析销售趋势与数据',
      '预测未来销量',
      '识别热销与滞销商品',
    ],
    welcome:
      '我是销售预测 Agent。我可以帮您分析销售趋势、预测未来销量、识别热销商品。请告诉我您的需求？',
  },
  {
    key: 'purchase',
    name: 'Purchase Agent',
    subtitle: '采购管理',
    icon: '🛒',
    description: '供应商管理、采购优化',
    capabilities: [
      '优化采购流程',
      '管理供应商信息',
      '降低采购成本',
    ],
    welcome:
      '我是采购管理 Agent。我可以帮您优化采购流程、管理供应商、降低采购成本。有什么可以帮您的？',
  },
  {
    key: 'market',
    name: 'Market Agent',
    subtitle: '市场分析',
    icon: '📈',
    description: '市场趋势、竞争对手分析、营销策略',
    capabilities: [
      '分析市场趋势',
      '研究竞争对手',
      '制定营销策略',
    ],
    welcome:
      '我是市场分析 Agent。我可以帮您分析市场趋势、研究竞争对手、制定营销策略。请问您想了解什么？',
  },
  {
    key: 'customer_service',
    name: 'Customer Service Agent',
    subtitle: '客户服务',
    icon: '💬',
    description: '客户咨询、FAQ、售后支持',
    capabilities: [
      '处理客户咨询与投诉',
      '管理常见问题 FAQ',
      '提升客户满意度',
    ],
    welcome:
      '我是客户服务 Agent。我可以帮您处理客户咨询、管理FAQ、提升客户满意度。请告诉我您需要什么帮助？',
  },
  {
    key: 'data_analyst',
    name: 'Data Analyst Agent',
    subtitle: '数据分析',
    icon: '🔍',
    description: '数据洞察、商业智能',
    capabilities: [
      '挖掘数据价值',
      '生成业务洞察',
      '辅助决策制定',
    ],
    welcome:
      '我是数据分析 Agent。我可以帮您挖掘数据价值、生成业务洞察、辅助决策制定。请问您想分析什么？',
  },
];

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('ceo');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentAgent = AGENTS.find(a => a.key === selectedAgent) ?? AGENTS[0];

  // 新消息或加载状态变化时，自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const switchAgent = (key: string) => {
    if (key === selectedAgent) return;
    setSelectedAgent(key);
    setMessages([]);
    setInput('');
  };

  const clearConversation = () => {
    setMessages([]);
  };

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMessage: AIMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          agentType: selectedAgent,
        }),
      });

      const result = await res.json();

      if (result.success) {
        const aiMessage: AIMessage = {
          role: 'assistant',
          content: result.data.content,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast.error(result.error || 'AI 回复失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* 左侧 / 顶部：Agent 选择面板 */}
      <aside className="lg:w-80 max-h-60 lg:max-h-none flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">AI Agent 框架</h2>
          <p className="text-xs text-gray-500 mt-1">选择专业 Agent 开始对话</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {AGENTS.map(agent => {
            const isActive = selectedAgent === agent.key;
            return (
              <button
                key={agent.key}
                onClick={() => switchAgent(agent.key)}
                className={`w-full text-left p-3 rounded-xl transition-colors border ${
                  isActive
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                    : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl shrink-0">{agent.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {agent.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {agent.subtitle}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{agent.description}</p>
                <ul className="mt-2 space-y-1">
                  {agent.capabilities.map((cap, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-gray-600 flex items-start gap-1.5"
                    >
                      <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">每次 AI 对话消耗 5 Token</div>
        </div>
      </aside>

      {/* 右侧 / 底部：Agent 聊天面板 */}
      <section className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-0">
        {/* Agent 信息头 */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
          <span className="text-2xl">{currentAgent.icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">
              {currentAgent.name}
              <span className="ml-2 text-xs font-normal text-gray-400">
                {currentAgent.subtitle}
              </span>
            </div>
            <div className="text-xs text-gray-500 truncate">
              {currentAgent.description}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 shrink-0"
            >
              清空对话
            </button>
          )}
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            // 空状态：展示 Agent 欢迎消息
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-base shrink-0 mt-1">
                  {currentAgent.icon}
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap break-words">
                    {currentAgent.welcome}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex gap-3 max-w-[85%]">
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-base shrink-0 mt-1">
                      {currentAgent.icon}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0 mt-1">
                      👤
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* 输入中指示器 */}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-base shrink-0 mt-1">
                  {currentAgent.icon}
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                loading
                  ? 'AI 思考中...'
                  : `向${currentAgent.subtitle}提问...`
              }
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="发送"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
