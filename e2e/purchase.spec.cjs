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
test_1.test.describe('采购管理功能', function () {
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
                    return [4 /*yield*/, page.click('text=采购')];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/purchase', { timeout: 5000 })];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该显示采购订单列表页面', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.locator('text=采购订单')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("创建采购订单")')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够打开创建采购订单对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.click('button:has-text("创建采购订单")')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够创建新采购订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var supplierSelect;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.click('button:has-text("创建采购订单")')];
                case 1:
                    _c.sent();
                    supplierSelect = page.locator('select[name*="supplier"]').first();
                    return [4 /*yield*/, supplierSelect.count()];
                case 2:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, supplierSelect.selectOption({ index: 1 })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4: return [4 /*yield*/, page.click('button:has-text("添加产品"), button:has-text("+")')];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.fill('input[name*="quantity"], input[placeholder*="数量"]', '20')];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, page.fill('input[name*="price"], input[placeholder*="价格"]', '80')];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, page.click('button:has-text("保存"), button:has-text("确定")')];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).not.toBeVisible({ timeout: 5000 })];
                case 9:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该显示采购订单统计信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.locator('text=总采购金额')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=待入库')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够按状态过滤采购订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var statusFilter;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    statusFilter = page.locator('select[name="status"]').first();
                    return [4 /*yield*/, statusFilter.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, statusFilter.selectOption('confirmed')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[data-testid="order-list"]')).toBeVisible()];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够查看采购订单详情', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var orderRow;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    orderRow = page.locator('tbody tr').first();
                    return [4 /*yield*/, orderRow.click()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=订单详情')).toBeVisible({ timeout: 5000 })];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=供应商')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够管理供应商', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var supplierTab;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    supplierTab = page.locator('text=供应商').first();
                    return [4 /*yield*/, supplierTab.count()];
                case 1:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, supplierTab.click()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("添加供应商")')).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('应该能够搜索采购订单', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var searchInput;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    searchInput = page.locator('input[placeholder*="搜索"]').first();
                    return [4 /*yield*/, searchInput.fill('PO-')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
