// ProClaw Cloud 托管版 - AI 客服悬浮聊天组件
// 面向商城访客的独立客服聊天窗口
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
exports.default = ChatWidget;
var react_1 = require("react");
var customer_service_store_1 = require("@/lib/customer-service-store");
var image_1 = require("next/image");
function ChatWidget(_a) {
    var _this = this;
    var tenantId = _a.tenantId;
    var _b = (0, customer_service_store_1.useCustomerServiceStore)(), messages = _b.messages, isOpen = _b.isOpen, isLoading = _b.isLoading, isTransferring = _b.isTransferring, settings = _b.settings, unreadCount = _b.unreadCount, initialize = _b.initialize, sendMessage = _b.sendMessage, toggleOpen = _b.toggleOpen, clearMessages = _b.clearMessages;
    var _c = (0, react_1.useState)(''), input = _c[0], setInput = _c[1];
    var _d = (0, react_1.useState)(false), isMinimized = _d[0], setIsMinimized = _d[1];
    var messagesEndRef = (0, react_1.useRef)(null);
    var inputRef = (0, react_1.useRef)(null);
    // 初始化
    (0, react_1.useEffect)(function () {
        if (tenantId) {
            initialize(tenantId);
        }
    }, [tenantId, initialize]);
    // 自动滚动到最新消息
    var scrollToBottom = (0, react_1.useCallback)(function () {
        setTimeout(function () {
            var _a;
            (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, []);
    (0, react_1.useEffect)(function () {
        scrollToBottom();
    }, [messages, scrollToBottom]);
    // 打开时聚焦输入框
    (0, react_1.useEffect)(function () {
        if (isOpen && inputRef.current) {
            setTimeout(function () { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 300);
        }
    }, [isOpen]);
    // 商家头像 URL
    var avatarUrl = settings === null || settings === void 0 ? void 0 : settings.avatar_url;
    var agentName = (settings === null || settings === void 0 ? void 0 : settings.agent_name) || '智能客服';
    var handleSend = function () { return __awaiter(_this, void 0, void 0, function () {
        var text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    text = input.trim();
                    if (!text || isLoading)
                        return [2 /*return*/];
                    setInput('');
                    return [4 /*yield*/, sendMessage(text)];
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
    var handleNewChat = function () {
        clearMessages();
    };
    // ===== 聊天面板 =====
    var renderChatPanel = function () { return (<div className="fixed bottom-24 right-6 z-1199 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300" style={{
            width: isMinimized ? '60px' : '380px',
            height: isMinimized ? '60px' : '520px',
            maxHeight: 'calc(100vh - 120px)',
        }}>
      {/* 标题栏 */}
      <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden shrink-0 relative">
            {avatarUrl ? (<image_1.default src={avatarUrl} alt={agentName} fill className="object-cover"/>) : (<svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>)}
          </div>
          <div>
            <div className="text-sm font-semibold">{agentName}</div>
            <div className="text-[10px] text-gray-400">在线</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleNewChat} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="新对话">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
          </button>
          <button onClick={function () { return setIsMinimized(!isMinimized); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title={isMinimized ? '展开' : '最小化'}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMinimized ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 4L4 20m0 0h16M4 20V4"/>)}
            </svg>
          </button>
          <button onClick={function () { toggleOpen(); setIsMinimized(false); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="关闭">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 最小化状态 */}
      {isMinimized ? (<div className="flex-1 flex items-center justify-center cursor-pointer bg-gray-50" onClick={function () { return setIsMinimized(false); }}>
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center relative">
            {avatarUrl ? (<image_1.default src={avatarUrl} alt={agentName} fill className="object-cover rounded-full"/>) : (<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>)}
          </div>
        </div>) : (<>
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.map(function (msg) { return (<div key={msg.id} className={"flex gap-2.5 ".concat(msg.role === 'customer' ? 'flex-row-reverse' : 'flex-row')}>
                {/* 头像 */}
                {msg.role === 'assistant' && (<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden relative">
                    {avatarUrl ? (<image_1.default src={avatarUrl} alt="CS" fill className="object-cover"/>) : (<svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                      </svg>)}
                  </div>)}

                {/* 消息气泡 */}
                <div className={"max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ".concat(msg.role === 'customer'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md border border-gray-100 shadow-sm')}>
                  {msg.content}
                </div>

                {/* 用户头像 */}
                {msg.role === 'customer' && (<div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>)}
              </div>); })}

            {/* 加载中 */}
            {isLoading && (<div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                  </svg>
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </div>
                </div>
              </div>)}

            {/* 转人工提示 */}
            {isTransferring && !isLoading && (<div className="text-center py-2">
                <div className="inline-block bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg px-3 py-1.5">
                  您的问题已转给人工客服，请稍候...
                </div>
              </div>)}

            <div ref={messagesEndRef}/>
          </div>

          {/* 输入区域 */}
          <div className="px-3 py-2.5 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input ref={inputRef} type="text" value={input} onChange={function (e) { return setInput(e.target.value); }} onKeyDown={handleKeyDown} placeholder={isLoading ? 'AI 思考中...' : '输入您的问题...'} disabled={isLoading} className="flex-1 px-3.5 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"/>
              <button onClick={handleSend} disabled={!input.trim() || isLoading} className="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </>)}
    </div>); };
    // ===== 悬浮按钮 =====
    return (<>
      {/* 聊天面板 */}
      {isOpen && renderChatPanel()}

      {/* 悬浮按钮 */}
      <button onClick={function () { toggleOpen(); setIsMinimized(false); }} className="fixed bottom-6 right-6 z-1200 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        }}>
        {isOpen ? (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>) : (<>
            {avatarUrl ? (<image_1.default src={avatarUrl} alt={agentName} width={40} height={40} className="rounded-full object-cover"/>) : (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>)}
            {/* 未读红点 */}
            {unreadCount > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>)}
          </>)}
      </button>
    </>);
}
