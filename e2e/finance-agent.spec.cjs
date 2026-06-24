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
var test_1 = require("@playwright/test");
test_1.test.describe('财务管理 Agent 功能', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.click('button:has-text("一键体验")')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/datacenter**', { timeout: 15000 })];
                case 3:
                    _c.sent();
                    // 导航到财务管理 Agent 页面
                    return [4 /*yield*/, page.click('text=财务管理')];
                case 4:
                    // 导航到财务管理 Agent 页面
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/finance-agent', { timeout: 5000 })];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('财务管理页面应正常加载，显示标题和 Tab 导航', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.locator('text=财务管理')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=内置财务管理 Agent')).toBeVisible()];
                case 2:
                    _c.sent();
                    // 所有 Tab 应显示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=概览')).toBeVisible()];
                case 3:
                    // 所有 Tab 应显示
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=账户')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=交易记录')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=预算')).toBeVisible()];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=报表')).toBeVisible()];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=发票')).toBeVisible()];
                case 8:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('概览 Tab 应显示财务摘要', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 默认在概览 Tab
                return [4 /*yield*/, (0, test_1.expect)(page.locator('text=财务概览')).toBeVisible({ timeout: 3000 })];
                case 1:
                    // 默认在概览 Tab
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=总资产')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=本月收入')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=本月支出')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=本月结余')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('账户 Tab 应能显示账户列表并支持创建新账户', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 切换到账户 Tab
                return [4 /*yield*/, page.locator('text=账户').click()];
                case 1:
                    // 切换到账户 Tab
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    // 应显示账户相关 UI
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=新建账户').first().or(page.locator('text=创建账户').first())).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 应显示账户相关 UI
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('交易记录 Tab 应能显示交易列表', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 切换到交易记录 Tab
                return [4 /*yield*/, page.locator('text=交易记录').click()];
                case 1:
                    // 切换到交易记录 Tab
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    // 应显示交易相关 UI
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=记一笔').first().or(page.locator('text=新增').first()).or(page.locator('text=新建').first())).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 应显示交易相关 UI
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('预算 Tab 应能显示预算面板', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 切换到预算 Tab
                return [4 /*yield*/, page.locator('text=预算').click()];
                case 1:
                    // 切换到预算 Tab
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    // 预算 Tab 应有内容
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=预算').first()).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 预算 Tab 应有内容
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('报表 Tab 应能查看收支报表', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 切换到报表 Tab
                return [4 /*yield*/, page.locator('text=报表').click()];
                case 1:
                    // 切换到报表 Tab
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    // 报表应有内容
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=收支分类').first().or(page.locator('text=分类统计').first())).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 报表应有内容
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('发票管理 Tab 应能显示发票列表', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 切换到发票 Tab
                return [4 /*yield*/, page.locator('text=发票').click()];
                case 1:
                    // 切换到发票 Tab
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    // 发票 Tab 应有内容
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=新建发票').first().or(page.locator('text=添加发票').first())).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 发票 Tab 应有内容
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('所有 Tab 切换应正确显示对应内容', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var tabs, _i, tabs_1, tab;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    tabs = ['概览', '账户', '交易记录', '预算', '报表', '发票'];
                    _i = 0, tabs_1 = tabs;
                    _c.label = 1;
                case 1:
                    if (!(_i < tabs_1.length)) return [3 /*break*/, 6];
                    tab = tabs_1[_i];
                    return [4 /*yield*/, page.locator("text=".concat(tab)).first().click()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 3:
                    _c.sent();
                    // 验证页面没有崩溃（mounted 组件应存在）
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=财务管理').first()).toBeVisible()];
                case 4:
                    // 验证页面没有崩溃（mounted 组件应存在）
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    }); });
});
