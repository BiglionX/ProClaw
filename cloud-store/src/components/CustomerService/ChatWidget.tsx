// ProClaw Cloud 托管版 - AI 客服悬浮聊天组件
// 面向商城访客的独立客服聊天窗口

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCustomerServiceStore } from '@/lib/customer-service-store';
import Image from 'next/image';

interface ChatWidgetProps {
  tenantId: string;
}

export default function ChatWidget({ tenantId }: ChatWidgetProps) {
  const {
    messages,
    isOpen,
    isLoading,
    isTransferring,
    settings,
    unreadCount,
    initialize,
    sendMessage,
    toggleOpen,
    clearMessages,
  } = useCustomerServiceStore();

  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化
  useEffect(() => {
    if (tenantId) {
      initialize(tenantId);
    }
  }, [tenantId, initialize]);

  // 自动滚动到最新消息
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // 商家头像 URL
  const avatarUrl = settings?.avatar_url;
  const agentName = settings?.agent_name || '智能客服';

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    clearMessages();
  };

  // ===== 聊天面板 =====
  const renderChatPanel = () => (
    <div
      className="fixed bottom-24 right-6 z-[1199] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300"
      style={{
        width: isMinimized ? '60px' : '380px',
        height: isMinimized ? '60px' : '520px',
        maxHeight: 'calc(100vh - 120px)',
      }}
    >
      {/* 标题栏 */}
      <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden shrink-0 relative">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={agentName} fill className="object-cover" />
            ) : (
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold">{agentName}</div>
            <div className="text-[10px] text-gray-400">在线</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="新对话"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title={isMinimized ? '展开' : '最小化'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMinimized ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 4L4 20m0 0h16M4 20V4" />
              )}
            </svg>
          </button>
          <button
            onClick={() => { toggleOpen(); setIsMinimized(false); }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 最小化状态 */}
      {isMinimized ? (
        <div
          className="flex-1 flex items-center justify-center cursor-pointer bg-gray-50"
          onClick={() => setIsMinimized(false)}
        >
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center relative">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={agentName} fill className="object-cover rounded-full" />
            ) : (
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'customer' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* 头像 */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden relative">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="CS" fill className="object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    )}
                  </div>
                )}

                {/* 消息气泡 */}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'customer'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md border border-gray-100 shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* 用户头像 */}
                {msg.role === 'customer' && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {/* 加载中 */}
            {isLoading && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* 转人工提示 */}
            {isTransferring && !isLoading && (
              <div className="text-center py-2">
                <div className="inline-block bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg px-3 py-1.5">
                  您的问题已转给人工客服，请稍候...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="px-3 py-2.5 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? 'AI 思考中...' : '输入您的问题...'}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ===== 悬浮按钮 =====
  return (
    <>
      {/* 聊天面板 */}
      {isOpen && renderChatPanel()}

      {/* 悬浮按钮 */}
      <button
        onClick={() => { toggleOpen(); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 z-[1200] w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        }}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            {avatarUrl ? (
              <Image src={avatarUrl} alt={agentName} width={40} height={40} className="rounded-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )}
            {/* 未读红点 */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}
