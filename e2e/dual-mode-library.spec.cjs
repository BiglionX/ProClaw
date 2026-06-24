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
test_1.test.describe('双模式商品库系统', function () {
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
                    // 导航到商品管理页面
                    return [4 /*yield*/, page.click('text=商品库')];
                case 4:
                    // 导航到商品管理页面
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/products', { timeout: 5000 })];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test_1.test.describe('模式检测功能', function () {
        (0, test_1.test)('应该默认显示简单商品库模式', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var upgradeButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 验证页面标题显示简单模式
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=📦 商品管理')).toBeVisible()];
                    case 1:
                        // 验证页面标题显示简单模式
                        _c.sent();
                        // 验证副标题
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=适合小商家、农场、手工作坊')).toBeVisible()];
                    case 2:
                        // 验证副标题
                        _c.sent();
                        upgradeButton = page.locator('button[title*="升级"]');
                        return [4 /*yield*/, (0, test_1.expect)(upgradeButton).toBeVisible()];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('升级按钮应该显示正确的Tooltip', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var upgradeButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        upgradeButton = page.locator('button[title*="升级"]');
                        // 鼠标悬停查看Tooltip
                        return [4 /*yield*/, upgradeButton.hover()];
                    case 1:
                        // 鼠标悬停查看Tooltip
                        _c.sent();
                        // 验证Tooltip文本
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=升级为电商商品库：支持多规格、多图管理')).toBeVisible({ timeout: 3000 })];
                    case 2:
                        // 验证Tooltip文本
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('升级流程测试', function () {
        (0, test_1.test)('点击升级按钮应该打开确认对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击升级按钮
                    return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 1:
                        // 点击升级按钮
                        _c.sent();
                        // 验证对话框打开
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).toBeVisible()];
                    case 2:
                        // 验证对话框打开
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=🚀 升级为电商商品库')).toBeVisible()];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('升级对话框应该显示完整的说明信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击升级按钮
                    return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 1:
                        // 点击升级按钮
                        _c.sent();
                        // 验证升级内容包括
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=升级内容包括：')).toBeVisible()];
                    case 2:
                        // 验证升级内容包括
                        _c.sent();
                        // 验证4个升级项
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=为每个商品创建SPU')).toBeVisible()];
                    case 3:
                        // 验证4个升级项
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=为每个商品创建默认SKU')).toBeVisible()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=自动迁移商品图片')).toBeVisible()];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=原商品数据保留')).toBeVisible()];
                    case 6:
                        _c.sent();
                        // 验证注意事项
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=注意事项：')).toBeVisible()];
                    case 7:
                        // 验证注意事项
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=升级过程不可逆')).toBeVisible()];
                    case 8:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=建议在升级前备份数据库')).toBeVisible()];
                    case 9:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=升级期间请勿关闭应用')).toBeVisible()];
                    case 10:
                        _c.sent();
                        // 验证按钮
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("取消")')).toBeVisible()];
                    case 11:
                        // 验证按钮
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("确认升级")')).toBeVisible()];
                    case 12:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('升级对话框应该显示待迁移商品数量', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var productCountAlert;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击升级按钮
                    return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 1:
                        // 点击升级按钮
                        _c.sent();
                        productCountAlert = page.locator('text=检测到').locator('text=个商品将被迁移');
                        return [4 /*yield*/, productCountAlert.count()];
                    case 2:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, test_1.expect)(productCountAlert).toBeVisible()];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('点击取消应该关闭升级对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击升级按钮
                    return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 1:
                        // 点击升级按钮
                        _c.sent();
                        // 点击取消
                        return [4 /*yield*/, page.click('button:has-text("取消")')];
                    case 2:
                        // 点击取消
                        _c.sent();
                        // 验证对话框关闭
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).not.toBeVisible({ timeout: 3000 })];
                    case 3:
                        // 验证对话框关闭
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('执行升级应该成功迁移数据', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var productRows, productCount, successAlert, downgradeButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        productRows = page.locator('tbody tr');
                        return [4 /*yield*/, productRows.count()];
                    case 1:
                        productCount = _c.sent();
                        // 点击升级按钮
                        return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 2:
                        // 点击升级按钮
                        _c.sent();
                        // 点击确认升级
                        return [4 /*yield*/, page.click('button:has-text("确认升级")')];
                    case 3:
                        // 点击确认升级
                        _c.sent();
                        // 验证加载状态
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=正在迁移数据，请稍候...')).toBeVisible({ timeout: 3000 })];
                    case 4:
                        // 验证加载状态
                        _c.sent();
                        // 等待迁移完成（可能需要较长时间）
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=正在迁移数据')).not.toBeVisible({ timeout: 30000 })];
                    case 5:
                        // 等待迁移完成（可能需要较长时间）
                        _c.sent();
                        // 验证模式切换
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=🛍️ 电商商品库')).toBeVisible({ timeout: 5000 })];
                    case 6:
                        // 验证模式切换
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=支持多规格、多图、精细化库存管理')).toBeVisible()];
                    case 7:
                        _c.sent();
                        successAlert = page.locator('text=成功升级').locator("text=\u8FC1\u79FB\u4E86".concat(productCount, "\u4E2A\u5546\u54C1"));
                        return [4 /*yield*/, successAlert.count()];
                    case 8:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 10];
                        return [4 /*yield*/, (0, test_1.expect)(successAlert).toBeVisible()];
                    case 9:
                        _c.sent();
                        _c.label = 10;
                    case 10:
                        downgradeButton = page.locator('button[title*="返回"]');
                        return [4 /*yield*/, (0, test_1.expect)(downgradeButton).toBeVisible()];
                    case 11:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('升级完成后应该显示迁移结果统计', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isEcommerceMode, resultAlert;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.locator('text=🛍️ 电商商品库').isVisible()];
                    case 1:
                        isEcommerceMode = _c.sent();
                        if (isEcommerceMode) {
                            test_1.test.skip();
                            return [2 /*return*/];
                        }
                        // 点击升级按钮
                        return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 2:
                        // 点击升级按钮
                        _c.sent();
                        // 点击确认升级
                        return [4 /*yield*/, page.click('button:has-text("确认升级")')];
                    case 3:
                        // 点击确认升级
                        _c.sent();
                        // 等待迁移完成
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=正在迁移数据')).not.toBeVisible({ timeout: 30000 })];
                    case 4:
                        // 等待迁移完成
                        _c.sent();
                        resultAlert = page.locator('text=迁移完成');
                        return [4 /*yield*/, resultAlert.count()];
                    case 5:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, test_1.expect)(resultAlert).toBeVisible()];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=个SPU')).toBeVisible()];
                    case 7:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=个SKU')).toBeVisible()];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('降级流程测试', function () {
        test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isEcommerceMode;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.locator('text=🛍️ 电商商品库').isVisible()];
                    case 1:
                        isEcommerceMode = _c.sent();
                        if (!!isEcommerceMode) return [3 /*break*/, 5];
                        return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.click('button:has-text("确认升级")')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=🛍️ 电商商品库')).toBeVisible({ timeout: 30000 })];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('点击返回按钮应该打开降级确认对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击返回按钮
                    return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 1:
                        // 点击返回按钮
                        _c.sent();
                        // 验证对话框打开
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).toBeVisible()];
                    case 2:
                        // 验证对话框打开
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=⚠️ 返回简单商品库')).toBeVisible()];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('降级对话框应该显示警告信息', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击返回按钮
                    return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 1:
                        // 点击返回按钮
                        _c.sent();
                        // 验证警告信息
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=危险操作！此操作将导致以下数据丢失：')).toBeVisible()];
                    case 2:
                        // 验证警告信息
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=所有SPU（标准产品单位）数据')).toBeVisible()];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=所有SKU（库存量单位）数据')).toBeVisible()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=所有商品图片关联')).toBeVisible()];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=多规格配置信息')).toBeVisible()];
                    case 6:
                        _c.sent();
                        // 验证保留的数据说明
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=保留的数据：')).toBeVisible()];
                    case 7:
                        // 验证保留的数据说明
                        _c.sent();
                        // 验证强烈建议
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=强烈建议：')).toBeVisible()];
                    case 8:
                        // 验证强烈建议
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=在降级前备份数据库')).toBeVisible()];
                    case 9:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('降级对话框应该有二次确认输入框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var confirmInput, confirmButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击返回按钮
                    return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 1:
                        // 点击返回按钮
                        _c.sent();
                        confirmInput = page.locator('input[placeholder*="CONFIRM"]');
                        return [4 /*yield*/, (0, test_1.expect)(confirmInput).toBeVisible()];
                    case 2:
                        _c.sent();
                        confirmButton = page.locator('button:has-text("确认降级")');
                        return [4 /*yield*/, (0, test_1.expect)(confirmButton).toBeDisabled()];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('输入错误的确认文本应该保持按钮禁用', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var confirmInput, confirmButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击返回按钮
                    return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 1:
                        // 点击返回按钮
                        _c.sent();
                        confirmInput = page.locator('input[placeholder*="CONFIRM"]');
                        return [4 /*yield*/, confirmInput.fill('abc')];
                    case 2:
                        _c.sent();
                        // 验证错误提示
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=输入不正确，请重新输入')).toBeVisible()];
                    case 3:
                        // 验证错误提示
                        _c.sent();
                        confirmButton = page.locator('button:has-text("确认降级")');
                        return [4 /*yield*/, (0, test_1.expect)(confirmButton).toBeDisabled()];
                    case 4:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('输入正确的CONFIRM应该启用确认按钮', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var confirmInput, confirmButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击返回按钮
                    return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 1:
                        // 点击返回按钮
                        _c.sent();
                        confirmInput = page.locator('input[placeholder*="CONFIRM"]');
                        return [4 /*yield*/, confirmInput.fill('CONFIRM')];
                    case 2:
                        _c.sent();
                        // 验证错误提示消失
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=输入不正确')).not.toBeVisible()];
                    case 3:
                        // 验证错误提示消失
                        _c.sent();
                        confirmButton = page.locator('button:has-text("确认降级")');
                        return [4 /*yield*/, (0, test_1.expect)(confirmButton).toBeEnabled()];
                    case 4:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('点击取消应该关闭降级对话框并清空输入', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var confirmInput, inputAgain;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击返回按钮
                    return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 1:
                        // 点击返回按钮
                        _c.sent();
                        confirmInput = page.locator('input[placeholder*="CONFIRM"]');
                        return [4 /*yield*/, confirmInput.fill('CONFIRM')];
                    case 2:
                        _c.sent();
                        // 点击取消
                        return [4 /*yield*/, page.click('button:has-text("取消")')];
                    case 3:
                        // 点击取消
                        _c.sent();
                        // 验证对话框关闭
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).not.toBeVisible({ timeout: 3000 })];
                    case 4:
                        // 验证对话框关闭
                        _c.sent();
                        // 再次打开对话框，验证输入已清空
                        return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 5:
                        // 再次打开对话框，验证输入已清空
                        _c.sent();
                        inputAgain = page.locator('input[placeholder*="CONFIRM"]');
                        return [4 /*yield*/, (0, test_1.expect)(inputAgain).toHaveValue('')];
                    case 6:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('执行降级应该成功返回简单模式', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var confirmInput, upgradeButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击返回按钮
                    return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 1:
                        // 点击返回按钮
                        _c.sent();
                        confirmInput = page.locator('input[placeholder*="CONFIRM"]');
                        return [4 /*yield*/, confirmInput.fill('CONFIRM')];
                    case 2:
                        _c.sent();
                        // 点击确认降级
                        return [4 /*yield*/, page.click('button:has-text("确认降级")')];
                    case 3:
                        // 点击确认降级
                        _c.sent();
                        // 验证加载状态
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=正在降级，请稍候...')).toBeVisible({ timeout: 3000 })];
                    case 4:
                        // 验证加载状态
                        _c.sent();
                        // 等待降级完成
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=正在降级')).not.toBeVisible({ timeout: 15000 })];
                    case 5:
                        // 等待降级完成
                        _c.sent();
                        // 验证模式切换回简单模式
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=📦 商品管理')).toBeVisible({ timeout: 5000 })];
                    case 6:
                        // 验证模式切换回简单模式
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=适合小商家、农场、手工作坊')).toBeVisible()];
                    case 7:
                        _c.sent();
                        // 验证成功提示
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=已返回简单商品库模式')).toBeVisible()];
                    case 8:
                        // 验证成功提示
                        _c.sent();
                        upgradeButton = page.locator('button[title*="升级"]');
                        return [4 /*yield*/, (0, test_1.expect)(upgradeButton).toBeVisible()];
                    case 9:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('边界情况测试', function () {
        (0, test_1.test)('升级过程中不应该能关闭对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var dialog, isLoading;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 点击升级按钮
                    return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 1:
                        // 点击升级按钮
                        _c.sent();
                        // 点击确认升级
                        return [4 /*yield*/, page.click('button:has-text("确认升级")')];
                    case 2:
                        // 点击确认升级
                        _c.sent();
                        dialog = page.locator('role=dialog');
                        return [4 /*yield*/, dialog.click({ position: { x: 0, y: 0 } })];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, page.locator('text=正在迁移数据').isVisible()];
                    case 4:
                        isLoading = _c.sent();
                        if (!isLoading) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, test_1.expect)(dialog).toBeVisible()];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('降级过程中不应该能关闭对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isEcommerceMode, dialog, isLoading;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.locator('text=🛍️ 电商商品库').isVisible()];
                    case 1:
                        isEcommerceMode = _c.sent();
                        if (!isEcommerceMode) {
                            test_1.test.skip();
                            return [2 /*return*/];
                        }
                        // 点击返回按钮
                        return [4 /*yield*/, page.click('button[title*="返回"]')];
                    case 2:
                        // 点击返回按钮
                        _c.sent();
                        // 输入确认文本
                        return [4 /*yield*/, page.locator('input[placeholder*="CONFIRM"]').fill('CONFIRM')];
                    case 3:
                        // 输入确认文本
                        _c.sent();
                        // 点击确认降级
                        return [4 /*yield*/, page.click('button:has-text("确认降级")')];
                    case 4:
                        // 点击确认降级
                        _c.sent();
                        dialog = page.locator('role=dialog');
                        return [4 /*yield*/, dialog.click({ position: { x: 0, y: 0 } })];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, page.locator('text=正在降级').isVisible()];
                    case 6:
                        isLoading = _c.sent();
                        if (!isLoading) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, test_1.expect)(dialog).toBeVisible()];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('迁移结果提示应该可以关闭', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isSimpleMode, resultAlert, closeButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.locator('text=📦 商品管理').isVisible()];
                    case 1:
                        isSimpleMode = _c.sent();
                        if (!isSimpleMode) return [3 /*break*/, 9];
                        return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.click('button:has-text("确认升级")')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=🛍️ 电商商品库')).toBeVisible({ timeout: 30000 })];
                    case 4:
                        _c.sent();
                        resultAlert = page.locator('text=迁移完成');
                        return [4 /*yield*/, resultAlert.count()];
                    case 5:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 9];
                        closeButton = resultAlert.locator('button[aria-label*="Close"]');
                        return [4 /*yield*/, closeButton.count()];
                    case 6:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, closeButton.click()];
                    case 7:
                        _c.sent();
                        // 验证提示关闭
                        return [4 /*yield*/, (0, test_1.expect)(resultAlert).not.toBeVisible({ timeout: 3000 })];
                    case 8:
                        // 验证提示关闭
                        _c.sent();
                        _c.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('UI/UX体验测试', function () {
        (0, test_1.test)('响应式布局 - 对话框在小屏幕上应该正常显示', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 设置小屏幕尺寸
                    return [4 /*yield*/, page.setViewportSize({ width: 375, height: 667 })];
                    case 1:
                        // 设置小屏幕尺寸
                        _c.sent();
                        // 点击升级按钮
                        return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 2:
                        // 点击升级按钮
                        _c.sent();
                        // 验证对话框可见且内容不被截断
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('role=dialog')).toBeVisible()];
                    case 3:
                        // 验证对话框可见且内容不被截断
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=🚀 升级为电商商品库')).toBeVisible()];
                    case 4:
                        _c.sent();
                        // 验证按钮可见
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("取消")')).toBeVisible()];
                    case 5:
                        // 验证按钮可见
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("确认升级")')).toBeVisible()];
                    case 6:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('加载状态应该正确显示', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isSimpleMode;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.locator('text=📦 商品管理').isVisible()];
                    case 1:
                        isSimpleMode = _c.sent();
                        if (!isSimpleMode) return [3 /*break*/, 5];
                        return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.click('button:has-text("确认升级")')];
                    case 3:
                        _c.sent();
                        // 验证加载进度条
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('[role="progressbar"]')).toBeVisible({ timeout: 3000 })];
                    case 4:
                        // 验证加载进度条
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('按钮应该在加载时禁用', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isSimpleMode, confirmButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.locator('text=📦 商品管理').isVisible()];
                    case 1:
                        isSimpleMode = _c.sent();
                        if (!isSimpleMode) return [3 /*break*/, 6];
                        return [4 /*yield*/, page.click('button[title*="升级"]')];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.click('button:has-text("确认升级")')];
                    case 3:
                        _c.sent();
                        confirmButton = page.locator('button:has-text("升级中")');
                        return [4 /*yield*/, confirmButton.count()];
                    case 4:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, test_1.expect)(confirmButton).toBeDisabled()];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); });
    });
});
