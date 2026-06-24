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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PluginStorePage;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var RouteSEO_1 = require("../components/RouteSEO");
var pluginService_1 = require("../lib/pluginService");
var INDUSTRY_ICONS = {
    retail: '🛍️',
    inventory: '📦',
    virtual_company: '🏢',
    catering: '🍽️',
    beauty: '💇',
    pet: '🐾',
    'cloud-proclaw': '☁️',
};
var INDUSTRY_COLORS = {
    retail: '#e74c3c',
    inventory: '#111827',
    virtual_company: '#7c3aed',
    catering: '#e74c3c',
    beauty: '#ec4899',
    pet: '#f59e0b',
    'cloud-proclaw': '#0ea5e9',
};
var CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: 'retail', label: '零售' },
    { id: 'inventory', label: '进销存' },
    { id: 'virtual_company', label: 'ProClaw Light' },
    { id: 'catering', label: '餐饮' },
    { id: 'beauty', label: '美业' },
    { id: 'pet', label: '宠物' },
    { id: 'cloud-proclaw', label: '云服务' },
];
function PluginStorePage() {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)([]), cards = _a[0], setCards = _a[1];
    var _b = (0, react_1.useState)([]), filteredCards = _b[0], setFilteredCards = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)('all'), category = _d[0], setCategory = _d[1];
    var _e = (0, react_1.useState)(''), search = _e[0], setSearch = _e[1];
    var _f = (0, react_1.useState)('downloads'), sortBy = _f[0], setSortBy = _f[1];
    (0, react_1.useEffect)(function () {
        function load() {
            return __awaiter(this, void 0, void 0, function () {
                var plugins, items, _i, plugins_1, plugin, manifest, rating;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, pluginService_1.getPublishedPlugins)()];
                        case 1:
                            plugins = _a.sent();
                            items = [];
                            _i = 0, plugins_1 = plugins;
                            _a.label = 2;
                        case 2:
                            if (!(_i < plugins_1.length)) return [3 /*break*/, 5];
                            plugin = plugins_1[_i];
                            manifest = (0, pluginService_1.parseManifest)(plugin);
                            return [4 /*yield*/, (0, pluginService_1.getPluginRatingSummary)(plugin.id)];
                        case 3:
                            rating = _a.sent();
                            items.push({ plugin: plugin, manifest: manifest, rating: rating });
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5:
                            setCards(items);
                            setLoading(false);
                            return [2 /*return*/];
                    }
                });
            });
        }
        load();
    }, []);
    (0, react_1.useEffect)(function () {
        var filtered = __spreadArray([], cards, true);
        // 按分类过滤
        if (category !== 'all') {
            filtered = filtered.filter(function (c) { return c.plugin.id === category; });
        }
        // 搜索过滤
        if (search) {
            var q_1 = search.toLowerCase();
            filtered = filtered.filter(function (c) {
                return c.plugin.name.toLowerCase().includes(q_1) ||
                    c.plugin.id.toLowerCase().includes(q_1) ||
                    (c.plugin.description || '').toLowerCase().includes(q_1);
            });
        }
        // 排序
        filtered.sort(function (a, b) {
            var _a, _b;
            switch (sortBy) {
                case 'rating':
                    return (((_a = b.rating) === null || _a === void 0 ? void 0 : _a.average) || 0) - (((_b = a.rating) === null || _b === void 0 ? void 0 : _b.average) || 0);
                case 'newest':
                    return new Date(b.plugin.published_at || '').getTime() - new Date(a.plugin.published_at || '').getTime();
                default:
                    return (b.plugin.downloads || 0) - (a.plugin.downloads || 0);
            }
        });
        setFilteredCards(filtered);
    }, [cards, category, search, sortBy]);
    var renderStars = function (rating) {
        var full = Math.floor(rating);
        var half = rating - full >= 0.5;
        return (<span className="text-amber-400 text-sm">
        {'★'.repeat(full)}
        {half ? '½' : ''}
        {'☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
      </span>);
    };
    return (<div className="min-h-screen bg-gray-50">
      <RouteSEO_1.default routeKey="plugins"/>
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-3">行业插件商店</h1>
          <p className="text-gray-300 text-lg max-w-2xl">
            发现适合你业务的行业插件。每个插件都包含专属功能模块、操作面板和 AI 经营团队，即装即用。
          </p>
        </div>
      </div>

      {/* 过滤栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 分类 tabs */}
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map(function (cat) { return (<button key={cat.id} onClick={function () { return setCategory(cat.id); }} className={"px-3 py-1.5 rounded-full text-xs font-medium transition-all ".concat(category === cat.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  {cat.label}
                </button>); })}
            </div>

            <div className="flex-1"/>

            {/* 搜索框 */}
            <input type="text" placeholder="搜索插件..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-gray-900"/>

            {/* 排序 */}
            <select value={sortBy} onChange={function (e) { return setSortBy(e.target.value); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="downloads">按下载量</option>
              <option value="rating">按评分</option>
              <option value="newest">最新发布</option>
            </select>
          </div>
        </div>
      </div>

      {/* 插件网格 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (<div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3 animate-pulse">🔌</div>
            <div>加载插件商店...</div>
          </div>) : filteredCards.length === 0 ? (<div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg">暂无匹配的插件</p>
            {search && (<p className="text-sm mt-1">
                尝试修改搜索关键词「{search}」
              </p>)}
          </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map(function (card) {
                var _a;
                var icon = card.plugin.icon ||
                    INDUSTRY_ICONS[card.plugin.id] ||
                    '🔌';
                var color = INDUSTRY_COLORS[card.plugin.id] || '#6b7280';
                return (<div key={card.plugin.id} onClick={function () { return navigate("/plugins/".concat(card.plugin.id)); }} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group cursor-pointer">
                  {/* 顶栏 */}
                  <div className="px-5 pt-5 pb-3 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: "".concat(color, "15") }}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {card.plugin.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {card.plugin.id} · v{card.plugin.version}
                      </p>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="px-5 pb-3">
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {card.plugin.description || '暂无描述'}
                    </p>
                  </div>

                  {/* 标签/功能 */}
                  {card.manifest && (<div className="px-5 pb-3">
                      <div className="flex flex-wrap gap-1">
                        {(card.manifest.tags ||
                            card.manifest.features.modules.slice(0, 4)).map(function (tag) { return (<span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                              {tag}
                            </span>); })}
                      </div>
                    </div>)}

                  {/* 底栏 */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>⬇️ {card.plugin.downloads}</span>
                      {card.rating && card.rating.count > 0 && (<span className="flex items-center gap-1">
                          {renderStars(card.rating.average)}
                          <span>({card.rating.count})</span>
                        </span>)}
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} title={((_a = card.manifest) === null || _a === void 0 ? void 0 : _a.category) || 'builtin'}/>
                    </div>
                  </div>
                </div>);
            })}
          </div>)}
      </div>
    </div>);
}
