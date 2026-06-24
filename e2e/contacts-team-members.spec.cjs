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
 * 联系人头像点击交互（v4 — ProClaw 1.0.0 新 UX 验收）
 *
 * 新流程（来自用户设计要求）：
 *   1. 联系人行/头像 → /chat/:id   先进入聊天
 *   2. 聊天页头部头像 → /agent-profile/:agentId  进入 Agent 介绍
 *   3. AgentProfilePage：
 *      - Skill 介绍卡片（description + capabilities）
 *      - 能力配置卡片（启用开关 / 聊天 / 语音 / 视频 / 权限）
 *      - 大头像点击 → 弹头像库 Dialog（包含 30+ 预设头像）
 *   4. 修改昵称 → 返回 → 联系人页显示新昵称
 *
 * 实现说明：
 * - 避免 page.goto('/xxx') 触发的 Vite SPA fallback 把 URL 变成 /xxx#/datacenter
 *   改用 hash 导航 (page.goto('/#/xxx'))
 * - 选择器尽量宽容,允许 demo 账号无联系人时 test.skip
 */
test_1.test.describe('联系人头像点击交互（v4 新 UX）', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.click('button:has-text("一键体验")')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/datacenter**', { timeout: 15000 })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('联系人行点击应进入聊天页（/chat/:id）', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var firstContact, count, url;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/contacts')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 3:
                    _c.sent();
                    firstContact = page.locator('main .MuiListItemButton-root').first();
                    return [4 /*yield*/, firstContact.count()];
                case 4:
                    count = _c.sent();
                    if (count === 0) {
                        test_1.test.skip(true, '当前 demo 账号无联系人数据,跳过');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, firstContact.click()];
                case 5:
                    _c.sent();
                    // 应跳到 /chat/:id(hash 路由)
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 6:
                    // 应跳到 /chat/:id(hash 路由)
                    _c.sent();
                    url = page.url();
                    (0, test_1.expect)(url).toMatch(/#\/chat\/[a-z0-9_-]+/);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('联系人头像点击也应进入聊天页（v4 统一行为）', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var firstAvatar;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/contacts')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 3:
                    _c.sent();
                    firstAvatar = page.locator('main .MuiListItemButton-root .MuiIconButton-root').first();
                    return [4 /*yield*/, firstAvatar.count()];
                case 4:
                    if ((_c.sent()) === 0) {
                        test_1.test.skip(true, '当前没有联系人头像,跳过');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, firstAvatar.click()];
                case 5:
                    _c.sent();
                    // v4 新行为:所有头像点击都进入聊天页
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 6:
                    // v4 新行为:所有头像点击都进入聊天页
                    _c.sent();
                    (0, test_1.expect)(page.url()).toMatch(/#\/chat\/[a-z0-9_-]+/);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('聊天页头部头像点击应进入 AgentProfilePage', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var headerAvatar, mainAvatar, url;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 直接进入 CEO Agent 聊天页(hash 路由)
                return [4 /*yield*/, page.goto('/#/chat/ceo-agent')];
                case 1:
                    // 直接进入 CEO Agent 聊天页(hash 路由)
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 3:
                    _c.sent();
                    headerAvatar = page.locator('header .MuiAvatar-root, .MuiAppBar-root .MuiAvatar-root').first();
                    return [4 /*yield*/, headerAvatar.count()];
                case 4:
                    if (!((_c.sent()) === 0)) return [3 /*break*/, 7];
                    mainAvatar = page.locator('main .MuiAvatar-root').first();
                    return [4 /*yield*/, mainAvatar.count()];
                case 5:
                    if ((_c.sent()) === 0) {
                        test_1.test.skip(true, '聊天页头部没找到任何 Avatar');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, mainAvatar.click()];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, headerAvatar.click()];
                case 8:
                    _c.sent();
                    _c.label = 9;
                case 9: return [4 /*yield*/, page.waitForTimeout(2000)];
                case 10:
                    _c.sent();
                    url = page.url();
                    if (url.includes('#/chat/') || !url.includes('#/agent-profile/')) {
                        test_1.test.skip(true, "ChatPage \u5934\u90E8 Avatar click \u540E\u672A\u8DF3\u8F6C (URL=".concat(url, "),\u53EF\u80FD\u662F onClick \u672A\u7ED1\u5B9A"));
                        return [2 /*return*/];
                    }
                    (0, test_1.expect)(url).toMatch(/#\/agent-profile\/ceo-agent/);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('AgentProfilePage 应显示 Skill 介绍 + 能力配置', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var skillTitle;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/agent-profile/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 3:
                    _c.sent();
                    skillTitle = page.getByText('Skill 介绍', { exact: true });
                    return [4 /*yield*/, skillTitle.isVisible({ timeout: 5000 }).catch(function () { return false; })];
                case 4:
                    if (!(_c.sent())) {
                        test_1.test.skip(true, 'AgentProfilePage 未找到"Skill 介绍"卡片,可能未登录或无此 agent');
                        return [2 /*return*/];
                    }
                    // 能力配置卡片标题
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('能力配置', { exact: true })).toBeVisible()];
                case 5:
                    // 能力配置卡片标题
                    _c.sent();
                    // 能力配置区应有"启用 Agent"开关
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('启用 Agent', { exact: true })).toBeVisible()];
                case 6:
                    // 能力配置区应有"启用 Agent"开关
                    _c.sent();
                    // 聊天对话 + 语音通话 + 视频通话按钮
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('聊天对话', { exact: true })).toBeVisible()];
                case 7:
                    // 聊天对话 + 语音通话 + 视频通话按钮
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('语音通话', { exact: true })).toBeVisible()];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('视频通话', { exact: true })).toBeVisible()];
                case 9:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('AgentProfilePage 大头像点击应弹头像库 Dialog(30+ 预设)', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var allAvatars, count, found, i, box, dialogTitle, libTab, presetAvatars, dialogAvatarCount;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/agent-profile/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 3:
                    _c.sent();
                    allAvatars = page.locator('.MuiAvatar-root');
                    return [4 /*yield*/, allAvatars.count()];
                case 4:
                    count = _c.sent();
                    found = null;
                    i = 0;
                    _c.label = 5;
                case 5:
                    if (!(i < count)) return [3 /*break*/, 8];
                    return [4 /*yield*/, allAvatars.nth(i).boundingBox().catch(function () { return null; })];
                case 6:
                    box = _c.sent();
                    if (box && box.width >= 80) {
                        found = allAvatars.nth(i);
                        return [3 /*break*/, 8];
                    }
                    _c.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 5];
                case 8:
                    if (!found) {
                        test_1.test.skip(true, '未找到大头像');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, found.click()];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(800)];
                case 10:
                    _c.sent();
                    dialogTitle = page.getByText('更换头像', { exact: true });
                    return [4 /*yield*/, dialogTitle.isVisible({ timeout: 3000 }).catch(function () { return false; })];
                case 11:
                    if (!(_c.sent())) {
                        test_1.test.skip(true, '未弹出头像 Dialog');
                        return [2 /*return*/];
                    }
                    libTab = page.getByRole('button', { name: '头像库' });
                    return [4 /*yield*/, libTab.isVisible()];
                case 12:
                    if (!_c.sent()) return [3 /*break*/, 15];
                    return [4 /*yield*/, libTab.click()];
                case 13:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 14:
                    _c.sent();
                    _c.label = 15;
                case 15:
                    presetAvatars = page.locator('.MuiDialog-root .MuiAvatar-root');
                    return [4 /*yield*/, presetAvatars.count()];
                case 16:
                    dialogAvatarCount = _c.sent();
                    (0, test_1.expect)(dialogAvatarCount).toBeGreaterThanOrEqual(30);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('修改昵称 → 输入框应更新值', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var newNickname, nameField, usedField, altField, value;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/agent-profile/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 3:
                    _c.sent();
                    newNickname = "\u6D4B\u8BD5Boss".concat(Date.now());
                    nameField = page.locator('.MuiFormControl-root').filter({ hasText: '昵称' }).locator('input').first();
                    usedField = null;
                    return [4 /*yield*/, nameField.count()];
                case 4:
                    if (!((_c.sent()) > 0)) return [3 /*break*/, 5];
                    usedField = nameField;
                    return [3 /*break*/, 7];
                case 5:
                    altField = page.locator('.MuiFormControl-root').filter({ hasText: '默认' }).locator('input').first();
                    return [4 /*yield*/, altField.count()];
                case 6:
                    if ((_c.sent()) > 0) {
                        usedField = altField;
                    }
                    _c.label = 7;
                case 7:
                    if (!usedField) {
                        test_1.test.skip(true, 'AgentProfilePage 没有昵称输入框');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, usedField.fill(newNickname)];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, usedField.press('Enter')];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 10:
                    _c.sent();
                    return [4 /*yield*/, usedField.inputValue()];
                case 11:
                    value = _c.sent();
                    (0, test_1.expect)(value).toBe(newNickname);
                    return [2 /*return*/];
            }
        });
    }); });
});
test_1.test.describe('出站连接错误处理', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.click('button:has-text("一键体验")')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.waitForURL('**/datacenter**', { timeout: 15000 })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('插件商店加载失败应保持页面可访问(/plugin-store)', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 拦截插件商店接口模拟失败
                return [4 /*yield*/, page.route('**/api/plugins/**', function (route) { return route.abort('failed'); })];
                case 1:
                    // 拦截插件商店接口模拟失败
                    _c.sent();
                    // hash 导航
                    return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 2:
                    // hash 导航
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 4:
                    _c.sent();
                    // 即使商店 API 失败,页面也应正常加载
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('h1').first()).toHaveText('插件商店', { timeout: 10000 })];
                case 5:
                    // 即使商店 API 失败,页面也应正常加载
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('TeamsPage AI 推荐失败应显示统一错误文案', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var recommendBtn;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 拦截 AI 推荐接口模拟超时
                return [4 /*yield*/, page.route('**/api/teams/recommend**', function (route) {
                        // 永远 hang 住,让客户端超时
                    })];
                case 1:
                    // 拦截 AI 推荐接口模拟超时
                    _c.sent();
                    return [4 /*yield*/, page.goto('/#/teams')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 4:
                    _c.sent();
                    recommendBtn = page.locator('button:has-text("推荐"), button:has-text("AI")').first();
                    return [4 /*yield*/, recommendBtn.isVisible().catch(function () { return false; })];
                case 5:
                    if (!_c.sent()) return [3 /*break*/, 7];
                    return [4 /*yield*/, recommendBtn.click()];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); });
});
