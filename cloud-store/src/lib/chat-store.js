"use strict";
// ProClaw Cloud 托管版 - 聊天状态管理 (Zustand)
// 基于 Supabase Realtime 实现实时消息
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.useChatStore = void 0;
var zustand_1 = require("zustand");
var supabase_1 = require("./supabase");
var PAGE_SIZE = 50;
exports.useChatStore = (0, zustand_1.create)(function (set, get) { return ({
    contacts: [],
    messages: {},
    activeContactId: null,
    loadingContacts: false,
    loadingMessages: false,
    loadingMore: false,
    pagination: {},
    fetchContacts: function () { return __awaiter(void 0, void 0, void 0, function () {
        var supabase, session, res, result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ loadingContacts: true });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    supabase = (0, supabase_1.getSupabaseClient)();
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_a.sent()).data.session;
                    if (!session)
                        return [2 /*return*/];
                    return [4 /*yield*/, fetch('/api/contacts')];
                case 3:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 4:
                    result = _a.sent();
                    if (result.data) {
                        set({ contacts: result.data, loadingContacts: false });
                    }
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    console.error('获取联系人失败:', err_1);
                    set({ loadingContacts: false });
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); },
    fetchMessages: function (contactId) { return __awaiter(void 0, void 0, void 0, function () {
        var res, result_1, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ loadingMessages: true });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("/api/chat?contactId=".concat(contactId, "&page=1"))];
                case 2:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result_1 = _a.sent();
                    if (result_1.data) {
                        set(function (state) {
                            var _a, _b;
                            return ({
                                messages: __assign(__assign({}, state.messages), (_a = {}, _a[contactId] = result_1.data, _a)),
                                pagination: __assign(__assign({}, state.pagination), (_b = {}, _b[contactId] = { page: 1, hasMore: (result_1.total || 0) > PAGE_SIZE }, _b)),
                                loadingMessages: false,
                            });
                        });
                    }
                    else {
                        set({ loadingMessages: false });
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_2 = _a.sent();
                    console.error('获取消息失败:', err_2);
                    set({ loadingMessages: false });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    loadMoreMessages: function (contactId) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, pagination, loadingMore, p, nextPage_1, res, result_2, err_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = get(), pagination = _a.pagination, loadingMore = _a.loadingMore;
                    p = pagination[contactId];
                    if (loadingMore || !(p === null || p === void 0 ? void 0 : p.hasMore))
                        return [2 /*return*/];
                    set({ loadingMore: true });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    nextPage_1 = ((p === null || p === void 0 ? void 0 : p.page) || 1) + 1;
                    return [4 /*yield*/, fetch("/api/chat?contactId=".concat(contactId, "&page=").concat(nextPage_1))];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result_2 = _b.sent();
                    if (result_2.data) {
                        set(function (state) {
                            var _a, _b;
                            return ({
                                messages: __assign(__assign({}, state.messages), (_a = {}, _a[contactId] = __spreadArray(__spreadArray([], result_2.data.reverse(), true), (state.messages[contactId] || []), true), _a)),
                                pagination: __assign(__assign({}, state.pagination), (_b = {}, _b[contactId] = {
                                    page: nextPage_1,
                                    hasMore: (result_2.total || 0) > nextPage_1 * PAGE_SIZE,
                                }, _b)),
                                loadingMore: false,
                            });
                        });
                    }
                    else {
                        set({ loadingMore: false });
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_3 = _b.sent();
                    console.error('加载更多消息失败:', err_3);
                    set({ loadingMore: false });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    sendMessage: function (contactId_1, content_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([contactId_1, content_1], args_1, true), void 0, function (contactId, content, contentType, fileUrl) {
            var res, result, newMsg_1, _a;
            if (contentType === void 0) { contentType = 'text'; }
            if (fileUrl === void 0) { fileUrl = ''; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch('/api/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contactId: contactId, content: content, contentType: contentType, fileUrl: fileUrl }),
                            })];
                    case 1:
                        res = _b.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        result = _b.sent();
                        if (result.success && result.data) {
                            newMsg_1 = result.data;
                            set(function (state) {
                                var _a;
                                return ({
                                    messages: __assign(__assign({}, state.messages), (_a = {}, _a[contactId] = __spreadArray(__spreadArray([], (state.messages[contactId] || []), true), [newMsg_1], false), _a)),
                                });
                            });
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/, false];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    setActiveContact: function (contactId) {
        set({ activeContactId: contactId });
        if (contactId) {
            get().fetchMessages(contactId);
        }
    },
    subscribeToMessages: function (contactId) {
        // 使用 Supabase Realtime 订阅
        // 创建 channel 引用，在异步获取 session 后赋值
        var supabase = (0, supabase_1.getSupabaseClient)();
        var channel = null;
        var cancelled = false;
        supabase.auth.getSession().then(function (_a) {
            var data = _a.data;
            if (cancelled)
                return; // 组件已卸载，不再创建订阅
            var session = data === null || data === void 0 ? void 0 : data.session;
            if (!session)
                return;
            var schema = "tenant_".concat(session.user.id.replace(/-/g, '').substring(0, 8).toLowerCase());
            channel = supabase
                .channel("messages:".concat(contactId))
                .on('postgres_changes', {
                event: 'INSERT',
                schema: schema,
                table: 'messages',
                filter: "contact_id=eq.".concat(contactId),
            }, function (payload) {
                var newMsg = payload.new;
                set(function (state) {
                    var _a;
                    return ({
                        messages: __assign(__assign({}, state.messages), (_a = {}, _a[contactId] = __spreadArray(__spreadArray([], (state.messages[contactId] || []), true), [newMsg], false), _a)),
                    });
                });
            })
                .subscribe();
        });
        return function () {
            cancelled = true;
            if (channel) {
                supabase.removeChannel(channel);
                channel = null;
            }
        };
    },
}); });
