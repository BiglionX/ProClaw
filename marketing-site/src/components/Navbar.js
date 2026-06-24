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
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var authStore_1 = require("../lib/authStore");
var navLinks = [
    { path: '/', label: '首页' },
    { path: '/features', label: '功能' },
    { path: '/flowhub', label: 'AI插件' },
    { path: '/download', label: '下载' },
    { path: '/faq', label: 'FAQ' },
];
var solutionLinks = [
    { path: '/solutions/catering', label: '餐饮', emoji: '\uD83C\uDF7D\uFE0F' },
    { path: '/solutions/beauty', label: '美业', emoji: '\uD83D\uDC87' },
    { path: '/solutions/pet', label: '宠物', emoji: '\uD83D\uDC3E' },
    { path: '/solutions/cloud', label: 'Cloud 托管', emoji: '\u2601\uFE0F' },
];
var Navbar = function () {
    var _a;
    var _b = (0, authStore_1.useAuthStore)(), user = _b.user, profile = _b.profile, logout = _b.logout;
    var location = (0, react_router_dom_1.useLocation)();
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _c = (0, react_1.useState)(false), dropdownOpen = _c[0], setDropdownOpen = _c[1];
    var _d = (0, react_1.useState)(false), solutionDropdownOpen = _d[0], setSolutionDropdownOpen = _d[1];
    var dropdownRef = (0, react_1.useRef)(null);
    var solutionDropdownRef = (0, react_1.useRef)(null);
    // 点击外部关闭下拉
    (0, react_1.useEffect)(function () {
        var handleClickOutside = function (e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
            if (solutionDropdownRef.current && !solutionDropdownRef.current.contains(e.target)) {
                setSolutionDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return function () { return document.removeEventListener('mousedown', handleClickOutside); };
    }, []);
    var isActive = function (path) {
        if (path === '/')
            return location.pathname === '/';
        return location.pathname.startsWith(path);
    };
    var handleLogout = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setDropdownOpen(false);
                    return [4 /*yield*/, logout()];
                case 1:
                    _a.sent();
                    navigate('/');
                    return [2 /*return*/];
            }
        });
    }); };
    return (<nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <react_router_dom_1.Link to="/" className="flex items-center gap-2">
            <img src="/proclaw-logo.png" alt="ProClaw Logo" className="h-8 w-auto"/>
            <span className="text-xl font-bold tracking-tight hover:text-gray-600">ProClaw</span>
          </react_router_dom_1.Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map(function (link) { return (<react_router_dom_1.Link key={link.path} to={link.path} className={isActive(link.path)
                ? 'text-black font-semibold border-b-2 border-black pb-1'
                : 'text-gray-600 hover:text-black font-semibold'}>
                {link.label}
              </react_router_dom_1.Link>); })}

            {/* 行业方案 下拉 */}
            <div className="relative" ref={solutionDropdownRef}>
              <button onClick={function () { return setSolutionDropdownOpen(!solutionDropdownOpen); }} onMouseEnter={function () { return setSolutionDropdownOpen(true); }} className="flex items-center gap-1 text-gray-600 hover:text-black font-semibold">
                行业方案
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              {solutionDropdownOpen && (<div className="absolute left-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1" onMouseLeave={function () { return setSolutionDropdownOpen(false); }}>
                  {solutionLinks.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setSolutionDropdownOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                      {item.emoji} {item.label}
                    </react_router_dom_1.Link>); })}
                </div>)}
            </div>
          </div>

          {/* Right Side: User State */}
          <div className="flex items-center space-x-3">
            {user ? (<div className="relative" ref={dropdownRef}>
                <button onClick={function () { return setDropdownOpen(!dropdownOpen); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {((profile === null || profile === void 0 ? void 0 : profile.username) || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
                    {(profile === null || profile === void 0 ? void 0 : profile.username) || ((_a = user.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]) || '用户'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {dropdownOpen && (<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <button onClick={function () { setDropdownOpen(false); navigate('/user'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      用户中心
                    </button>
                    <button onClick={function () { setDropdownOpen(false); navigate('/user/cloud'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
                      </svg>
                      我的商城
                    </button>
                    <hr className="my-1 border-gray-100"/>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      </svg>
                      退出登录
                    </button>
                  </div>)}
              </div>) : (<>
                <react_router_dom_1.Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors">
                  登录
                </react_router_dom_1.Link>
                <react_router_dom_1.Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                  注册
                </react_router_dom_1.Link>
              </>)}
          </div>
        </div>
      </div>
    </nav>);
};
exports.default = Navbar;
