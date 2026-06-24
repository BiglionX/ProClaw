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
test_1.test.describe('产品管理功能', function () {
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
                    // 导航到产品页面
                    return [4 /*yield*/, page.click('text=产品')];
                case 4:
                    // 导航到产品页面
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/products', { timeout: 5000 })];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该显示产品列表页面', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 验证产品页面加载
                return [4 /*yield*/, (0, test_1.expect)(page.locator('text=产品管理')).toBeVisible()];
                case 1:
                    // 验证产品页面加载
                    _c.sent();
                    // 检查是否有添加产品按钮
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("添加产品")')).toBeVisible()];
                case 2:
                    // 检查是否有添加产品按钮
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够打开添加产品对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 点击添加产品按钮
                return [4 /*yield*/, page.click('button:has-text("添加产品")')];
                case 1:
                    // 点击添加产品按钮
                    _c.sent();
                    // 验证对话框打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).toBeVisible()];
                case 2:
                    // 验证对话框打开
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=添加产品')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够创建新产品', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 点击添加产品按钮
                return [4 /*yield*/, page.click('button:has-text("添加产品")')];
                case 1:
                    // 点击添加产品按钮
                    _c.sent();
                    // 填写产品信息
                    return [4 /*yield*/, page.fill('input[placeholder*="SKU"], input[name="sku"]', 'TEST001')];
                case 2:
                    // 填写产品信息
                    _c.sent();
                    return [4 /*yield*/, page.fill('input[placeholder*="名称"], input[name="name"]', 'Test Product')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.fill('input[placeholder*="成本"], input[name="cost_price"]', '100')];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.fill('input[placeholder*="售价"], input[name="sell_price"]', '150')];
                case 5:
                    _c.sent();
                    // 提交表单
                    return [4 /*yield*/, page.click('button:has-text("保存"), button:has-text("确定")')];
                case 6:
                    // 提交表单
                    _c.sent();
                    // 等待成功提示或对话框关闭
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).not.toBeVisible({ timeout: 5000 })];
                case 7:
                    // 等待成功提示或对话框关闭
                    _c.sent();
                    // 验证产品出现在列表中
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Test Product')).toBeVisible({ timeout: 5000 })];
                case 8:
                    // 验证产品出现在列表中
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该在缺少必填字段时显示验证错误', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 点击添加产品按钮
                return [4 /*yield*/, page.click('button:has-text("添加产品")')];
                case 1:
                    // 点击添加产品按钮
                    _c.sent();
                    // 不填写任何信息，直接提交
                    return [4 /*yield*/, page.click('button:has-text("保存"), button:has-text("确定")')];
                case 2:
                    // 不填写任何信息，直接提交
                    _c.sent();
                    // 验证错误信息显示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=必填')).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 验证错误信息显示
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够搜索产品', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var searchInput;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
                    return [4 /*yield*/, searchInput.fill('Test')];
                case 1:
                    _c.sent();
                    // 等待搜索结果
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    // 等待搜索结果
                    _c.sent();
                    // 验证搜索结果
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Test')).toBeVisible()];
                case 3:
                    // 验证搜索结果
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够编辑产品', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var editButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    editButton = page.locator('button:has-text("编辑"), button[data-action="edit"]').first();
                    return [4 /*yield*/, editButton.click()];
                case 1:
                    _c.sent();
                    // 验证编辑对话框打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).toBeVisible()];
                case 2:
                    // 验证编辑对话框打开
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=编辑产品')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够删除产品', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var deleteButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    deleteButton = page.locator('button:has-text("删除"), button[data-action="delete"]').first();
                    return [4 /*yield*/, deleteButton.click()];
                case 1:
                    _c.sent();
                    // 确认删除
                    return [4 /*yield*/, page.click('button:has-text("确认"), button:has-text("确定")')];
                case 2:
                    // 确认删除
                    _c.sent();
                    // 验证删除成功提示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=删除成功')).toBeVisible({ timeout: 5000 })];
                case 3:
                    // 验证删除成功提示
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够按类别过滤产品', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var categoryFilter;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    categoryFilter = page.locator('select[name="category"], select[id*="category"]').first();
                    return [4 /*yield*/, categoryFilter.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, categoryFilter.selectOption({ index: 1 })];
                case 2:
                    _c.sent();
                    // 等待过滤结果
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 3:
                    // 等待过滤结果
                    _c.sent();
                    // 验证产品列表已更新
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[data-testid="product-list"]')).toBeVisible()];
                case 4:
                    // 验证产品列表已更新
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该显示产品详细信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var productRow;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    productRow = page.locator('tbody tr').first();
                    return [4 /*yield*/, productRow.click()];
                case 1:
                    _c.sent();
                    // 验证详情对话框或页面打开
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=产品详情')).toBeVisible({ timeout: 5000 })];
                case 2:
                    // 验证详情对话框或页面打开
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够导出产品列表', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
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
});
