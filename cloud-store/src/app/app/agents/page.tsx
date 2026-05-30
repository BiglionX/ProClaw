// ProClaw Cloud 托管版 - AI 助手页面
'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

const AGENT_TYPES = [
  { key: 'general', label: '通用助手', icon: '🤖', description: '回答系统使用和经营问题' },
  { key: 'inventory', label: '库存专家', icon: '📦', description: '库存分析和补货建议' },
  { key: 'finance', label: '财务专家', icon: '💰', description: 'Token 消耗和成本优化' },
  { key: 'sales', label: '销售专家', icon: '📈', description: '销售分析和趋势预测' },
];

const QUICK_QUESTIONS: Record<string, string[]> = {
  general: [
    '如何使用进销存系统？',
    '如何添加新商品？',
    '如何创建采购订单？',
  ],
  inventory: [
    '有哪些商品库存不足？',
    '如何设置库存预警？',
    '分析当前库存状况',
  ],
  finance: [
    '我的 Token 消耗情况如何？',
    '如何节省 Token 使用？',
    '分析我的经营成本',
  ],
  sales: [
    '哪些商品卖得最好？',
    '分析本周销售趋势',
    '如何提升销售额？',
  ],
};

export default function AgentsPage() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentType, setAgentType] = useState('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content) return;

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
          messages: updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
          agentType,
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

  const switchAgent = (key: string) => {
    setAgentType(key);
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 左侧 Agent 选择 */}
      <div className="w-64 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">AI 助手</h2>
          <p className="text-xs text-gray-500 mt-1">选择专业助手</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {AGENT_TYPES.map(agent => (
            <button
              key={agent.key}
              onClick={() => switchAgent(agent.key)}
              className={`w-full text-left p-3 rounded-xl transition-colors ${
                agentType === agent.key
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{agent.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{agent.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{agent.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            每次 AI 对话消耗 5 Token
          </div>
        </div>
      </div>

      {/* 右侧聊天面板 */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-6xl mb-4">{AGENT_TYPES.find(a => a.key === agentType)?.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {AGENT_TYPES.find(a => a.key === agentType)?.label}
            </h3>
            <p className="text-gray-500 text-sm mb-8 text-center max-w-md">
              {AGENT_TYPES.find(a => a.key === agentType)?.description}
            </p>

            {/* 快速问题 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {(QUICK_QUESTIONS[agentType] || QUICK_QUESTIONS.general).map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(question)}
                  className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors text-left border border-gray-100"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Agent 选择标签 */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-lg">{AGENT_TYPES.find(a => a.key === agentType)?.icon}</span>
              <span className="font-medium text-gray-900">
                {AGENT_TYPES.find(a => a.key === agentType)?.label}
              </span>
              <button
                onClick={() => setMessages([])}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
              >
                清空对话
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex gap-3 max-w-[80%]">
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm shrink-0 mt-1">
                        {AGENT_TYPES.find(a => a.key === agentType)?.icon || '🤖'}
                      </div>
                    )}
                    <div>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm shrink-0 mt-1">
                        👤
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm shrink-0 mt-1">
                      {AGENT_TYPES.find(a => a.key === agentType)?.icon || '🤖'}
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}

        {/* 输入框 */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loading ? 'AI 思考中...' : `向${AGENT_TYPES.find(a => a.key === agentType)?.label}提问...`}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
