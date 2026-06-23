"use strict";
// ProClaw Cloud 托管版 - AI 客服状态管理（Zustand Store）
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
exports.useCustomerServiceStore = void 0;
var zustand_1 = require("zustand");
function generateId() {
    return "cs_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 10));
}
function getOrCreateCustomerId() {
    if (typeof window === 'undefined')
        return '';
    var cid = localStorage.getItem('cs_customer_id');
    if (!cid) {
        cid = "guest_".concat(generateId());
        localStorage.setItem('cs_customer_id', cid);
    }
    return cid;
}
function getOrCreateSessionId() {
    if (typeof window === 'undefined')
        return '';
    var sid = sessionStorage.getItem('cs_session_id');
    if (!sid) {
        sid = generateId();
        sessionStorage.setItem('cs_session_id', sid);
    }
    return sid;
}
exports.useCustomerServiceStore = (0, zustand_1.create)(function (set, get) { return ({
    // 初始状态
    messages: [],
    sessionId: null,
    customerId: '',
    customerName: '',
    isOpen: false,
    unreadCount: 0,
    isLoading: false,
    isTransferring: false,
    settings: null,
    tenantId: null,
    initialize: function (tenantId) { return __awaiter(void 0, void 0, void 0, function () {
        var customerId, sessionId, res, result, greeting, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerId = getOrCreateCustomerId();
                    sessionId = getOrCreateSessionId();
                    set({ tenantId: tenantId, customerId: customerId, sessionId: sessionId });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("/api/customer-service/settings?tenant_id=".concat(tenantId))];
                case 2:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _a.sent();
                    if (result.success && result.data) {
                        set({ settings: result.data });
                        greeting = result.data.auto_greeting || '您好，我是客服小如，请问有什么可以帮您？';
                        set({
                            messages: [{
                                    id: 'welcome',
                                    role: 'assistant',
                                    content: greeting,
                                    timestamp: new Date().toISOString(),
                                    source: 'model',
                                }],
                        });
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error('加载客服设置失败:', err_1);
                    // 默认欢迎语
                    set({
                        messages: [{
                                id: 'welcome',
                                role: 'assistant',
                                content: '您好，我是客服小如，请问有什么可以帮您？',
                                timestamp: new Date().toISOString(),
                                source: 'model',
                            }],
                    });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    setCustomerInfo: function (name) {
        set({ customerName: name });
        if (typeof window !== 'undefined') {
            localStorage.setItem('cs_customer_name', name);
        }
    },
    sendMessage: function (message) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, tenantId, sessionId, customerId, customerName, userMessage, res, result_1, reply_1, errorReply_1, _b, errorReply_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = get(), tenantId = _a.tenantId, sessionId = _a.sessionId, customerId = _a.customerId, customerName = _a.customerName;
                    if (!tenantId || !sessionId)
                        return [2 /*return*/];
                    userMessage = {
                        id: generateId(),
                        role: 'customer',
                        content: message,
                        timestamp: new Date().toISOString(),
                    };
                    set(function (state) { return ({
                        messages: __spreadArray(__spreadArray([], state.messages, true), [userMessage], false),
                        isLoading: true,
                    }); });
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("/api/customer-service/chat?tenant_id=".concat(tenantId), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                session_id: sessionId,
                                message: message,
                                customer_id: customerId,
                                customer_name: customerName || undefined,
                            }),
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result_1 = _c.sent();
                    if (result_1.success && result_1.data) {
                        reply_1 = {
                            id: generateId(),
                            role: 'assistant',
                            content: result_1.data.reply,
                            timestamp: result_1.data.timestamp || new Date().toISOString(),
                            source: result_1.data.source,
                        };
                        set(function (state) { return ({
                            messages: __spreadArray(__spreadArray([], state.messages, true), [reply_1], false),
                            isLoading: false,
                            isTransferring: result_1.data.needs_transfer || false,
                        }); });
                    }
                    else {
                        errorReply_1 = {
                            id: generateId(),
                            role: 'assistant',
                            content: '抱歉，我暂时无法回复，请稍后再试。',
                            timestamp: new Date().toISOString(),
                            source: 'model',
                        };
                        set(function (state) { return ({
                            messages: __spreadArray(__spreadArray([], state.messages, true), [errorReply_1], false),
                            isLoading: false,
                        }); });
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _b = _c.sent();
                    errorReply_2 = {
                        id: generateId(),
                        role: 'assistant',
                        content: '网络连接失败，请检查网络后重试。',
                        timestamp: new Date().toISOString(),
                        source: 'model',
                    };
                    set(function (state) { return ({
                        messages: __spreadArray(__spreadArray([], state.messages, true), [errorReply_2], false),
                        isLoading: false,
                    }); });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    toggleOpen: function () {
        set(function (state) { return ({
            isOpen: !state.isOpen,
            unreadCount: 0,
        }); });
    },
    setOpen: function (open) {
        set({
            isOpen: open,
            unreadCount: 0,
        });
    },
    clearMessages: function () {
        set({
            messages: [],
            isTransferring: false,
        });
        // 生成新会话
        var newSessionId = generateId();
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('cs_session_id', newSessionId);
        }
        set({ sessionId: newSessionId });
    },
    addTransferReply: function (reply) {
        var replyMsg = {
            id: generateId(),
            role: 'assistant',
            content: reply,
            timestamp: new Date().toISOString(),
            source: 'manual',
        };
        set(function (state) { return ({
            messages: __spreadArray(__spreadArray([], state.messages, true), [replyMsg], false),
            isTransferring: false,
        }); });
    },
}); });
