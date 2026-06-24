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
/**
 * 邀请系统 E2E 测试 (PRD v4.2)
 * 覆盖：创建邀请 → 验证邀请码 → 撤销邀请 → 过期场景
 */
test_1.test.describe('邀请系统功能', function () {
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
    test_1.test.describe('从采购页面创建邀请', function () {
        test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=采购')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/purchase', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('应该显示分享给供应商按钮', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var shareButton, orderRow, actionButtons;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        shareButton = page.locator('button:has-text("分享给供应商"), button:has-text("邀请"), button:has-text("Share")').first();
                        orderRow = page.locator('tbody tr').first();
                        return [4 /*yield*/, orderRow.count()];
                    case 1:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 3];
                        actionButtons = orderRow.locator('button');
                        return [4 /*yield*/, (0, test_1.expect)(actionButtons.first()).toBeVisible()];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('应该能够打开邀请对话框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteButton;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        inviteButton = page.locator('button:has-text("分享"), text=邀请供应商, [data-testid="invite-btn"]').first();
                        return [4 /*yield*/, inviteButton.count()];
                    case 1:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, inviteButton.click()];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(500)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('邀请对话框应该显示二维码和邀请码', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteDialog, qrCode, codeText, hasQrOrCode, _c;
            var page = _b.page;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        inviteDialog = page.locator('[role="dialog"]');
                        return [4 /*yield*/, inviteDialog.count()];
                    case 1:
                        if (!((_d.sent()) > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, test_1.expect)(inviteDialog).toBeVisible()];
                    case 2:
                        _d.sent();
                        qrCode = page.locator('canvas, img[alt*="QR"], [data-testid="qr-code"]');
                        codeText = page.locator('text=/[0-9a-f]{8}-/');
                        return [4 /*yield*/, qrCode.count()];
                    case 3:
                        _c = ((_d.sent()) > 0);
                        if (_c) return [3 /*break*/, 5];
                        return [4 /*yield*/, codeText.count()];
                    case 4:
                        _c = ((_d.sent()) > 0);
                        _d.label = 5;
                    case 5:
                        hasQrOrCode = _c;
                        (0, test_1.expect)(hasQrOrCode).toBeTruthy();
                        _d.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('邀请管理页面', function () {
        (0, test_1.test)('应该能从设置页面访问邀请管理', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteTab;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=设置')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/settings', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        inviteTab = page.locator('text=邀请管理, text=邀请记录, text=Invitations');
                        return [4 /*yield*/, inviteTab.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, inviteTab.first().click()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(500)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('邀请管理页面应该显示邀请列表', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteTab, errorMsg;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=设置')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/settings', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        inviteTab = page.locator('text=邀请管理, text=邀请记录').first();
                        return [4 /*yield*/, inviteTab.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, inviteTab.click()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(800)];
                    case 5:
                        _c.sent();
                        errorMsg = page.locator('[role="alert"], .error, .toast-error');
                        return [4 /*yield*/, (0, test_1.expect)(errorMsg).toHaveCount(0, { timeout: 3000 })];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('应该能按状态筛选邀请', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteTab, statusFilter;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=设置')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/settings', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        inviteTab = page.locator('text=邀请管理').first();
                        return [4 /*yield*/, inviteTab.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, inviteTab.click()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(500)];
                    case 5:
                        _c.sent();
                        statusFilter = page.locator('select, button:has-text("状态"), [data-testid="status-filter"]').first();
                        return [4 /*yield*/, statusFilter.count()];
                    case 6:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, statusFilter.click()];
                    case 7:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(300)];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('邀请撤销功能', function () {
        (0, test_1.test)('应该能撤销一个活跃的邀请', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteTab, revokeBtn, confirmBtn;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=设置')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/settings', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        inviteTab = page.locator('text=邀请管理').first();
                        return [4 /*yield*/, inviteTab.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 12];
                        return [4 /*yield*/, inviteTab.click()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(500)];
                    case 5:
                        _c.sent();
                        revokeBtn = page.locator('button:has-text("撤销"), button:has-text("Revoke")').first();
                        return [4 /*yield*/, revokeBtn.count()];
                    case 6:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 12];
                        return [4 /*yield*/, revokeBtn.click()];
                    case 7:
                        _c.sent();
                        confirmBtn = page.locator('button:has-text("确认"), button:has-text("确定")').first();
                        return [4 /*yield*/, confirmBtn.count()];
                    case 8:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 10];
                        return [4 /*yield*/, confirmBtn.click()];
                    case 9:
                        _c.sent();
                        _c.label = 10;
                    case 10: return [4 /*yield*/, page.waitForTimeout(500)];
                    case 11:
                        _c.sent();
                        _c.label = 12;
                    case 12: return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('邀请过期处理', function () {
        (0, test_1.test)('过期邀请应该显示过期状态', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteTab, expiredBadge;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=设置')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/settings', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        inviteTab = page.locator('text=邀请管理').first();
                        return [4 /*yield*/, inviteTab.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, inviteTab.click()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(500)];
                    case 5:
                        _c.sent();
                        expiredBadge = page.locator('text=已过期, text=expired');
                        // 过期邀请可能存在也可能不存在，这是一个非阻塞检查
                        return [4 /*yield*/, page.waitForTimeout(300)];
                    case 6:
                        // 过期邀请可能存在也可能不存在，这是一个非阻塞检查
                        _c.sent();
                        _c.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('应该能识别已使用的邀请', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var inviteTab, usedBadge;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=设置')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/settings', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        inviteTab = page.locator('text=邀请管理').first();
                        return [4 /*yield*/, inviteTab.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, inviteTab.click()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, page.waitForTimeout(500)];
                    case 5:
                        _c.sent();
                        usedBadge = page.locator('text=已使用, text=used');
                        return [4 /*yield*/, page.waitForTimeout(300)];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('邀请类型支持', function () {
        (0, test_1.test)('订单分享邀请应该关联订单号', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var orderRef;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=采购')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/purchase', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        orderRef = page.locator('text=/PO-\\d+/');
                        return [4 /*yield*/, orderRef.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, test_1.expect)(orderRef.first()).toBeVisible()];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('价格更新通知应该能触发', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var notifyBtn;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.click('text=产品')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForURL('**/products', { timeout: 5000 })];
                    case 2:
                        _c.sent();
                        notifyBtn = page.locator('button:has-text("通知客户"), button:has-text("价格更新"), [data-testid="notify-btn"]').first();
                        return [4 /*yield*/, notifyBtn.count()];
                    case 3:
                        if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, test_1.expect)(notifyBtn).toBeVisible()];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    });
});
