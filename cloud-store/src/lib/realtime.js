"use strict";
// ProClaw Cloud 托管版 - 实时通信工具
// 使用 Supabase Realtime 实现 WebSocket 实时通信
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
exports.getRealtimeClient = getRealtimeClient;
exports.subscribeToMessages = subscribeToMessages;
exports.subscribeToInventoryAlerts = subscribeToInventoryAlerts;
exports.subscribeToOrderUpdates = subscribeToOrderUpdates;
exports.subscribeToPresence = subscribeToPresence;
exports.broadcastMessage = broadcastMessage;
exports.getOnlineStatus = getOnlineStatus;
var supabase_js_1 = require("@supabase/supabase-js");
// 创建实时客户端（用于客户端组件）
var supabaseClient = null;
function getRealtimeClient() {
    if (typeof window === 'undefined')
        return null;
    if (!supabaseClient) {
        var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        var supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        if (!supabaseUrl || !supabaseKey) {
            console.warn('Supabase 配置缺失，无法使用实时功能');
            return null;
        }
        supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
        });
    }
    return supabaseClient;
}
/**
 * 订阅聊天消息实时更新
 */
function subscribeToMessages(userId, contactId, onMessage, onError) {
    var client = getRealtimeClient();
    if (!client) {
        console.warn('Supabase 客户端不可用');
        return function () { };
    }
    var schema = getTenantSchema(userId);
    var channelName = "messages:".concat(schema, ":").concat(contactId);
    var channel = client.channel(channelName)
        .on('postgres_changes', {
        event: 'INSERT',
        schema: schema,
        table: 'messages',
        filter: "contact_id=eq.".concat(contactId),
    }, function (payload) {
        var message = payload.new;
        // 只处理新消息（不是自己发送的）
        if (message.direction === 'incoming') {
            onMessage(message);
        }
    })
        .on('postgres_changes', {
        event: 'UPDATE',
        schema: schema,
        table: 'messages',
        filter: "contact_id=eq.".concat(contactId),
    }, function (payload) {
        var message = payload.new;
        // 消息已读状态更新
        if (message.is_read) {
            onMessage(message);
        }
    })
        .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
            console.log("\u5DF2\u8BA2\u9605\u6D88\u606F\u9891\u9053: ".concat(channelName));
        }
        else if (status === 'CHANNEL_ERROR') {
            onError === null || onError === void 0 ? void 0 : onError(new Error('订阅消息频道失败'));
        }
    });
    // 返回取消订阅函数
    return function () {
        client.removeChannel(channel);
    };
}
/**
 * 订阅库存预警通知
 */
function subscribeToInventoryAlerts(userId, onAlert, onError) {
    var client = getRealtimeClient();
    if (!client) {
        console.warn('Supabase 客户端不可用');
        return function () { };
    }
    var schema = getTenantSchema(userId);
    var channelName = "inventory_alerts:".concat(schema);
    var channel = client.channel(channelName)
        .on('postgres_changes', {
        event: 'INSERT',
        schema: schema,
        table: 'inventory_alerts',
    }, function (payload) {
        onAlert({
            id: payload.new.id,
            type: 'inventory_alert',
            title: '库存预警',
            message: payload.new.message || '库存不足',
            data: payload.new,
            created_at: payload.new.created_at,
        });
    })
        .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
            console.log("\u5DF2\u8BA2\u9605\u5E93\u5B58\u9884\u8B66\u9891\u9053: ".concat(channelName));
        }
        else if (status === 'CHANNEL_ERROR') {
            onError === null || onError === void 0 ? void 0 : onError(new Error('订阅库存预警频道失败'));
        }
    });
    return function () {
        client.removeChannel(channel);
    };
}
/**
 * 订阅订单状态更新
 */
function subscribeToOrderUpdates(userId, orderType, onUpdate, onError) {
    var client = getRealtimeClient();
    if (!client) {
        console.warn('Supabase 客户端不可用');
        return function () { };
    }
    var schema = getTenantSchema(userId);
    var tableName = orderType === 'purchase' ? 'purchase_orders' : 'sales_orders';
    var channelName = "order_updates:".concat(schema, ":").concat(tableName);
    var channel = client.channel(channelName)
        .on('postgres_changes', {
        event: 'UPDATE',
        schema: schema,
        table: tableName,
    }, function (payload) {
        onUpdate({
            id: payload.new.id,
            status: payload.new.status,
            data: payload.new,
        });
    })
        .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
            console.log("\u5DF2\u8BA2\u9605\u8BA2\u5355\u66F4\u65B0\u9891\u9053: ".concat(channelName));
        }
        else if (status === 'CHANNEL_ERROR') {
            onError === null || onError === void 0 ? void 0 : onError(new Error('订阅订单更新频道失败'));
        }
    });
    return function () {
        client.removeChannel(channel);
    };
}
/**
 * 订阅在线状态（Presence）
 */
function subscribeToPresence(userId, onSync, onJoin, onLeave) {
    var _this = this;
    var client = getRealtimeClient();
    if (!client) {
        console.warn('Supabase 客户端不可用');
        return function () { };
    }
    var channelName = "presence:".concat(userId);
    var channel = client.channel(channelName, {
        config: {
            presence: {
                key: userId,
            },
        },
    })
        .on('presence', { event: 'sync' }, function () {
        var state = channel.presenceState();
        onSync(state);
    })
        .on('presence', { event: 'join' }, function (_a) {
        var key = _a.key, newPresences = _a.newPresences;
        onJoin === null || onJoin === void 0 ? void 0 : onJoin(key, newPresences);
    })
        .on('presence', { event: 'leave' }, function (_a) {
        var key = _a.key, leftPresences = _a.leftPresences;
        onLeave === null || onLeave === void 0 ? void 0 : onLeave(key, leftPresences);
    })
        .subscribe(function (status) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(status === 'SUBSCRIBED')) return [3 /*break*/, 2];
                    // 设置在线状态
                    return [4 /*yield*/, channel.track({
                            user_id: userId,
                            online_at: new Date().toISOString(),
                            status: 'online',
                        })];
                case 1:
                    // 设置在线状态
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); });
    return function () {
        client.removeChannel(channel);
    };
}
/**
 * 广播消息（用于实时通知）
 */
function broadcastMessage(userId, type, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var client, channelName, channel;
        return __generator(this, function (_a) {
            client = getRealtimeClient();
            if (!client)
                return [2 /*return*/, false];
            channelName = "broadcast:".concat(userId);
            channel = client.channel(channelName);
            try {
                channel.send({
                    type: 'broadcast',
                    event: type,
                    payload: payload,
                });
                return [2 /*return*/, true];
            }
            catch (error) {
                console.error('广播消息失败:', error);
                return [2 /*return*/, false];
            }
            finally {
                client.removeChannel(channel);
            }
            return [2 /*return*/];
        });
    });
}
/**
 * 获取用户在线状态
 */
function getOnlineStatus(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var client, channelName, channel, state, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = getRealtimeClient();
                    if (!client)
                        return [2 /*return*/, false];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    channelName = "presence:".concat(userId);
                    channel = client.channel(channelName, {
                        config: {
                            presence: {
                                key: userId,
                            },
                        },
                    });
                    return [4 /*yield*/, channel.subscribe()];
                case 2:
                    _a.sent();
                    state = channel.presenceState();
                    // 清理频道
                    client.removeChannel(channel);
                    return [2 /*return*/, Object.keys(state).length > 0];
                case 3:
                    error_1 = _a.sent();
                    console.error('获取在线状态失败:', error_1);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取 tenant schema 名称
 */
function getTenantSchema(userId) {
    var shortId = userId.replace(/-/g, '').substring(0, 8).toLowerCase();
    return "tenant_".concat(shortId);
}
