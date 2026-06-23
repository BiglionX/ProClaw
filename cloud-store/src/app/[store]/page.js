"use strict";
// ProClaw Shop - 动态商城首页
// 根据子域名自动加载对应商户的商城
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
exports.dynamic = void 0;
exports.default = StoreHomePage;
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_router_1 = require("@/lib/tenant-router");
var image_1 = require("next/image");
exports.dynamic = 'force-dynamic';
function StoreHomePage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var storeParam, subdomain, _c, supabase, _d, tenant, error, schemaName, products, data, error_1, theme, categories;
        var _e, _f, _g;
        var params = _b.params;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, params];
                case 1:
                    storeParam = (_h.sent()).store;
                    _c = storeParam;
                    if (_c) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, tenant_router_1.getCurrentTenantSubdomain)()];
                case 2:
                    _c = (_h.sent());
                    _h.label = 3;
                case 3:
                    subdomain = _c;
                    if (!subdomain) {
                        return [2 /*return*/, (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商城未找到</h1>
          <p className="text-gray-500">请检查网址是否正确</p>
        </div>
      </div>)];
                    }
                    return [4 /*yield*/, (0, supabase_server_1.createServerSupabaseClient)()];
                case 4:
                    supabase = _h.sent();
                    console.log('[DEBUG] subdomain:', subdomain);
                    console.log('[DEBUG] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .select('id, name, subdomain, status, theme_config, logo_url, banner_url, contact_info')
                            .eq('subdomain', subdomain)
                            .single()];
                case 5:
                    _d = _h.sent(), tenant = _d.data, error = _d.error;
                    console.log('[DEBUG] tenant query result:', { tenant: tenant, error: error });
                    if (!tenant || tenant.status !== 'active') {
                        return [2 /*return*/, (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商城暂时不可用</h1>
          <p className="text-gray-500">该商城可能已被关闭或不存在</p>
          <p className="text-gray-400 text-sm mt-4">subdomain: {subdomain}</p>
        </div>
      </div>)];
                    }
                    schemaName = "tenant_".concat(subdomain.replace(/[^a-z0-9]/g, '_').substring(0, 53));
                    products = [];
                    _h.label = 6;
                case 6:
                    _h.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".products"))
                            .select('*')
                            .eq('is_on_sale', true)
                            .order('updated_at', { ascending: false })
                            .limit(20)];
                case 7:
                    data = (_h.sent()).data;
                    products = data || [];
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _h.sent();
                    console.warn("Schema ".concat(schemaName, " \u4E0D\u5B58\u5728\u6216\u65E0\u6743\u9650\u8BBF\u95EE\uFF0C\u5546\u54C1\u5217\u8868\u4E3A\u7A7A:"), error_1);
                    return [3 /*break*/, 9];
                case 9:
                    theme = tenant.theme_config || {
                        primary_color: '#3B82F6',
                        secondary_color: '#60A5FA',
                        layout: 'grid',
                    };
                    categories = products
                        ? __spreadArray([], new Set(products.map(function (p) { return p.category; }).filter(Boolean)), true) : [];
                    return [2 /*return*/, (<div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              {tenant.logo_url ? (<image_1.default src={tenant.logo_url} alt={tenant.name} width={40} height={40} className="h-10 w-auto"/>) : (<span className="text-xl font-bold" style={{ color: theme.primary_color }}>
                  {tenant.name}
                </span>)}
            </div>
            
            {/* 导航 */}
            <nav className="hidden md:flex space-x-8">
              <a href={"/".concat(subdomain)} className="text-gray-900 font-medium hover:text-blue-600">
                首页
              </a>
              <a href={"/".concat(subdomain, "/products")} className="text-gray-500 hover:text-blue-600">
                商品
              </a>
              <a href={"/".concat(subdomain, "/cart")} className="text-gray-500 hover:text-blue-600">
                购物车
              </a>
            </nav>
            
            {/* 操作 */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-blue-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Banner */}
      {tenant.banner_url && (<div className="w-full h-64 md:h-80 bg-cover bg-center" style={{ backgroundImage: "url(".concat(tenant.banner_url, ")") }}>
          <div className="w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
            <h2 className="text-white text-3xl font-bold">欢迎来到 {tenant.name}</h2>
          </div>
        </div>)}
      
      {/* 分类导航 */}
      {categories.length > 0 && (<div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 py-4 overflow-x-auto">
              <a href={"/".concat(subdomain, "/products")} className="text-gray-700 hover:text-blue-600 whitespace-nowrap">
                全部商品
              </a>
              {categories.map(function (cat) { return (<a key={cat} href={"/".concat(subdomain, "/products?category=").concat(encodeURIComponent(cat))} className="text-gray-700 hover:text-blue-600 whitespace-nowrap">
                  {cat}
                </a>); })}
            </div>
          </div>
        </div>)}
      
      {/* 商品列表 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">热门商品</h3>
          <a href={"/".concat(subdomain, "/products")} className="text-blue-600 hover:underline">
            查看全部 &rarr;
          </a>
        </div>
        
        {products && products.length > 0 ? (<div className={"grid gap-6 ".concat(theme.layout === 'list'
                                    ? 'grid-cols-1'
                                    : theme.layout === 'card'
                                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5')}>
            {products.map(function (product) { return (<a key={product.id} href={"/".concat(subdomain, "/product/").concat(product.id)} className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* 商品图片 */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (<image_1.default src={product.images[0]} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>)}
                  {product.stock === 0 && (<div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-medium">已售罄</span>
                    </div>)}
                </div>
                
                {/* 商品信息 */}
                <div className="p-4">
                  <h4 className="text-gray-900 font-medium line-clamp-2 mb-2">
                    {product.name}
                  </h4>
                  {product.category && (<p className="text-sm text-gray-500 mb-2">{product.category}</p>)}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold" style={{ color: theme.primary_color }}>
                      ¥{product.price}
                    </span>
                    {product.stock > 0 && (<span className="text-sm text-green-600">有货</span>)}
                  </div>
                </div>
              </a>); })}
          </div>) : (<div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无商品</h3>
            <p className="mt-1 text-sm text-gray-500">该商城暂未上架任何商品</p>
          </div>)}
      </main>
      
      {/* 页脚 */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-bold">{tenant.name}</span>
              <p className="text-gray-400 text-sm mt-1">由 ProClaw Shop 提供支持</p>
            </div>
            <div className="flex space-x-6 text-gray-400">
              {((_e = tenant.contact_info) === null || _e === void 0 ? void 0 : _e.phone) && <span>电话: {tenant.contact_info.phone}</span>}
              {((_f = tenant.contact_info) === null || _f === void 0 ? void 0 : _f.wechat) && <span>微信: {tenant.contact_info.wechat}</span>}
              {((_g = tenant.contact_info) === null || _g === void 0 ? void 0 : _g.email) && <span>邮箱: {tenant.contact_info.email}</span>}
              <a href={"https://proclaw.cc/customer-service?store=".concat(encodeURIComponent(subdomain || ''))} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                联系客服
              </a>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>)];
            }
        });
    });
}
