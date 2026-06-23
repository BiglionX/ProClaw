// ProClaw Shop - 聊天页面
'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatPage;
var react_1 = require("react");
var image_1 = require("next/image");
var chat_store_1 = require("@/lib/chat-store");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
function ChatPage() {
    var _this = this;
    var _a, _b;
    var _c = (0, chat_store_1.useChatStore)(), contacts = _c.contacts, messages = _c.messages, activeContactId = _c.activeContactId, loadingContacts = _c.loadingContacts, loadingMessages = _c.loadingMessages, loadingMore = _c.loadingMore, pagination = _c.pagination, fetchContacts = _c.fetchContacts, sendMessage = _c.sendMessage, setActiveContact = _c.setActiveContact, subscribeToMessages = _c.subscribeToMessages, loadMoreMessages = _c.loadMoreMessages;
    var _d = (0, react_1.useState)(''), newMessage = _d[0], setNewMessage = _d[1];
    var _e = (0, react_1.useState)(false), uploading = _e[0], setUploading = _e[1];
    var messagesEndRef = (0, react_1.useRef)(null);
    var messagesContainerRef = (0, react_1.useRef)(null);
    var fileInputRef = (0, react_1.useRef)(null);
    // 加载联系人
    (0, react_1.useEffect)(function () {
        fetchContacts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // 订阅活跃联系人的新消息
    (0, react_1.useEffect)(function () {
        if (!activeContactId)
            return;
        var unsubscribe = subscribeToMessages(activeContactId);
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeContactId]);
    // 新消息时滚动到底部
    (0, react_1.useEffect)(function () {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeContactId]);
    // 滚动到顶部加载更多
    var handleScroll = function () {
        var _a;
        if (!activeContactId || loadingMore || !((_a = pagination[activeContactId]) === null || _a === void 0 ? void 0 : _a.hasMore))
            return;
        var container = messagesContainerRef.current;
        if (container && container.scrollTop < 50) {
            // 保存当前滚动高度
            var prevHeight_1 = container.scrollHeight;
            loadMoreMessages(activeContactId).then(function () {
                // 等 DOM 更新后，保持滚动位置
                requestAnimationFrame(function () {
                    if (container) {
                        container.scrollTop = container.scrollHeight - prevHeight_1;
                    }
                });
            });
        }
    };
    var handleSend = function () { return __awaiter(_this, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!newMessage.trim() || !activeContactId)
                        return [2 /*return*/];
                    content = newMessage.trim();
                    setNewMessage('');
                    return [4 /*yield*/, sendMessage(activeContactId, content)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var handleKeyDown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    var handleFileUpload = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var file, formData, res, result, contentType, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    file = (_b = e.target.files) === null || _b === void 0 ? void 0 : _b[0];
                    if (!file || !activeContactId)
                        return [2 /*return*/];
                    setUploading(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, 8, 9]);
                    formData = new FormData();
                    formData.append('file', file);
                    return [4 /*yield*/, fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _c.sent();
                    if (!(result.success && result.data)) return [3 /*break*/, 5];
                    contentType = file.type.startsWith('image/') ? 'image' : 'file';
                    return [4 /*yield*/, sendMessage(activeContactId, file.name, contentType, result.data.url)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 6];
                case 5:
                    react_hot_toast_1.default.error(result.error || '上传失败');
                    _c.label = 6;
                case 6: return [3 /*break*/, 9];
                case 7:
                    _a = _c.sent();
                    react_hot_toast_1.default.error('文件上传失败');
                    return [3 /*break*/, 9];
                case 8:
                    setUploading(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    //
    var activeMessages = activeContactId ? messages[activeContactId] || [] : [];
    var activeContact = contacts.find(function (c) { return c.id === activeContactId; });
    return (<div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 左侧联系人列表 */}
      <div className="w-72 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">消息</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (<div className="text-center py-8 text-gray-400 text-sm">加载中...</div>) : contacts.length === 0 ? (<div className="text-center py-8 text-gray-400 text-sm">暂无联系人</div>) : (contacts.map(function (contact) { return (<button key={contact.id} onClick={function () { return setActiveContact(contact.id); }} className={"w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ".concat(activeContactId === contact.id ? 'bg-blue-50' : '')}>
                <div className="flex items-center gap-3">
                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium shrink-0">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 text-sm truncate">{contact.name}</span>
                      {contact.last_message_time && (<span className="text-xs text-gray-400 shrink-0">
                          {(0, utils_1.formatDate)(contact.last_message_time, 'short')}
                        </span>)}
                    </div>
                    {contact.last_message && (<p className="text-xs text-gray-500 truncate mt-0.5">{contact.last_message}</p>)}
                  </div>
                  {contact.unread_count > 0 && (<span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {contact.unread_count}
                    </span>)}
                </div>
              </button>); }))}
        </div>
      </div>

      {/* 右侧消息面板 */}
      <div className="flex-1 flex flex-col">
        {!activeContactId ? (<div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-lg font-medium text-gray-500">选择一个联系人开始聊天</p>
            </div>
          </div>) : (<>
            {/* 聊天头部 */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                {((_a = activeContact === null || activeContact === void 0 ? void 0 : activeContact.name) === null || _a === void 0 ? void 0 : _a.charAt(0)) || '?'}
              </div>
              <span className="font-medium text-gray-900">{(activeContact === null || activeContact === void 0 ? void 0 : activeContact.name) || '未知'}</span>
            </div>

            {/* 消息列表 */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMessages ? (<div className="text-center py-8 text-gray-400 text-sm">加载消息中...</div>) : (<>
                  {/* 加载更多指示器 */}
                  {((_b = pagination[activeContactId]) === null || _b === void 0 ? void 0 : _b.hasMore) && (<div className="text-center py-2">
                      {loadingMore ? (<span className="text-xs text-gray-400">加载更早消息...</span>) : (<button onClick={function () {
                            var container = messagesContainerRef.current;
                            if (!container)
                                return;
                            var prevHeight = container.scrollHeight;
                            loadMoreMessages(activeContactId).then(function () {
                                requestAnimationFrame(function () {
                                    if (container) {
                                        container.scrollTop = container.scrollHeight - prevHeight;
                                    }
                                });
                            });
                        }} className="text-xs text-blue-500 hover:text-blue-700">
                          加载更早消息
                        </button>)}
                    </div>)}
                  {activeMessages.length === 0 ? (<div className="text-center py-8 text-gray-400 text-sm">暂无消息，发送第一条消息吧</div>) : (activeMessages.map(function (msg) { return (<div key={msg.id} className={"flex ".concat(msg.direction === 'outgoing' ? 'justify-end' : 'justify-start')}>
                    <div className={"max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ".concat(msg.direction === 'outgoing'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md')}>
                      {msg.content_type === 'image' && msg.file_url ? (<image_1.default src={msg.file_url} alt="图片" className="max-w-full rounded-lg cursor-pointer" width={300} height={300} onClick={function () { return window.open(msg.file_url, '_blank'); }}/>) : msg.content_type === 'file' && msg.file_url ? (<a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
                          📎 {msg.content || '文件'}
                        </a>) : (<p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>)}
                      <div className={"text-xs mt-1 ".concat(msg.direction === 'outgoing' ? 'text-blue-200' : 'text-gray-400')}>
                        {(0, utils_1.formatDate)(msg.created_at, 'short')}
                      </div>
                    </div>
                  </div>); }))}
              </>)}
              <div ref={messagesEndRef}/>
            </div>

            {/* 输入框 */}
            <div className="px-6 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {/* 文件上传按钮 */}
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden" onChange={handleFileUpload}/>
                <button onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} disabled={uploading} className="w-9 h-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50" title="上传文件">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                </button>
                <input type="text" value={newMessage} onChange={function (e) { return setNewMessage(e.target.value); }} onKeyDown={handleKeyDown} placeholder={uploading ? '上传中...' : '输入消息...'} disabled={uploading} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"/>
                <button onClick={handleSend} disabled={!newMessage.trim()} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                </button>
              </div>
            </div>
          </>)}
      </div>
    </div>);
}
