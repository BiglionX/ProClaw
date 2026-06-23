// ProClaw Cloud 托管版 - 商品管理页面
'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.default = ProductsPage;
var react_1 = require("react");
var react_hot_toast_1 = require("react-hot-toast");
function ProductsPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), products = _a[0], setProducts = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(''), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)(''), statusFilter = _d[0], setStatusFilter = _d[1];
    var _e = (0, react_1.useState)(1), page = _e[0], setPage = _e[1];
    var _f = (0, react_1.useState)(0), total = _f[0], setTotal = _f[1];
    var pageSize = 20;
    var _g = (0, react_1.useState)(false), showModal = _g[0], setShowModal = _g[1];
    var _h = (0, react_1.useState)(null), editingProduct = _h[0], setEditingProduct = _h[1];
    var _j = (0, react_1.useState)(null), showDeleteConfirm = _j[0], setShowDeleteConfirm = _j[1];
    // 表单状态
    var _k = (0, react_1.useState)({
        name: '',
        spu_code: '',
        subtitle: '',
        description: '',
        category_id: '',
        unit: '件',
        is_on_sale: true,
        skus: [{ sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' }],
    }), form = _k[0], setForm = _k[1];
    // 定义请求函数（所有 setState 都在 .then 回调中，不会触发 Cascading Renders 警告）
    var loadProducts = function () {
        var params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (search)
            params.set('search', search);
        if (statusFilter)
            params.set('status', statusFilter);
        fetch("/api/products?".concat(params))
            .then(function (res) { return res.ok ? res.json() : { data: [], total: 0 }; })
            .then(function (data) {
            setProducts(data.data || []);
            setTotal(data.total || 0);
            setLoading(false);
        })
            .catch(function () {
            setLoading(false);
        });
    };
    // 初始加载
    (0, react_1.useEffect)(function () {
        (0, react_1.startTransition)(function () {
            setLoading(true);
        });
        loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    var doSearch = function () {
        setPage(1);
        setLoading(true);
        loadProducts();
    };
    // 翻页
    var goToPage = function (newPage) {
        setPage(newPage);
        setLoading(true);
        loadProducts();
    };
    var handleSearch = function (e) {
        e.preventDefault();
        doSearch();
    };
    var openCreateModal = function () {
        setEditingProduct(null);
        setForm({
            name: '',
            spu_code: '',
            subtitle: '',
            description: '',
            category_id: '',
            unit: '件',
            is_on_sale: true,
            skus: [{ sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' }],
        });
        setShowModal(true);
    };
    var openEditModal = function (product) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            setEditingProduct(product);
            setForm({
                name: product.name,
                spu_code: product.spu_code,
                subtitle: product.subtitle || '',
                description: product.description || '',
                category_id: product.category_id || '',
                unit: product.unit || '件',
                is_on_sale: product.is_on_sale,
                skus: product.skus && product.skus.length > 0
                    ? product.skus.map(function (s) { return ({
                        sku_code: s.sku_code || '',
                        sell_price: s.sell_price || 0,
                        cost_price: s.cost_price || 0,
                        current_stock: s.current_stock || 0,
                        min_stock: s.min_stock || 0,
                        max_stock: s.max_stock || 999999,
                        specifications: s.specifications || {},
                        spec_text: s.spec_text || '',
                    }); })
                    : [{ sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' }],
            });
            setShowModal(true);
            return [2 /*return*/];
        });
    }); };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var isEdit, url, method, body, res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    isEdit = !!editingProduct;
                    url = '/api/products';
                    method = isEdit ? 'PUT' : 'POST';
                    body = isEdit
                        ? __assign({ id: editingProduct.id }, form) : form;
                    return [4 /*yield*/, fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _b.sent();
                    if (res.ok && data.success) {
                        react_hot_toast_1.default.success(isEdit ? '商品已更新' : '商品创建成功');
                        setShowModal(false);
                        loadProducts();
                    }
                    else {
                        react_hot_toast_1.default.error(data.error || '操作失败');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('操作失败');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/products?id=".concat(id), { method: 'DELETE' })];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _b.sent();
                    if (res.ok && data.success) {
                        react_hot_toast_1.default.success('商品已删除');
                        setShowDeleteConfirm(null);
                        loadProducts();
                    }
                    else {
                        react_hot_toast_1.default.error(data.error || '删除失败');
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('删除失败');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var addSkuRow = function () {
        setForm(function (prev) { return (__assign(__assign({}, prev), { skus: __spreadArray(__spreadArray([], prev.skus, true), [{ sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' }], false) })); });
    };
    var removeSkuRow = function (index) {
        setForm(function (prev) { return (__assign(__assign({}, prev), { skus: prev.skus.filter(function (_, i) { return i !== index; }) })); });
    };
    var updateSku = function (index, field, value) {
        setForm(function (prev) { return (__assign(__assign({}, prev), { skus: prev.skus.map(function (sku, i) {
                var _a;
                return (i === index ? __assign(__assign({}, sku), (_a = {}, _a[field] = value, _a)) : sku);
            }) })); });
    };
    var totalPages = Math.ceil(total / pageSize);
    return (<div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          新增商品
        </button>
      </div>

      {/* 搜索与筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input type="text" value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="搜索商品名称..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"/>
          <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            搜索
          </button>
        </form>
        <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">全部状态</option>
          <option value="on_sale">上架</option>
          <option value="draft">草稿</option>
          <option value="discontinued">下架</option>
        </select>
      </div>

      {/* 商品列表 */}
      {loading ? (<div className="text-center py-12 text-gray-500">加载中...</div>) : products.length === 0 ? (<div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无商品</h3>
          <p className="text-gray-500 mb-6">点击右上角&ldquo;新增商品&rdquo;开始添加</p>
          <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            新增商品
          </button>
        </div>) : (<>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">SPU编码</th>
                    <th className="px-4 py-3 font-medium">商品名称</th>
                    <th className="px-4 py-3 font-medium text-right">售价</th>
                    <th className="px-4 py-3 font-medium text-right">库存</th>
                    <th className="px-4 py-3 font-medium text-center">单位</th>
                    <th className="px-4 py-3 font-medium text-center">状态</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(function (product) {
                var _a, _b, _c, _d;
                var defaultSku = ((_a = product.skus) === null || _a === void 0 ? void 0 : _a.find(function (s) { return s.is_default; })) || ((_b = product.skus) === null || _b === void 0 ? void 0 : _b[0]);
                return (<tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{product.spu_code}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{product.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium">
                            {defaultSku ? "\u00A5".concat((_c = defaultSku.sell_price) === null || _c === void 0 ? void 0 : _c.toFixed(2)) : '¥0.00'}
                          </span>
                          {product.skus && product.skus.length > 1 && (<span className="text-gray-400 text-xs ml-1">({product.skus.length}规格)</span>)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={defaultSku && defaultSku.current_stock <= (defaultSku.min_stock || 0) ? 'text-red-600 font-medium' : ''}>
                            {(_d = defaultSku === null || defaultSku === void 0 ? void 0 : defaultSku.current_stock) !== null && _d !== void 0 ? _d : '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{product.unit || '件'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium ".concat(product.status === 'on_sale' ? 'bg-green-100 text-green-700' :
                        product.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-700')}>
                            {product.status === 'on_sale' ? '上架' : product.status === 'draft' ? '草稿' : '下架'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={function () { return openEditModal(product); }} className="text-blue-600 hover:text-blue-800 text-sm">
                              编辑
                            </button>
                            <button onClick={function () { return setShowDeleteConfirm(product.id); }} className="text-red-500 hover:text-red-700 text-sm">
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>);
            })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (<div className="flex justify-center items-center gap-2">
              <button onClick={function () { return goToPage(page - 1); }} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {page} / {totalPages} 页（共 {total} 条）
              </span>
              <button onClick={function () { return goToPage(page + 1); }} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                下一页
              </button>
            </div>)}
        </>)}

      {/* 新增/编辑商品弹窗 */}
      {showModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto" onClick={function () { return setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? '编辑商品' : '新增商品'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label>
                  <input type="text" value={form.name} onChange={function (e) { return setForm(function (prev) { return (__assign(__assign({}, prev), { name: e.target.value })); }); }} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SPU编码</label>
                  <input type="text" value={form.spu_code} onChange={function (e) { return setForm(function (prev) { return (__assign(__assign({}, prev), { spu_code: e.target.value })); }); }} placeholder="留空自动生成" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">副标题</label>
                <input type="text" value={form.subtitle} onChange={function (e) { return setForm(function (prev) { return (__assign(__assign({}, prev), { subtitle: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={form.description} onChange={function (e) { return setForm(function (prev) { return (__assign(__assign({}, prev), { description: e.target.value })); }); }} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <input type="text" value={form.category_id} onChange={function (e) { return setForm(function (prev) { return (__assign(__assign({}, prev), { category_id: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <select value={form.unit} onChange={function (e) { return setForm(function (prev) { return (__assign(__assign({}, prev), { unit: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="件">件</option>
                    <option value="个">个</option>
                    <option value="台">台</option>
                    <option value="箱">箱</option>
                    <option value="套">套</option>
                    <option value="公斤">公斤</option>
                    <option value="米">米</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_on_sale" checked={form.is_on_sale} onChange={function (e) { return setForm(function (prev) { return (__assign(__assign({}, prev), { is_on_sale: e.target.checked })); }); }} className="rounded border-gray-300"/>
                <label htmlFor="is_on_sale" className="text-sm text-gray-700">上架</label>
              </div>

              {/* SKU 列表 */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">SKU 规格</h3>
                  <button type="button" onClick={addSkuRow} className="text-sm text-blue-600 hover:text-blue-800">
                    + 添加规格
                  </button>
                </div>

                {form.skus.map(function (sku, index) { return (<div key={index} className="bg-gray-50 rounded-lg p-4 mb-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">规格 {index + 1}</span>
                      {form.skus.length > 1 && (<button type="button" onClick={function () { return removeSkuRow(index); }} className="text-xs text-red-500 hover:text-red-700">
                          删除
                        </button>)}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">规格描述</label>
                        <input type="text" value={sku.spec_text} onChange={function (e) { return updateSku(index, 'spec_text', e.target.value); }} placeholder="如: 红色/L" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">SKU编码</label>
                        <input type="text" value={sku.sku_code} onChange={function (e) { return updateSku(index, 'sku_code', e.target.value); }} placeholder="留空自动生成" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">售价</label>
                        <input type="number" value={sku.sell_price || ''} onChange={function (e) { return updateSku(index, 'sell_price', parseFloat(e.target.value) || 0); }} min={0} step={0.01} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">成本价</label>
                        <input type="number" value={sku.cost_price || ''} onChange={function (e) { return updateSku(index, 'cost_price', parseFloat(e.target.value) || 0); }} min={0} step={0.01} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">库存</label>
                        <input type="number" value={sku.current_stock || ''} onChange={function (e) { return updateSku(index, 'current_stock', parseInt(e.target.value) || 0); }} min={0} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">最低库存</label>
                        <input type="number" value={sku.min_stock || ''} onChange={function (e) { return updateSku(index, 'min_stock', parseInt(e.target.value) || 0); }} min={0} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                    </div>
                  </div>); })}
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={function () { return setShowModal(false); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  取消
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  {editingProduct ? '保存修改' : '创建商品'}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* 删除确认 */}
      {showDeleteConfirm && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={function () { return setShowDeleteConfirm(null); }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={function (e) { return e.stopPropagation(); }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-6">删除后无法恢复，确定要删除该商品吗？</p>
            <div className="flex justify-end gap-3">
              <button onClick={function () { return setShowDeleteConfirm(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                取消
              </button>
              <button onClick={function () { return handleDelete(showDeleteConfirm); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                确认删除
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
