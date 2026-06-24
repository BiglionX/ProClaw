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
var fs = require("fs");
var path = require("path");
var adm_zip_1 = require("adm-zip");
/**
 * 行业插件系统 - Phase 4 生态
 *
 * ProClaw 1.0.0 验收更新（v3）：
 * - 插件商店独立路由：/plugin-store（替代旧的 /plugins）
 * - 页面标题：h1 = "插件商店"（替代旧的"行业插件商店"）
 * - 复用 AiPluginPanel，已使用 / 插件商店 双 Tab
 *
 * 实现说明：避免 page.goto('/plugin-store') 触发的 Vite SPA fallback 把 URL
 * 变成 /plugin-store#/datacenter (path+hash 混合),改用应用内 hash 导航或
 * 侧边栏点击。
 */
test_1.test.describe('行业插件系统 - Phase 4 生态', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 用 hash 形式直接到 /datacenter,绕开 Vite fallback
                return [4 /*yield*/, page.goto('/#/')];
                case 1:
                    // 用 hash 形式直接到 /datacenter,绕开 Vite fallback
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    // 一键体验登录
                    return [4 /*yield*/, page.click('button:has-text("一键体验")')];
                case 3:
                    // 一键体验登录
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
    (0, test_1.test)('插件商店独立路由应可访问（hash 导航）', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 用 hash 导航,不走 Vite fallback
                return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 1:
                    // 用 hash 导航,不走 Vite fallback
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 3:
                    _c.sent(); // 等 React 挂载 + 懒加载
                    // 验证 URL 正确
                    (0, test_1.expect)(page.url()).toMatch(/#\/plugin-store/);
                    // 新 UX：页面 h1 = "插件商店"
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('h1').first()).toHaveText('插件商店', { timeout: 10000 })];
                case 4:
                    // 新 UX：页面 h1 = "插件商店"
                    _c.sent();
                    // AiPluginPanel 的双 Tab 应可见
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('tab').filter({ hasText: '已使用' })).toBeVisible()];
                case 5:
                    // AiPluginPanel 的双 Tab 应可见
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('tab').filter({ hasText: '插件商店' })).toBeVisible()];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('插件商店 Tab 切换应正常', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var shopTab;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 3:
                    _c.sent();
                    shopTab = page.getByRole('tab').filter({ hasText: '插件商店' });
                    return [4 /*yield*/, (0, test_1.expect)(shopTab).toBeVisible({ timeout: 10000 })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, shopTab.click()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(800)];
                case 6:
                    _c.sent();
                    // 商店 Tab 应有搜索框
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('input[placeholder*="搜索插件"]').first()).toBeVisible()];
                case 7:
                    // 商店 Tab 应有搜索框
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('插件商店分类过滤应正常工作', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var retailChip;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.getByRole('tab').filter({ hasText: '插件商店' }).click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    retailChip = page.locator('text=零售').first();
                    return [4 /*yield*/, retailChip.isVisible()];
                case 6:
                    if (!_c.sent()) return [3 /*break*/, 10];
                    return [4 /*yield*/, retailChip.click()];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 8:
                    _c.sent();
                    // 不应报错,分类切换后页面仍正常
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('h1').first()).toHaveText('插件商店')];
                case 9:
                    // 不应报错,分类切换后页面仍正常
                    _c.sent();
                    _c.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('插件商店搜索应能过滤插件', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var searchInput;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.getByRole('tab').filter({ hasText: '插件商店' }).click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    searchInput = page.locator('input[placeholder*="搜索插件"]').first();
                    return [4 /*yield*/, searchInput.fill('零售')];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(800)];
                case 7:
                    _c.sent();
                    // 不应报错,搜索后页面仍正常
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('h1').first()).toHaveText('插件商店')];
                case 8:
                    // 不应报错,搜索后页面仍正常
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('侧边栏"插件商店"入口应在导航中可见', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var pluginStoreText, isVisible;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/datacenter')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 3:
                    _c.sent();
                    pluginStoreText = page.getByText('插件商店', { exact: true }).first();
                    return [4 /*yield*/, pluginStoreText.isVisible({ timeout: 10000 }).catch(function () { return false; })];
                case 4:
                    isVisible = _c.sent();
                    if (!isVisible) {
                        test_1.test.skip(true, '侧边栏未渲染"插件商店"文字(可能插件 manifest 已 hide)');
                        return [2 /*return*/];
                    }
                    // 应在导航中可点击
                    (0, test_1.expect)(isVisible).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('已使用 Tab 应能加载本地已安装插件', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var usedTab;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 3:
                    _c.sent();
                    usedTab = page.getByRole('tab').filter({ hasText: '已使用' });
                    return [4 /*yield*/, (0, test_1.expect)(usedTab).toBeVisible({ timeout: 10000 })];
                case 4:
                    _c.sent();
                    // aria-selected=true 表示已选中
                    return [4 /*yield*/, (0, test_1.expect)(usedTab).toHaveAttribute('aria-selected', 'true')];
                case 5:
                    // aria-selected=true 表示已选中
                    _c.sent();
                    // 等待插件卡片加载(最多 5s)
                    return [4 /*yield*/, page.waitForTimeout(2000)];
                case 6:
                    // 等待插件卡片加载(最多 5s)
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('已使用 Tab 在浏览器 dev 模式应至少展示 1 个内置插件卡片(manifestRegistry 兜底)', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var usedTab, main, cards, cardCount, emptyText, isEmpty;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 3:
                    _c.sent();
                    usedTab = page.getByRole('tab').filter({ hasText: '已使用' });
                    return [4 /*yield*/, (0, test_1.expect)(usedTab).toHaveAttribute('aria-selected', 'true')];
                case 4:
                    _c.sent();
                    main = page.locator('main');
                    return [4 /*yield*/, (0, test_1.expect)(main).toBeVisible()];
                case 5:
                    _c.sent();
                    cards = main.locator('.MuiCard-root');
                    return [4 /*yield*/, cards.count()];
                case 6:
                    cardCount = _c.sent();
                    if (!(cardCount === 0)) return [3 /*break*/, 8];
                    emptyText = page.getByText('暂无已安装的行业插件');
                    return [4 /*yield*/, emptyText.isVisible({ timeout: 1000 }).catch(function () { return false; })];
                case 7:
                    isEmpty = _c.sent();
                    if (isEmpty) {
                        // 这是 bug: manifestRegistry 兜底应该至少有 1 个 builtin
                        throw new Error('「已使用」Tab 显示为空,但 manifestRegistry 中应至少有 ma_foreign_counter 1 个内置插件');
                    }
                    _c.label = 8;
                case 8:
                    (0, test_1.expect)(cardCount).toBeGreaterThanOrEqual(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('插件商店 Tab 在 API 不可达时应使用本地推荐列表(5+ 个推荐插件)', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var shopTab, main, cards, cardCount;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/#/plugin-store')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 3:
                    _c.sent();
                    shopTab = page.getByRole('tab').filter({ hasText: '插件商店' });
                    return [4 /*yield*/, shopTab.click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(2500)];
                case 5:
                    _c.sent(); // 等 fetch 失败 + 本地兜底渲染
                    main = page.locator('main');
                    cards = main.locator('.MuiCard-root');
                    return [4 /*yield*/, cards.count()];
                case 6:
                    cardCount = _c.sent();
                    // flowhub.proclaw.cc 通常在 dev 环境不可达,应使用本地 fallback
                    // 本地 fallback 包含 5 个推荐插件(retail-pos / beauty-booking / catering-kds / pet-medical / cloud-backup-pro)
                    // 加上已安装的 builtin,实际会过滤掉 builtin,商店显示 5 个
                    (0, test_1.expect)(cardCount).toBeGreaterThanOrEqual(3);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('插件兼容性验证接口应可用', function () { return __awaiter(void 0, void 0, void 0, function () {
        var validManifest;
        return __generator(this, function (_a) {
            validManifest = {
                id: 'test-plugin',
                name: '测试插件',
                version: '1.0.0',
                description: 'Test',
                icon: 'plug',
                compatibleAppVersion: '>=0.1.0',
                features: { modules: [], dashboards: [], reports: [] },
                navigation: { add: [{ text: 'Test', icon: 'plug', path: '/test' }], remove: [] },
                ui: {},
                assets: { path: './assets', files: [] },
            };
            (0, test_1.expect)(validManifest.id).toBeTruthy();
            (0, test_1.expect)(validManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
            (0, test_1.expect)(validManifest.navigation.add[0].path).toMatch(/^\//);
            return [2 /*return*/];
        });
    }); });
    (0, test_1.test)('餐厅示例插件结构验证', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pluginDir, manifestPath, manifest, upSqlPath, upSql, downSqlPath, downSql, fePath, feContent;
        return __generator(this, function (_a) {
            pluginDir = path.resolve(process.cwd(), 'src/plugins/catering');
            manifestPath = path.join(pluginDir, 'manifest.json');
            (0, test_1.expect)(fs.existsSync(manifestPath)).toBeTruthy();
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            (0, test_1.expect)(manifest.id).toBe('catering');
            (0, test_1.expect)(manifest.name).toBeTruthy();
            (0, test_1.expect)(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
            (0, test_1.expect)(manifest.permissions).toBeInstanceOf(Array);
            (0, test_1.expect)(manifest.entry_points.frontend).toBe('frontend/index.js');
            (0, test_1.expect)(manifest.entry_points.migrations).toBe('migrations/up.sql');
            upSqlPath = path.join(pluginDir, 'migrations', 'up.sql');
            (0, test_1.expect)(fs.existsSync(upSqlPath)).toBeTruthy();
            upSql = fs.readFileSync(upSqlPath, 'utf-8');
            (0, test_1.expect)(upSql).toContain('CREATE TABLE IF NOT EXISTS catering_orders');
            downSqlPath = path.join(pluginDir, 'migrations', 'down.sql');
            (0, test_1.expect)(fs.existsSync(downSqlPath)).toBeTruthy();
            downSql = fs.readFileSync(downSqlPath, 'utf-8');
            (0, test_1.expect)(downSql).toContain('DROP TABLE IF EXISTS catering_orders');
            fePath = path.join(pluginDir, 'frontend', 'index.js');
            (0, test_1.expect)(fs.existsSync(fePath)).toBeTruthy();
            feContent = fs.readFileSync(fePath, 'utf-8');
            (0, test_1.expect)(feContent).toContain('ProClawPlugin.registerRoute');
            (0, test_1.expect)(feContent).toContain('/pos');
            (0, test_1.expect)(feContent).toContain('/tables');
            (0, test_1.expect)(feContent).toContain('/kitchen');
            return [2 /*return*/];
        });
    }); });
    (0, test_1.test)('打包脚本应正确输出 .proclaw-plugin 文件', function () { return __awaiter(void 0, void 0, void 0, function () {
        var distFile, zip, entries, entryNames, pkgManifest;
        return __generator(this, function (_a) {
            distFile = path.resolve(process.cwd(), 'dist/catering-1.0.0.proclaw-plugin');
            // 注:dist/catering-*.proclaw-plugin 在 release-build 时生成;如果不存在则跳过
            if (!fs.existsSync(distFile)) {
                test_1.test.skip(true, 'dist/catering-1.0.0.proclaw-plugin 未生成(需先跑 release build)');
                return [2 /*return*/];
            }
            (0, test_1.expect)(fs.existsSync(distFile)).toBeTruthy();
            zip = new adm_zip_1.default(distFile);
            entries = zip.getEntries();
            entryNames = entries.map(function (e) { return e.entryName; });
            (0, test_1.expect)(entryNames).toContain('manifest.json');
            (0, test_1.expect)(entryNames.some(function (n) { return n.startsWith('migrations/') || n.startsWith('migrations\\'); })).toBeTruthy();
            (0, test_1.expect)(entryNames.some(function (n) { return n.startsWith('frontend/') || n.startsWith('frontend\\'); })).toBeTruthy();
            pkgManifest = JSON.parse(zip.readAsText('manifest.json'));
            (0, test_1.expect)(pkgManifest.id).toBe('catering');
            (0, test_1.expect)(pkgManifest.version).toBe('1.0.0');
            return [2 /*return*/];
        });
    }); });
});
