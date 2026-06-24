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
/**
 * 商务秘书 Agent 端到端测试 (PRD v8.5)
 * 测试内容: 右键菜单、个性化定制、关注设置、碰壁话术
 */
var test_1 = require("@playwright/test");
test_1.test.describe('商务秘书 Agent 功能 (PRD v8.5)', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 登录
                return [4 /*yield*/, page.goto('/')];
                case 1:
                    // 登录
                    _c.sent();
                    return [4 /*yield*/, page.click('button:has-text("一键体验")')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/datacenter**', { timeout: 15000 })];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('秘书浮动按钮应在右下角显示', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var fab;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fab = page.locator('[data-testid="Fab"]');
                    return [4 /*yield*/, (0, test_1.expect)(fab).toBeVisible()];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('右键浮动按钮应弹出上下文菜单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var fabIcon;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
                    return [4 /*yield*/, fabIcon.click({ button: 'right' })];
                case 1:
                    _c.sent();
                    // 应显示右键菜单
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=更换头像')).toBeVisible()];
                case 2:
                    // 应显示右键菜单
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=修改名称')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=关注设置')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=语音通话')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=关于秘书')).toBeVisible()];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('右键菜单中语音通话应为灰态', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var fabIcon;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
                    return [4 /*yield*/, fabIcon.click({ button: 'right' })];
                case 1:
                    _c.sent();
                    // 语音通话菜单项应包含"即将上线"提示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=即将上线')).toBeVisible()];
                case 2:
                    // 语音通话菜单项应包含"即将上线"提示
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('右键菜单中点击关于秘书应显示信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var fabIcon;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
                    return [4 /*yield*/, fabIcon.click({ button: 'right' })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.click('text=关于秘书')];
                case 2:
                    _c.sent();
                    // 应显示关于秘书对话框
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Agent ID: builtin:secretary')).toBeVisible()];
                case 3:
                    // 应显示关于秘书对话框
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('点击更换头像应打开头像选择器', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var fabIcon;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
                    return [4 /*yield*/, fabIcon.click({ button: 'right' })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.click('text=更换头像')];
                case 2:
                    _c.sent();
                    // 应显示头像选择器
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=更换头像')).toBeVisible()];
                case 3:
                    // 应显示头像选择器
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('对话面板应由秘书身份显示', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 打开聊天面板
                return [4 /*yield*/, page.locator('[data-testid="Fab"]').click()];
                case 1:
                    // 打开聊天面板
                    _c.sent();
                    // 应显示秘书头像和名称
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    // 应显示秘书头像和名称
                    _c.sent();
                    // 标题栏应显示名称
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=小 Pro')).toBeVisible()];
                case 3:
                    // 标题栏应显示名称
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('关注设置应打开并显示各配置区域', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var fabIcon;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
                    return [4 /*yield*/, fabIcon.click({ button: 'right' })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.click('text=关注设置')];
                case 2:
                    _c.sent();
                    // 应显示关注设置面板的各区域标题
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=我关注的指标')).toBeVisible()];
                case 3:
                    // 应显示关注设置面板的各区域标题
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=自动预警')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=简报推送')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=学习记录')).toBeVisible()];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('向秘书发送决策类请求应触发碰壁话术', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var textarea;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 打开聊天面板
                return [4 /*yield*/, page.locator('[data-testid="Fab"]').click()];
                case 1:
                    // 打开聊天面板
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    textarea = page.locator('textarea');
                    return [4 /*yield*/, textarea.fill('帮我下采购单')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.locator('button[type="button"]').last().click()];
                case 4:
                    _c.sent();
                    // 等待响应
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 5:
                    // 等待响应
                    _c.sent();
                    // 应显示碰壁话术（拒绝+引导）
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=决策权限')).toBeVisible()];
                case 6:
                    // 应显示碰壁话术（拒绝+引导）
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
