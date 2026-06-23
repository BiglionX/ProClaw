// ProClaw Cloud 托管版 - AI 助手页面
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgentsPage;
var react_1 = require("react");
var react_hot_toast_1 = require("react-hot-toast");
var AGENT_TYPES = [
    { key: 'general', label: '通用助手', icon: '🤖', description: '回答系统使用和经营问题' },
    { key: 'inventory', label: '库存专家', icon: '📦', description: '库存分析和补货建议' },
    { key: 'finance', label: '财务专家', icon: '💰', description: 'Token 消耗和成本优化' },
    { key: 'sales', label: '销售专家', icon: '📈', description: '销售分析和趋势预测' },
];
var QUICK_QUESTIONS = {
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
function AgentsPage() {
    var _this = this;
    var _a, _b, _c, _d, _e, _f, _g;
    var _h = (0, react_1.useState)([]), messages = _h[0], setMessages = _h[1];
    var _j = (0, react_1.useState)(''), input = _j[0], setInput = _j[1];
    var _k = (0, react_1.useState)(false), loading = _k[0], setLoading = _k[1];
    var _l = (0, react_1.useState)('general'), agentType = _l[0], setAgentType = _l[1];
    var messagesEndRef = (0, react_1.useRef)(null);
    var handleSend = function (text) { return __awaiter(_this, void 0, void 0, function () {
        var content, userMessage, updatedMessages, res, result, aiMessage_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    content = (text || input).trim();
                    if (!content)
                        return [2 /*return*/];
                    userMessage = { role: 'user', content: content };
                    updatedMessages = __spreadArray(__spreadArray([], messages, true), [userMessage], false);
                    setMessages(updatedMessages);
                    setInput('');
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/ai/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                messages: updatedMessages.map(function (msg) { return ({ role: msg.role, content: msg.content }); }),
                                agentType: agentType,
                            }),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _b.sent();
                    if (result.success) {
                        aiMessage_1 = {
                            role: 'assistant',
                            content: result.data.content,
                        };
                        setMessages(function (prev) { return __spreadArray(__spreadArray([], prev, true), [aiMessage_1], false); });
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || 'AI 回复失败');
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('网络错误，请重试');
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleKeyDown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    var switchAgent = function (key) {
        setAgentType(key);
        setMessages([]);
    };
    return (<div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 左侧 Agent 选择 */}
      <div className="w-64 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">AI 助手</h2>
          <p className="text-xs text-gray-500 mt-1">选择专业助手</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {AGENT_TYPES.map(function (agent) { return (<button key={agent.key} onClick={function () { return switchAgent(agent.key); }} className={"w-full text-left p-3 rounded-xl transition-colors ".concat(agentType === agent.key
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent')}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{agent.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{agent.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{agent.description}</div>
                </div>
              </div>
            </button>); })}
        </div>
        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            每次 AI 对话消耗 5 Token
          </div>
        </div>
      </div>

      {/* 右侧聊天面板 */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-6xl mb-4">{(_a = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _a === void 0 ? void 0 : _a.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {(_b = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _b === void 0 ? void 0 : _b.label}
            </h3>
            <p className="text-gray-500 text-sm mb-8 text-center max-w-md">
              {(_c = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _c === void 0 ? void 0 : _c.description}
            </p>

            {/* 快速问题 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {(QUICK_QUESTIONS[agentType] || QUICK_QUESTIONS.general).map(function (question, idx) { return (<button key={idx} onClick={function () { return handleSend(question); }} className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors text-left border border-gray-100">
                  {question}
                </button>); })}
            </div>
          </div>) : (<>
            {/* Agent 选择标签 */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-lg">{(_d = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _d === void 0 ? void 0 : _d.icon}</span>
              <span className="font-medium text-gray-900">
                {(_e = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _e === void 0 ? void 0 : _e.label}
              </span>
              <button onClick={function () { return setMessages([]); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600">
                清空对话
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map(function (msg, idx) {
                var _a;
                return (<div key={idx} className={"flex ".concat(msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className="flex gap-3 max-w-[80%]">
                    {msg.role === 'assistant' && (<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm shrink-0 mt-1">
                        {((_a = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _a === void 0 ? void 0 : _a.icon) || '🤖'}
                      </div>)}
                    <div>
                      <div className={"rounded-2xl px-4 py-3 text-sm leading-relaxed ".concat(msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md')}>
                        <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                      </div>
                    </div>
                    {msg.role === 'user' && (<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm shrink-0 mt-1">
                        👤
                      </div>)}
                  </div>
                </div>);
            })}

              {loading && (<div className="flex justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm shrink-0 mt-1">
                      {((_f = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _f === void 0 ? void 0 : _f.icon) || '🤖'}
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                      </div>
                    </div>
                  </div>
                </div>)}
              <div ref={messagesEndRef}/>
            </div>
          </>)}

        {/* 输入框 */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input type="text" value={input} onChange={function (e) { return setInput(e.target.value); }} onKeyDown={handleKeyDown} placeholder={loading ? 'AI 思考中...' : "\u5411".concat((_g = AGENT_TYPES.find(function (a) { return a.key === agentType; })) === null || _g === void 0 ? void 0 : _g.label, "\u63D0\u95EE...")} disabled={loading} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"/>
            <button onClick={function () { return handleSend(); }} disabled={!input.trim() || loading} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>);
}
