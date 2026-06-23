"use strict";
// ProClaw Shop - 商品详情页
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
exports.dynamic = void 0;
exports.default = ProductDetailPage;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_router_1 = require("@/lib/tenant-router");
var image_1 = require("next/image");
exports.dynamic = 'force-dynamic';
function ProductDetailPage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c, storeParam, productId, subdomain, _d, supabase, tenant, schemaName, product, theme;
        var params = _b.params;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, params];
                case 1:
                    _c = _e.sent(), storeParam = _c.store, productId = _c.id;
                    _d = storeParam;
                    if (_d) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, tenant_router_1.getCurrentTenantSubdomain)()];
                case 2:
                    _d = (_e.sent());
                    _e.label = 3;
                case 3:
                    subdomain = _d;
                    if (!subdomain) {
                        return [2 /*return*/, (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商城未找到</h1>
          <p className="text-gray-500">请检查网址是否正确</p>
        </div>
      </div>)];
                    }
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(new server_1.NextRequest('http://localhost'), server_1.NextResponse.next());
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .select('id, name, subdomain, status, theme_config, logo_url, contact_info')
                            .eq('subdomain', subdomain)
                            .single()];
                case 4:
                    tenant = (_e.sent()).data;
                    if (!tenant || tenant.status !== 'active') {
                        return [2 /*return*/, (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商城暂时不可用</h1>
          <p className="text-gray-500">该商城可能已被关闭或不存在</p>
        </div>
      </div>)];
                    }
                    schemaName = "tenant_".concat(subdomain.replace(/-/g, '_'));
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".products"))
                            .select('*')
                            .eq('id', productId)
                            .single()];
                case 5:
                    product = (_e.sent()).data;
                    if (!product) {
                        return [2 /*return*/, (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商品未找到</h1>
          <p className="text-gray-500">该商品可能已下架或不存在</p>
          <a href={"/".concat(subdomain)} className="mt-4 inline-block text-blue-600 hover:underline">
            返回首页
          </a>
        </div>
      </div>)];
                    }
                    theme = tenant.theme_config || {
                        primary_color: '#3B82F6',
                        secondary_color: '#60A5FA',
                    };
                    return [2 /*return*/, (<div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <a href={"/".concat(subdomain)} className="flex items-center text-gray-500 hover:text-gray-900">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
                返回
              </a>
            </div>
            <div className="flex items-center">
              {tenant.logo_url ? (<image_1.default src={tenant.logo_url} alt={tenant.name} width={32} height={32} className="h-8 w-auto"/>) : (<span className="text-lg font-bold" style={{ color: theme.primary_color }}>
                  {tenant.name}
                </span>)}
            </div>
            <div />
          </div>
        </div>
      </header>
      
      {/* 商品详情 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* 商品图片 */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {product.images && product.images.length > 0 ? (<image_1.default src={product.images[0]} alt={product.name} fill className="object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>)}
              </div>
              
              {/* 缩略图 */}
              {product.images && product.images.length > 1 && (<div className="grid grid-cols-4 gap-2">
                  {product.images.map(function (img, idx) { return (<button key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden border-2 border-transparent hover:border-blue-500">
                      <image_1.default src={img} alt="" fill className="object-cover"/>
                    </button>); })}
                </div>)}
            </div>
            
            {/* 商品信息 */}
            <div className="space-y-6">
              <div>
                {product.category && (<span className="text-sm text-gray-500">{product.category}</span>)}
                <h1 className="text-2xl font-bold text-gray-900 mt-1">
                  {product.name}
                </h1>
              </div>
              
              {/* 价格 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold" style={{ color: theme.primary_color }}>
                    ¥{product.price}
                  </span>
                  {product.stock > 0 ? (<span className="ml-4 text-sm text-green-600">有货</span>) : (<span className="ml-4 text-sm text-red-600">缺货</span>)}
                </div>
                {product.stock > 0 && (<p className="text-sm text-gray-500 mt-1">
                    库存: {product.stock}
                  </p>)}
              </div>
              
              {/* 描述 */}
              {product.description && (<div>
                  <h3 className="font-medium text-gray-900 mb-2">商品描述</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
                </div>)}
              
              {/* 操作按钮 */}
              <div className="space-y-3">
                {product.stock > 0 ? (<>
                    <button className="w-full py-3 px-6 rounded-lg text-white font-medium transition-colors hover:opacity-90" style={{ backgroundColor: theme.primary_color }}>
                      加入购物车
                    </button>
                    <button className="w-full py-3 px-6 rounded-lg border-2 font-medium transition-colors hover:bg-gray-50" style={{ borderColor: theme.primary_color, color: theme.primary_color }}>
                      立即购买
                    </button>
                  </>) : (<button disabled className="w-full py-3 px-6 rounded-lg bg-gray-300 text-gray-500 cursor-not-allowed">
                    该商品暂时缺货
                  </button>)}
              </div>
              
              {/* 联系方式 */}
              {tenant.contact_info && (<div className="border-t pt-4 mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">联系商家</h3>
                  <div className="space-y-1 text-gray-600 text-sm">
                    {tenant.contact_info.phone && <p>电话: {tenant.contact_info.phone}</p>}
                    {tenant.contact_info.wechat && <p>微信: {tenant.contact_info.wechat}</p>}
                    {tenant.contact_info.email && <p>邮箱: {tenant.contact_info.email}</p>}
                  </div>
                  <a href={"https://proclaw.cc/customer-service?store=".concat(encodeURIComponent(subdomain || ''), "&product=").concat(encodeURIComponent(productId || ''))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                    </svg>
                    联系客服
                  </a>
                </div>)}
            </div>
          </div>
        </div>
        
        {/* 推荐商品 */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">更多商品</h3>
          <a href={"/".concat(subdomain, "/products")} className="inline-flex items-center text-blue-600 hover:underline">
            查看全部商品
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </main>
      
      {/* 页脚 */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} {tenant.name}. 由 ProClaw Shop 提供支持
          </p>
        </div>
      </footer>
    </div>)];
            }
        });
    });
}
