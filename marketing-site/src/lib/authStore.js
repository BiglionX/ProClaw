"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
var zustand_1 = require("zustand");
var supabase_1 = require("../lib/supabase");
exports.useAuthStore = (0, zustand_1.create)(function (set, get) { return ({
    user: null,
    session: null,
    profile: null,
    isLoading: false,
    error: null,
    login: function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, data, error, isAdmin, mockUser, mockProfile, _b, profile, profileError, error_1;
        var _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, supabase_1.supabase.auth.signInWithPassword({
                            email: email,
                            password: password,
                        })];
                case 2:
                    _a = _f.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        // 演示模式：允许任意登录
                        if (import.meta.env.VITE_SUPABASE_URL === 'your_supabase_url_here' ||
                            !((_c = import.meta.env.VITE_SUPABASE_URL) === null || _c === void 0 ? void 0 : _c.startsWith('http'))) {
                            console.warn('⚠️  Demo mode: Simulating login');
                            isAdmin = email === '1055603323@qq.com' && password === '12345678';
                            mockUser = {
                                id: isAdmin ? 'admin-super-001' : 'demo-user-001',
                                email: email,
                                created_at: new Date().toISOString(),
                            };
                            mockProfile = {
                                id: mockUser.id,
                                username: email.split('@')[0],
                                role: isAdmin ? 'admin' : 'user',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            set({
                                user: mockUser,
                                session: null,
                                profile: mockProfile,
                                isLoading: false,
                            });
                            return [2 /*return*/];
                        }
                        throw error;
                    }
                    // 获取用户 profile
                    console.log('Fetching profile for user:', (_d = data.user) === null || _d === void 0 ? void 0 : _d.id);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', (_e = data.user) === null || _e === void 0 ? void 0 : _e.id)
                            .single()];
                case 3:
                    _b = _f.sent(), profile = _b.data, profileError = _b.error;
                    if (profileError) {
                        console.error('Failed to fetch profile:', profileError);
                    }
                    else {
                        console.log('Profile fetched successfully:', profile);
                    }
                    set({
                        user: data.user,
                        session: data.session,
                        profile: profile,
                        isLoading: false,
                    });
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _f.sent();
                    set({
                        error: error_1.message || '登录失败',
                        isLoading: false,
                    });
                    throw error_1;
                case 5: return [2 /*return*/];
            }
        });
    }); },
    register: function (email, password, username) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, data, error, mockUser, mockProfile, error_2;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, supabase_1.supabase.auth.signUp({
                            email: email,
                            password: password,
                        })];
                case 2:
                    _a = _c.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        // 演示模式：允许任意注册
                        if (import.meta.env.VITE_SUPABASE_URL === 'your_supabase_url_here' ||
                            !((_b = import.meta.env.VITE_SUPABASE_URL) === null || _b === void 0 ? void 0 : _b.startsWith('http'))) {
                            console.warn('⚠️  Demo mode: Simulating registration');
                            mockUser = {
                                id: 'demo-user-' + Date.now(),
                                email: email,
                                created_at: new Date().toISOString(),
                            };
                            mockProfile = {
                                id: mockUser.id,
                                username: username || email.split('@')[0],
                                role: 'user',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            set({
                                user: mockUser,
                                session: null,
                                profile: mockProfile,
                                isLoading: false,
                            });
                            return [2 /*return*/];
                        }
                        throw error;
                    }
                    if (!data.user) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase_1.supabase.from('profiles').insert({
                            id: data.user.id,
                            username: username || email.split('@')[0],
                            role: 'user',
                        })];
                case 3:
                    _c.sent();
                    // 初始化 token balance
                    return [4 /*yield*/, supabase_1.supabase.from('token_balances').insert({
                            user_id: data.user.id,
                            balance: 0,
                            total_purchased: 0,
                            total_used: 0,
                        })];
                case 4:
                    // 初始化 token balance
                    _c.sent();
                    _c.label = 5;
                case 5:
                    set({
                        user: data.user,
                        session: data.session,
                        isLoading: false,
                    });
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _c.sent();
                    set({
                        error: error_2.message || '注册失败',
                        isLoading: false,
                    });
                    throw error_2;
                case 7: return [2 /*return*/];
            }
        });
    }); },
    logout: function () { return __awaiter(void 0, void 0, void 0, function () {
        var error, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase_1.supabase.auth.signOut()];
                case 2:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    set({
                        user: null,
                        session: null,
                        profile: null,
                        isLoading: false,
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    set({
                        error: error_3.message || '登出失败',
                        isLoading: false,
                    });
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    }); },
    checkAuth: function () { return __awaiter(void 0, void 0, void 0, function () {
        var session, profile, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getSession()];
                case 2:
                    session = (_a.sent()).data.session;
                    if (!(session === null || session === void 0 ? void 0 : session.user)) return [3 /*break*/, 4];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single()];
                case 3:
                    profile = (_a.sent()).data;
                    set({
                        user: session.user,
                        session: session,
                        profile: profile,
                        isLoading: false,
                    });
                    return [3 /*break*/, 5];
                case 4:
                    set({
                        user: null,
                        session: null,
                        profile: null,
                        isLoading: false,
                    });
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_4 = _a.sent();
                    set({
                        error: error_4.message || '认证检查失败',
                        isLoading: false,
                    });
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); },
    updateProfile: function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var user, error, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    user = get().user;
                    if (!user)
                        throw new Error('User not authenticated');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('profiles')
                            .update(__assign(__assign({}, data), { updated_at: new Date().toISOString() }))
                            .eq('id', user.id)];
                case 2:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    // 更新本地状态
                    set(function (state) { return ({
                        profile: state.profile ? __assign(__assign({}, state.profile), data) : null,
                    }); });
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    throw new Error(error_5.message || '更新个人资料失败');
                case 4: return [2 /*return*/];
            }
        });
    }); },
    clearError: function () { return set({ error: null }); },
}); });
