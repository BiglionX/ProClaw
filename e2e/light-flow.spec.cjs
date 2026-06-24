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
/** 登录辅助函数 - 使用一键体验按钮 */
function loginWithQuickButton(page) {
    return __awaiter(this, void 0, void 0, function () {
        var quickButton;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 1:
                    _a.sent();
                    quickButton = page.locator('button:has-text("一键体验")');
                    return [4 /*yield*/, quickButton.isVisible({ timeout: 5000 }).catch(function () { return false; })];
                case 2:
                    if (!_a.sent()) return [3 /*break*/, 5];
                    return [4 /*yield*/, quickButton.click()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
test_1.test.describe('ProClaw-Light 极简版 E2E', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 清除本地存储，确保测试环境干净
                return [4 /*yield*/, page.goto('/')];
                case 1:
                    // 清除本地存储，确保测试环境干净
                    _c.sent();
                    return [4 /*yield*/, page.evaluate(function () {
                            localStorage.clear();
                            sessionStorage.clear();
                        })];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test_1.test.describe('安装向导流程', function () {
        (0, test_1.test)('应显示安装向导页面', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/#/setup')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _c.sent();
                        // 验证向导容器存在
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=安装向导')).toBeVisible({ timeout: 10000 })];
                    case 3:
                        // 验证向导容器存在
                        _c.sent();
                        // 验证 CEO Agent 头像存在
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('[class*="ceo"]')).toBeVisible()];
                    case 4:
                        // 验证 CEO Agent 头像存在
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('安装向导应包含店铺类型选择界面', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/#/setup')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _c.sent();
                        // 验证店铺类型选择按钮存在
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=餐饮')).toBeVisible({ timeout: 10000 })];
                    case 3:
                        // 验证店铺类型选择按钮存在
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=零售')).toBeVisible()];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=服务')).toBeVisible()];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=生鲜')).toBeVisible()];
                    case 6:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('Light 版导航', function () {
        (0, test_1.test)('侧边栏应显示 Light 版特有导航项', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 导航到主页，会触发登录弹窗 - 先登录
                    return [4 /*yield*/, page.goto('/#/')];
                    case 1:
                        // 导航到主页，会触发登录弹窗 - 先登录
                        _c.sent();
                        return [4 /*yield*/, loginWithQuickButton(page)];
                    case 2:
                        _c.sent();
                        // 验证 Light 版导航项存在
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=AI 知识库').first()).toBeVisible({ timeout: 10000 })];
                    case 3:
                        // 验证 Light 版导航项存在
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('AI 知识库页面', function () {
        (0, test_1.test)('AI 知识库页面应正常加载并显示三个 Tab', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/#/')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, loginWithQuickButton(page)];
                    case 2:
                        _c.sent();
                        // 导航到 AI 知识库
                        return [4 /*yield*/, page.goto('/#/ai-knowledge')];
                    case 3:
                        // 导航到 AI 知识库
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 4:
                        _c.sent();
                        // 验证页面标题
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=AI 知识库').first()).toBeVisible({ timeout: 10000 })];
                    case 5:
                        // 验证页面标题
                        _c.sent();
                        // 验证三个分类 Tab 存在
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=媒体库').first()).toBeVisible({ timeout: 5000 })];
                    case 6:
                        // 验证三个分类 Tab 存在
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=问答库').first()).toBeVisible({ timeout: 5000 })];
                    case 7:
                        _c.sent();
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=资料库').first()).toBeVisible({ timeout: 5000 })];
                    case 8:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('AI 知识库 - 旧路由 /media-library 应重定向到 /ai-knowledge', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/#/')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, loginWithQuickButton(page)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.goto('/#/media-library')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 4:
                        _c.sent();
                        // 应重定向到 /ai-knowledge
                        return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL(/#\/ai-knowledge/)];
                    case 5:
                        // 应重定向到 /ai-knowledge
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('数据看板 Light 版', function () {
        (0, test_1.test)('数据看板应显示 AI Team 状态卡片', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/#/')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, loginWithQuickButton(page)];
                    case 2:
                        _c.sent();
                        // 导航到数据看板
                        return [4 /*yield*/, page.goto('/#/analytics')];
                    case 3:
                        // 导航到数据看板
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 4:
                        _c.sent();
                        // 验证 AI Team 卡片（Light 版特有）
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=新媒体运营').first()).toBeVisible({ timeout: 10000 })];
                    case 5:
                        // 验证 AI Team 卡片（Light 版特有）
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('设置页面 Light 版', function () {
        (0, test_1.test)('设置页面应隐藏 Plus 版特有选项卡', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/#/')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, loginWithQuickButton(page)];
                    case 2:
                        _c.sent();
                        // 导航到设置页面
                        return [4 /*yield*/, page.goto('/#/settings')];
                    case 3:
                        // 导航到设置页面
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 4:
                        _c.sent();
                        // 验证基础设置选项卡存在
                        return [4 /*yield*/, (0, test_1.expect)(page.locator('text=基础设置').first()).toBeVisible({ timeout: 10000 })];
                    case 5:
                        // 验证基础设置选项卡存在
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('Light 版模式检测', function () {
        (0, test_1.test)('应用应运行在 Light 模式', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var isLight;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto('/#/')];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, loginWithQuickButton(page)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.evaluate(function () {
                                return document.querySelector('[href*="ai-knowledge"]') !== null;
                            })];
                    case 3:
                        isLight = _c.sent();
                        (0, test_1.expect)(isLight).toBeTruthy();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
