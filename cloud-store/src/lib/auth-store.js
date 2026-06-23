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
exports.useAuthStore = void 0;
var zustand_1 = require("zustand");
var supabase_1 = require("./supabase");
var oidc_client_1 = require("./oidc-client");
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === 'string')
        return error;
    return '操作失败';
}
exports.useAuthStore = (0, zustand_1.create)(function (set) { return ({
    user: null,
    session: null,
    isLoading: false,
    error: null,
    oidcTokens: null,
    login: function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var supabase, _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    supabase = (0, supabase_1.getSupabaseClient)();
                    return [4 /*yield*/, supabase.auth.signInWithPassword({
                            email: email,
                            password: password,
                        })];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    set({
                        user: data.user,
                        session: data.session,
                        isLoading: false,
                    });
                    window.location.href = '/app/dashboard';
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    set({
                        error: getErrorMessage(error_1),
                        isLoading: false,
                    });
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    }); },
    register: function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var supabase, _a, data, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    supabase = (0, supabase_1.getSupabaseClient)();
                    return [4 /*yield*/, supabase.auth.signUp({
                            email: email,
                            password: password,
                            options: {
                                emailRedirectTo: "".concat(window.location.origin, "/auth/callback"),
                            },
                        })];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    set({
                        user: data.user,
                        session: data.session,
                        isLoading: false,
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _b.sent();
                    set({
                        error: getErrorMessage(error_2),
                        isLoading: false,
                    });
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    }); },
    logout: function () { return __awaiter(void 0, void 0, void 0, function () {
        var supabase, error, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    supabase = (0, supabase_1.getSupabaseClient)();
                    return [4 /*yield*/, supabase.auth.signOut()];
                case 2:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    set({
                        user: null,
                        session: null,
                        isLoading: false,
                    });
                    window.location.href = '/';
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    set({
                        error: getErrorMessage(error_3),
                        isLoading: false,
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    checkAuth: function () { return __awaiter(void 0, void 0, void 0, function () {
        var supabase, _a, session, sessionError, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    supabase = (0, supabase_1.getSupabaseClient)();
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    _a = _b.sent(), session = _a.data.session, sessionError = _a.error;
                    if (sessionError) {
                        console.error('获取会话失败:', sessionError);
                        set({
                            user: null,
                            session: null,
                            error: sessionError.message || '获取会话失败',
                            isLoading: false,
                        });
                        return [2 /*return*/];
                    }
                    set({
                        user: (session === null || session === void 0 ? void 0 : session.user) || null,
                        session: session,
                        isLoading: false,
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _b.sent();
                    console.error('检查认证状态失败:', error_4);
                    set({
                        user: null,
                        session: null,
                        error: getErrorMessage(error_4),
                        isLoading: false,
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    loginWithOidc: function () { return __awaiter(void 0, void 0, void 0, function () {
        var authUrl, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, oidc_client_1.startOidcAuth)()];
                case 2:
                    authUrl = _a.sent();
                    window.location.href = authUrl;
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    set({
                        error: getErrorMessage(error_5),
                        isLoading: false,
                    });
                    throw error_5;
                case 4: return [2 /*return*/];
            }
        });
    }); },
    handleOidcCallback: function (code, state) { return __awaiter(void 0, void 0, void 0, function () {
        var tokens, userInfo, oidcUser, oidcSession, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true, error: null });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, oidc_client_1.exchangeCodeForToken)(code, state)];
                case 2:
                    tokens = _a.sent();
                    return [4 /*yield*/, (0, oidc_client_1.getUserInfo)(tokens.access_token)];
                case 3:
                    userInfo = _a.sent();
                    oidcUser = {
                        id: userInfo.sub,
                        email: userInfo.email || '',
                        created_at: new Date().toISOString(),
                    };
                    oidcSession = {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        expires_in: tokens.expires_in,
                        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
                        token_type: tokens.token_type,
                        user: oidcUser,
                    };
                    set({
                        user: oidcUser,
                        session: oidcSession,
                        oidcTokens: {
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            id_token: tokens.id_token,
                        },
                        isLoading: false,
                    });
                    window.location.href = '/app/dashboard';
                    return [3 /*break*/, 5];
                case 4:
                    error_6 = _a.sent();
                    set({
                        error: getErrorMessage(error_6),
                        isLoading: false,
                    });
                    throw error_6;
                case 5: return [2 /*return*/];
            }
        });
    }); },
    clearError: function () { return set({ error: null }); },
}); });
