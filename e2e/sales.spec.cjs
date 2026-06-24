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
test_1.test.describe('销售流程功能', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 先登录
                return [4 /*yield*/, page.goto('/')];
                case 1:
                    // 先登录
                    _c.sent();
                    return [4 /*yield*/, page.click('button:has-text("一键体验")')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/datacenter**', { timeout: 15000 })];
                case 3:
                    _c.sent();
                    // 导航到销售页面
                    return [4 /*yield*/, page.click('text=销售')];
                case 4:
                    // 导航到销售页面
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/sales', { timeout: 5000 })];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该显示销售订单列表页面', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 验证销售页面加载
                return [4 /*yield*/, (0, test_1.expect)(page.locator('text=销售订单')).toBeVisible()];
                case 1:
                    // 验证销售页面加载
                    _c.sent();
                    // 检查是否有创建订单按钮
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("创建订单")')).toBeVisible()];
                case 2:
                    // 检查是否有创建订单按钮
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够打开创建订单对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 点击创建订单按钮
                return [4 /*yield*/, page.click('button:has-text("创建订单")')];
                case 1:
                    // 点击创建订单按钮
                    _c.sent();
                    // 验证对话框打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).toBeVisible()];
                case 2:
                    // 验证对话框打开
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=创建销售订单')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够创建新销售订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var customerSelect, customerInput, productSelect;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 点击创建订单按钮
                return [4 /*yield*/, page.click('button:has-text("创建订单")')];
                case 1:
                    // 点击创建订单按钮
                    _c.sent();
                    customerSelect = page.locator('select[name="customer_id"], select[id*="customer"]').first();
                    return [4 /*yield*/, customerSelect.count()];
                case 2:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, customerSelect.selectOption({ index: 1 })];
                case 3:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 4:
                    customerInput = page.locator('input[placeholder*="客户"]').first();
                    return [4 /*yield*/, customerInput.fill('Test Customer')];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.keyboard.press('Enter')];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: 
                // 添加产品
                return [4 /*yield*/, page.click('button:has-text("添加产品"), button:has-text("+")')];
                case 8:
                    // 添加产品
                    _c.sent();
                    productSelect = page.locator('select[name*="product"]').first();
                    return [4 /*yield*/, productSelect.count()];
                case 9:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, productSelect.selectOption({ index: 1 })];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11: 
                // 填写数量和价格
                return [4 /*yield*/, page.fill('input[name*="quantity"], input[placeholder*="数量"]', '10')];
                case 12:
                    // 填写数量和价格
                    _c.sent();
                    return [4 /*yield*/, page.fill('input[name*="price"], input[placeholder*="价格"]', '150')];
                case 13:
                    _c.sent();
                    // 提交订单
                    return [4 /*yield*/, page.click('button:has-text("保存"), button:has-text("确定")')];
                case 14:
                    // 提交订单
                    _c.sent();
                    // 等待成功提示或对话框关闭
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).not.toBeVisible({ timeout: 5000 })];
                case 15:
                    // 等待成功提示或对话框关闭
                    _c.sent();
                    // 验证订单出现在列表中
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=SO-')).toBeVisible({ timeout: 5000 })];
                case 16:
                    // 验证订单出现在列表中
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该显示订单详细信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var orderRow;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    orderRow = page.locator('tbody tr').first();
                    return [4 /*yield*/, orderRow.click()];
                case 1:
                    _c.sent();
                    // 验证详情对话框或页面打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=订单详情')).toBeVisible({ timeout: 5000 })];
                case 2:
                    // 验证详情对话框或页面打开
                    _c.sent();
                    // 验证订单信息显示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=订单号')).toBeVisible()];
                case 3:
                    // 验证订单信息显示
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=客户')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=金额')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够按状态过滤订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var statusFilter;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    statusFilter = page.locator('select[name="status"], select[id*="status"]').first();
                    return [4 /*yield*/, statusFilter.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, statusFilter.selectOption('confirmed')];
                case 2:
                    _c.sent();
                    // 等待过滤结果
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 3:
                    // 等待过滤结果
                    _c.sent();
                    // 验证订单列表已更新
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[data-testid="order-list"]')).toBeVisible()];
                case 4:
                    // 验证订单列表已更新
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够搜索订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var searchInput;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
                    return [4 /*yield*/, searchInput.fill('SO-')];
                case 1:
                    _c.sent();
                    // 等待搜索结果
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    // 等待搜索结果
                    _c.sent();
                    // 验证搜索结果
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=SO-')).toBeVisible()];
                case 3:
                    // 验证搜索结果
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够确认订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var confirmButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    confirmButton = page.locator('button:has-text("确认"), button[data-action="confirm"]').first();
                    return [4 /*yield*/, confirmButton.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, confirmButton.click()];
                case 2:
                    _c.sent();
                    // 确认操作
                    return [4 /*yield*/, page.click('button:has-text("确定"), button:has-text("确认")')];
                case 3:
                    // 确认操作
                    _c.sent();
                    // 验证状态更新
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=已确认')).toBeVisible({ timeout: 5000 })];
                case 4:
                    // 验证状态更新
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够取消订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var cancelButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    cancelButton = page.locator('button:has-text("取消"), button[data-action="cancel"]').first();
                    return [4 /*yield*/, cancelButton.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, cancelButton.click()];
                case 2:
                    _c.sent();
                    // 确认取消
                    return [4 /*yield*/, page.click('button:has-text("确定"), button:has-text("确认")')];
                case 3:
                    // 确认取消
                    _c.sent();
                    // 验证状态更新
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=已取消')).toBeVisible({ timeout: 5000 })];
                case 4:
                    // 验证状态更新
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该显示订单统计信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 验证统计卡片存在
                return [4 /*yield*/, (0, test_1.expect)(page.locator('text=总订单数')).toBeVisible()];
                case 1:
                    // 验证统计卡片存在
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=总金额')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=待处理')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够导出订单列表', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var exportButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    exportButton = page.locator('button:has-text("导出"), button[data-action="export"]');
                    return [4 /*yield*/, exportButton.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, exportButton.click()];
                case 2:
                    _c.sent();
                    // 验证下载开始或导出对话框打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=导出')).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 验证下载开始或导出对话框打开
                    _c.sent();
                    _c.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够打印订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var printButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    printButton = page.locator('button:has-text("打印"), button[data-action="print"]').first();
                    return [4 /*yield*/, printButton.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, printButton.click()];
                case 2:
                    _c.sent();
                    // 验证打印对话框或预览打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=打印')).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 验证打印对话框或预览打开
                    _c.sent();
                    _c.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够添加订单备注', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var orderRow, notesInput;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    orderRow = page.locator('tbody tr').first();
                    return [4 /*yield*/, orderRow.click()];
                case 1:
                    _c.sent();
                    notesInput = page.locator('textarea[name="notes"], textarea[placeholder*="备注"]').first();
                    return [4 /*yield*/, notesInput.count()];
                case 2:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, notesInput.fill('Test note')];
                case 3:
                    _c.sent();
                    // 保存备注
                    return [4 /*yield*/, page.click('button:has-text("保存备注")')];
                case 4:
                    // 保存备注
                    _c.sent();
                    // 验证备注保存成功
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Test note')).toBeVisible({ timeout: 3000 })];
                case 5:
                    // 验证备注保存成功
                    _c.sent();
                    _c.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够查看客户信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var customerLink;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    customerLink = page.locator('a[href*="customer"], span[class*="customer"]').first();
                    return [4 /*yield*/, customerLink.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, customerLink.click()];
                case 2:
                    _c.sent();
                    // 验证客户详情页面或对话框打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=客户信息')).toBeVisible({ timeout: 5000 })];
                case 3:
                    // 验证客户详情页面或对话框打开
                    _c.sent();
                    _c.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够批量操作订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var checkboxes, count;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    checkboxes = page.locator('input[type="checkbox"]');
                    return [4 /*yield*/, checkboxes.count()];
                case 1:
                    count = _c.sent();
                    if (!(count > 1)) return [3 /*break*/, 5];
                    // 选择前两个订单
                    return [4 /*yield*/, checkboxes.nth(0).check()];
                case 2:
                    // 选择前两个订单
                    _c.sent();
                    return [4 /*yield*/, checkboxes.nth(1).check()];
                case 3:
                    _c.sent();
                    // 验证批量操作按钮出现
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("批量")')).toBeVisible()];
                case 4:
                    // 验证批量操作按钮出现
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    }); });
});
