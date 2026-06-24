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
test_1.test.describe('Agent 管理功能', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var agentNav;
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
                    agentNav = page.locator('text=Agent管理, text=Agents, text=智能体, a[href*="agents"]').first();
                    return [4 /*yield*/, agentNav.isVisible({ timeout: 5000 }).catch(function () { return false; })];
                case 4:
                    if (!_c.sent()) return [3 /*break*/, 7];
                    return [4 /*yield*/, agentNav.click()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/agents**', { timeout: 5000 })];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('Agent 管理页面应正常加载并显示内置财务管理 Agent', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Agent 管理')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=财务管理 Agent')).toBeVisible()];
                case 2:
                    _c.sent();
                    // 内置 Agent 应该有"内置"标签
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=内置').first()).toBeVisible()];
                case 3:
                    // 内置 Agent 应该有"内置"标签
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应有"发现更多 Agent"按钮', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var discoverBtn;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    discoverBtn = page.locator('button:has-text("发现更多 Agent")');
                    return [4 /*yield*/, (0, test_1.expect)(discoverBtn).toBeVisible()];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应能切换 Agent 的启用/禁用状态', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var agentCard, toggle;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    agentCard = page.locator('text=财务管理 Agent').locator('..');
                    toggle = agentCard.locator('input[type="checkbox"]').first();
                    return [4 /*yield*/, (0, test_1.expect)(toggle).toBeVisible()];
                case 1:
                    _c.sent();
                    // 初始状态为启用
                    return [4 /*yield*/, (0, test_1.expect)(toggle).toBeChecked()];
                case 2:
                    // 初始状态为启用
                    _c.sent();
                    // 点击禁用
                    return [4 /*yield*/, toggle.click()];
                case 3:
                    // 点击禁用
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 4:
                    _c.sent();
                    // 再次启用
                    return [4 /*yield*/, toggle.click()];
                case 5:
                    // 再次启用
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应能查看 Agent 详情', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var infoButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    infoButton = page.locator('text=财务管理 Agent')
                        .locator('..')
                        .locator('button').first();
                    return [4 /*yield*/, infoButton.click()];
                case 1:
                    _c.sent();
                    // 详情弹窗应显示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=所需权限')).toBeVisible({ timeout: 3000 })];
                case 2:
                    // 详情弹窗应显示
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Agent ID')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=proclaw-finance-agent').first()).toBeVisible()];
                case 4:
                    _c.sent();
                    // 关闭详情弹窗
                    return [4 /*yield*/, page.locator('button').filter({ has: page.locator('svg') }).first().click()];
                case 5:
                    // 关闭详情弹窗
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('内置财务管理 Agent 应没有卸载按钮', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var agentCard, deleteButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    agentCard = page.locator('text=财务管理 Agent').locator('..');
                    deleteButton = agentCard.locator('button[color="error"]');
                    return [4 /*yield*/, (0, test_1.expect)(deleteButton).toHaveCount(0)];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应能打开 Agent 市场', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var discoverBtn;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    discoverBtn = page.locator('button:has-text("发现更多 Agent")');
                    return [4 /*yield*/, discoverBtn.click()];
                case 1:
                    _c.sent();
                    // 市场弹窗应打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Agent 市场')).toBeVisible({ timeout: 3000 })];
                case 2:
                    // 市场弹窗应打开
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=搜索 Agent...')).toBeVisible()];
                case 3:
                    _c.sent();
                    // 检查分类标签
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=全部')).toBeVisible()];
                case 4:
                    // 检查分类标签
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=协作')).toBeVisible()];
                case 5:
                    _c.sent();
                    // 关闭市场
                    return [4 /*yield*/, page.locator('button').filter({ has: page.locator('svg') }).first().click()];
                case 6:
                    // 关闭市场
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('市场应能按分类筛选', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 打开市场
                return [4 /*yield*/, page.locator('button:has-text("发现更多 Agent")').click()];
                case 1:
                    // 打开市场
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    // 点击销售分类
                    return [4 /*yield*/, page.locator('text=销售').click()];
                case 3:
                    // 点击销售分类
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 4:
                    _c.sent();
                    // 销售分类被选中
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=客户关系 Agent')).toBeVisible({ timeout: 3000 })];
                case 5:
                    // 销售分类被选中
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('市场应支持搜索', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 打开市场
                return [4 /*yield*/, page.locator('button:has-text("发现更多 Agent")').click()];
                case 1:
                    // 打开市场
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    // 输入搜索文本
                    return [4 /*yield*/, page.fill('input[placeholder="搜索 Agent..."]', '任务')];
                case 3:
                    // 输入搜索文本
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 4:
                    _c.sent();
                    // 应显示匹配结果
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=任务管理 Agent')).toBeVisible({ timeout: 3000 })];
                case 5:
                    // 应显示匹配结果
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应能通过浮动按钮打开 Agent 市场', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var floatingBtn;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    floatingBtn = page.locator('button:has-text("发现更多 Agent")').last();
                    return [4 /*yield*/, (0, test_1.expect)(floatingBtn).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, floatingBtn.click()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Agent 市场')).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
