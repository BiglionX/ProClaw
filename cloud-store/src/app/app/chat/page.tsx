// ProClaw Shop - 聊天页面
'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useChatStore, type Message } from '@/lib/chat-store';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const {
    contacts,
    messages,
    activeContactId,
    loadingContacts,
    loadingMessages,
    loadingMore,
    pagination,
    fetchContacts,
    sendMessage,
    setActiveContact,
    subscribeToMessages,
    loadMoreMessages,
  } = useChatStore();

  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载联系人
  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 订阅活跃联系人的新消息
  useEffect(() => {
    if (!activeContactId) return;
    const unsubscribe = subscribeToMessages(activeContactId);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContactId]);

  // 新消息时滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContactId]);

  // 滚动到顶部加载更多
  const handleScroll = () => {
    if (!activeContactId || loadingMore || !pagination[activeContactId]?.hasMore) return;
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 50) {
      // 保存当前滚动高度
      const prevHeight = container.scrollHeight;
      loadMoreMessages(activeContactId).then(() => {
        // 等 DOM 更新后，保持滚动位置
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevHeight;
          }
        });
      });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeContactId) return;
    const content = newMessage.trim();
    setNewMessage('');
    await sendMessage(activeContactId, content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeContactId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success && result.data) {
        const contentType = file.type.startsWith('image/') ? 'image' : 'file';
        await sendMessage(activeContactId, file.name, contentType, result.data.url);
      } else {
        toast.error(result.error || '上传失败');
      }
    } catch {
      toast.error('文件上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  //
  const activeMessages = activeContactId ? messages[activeContactId] || [] : [];
  const activeContact = contacts.find(c => c.id === activeContactId);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 左侧联系人列表 */}
      <div className="w-72 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">消息</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无联系人</div>
          ) : (
            contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  activeContactId === contact.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium shrink-0">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 text-sm truncate">{contact.name}</span>
                      {contact.last_message_time && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatDate(contact.last_message_time, 'short')}
                        </span>
                      )}
                    </div>
                    {contact.last_message && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{contact.last_message}</p>
                    )}
                  </div>
                  {contact.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {contact.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 右侧消息面板 */}
      <div className="flex-1 flex flex-col">
        {!activeContactId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-lg font-medium text-gray-500">选择一个联系人开始聊天</p>
            </div>
          </div>
        ) : (
          <>
            {/* 聊天头部 */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                {activeContact?.name?.charAt(0) || '?'}
              </div>
              <span className="font-medium text-gray-900">{activeContact?.name || '未知'}</span>
            </div>

            {/* 消息列表 */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
            >
              {loadingMessages ? (
                <div className="text-center py-8 text-gray-400 text-sm">加载消息中...</div>
              ) : (
                <>
                  {/* 加载更多指示器 */}
                  {pagination[activeContactId]?.hasMore && (
                    <div className="text-center py-2">
                      {loadingMore ? (
                        <span className="text-xs text-gray-400">加载更早消息...</span>
                      ) : (
                        <button
                          onClick={() => {
                            const container = messagesContainerRef.current;
                            if (!container) return;
                            const prevHeight = container.scrollHeight;
                            loadMoreMessages(activeContactId).then(() => {
                              requestAnimationFrame(() => {
                                if (container) {
                                  container.scrollTop = container.scrollHeight - prevHeight;
                                }
                              });
                            });
                          }}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          加载更早消息
                        </button>
                      )}
                    </div>
                  )}
                  {activeMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无消息，发送第一条消息吧</div>
                  ) : (
                    activeMessages.map((msg: Message) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.direction === 'outgoing'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {msg.content_type === 'image' && msg.file_url ? (
                        <Image
                          src={msg.file_url}
                          alt="图片"
                          className="max-w-full rounded-lg cursor-pointer"
                          width={300}
                          height={300}
                          onClick={() => window.open(msg.file_url, '_blank')}
                        />
                      ) : msg.content_type === 'file' && msg.file_url ? (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline flex items-center gap-1"
                        >
                          📎 {msg.content || '文件'}
                        </a>
                      ) : (
                        <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                      )}
                      <div
                        className={`text-xs mt-1 ${
                          msg.direction === 'outgoing' ? 'text-blue-200' : 'text-gray-400'
                        }`}
                      >
                        {formatDate(msg.created_at, 'short')}
                      </div>
                    </div>
                  </div>
                ))
              )}
              </>
            )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="px-6 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {/* 文件上传按钮 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-9 h-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
                  title="上传文件"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={uploading ? '上传中...' : '输入消息...'}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
