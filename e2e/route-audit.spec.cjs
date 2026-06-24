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
var fs_1 = require("fs");
var SCREENSHOT_DIR = 'd:\\BigLionX\\ProClaw\\test-results\\route-test';
fs_1.default.mkdirSync(SCREENSHOT_DIR, { recursive: true });
// Routes grouped by category
var PUBLIC_ROUTES = ['/login', '/register', '/setup', '/setup-page', '/test'];
var REDIRECT_ROUTES = [
    { from: '/', expect: '/datacenter' },
    { from: '/dashboard', expect: '/datacenter' },
    { from: '/finance', expect: '/datacenter' },
    { from: '/purchase', expect: '/supplychain' },
    { from: '/media-library', expect: '/ai-knowledge' },
    { from: '/qa-library', expect: '/ai-knowledge' },
    { from: '/knowledge-base', expect: '/ai-knowledge' },
];
// /customers, /analytics, /ai-teams are NOT redirects, they are valid routes
var PROTECTED_ROUTES = [
    // Core
    '/datacenter', '/products', '/supplychain', '/settings', '/contacts',
    '/messages', '/call', '/ucenter', '/operations', '/shop/dashboard',
    '/customer-service', '/ai-knowledge', '/sales', '/inventory',
    // AI
    '/teams', '/agents', '/ai-demo', '/ai-sales-order', '/finance-agent', '/project-overview',
    // Aliases
    '/customers', '/analytics', '/ai-teams',
    // Chat/agent dynamic
    '/chat/mock-contact-1', '/agent-profile/mock-agent-1',
    // Industry plugins
    '/pos', '/tables', '/kitchen',
    '/appointments', '/services', '/employees', '/marketing',
    '/pets', '/boarding', '/grooming',
    '/token-billing', '/cloud-backup', '/members',
    '/convenience-pos', '/daily-settlement',
    '/credit-ledger', '/batch-manage',
    '/quotations', '/device-models',
    '/delivery', '/recurring-orders',
    '/vehicle-db', '/oe-search',
    '/hw-credit-ledger', '/cutting-calc',
    '/projects', '/material-bom',
    '/group-buy', '/pickup-verify',
    // Other
    '/faq-management', '/unrecognized-commands', '/user-management',
];
function loginAsBoss(page) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, page.goto('http://localhost:3000')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, page.evaluate(function () {
                            var mockUser = {
                                id: 'mock-boss-001',
                                email: 'boss@proclaw.demo',
                                role: 'admin',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            var mockSession = {
                                access_token: 'mock-access-token-boss',
                                refresh_token: 'mock-refresh-token-boss',
                                expires_in: 3600,
                                expires_at: Math.floor(Date.now() / 1000) + 3600,
                                token_type: 'bearer',
                                user: mockUser,
                            };
                            localStorage.setItem('auth-storage', JSON.stringify({
                                state: { user: mockUser, session: mockSession, isLoading: false, error: null, loginDialogOpen: false },
                                version: 0,
                            }));
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function testRoute(page, route) {
    return __awaiter(this, void 0, void 0, function () {
        var consoleErrors, handler, status, hasContent, errorText, url, finalUrl, bodyText, criticalErrors, nonTauriCritical, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    consoleErrors = [];
                    handler = function (msg) {
                        if (msg.type() === 'error')
                            consoleErrors.push(msg.text());
                    };
                    page.on('console', handler);
                    status = 'OK';
                    hasContent = false;
                    errorText = '';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    url = "http://localhost:3000/#".concat(route);
                    return [4 /*yield*/, page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 })];
                case 2:
                    _a.sent();
                    // Just give it a short time to lazy-load
                    return [4 /*yield*/, page.waitForTimeout(800)];
                case 3:
                    // Just give it a short time to lazy-load
                    _a.sent();
                    finalUrl = page.url();
                    return [4 /*yield*/, page.evaluate(function () { var _a; return ((_a = document.body) === null || _a === void 0 ? void 0 : _a.innerText) || ''; })];
                case 4:
                    bodyText = _a.sent();
                    hasContent = bodyText.trim().length > 20;
                    if (bodyText.includes('Something went wrong') || bodyText.includes('Application error')) {
                        status = 'CRASH';
                        errorText = bodyText.substring(0, 200);
                    }
                    else if (bodyText.match(/TypeError|ReferenceError|Cannot read|undefined is not/)) {
                        status = 'ERROR';
                        errorText = bodyText.substring(0, 300);
                    }
                    else if (!hasContent) {
                        status = 'BLANK';
                    }
                    criticalErrors = consoleErrors.filter(function (e) {
                        return e.includes('TypeError') || e.includes('ReferenceError') ||
                            e.includes('Module not found') || e.includes('Failed to fetch dynamically');
                    });
                    nonTauriCritical = criticalErrors.filter(function (e) {
                        return !e.includes('__TAURI_INTERNALS__') && !e.includes('window.__TAURI');
                    });
                    if (nonTauriCritical.length > 0 && status === 'OK') {
                        status = 'ERROR';
                        errorText = nonTauriCritical[0].substring(0, 200);
                    }
                    return [2 /*return*/, { route: route, status: status, finalUrl: finalUrl, hasContent: hasContent, errorText: errorText, consoleErrors: consoleErrors.slice(0, 3) }];
                case 5:
                    e_1 = _a.sent();
                    return [2 /*return*/, { route: route, status: 'CRASH', finalUrl: page.url(), hasContent: false, errorText: e_1.message, consoleErrors: consoleErrors }];
                case 6:
                    page.off('console', handler);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
test_1.test.describe.configure({ mode: 'serial' });
test_1.test.describe('ProClaw Route Audit', function () {
    var _loop_1 = function (route) {
        (0, test_1.test)("PUBLIC: ".concat(route), function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var result;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        test_1.test.setTimeout(15000);
                        return [4 /*yield*/, testRoute(page, route)];
                    case 1:
                        result = _c.sent();
                        console.log("[PUBLIC] ".concat(route, " \u2192 ").concat(result.status));
                        if (!(result.status === 'CRASH' || result.status === 'BLANK')) return [3 /*break*/, 3];
                        return [4 /*yield*/, page.screenshot({ path: "".concat(SCREENSHOT_DIR, "/FAIL").concat(route.replace(/\//g, '_'), ".png") })];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); });
    };
    // Each route as a separate test so one slow page doesn't break others
    for (var _i = 0, PUBLIC_ROUTES_1 = PUBLIC_ROUTES; _i < PUBLIC_ROUTES_1.length; _i++) {
        var route = PUBLIC_ROUTES_1[_i];
        _loop_1(route);
    }
    // Setup auth once for protected tests
    test_1.test.beforeAll(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, browser.newPage()];
                case 1:
                    page = _c.sent();
                    return [4 /*yield*/, loginAsBoss(page)];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.close()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    var _loop_2 = function (route) {
        (0, test_1.test)("PROTECTED: ".concat(route), function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var result, errMsg;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        test_1.test.setTimeout(15000);
                        // Re-login each test to be safe
                        return [4 /*yield*/, loginAsBoss(page)];
                    case 1:
                        // Re-login each test to be safe
                        _c.sent();
                        return [4 /*yield*/, testRoute(page, route)];
                    case 2:
                        result = _c.sent();
                        errMsg = result.errorText ? " (".concat(result.errorText.substring(0, 80), ")") : '';
                        console.log("[PROTECTED] ".concat(route, " \u2192 ").concat(result.status).concat(errMsg));
                        if (!(result.status === 'CRASH' || result.status === 'BLANK' || result.status === 'ERROR')) return [3 /*break*/, 4];
                        return [4 /*yield*/, page.screenshot({ path: "".concat(SCREENSHOT_DIR, "/FAIL").concat(route.replace(/\//g, '_'), ".png") })];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    };
    for (var _a = 0, PROTECTED_ROUTES_1 = PROTECTED_ROUTES; _a < PROTECTED_ROUTES_1.length; _a++) {
        var route = PROTECTED_ROUTES_1[_a];
        _loop_2(route);
    }
    var _loop_3 = function (from, expected) {
        (0, test_1.test)("REDIRECT: ".concat(from, " \u2192 ").concat(expected), function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var result, finalPath, ok;
            var page = _b.page;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        test_1.test.setTimeout(15000);
                        return [4 /*yield*/, loginAsBoss(page)];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, testRoute(page, from)];
                    case 2:
                        result = _c.sent();
                        finalPath = result.finalUrl.split('#')[1] || '';
                        ok = finalPath === expected;
                        console.log("[REDIRECT] ".concat(from, " \u2192 ").concat(finalPath, " (expected ").concat(expected, ") \u2192 ").concat(ok ? 'OK' : 'FAIL'));
                        (0, test_1.expect)(ok, "".concat(from, " should redirect to ").concat(expected, ", got ").concat(finalPath)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    for (var _b = 0, REDIRECT_ROUTES_1 = REDIRECT_ROUTES; _b < REDIRECT_ROUTES_1.length; _b++) {
        var _c = REDIRECT_ROUTES_1[_b], from = _c.from, expected = _c.expect;
        _loop_3(from, expected);
    }
});
