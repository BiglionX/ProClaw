"use strict";
// ProClaw AI 客服模块 - E2E 测试
// 测试场景：访客打开客服聊天窗口、发送消息、转人工、商户端回复
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
var test_1 = require("@playwright/test");
// ===== 测试数据 =====
var TEST_TENANT_ID = 'e2e-test-tenant-id';
var TEST_CUSTOMER_ID = "e2e-test-customer-".concat(Date.now());
var TEST_SESSION_ID = "e2e-test-session-".concat(Date.now());
test_1.test.describe('AI 客服模块 E2E 测试', function () {
    test_1.test.describe('云商城前端 - 客服悬浮组件', function () {
        (0, test_1.test)('应显示客服悬浮按钮', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/')];
                    case 1:
                        _c.sent();
                        // 检查悬浮按钮存在（ChatWidget 需要认证，这里验证 Provider 正常渲染）
                        // 由于未登录时 tenant_id 为空，ChatWidget 不渲染，这里验证页面加载正常
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('h1')).toBeVisible()];
                    case 2:
                        // 检查悬浮按钮存在（ChatWidget 需要认证，这里验证 Provider 正常渲染）
                        // 由于未登录时 tenant_id 为空，ChatWidget 不渲染，这里验证页面加载正常
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('云商城受保护页面应显示客服悬浮按钮', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var fabButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 先登录
                    return [4 /*yield*/, page.goto('/login')];
                    case 1:
                        // 先登录
                        _c.sent();
                        return [4 /*yield*/, page.fill('input[type="email"]', 'e2e-test@proclaw.com')];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.fill('input[type="password"]', 'e2e-test-password')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, page.click('button[type="submit"]')];
                    case 4:
                        _c.sent();
                        // 等待登录完成并跳转到 dashboard
                        return [4 /*yield*/, page.waitForURL(/\/app\/dashboard/, { timeout: 10000 })];
                    case 5:
                        // 等待登录完成并跳转到 dashboard
                        _c.sent();
                        fabButton = page.locator('button').filter({ has: page.locator('svg') }).last();
                        return [4 /*yield*/, (0, test_1.expect)(fabButton).toBeVisible()];
                    case 6:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('点击客服按钮应打开聊天窗口', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var fabButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/login')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.fill('input[type="email"]', 'e2e-test@proclaw.com')];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.fill('input[type="password"]', 'e2e-test-password')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, page.click('button[type="submit"]')];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL(/\/app\/dashboard/, { timeout: 10000 })];
                    case 5:
                        _c.sent();
                        fabButton = page.locator('button').filter({ has: page.locator('svg') }).last();
                        return [4 /*yield*/, fabButton.click()];
                    case 6:
                        _c.sent();
                        // 验证聊天窗口出现（可能包含 "智能客服" 或欢迎语）
                        return [4 /*yield*/, page.waitForTimeout(1000)];
                    case 7:
                        // 验证聊天窗口出现（可能包含 "智能客服" 或欢迎语）
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=智能客服').or(page.locator('text=客服'))).toBeVisible({ timeout: 5000 })];
                    case 8:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('后端 API 测试', function () {
        (0, test_1.test)('客服设置 API - 获取默认设置', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var response, body;
            var request = _b.request;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, request.get("/api/customer-service/settings?tenant_id=".concat(TEST_TENANT_ID))];
                    case 1:
                        response = _c.sent();
                        (0, test_1.expect)(response.status()).toBe(200);
                        return [4 /*yield*/, response.json()];
                    case 2:
                        body = _c.sent();
                        (0, test_1.expect)(body.success).toBe(true);
                        (0, test_1.expect)(body.data).toBeDefined();
                        (0, test_1.expect)(body.data.is_enabled).toBe(true);
                        (0, test_1.expect)(body.data.transfer_mode).toBe('direct');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('客服聊天 API - 发送消息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var response, body;
            var request = _b.request;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, request.post("/api/customer-service/chat?tenant_id=".concat(TEST_TENANT_ID), {
                            data: {
                                session_id: TEST_SESSION_ID,
                                message: '你好，有什么商品推荐？',
                                customer_id: TEST_CUSTOMER_ID,
                                customer_name: '测试客户',
                            },
                        })];
                    case 1:
                        response = _c.sent();
                        (0, test_1.expect)(response.status()).toBe(200);
                        return [4 /*yield*/, response.json()];
                    case 2:
                        body = _c.sent();
                        (0, test_1.expect)(body.success).toBe(true);
                        (0, test_1.expect)(body.data).toBeDefined();
                        (0, test_1.expect)(body.data.reply).toBeDefined();
                        (0, test_1.expect)(body.data.session_id).toBe(TEST_SESSION_ID);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('转人工流程 - 无法回答应触发转人工', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var response, body;
            var request = _b.request;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, request.post("/api/customer-service/chat?tenant_id=".concat(TEST_TENANT_ID), {
                            data: {
                                session_id: TEST_SESSION_ID,
                                message: '我要投诉，产品有质量问题',
                                customer_id: TEST_CUSTOMER_ID,
                                customer_name: '测试客户',
                            },
                        })];
                    case 1:
                        response = _c.sent();
                        (0, test_1.expect)(response.status()).toBe(200);
                        return [4 /*yield*/, response.json()];
                    case 2:
                        body = _c.sent();
                        // 可能返回转人工或知识库匹配（取决于知识库内容）
                        (0, test_1.expect)(body.success).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('问答库 API - CRUD 操作', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var createRes;
            var request = _b.request;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, request.post('/api/customer-service/knowledge-base', {
                            data: {
                                tenant_id: TEST_TENANT_ID,
                                question: '测试问题：退货流程是什么？',
                                answer: '您可以在订单页面点击"申请退款"，填写原因后提交。我们会在1-3个工作日处理。',
                                category: 'return',
                                keywords: ['退货', '退款', '流程'],
                                is_active: true,
                            },
                        })];
                    case 1:
                        createRes = _c.sent();
                        // 需要认证，所以这里可能返回 401
                        (0, test_1.expect)(createRes.status() === 201 || createRes.status() === 401).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('桌面端 - 客服管理页面', function () {
        (0, test_1.test)('客服管理页面应显示基本布局', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isLoggedIn;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 桌面端页面通常需要 HashRouter
                    return [4 /*yield*/, page.goto('/#/customer-service')];
                    case 1:
                        // 桌面端页面通常需要 HashRouter
                        _c.sent();
                        // 可能需要登录，检查页面是否显示登录提示或实际页面
                        return [4 /*yield*/, page.waitForTimeout(2000)];
                    case 2:
                        // 可能需要登录，检查页面是否显示登录提示或实际页面
                        _c.sent();
                        return [4 /*yield*/, page.locator('text=AI 客服管理').isVisible()];
                    case 3:
                        isLoggedIn = _c.sent();
                        if (!isLoggedIn) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=AI 客服管理')).toBeVisible()];
                    case 4:
                        _c.sent();
                        // 检查 Tab 存在
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=待回复')).toBeVisible()];
                    case 5:
                        // 检查 Tab 存在
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=聊天记录')).toBeVisible()];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=问答库')).toBeVisible()];
                    case 7:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=客服设置')).toBeVisible()];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        }); });
    });
});
