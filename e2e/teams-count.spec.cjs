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
 * AI Team 演示数据 - ProClaw 1.0.0 测试数据包
 *
 * 计划要求（plan ProClaw_1.0.0_测试用户数据包_task-d8c.md）:
 * 演示账号首次登录需预置 3 个 AI Team:
 *   - AI 经营团队
 *   - 国内社媒运营团队 / 国内社媒运营 Team
 *   - 海外社媒运营团队 / 海外社媒运营 Team
 *
 * 浏览器 dev 模式（Tauri 不可用）应通过 getMockBuiltinTeams() 展示 3 个 mock 团队。
 * Sidebar "AI 团队" badge 应动态同步为 3。
 */
test_1.test.describe('AI Team 演示数据 - ProClaw 1.0.0 测试数据包', function () {
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
                    // 一键体验登录(演示账号)
                    return [4 /*yield*/, page.click('button:has-text("一键体验")')];
                case 3:
                    // 一键体验登录(演示账号)
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
    (0, test_1.test)('TeamsPage 浏览器 dev 模式应展示 3 个 AI Team 卡片', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var aiTeamTab, main, aiTeamBadge;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/teams')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 3:
                    _c.sent();
                    aiTeamTab = page.getByRole('tab').filter({ hasText: 'AI Team' });
                    return [4 /*yield*/, (0, test_1.expect)(aiTeamTab).toBeVisible({ timeout: 10000 })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, aiTeamTab.click()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 6:
                    _c.sent();
                    main = page.locator('main');
                    return [4 /*yield*/, (0, test_1.expect)(main).toBeVisible()];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(main.getByText('AI 经营团队').first()).toBeVisible({ timeout: 10000 })];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(main.getByText('国内社媒运营 Team').first()).toBeVisible({ timeout: 10000 })];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(main.getByText('欧美社媒运营 Team').first()).toBeVisible({ timeout: 10000 })];
                case 10:
                    _c.sent();
                    aiTeamBadge = page.locator('.MuiChip-root').filter({ hasText: /^3$/ }).first();
                    return [4 /*yield*/, (0, test_1.expect)(aiTeamBadge).toBeVisible({ timeout: 5000 })];
                case 11:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('Sidebar AI 团队徽章应动态反映 TeamsPage 中的团队数量', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var aiTeamTab, teamCount;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/teams')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 3:
                    _c.sent();
                    aiTeamTab = page.getByRole('tab').filter({ hasText: 'AI Team' });
                    return [4 /*yield*/, aiTeamTab.click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.evaluate(function () {
                            var raw = localStorage.getItem('proclaw:teams:count');
                            return raw ? parseInt(raw, 10) : 0;
                        })];
                case 6:
                    teamCount = _c.sent();
                    (0, test_1.expect)(teamCount).toBe(3);
                    return [2 /*return*/];
            }
        });
    }); });
});
