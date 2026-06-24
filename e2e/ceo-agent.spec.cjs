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
/**
 * CEO Agent 主控官端到端测试 (PRD v6.2)
 * 测试流程: Boss 下达指令 -> CEO Agent 响应 -> 界面元素展示
 */
var test_1 = require("@playwright/test");
test_1.test.describe('CEO Agent 主控官功能 (PRD v6.2)', function () {
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
    (0, test_1.test)('CEO Agent 聊天页面应显示主控官标识和上下文指示器', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 从消息列表导航到 CEO Agent 聊天
                return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    // 从消息列表导航到 CEO Agent 聊天
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    // 应显示 CEO Agent 名称
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=CEO Agent')).toBeVisible()];
                case 3:
                    // 应显示 CEO Agent 名称
                    _c.sent();
                    // 应显示"主控官"徽标
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=主控官')).toBeVisible()];
                case 4:
                    // 应显示"主控官"徽标
                    _c.sent();
                    // 应显示描述文字
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=虚拟公司主控官')).toBeVisible()];
                case 5:
                    // 应显示描述文字
                    _c.sent();
                    // 应显示项目仪表板按钮（AI 图标）
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[title="项目仪表板"]')).toBeVisible()];
                case 6:
                    // 应显示项目仪表板按钮（AI 图标）
                    _c.sent();
                    // 应显示上下文指示器（浅黄色背景的活跃项目目标条）
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=活跃项目目标').or(page.locator('text=暂无活跃项目目标'))).toBeVisible()];
                case 7:
                    // 应显示上下文指示器（浅黄色背景的活跃项目目标条）
                    _c.sent();
                    // 应显示 CEO 快捷命令建议
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=/task list')).toBeVisible()];
                case 8:
                    // 应显示 CEO 快捷命令建议
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=/context show')).toBeVisible()];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=/report daily')).toBeVisible()];
                case 10:
                    _c.sent();
                    // 输入框应有 CEO 专属 placeholder
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('input[placeholder="向 CEO Agent 下达指令..."]').or(page.locator('textarea[placeholder="向 CEO Agent 下达指令..."]'))).toBeVisible()];
                case 11:
                    // 输入框应有 CEO 专属 placeholder
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('CEO Agent 主页应显示在最近联系人中', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 在消息列表页面应显示 CEO Agent
                return [4 /*yield*/, page.goto('/messages')];
                case 1:
                    // 在消息列表页面应显示 CEO Agent
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    // 应显示 CEO Agent 联系人
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=CEO Agent')).toBeVisible()];
                case 3:
                    // 应显示 CEO Agent 联系人
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('上下文指示器应可点击展开查看详细 PCP 条目', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var contextBar;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    contextBar = page.locator('text=活跃项目目标').or(page.locator('text=暂无活跃项目目标'));
                    return [4 /*yield*/, contextBar.isVisible()];
                case 3:
                    if (!_c.sent()) return [3 /*break*/, 7];
                    return [4 /*yield*/, contextBar.click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    // 弹出框应显示"项目上下文"标题
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=项目上下文').or(page.locator('text=暂无活跃项目上下文条目'))).toBeVisible({ timeout: 3000 })];
                case 6:
                    // 弹出框应显示"项目上下文"标题
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('上下文指示器弹出框中应有跳转仪表板的链接', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var contextBar, dashboardLink;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    contextBar = page.locator('text=活跃项目目标').or(page.locator('text=暂无活跃项目目标'));
                    return [4 /*yield*/, contextBar.isVisible()];
                case 3:
                    if (!_c.sent()) return [3 /*break*/, 7];
                    return [4 /*yield*/, contextBar.click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    dashboardLink = page.locator('text=查看完整仪表板');
                    return [4 /*yield*/, (0, test_1.expect)(dashboardLink).toBeVisible({ timeout: 3000 })];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('发送消息后消息应显示在聊天列表中', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var input;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    input = page.locator('textarea, input[type="text"]').first();
                    return [4 /*yield*/, (0, test_1.expect)(input).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, input.fill('我们下个季度要主攻海外市场')];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, input.press('Enter')];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 6:
                    _c.sent();
                    // 消息应出现在聊天列表中
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=我们下个季度要主攻海外市场')).toBeVisible()];
                case 7:
                    // 消息应出现在聊天列表中
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('快捷命令点击应自动填充输入框', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var taskListChip, input, inputValue;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    taskListChip = page.locator('text=/task list').first();
                    return [4 /*yield*/, (0, test_1.expect)(taskListChip).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, taskListChip.click()];
                case 4:
                    _c.sent();
                    input = page.locator('textarea, input[type="text"]').first();
                    return [4 /*yield*/, input.inputValue()];
                case 5:
                    inputValue = _c.sent();
                    (0, test_1.expect)(inputValue).toContain('/task list');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('CEO Agent 应显示紫色主题', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var avatar, bgColor;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    avatar = page.locator('.MuiAvatar-root').first();
                    return [4 /*yield*/, avatar.evaluate(function (el) { return getComputedStyle(el).backgroundColor; })];
                case 3:
                    bgColor = _c.sent();
                    // 紫色背景对应 rgb(124, 77, 255) 或相近值
                    (0, test_1.expect)(bgColor).toContain('124');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('项目仪表板页面应能正常加载', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/project-overview')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    // 应显示"项目概览"标题
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=项目概览')).toBeVisible({ timeout: 3000 })];
                case 3:
                    // 应显示"项目概览"标题
                    _c.sent();
                    // 应显示统计卡片
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=活跃目标')).toBeVisible()];
                case 4:
                    // 应显示统计卡片
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=进行中')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=已完成').or(page.locator('text=暂无任务数据'))).toBeVisible()];
                case 6:
                    _c.sent();
                    // 应显示项目上下文区域
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=项目上下文').or(page.locator('text=暂无活跃的项目上下文条目'))).toBeVisible()];
                case 7:
                    // 应显示项目上下文区域
                    _c.sent();
                    // 应显示最近任务活动区域
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=最近任务活动').or(page.locator('text=暂无任务记录'))).toBeVisible()];
                case 8:
                    // 应显示最近任务活动区域
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('仪表板页面应能刷新数据', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var refreshBtn;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/project-overview')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    refreshBtn = page.locator('button[title="刷新数据"]');
                    return [4 /*yield*/, (0, test_1.expect)(refreshBtn).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    // 点击刷新按钮
                    return [4 /*yield*/, refreshBtn.click()];
                case 4:
                    // 点击刷新按钮
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
test_1.test.describe('CEO Agent 决策确认与个性化学习 (PRD v6.3)', function () {
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
    (0, test_1.test)('决策历史按钮应在 CEO 聊天头部显示', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    // 决策历史按钮
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[title="决策历史"]')).toBeVisible()];
                case 3:
                    // 决策历史按钮
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('点击决策历史按钮应显示侧边栏面板', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var historyBtn;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    historyBtn = page.locator('button[title="决策历史"]');
                    return [4 /*yield*/, (0, test_1.expect)(historyBtn).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, historyBtn.click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    // 侧边栏应显示"决策历史"标题
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=决策历史')).toBeVisible()];
                case 6:
                    // 侧边栏应显示"决策历史"标题
                    _c.sent();
                    // 应显示统计信息或"暂无决策记录"
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=总决策').or(page.locator('text=暂无决策记录'))).toBeVisible()];
                case 7:
                    // 应显示统计信息或"暂无决策记录"
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('公司时间轴切换应在项目仪表板显示', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var timelineChip;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/project-overview')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    timelineChip = page.locator('text=公司时间轴');
                    return [4 /*yield*/, (0, test_1.expect)(timelineChip).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    // 点击切换
                    return [4 /*yield*/, timelineChip.click()];
                case 4:
                    // 点击切换
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    // 时间轴视图应显示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=公司时间轴')).toBeVisible()];
                case 6:
                    // 时间轴视图应显示
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('设置页面应包含 CEO Agent 偏好标签', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var ceoTab;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/settings')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    ceoTab = page.locator('text=CEO Agent');
                    return [4 /*yield*/, (0, test_1.expect)(ceoTab).toBeVisible({ timeout: 3000 })];
                case 3:
                    _c.sent();
                    // 点击标签
                    return [4 /*yield*/, ceoTab.click()];
                case 4:
                    // 点击标签
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    // 应显示偏好设置内容
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=CEO Agent 偏好设置').or(page.locator('text=预算敏感度'))).toBeVisible()];
                case 6:
                    // 应显示偏好设置内容
                    _c.sent();
                    // 应显示配置包管理
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=公司发展配置包')).toBeVisible()];
                case 7:
                    // 应显示配置包管理
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('确认卡片应支持键盘快捷键 Y/N/E/S', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var confirmCard;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/chat/ceo-agent')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    confirmCard = page.locator('text=需要确认').first();
                    return [4 /*yield*/, confirmCard.isVisible({ timeout: 2000 }).catch(function () { return false; })];
                case 3:
                    if (!_c.sent()) return [3 /*break*/, 8];
                    // 应显示快捷键提示
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Y 确认')).toBeVisible()];
                case 4:
                    // 应显示快捷键提示
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=N 拒绝')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=E 编辑')).toBeVisible()];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=S 稍后提醒')).toBeVisible()];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    }); });
});
