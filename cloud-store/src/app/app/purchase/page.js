// ProClaw Cloud 托管版 - 采购管理页面
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
exports.default = PurchasePage;
var react_1 = require("react");
var react_hot_toast_1 = require("react-hot-toast");
function PurchasePage() {
    var _this = this;
    var _a = (0, react_1.useState)('orders'), activeTab = _a[0], setActiveTab = _a[1];
    // 采购单状态
    var _b = (0, react_1.useState)([]), orders = _b[0], setOrders = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(1), page = _d[0], setPage = _d[1];
    var _e = (0, react_1.useState)(0), total = _e[0], setTotal = _e[1];
    var pageSize = 20;
    var _f = (0, react_1.useState)(''), statusFilter = _f[0], setStatusFilter = _f[1];
    var _g = (0, react_1.useState)(false), showOrderModal = _g[0], setShowOrderModal = _g[1];
    var _h = (0, react_1.useState)(null), editingOrder = _h[0], setEditingOrder = _h[1];
    // 供应商状态
    var _j = (0, react_1.useState)([]), suppliers = _j[0], setSuppliers = _j[1];
    var _k = (0, react_1.useState)(false), suppliersLoading = _k[0], setSuppliersLoading = _k[1];
    var _l = (0, react_1.useState)(false), showSupplierModal = _l[0], setShowSupplierModal = _l[1];
    var _m = (0, react_1.useState)(null), editingSupplier = _m[0], setEditingSupplier = _m[1];
    var _o = (0, react_1.useState)(''), supplierSearch = _o[0], setSupplierSearch = _o[1];
    // 采购单表单
    var _p = (0, react_1.useState)({
        po_number: '',
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        notes: '',
        items: [{ product_id: '', quantity: 1, unit_price: 0, notes: '' }],
    }), orderForm = _p[0], setOrderForm = _p[1];
    // 供应商表单
    var _q = (0, react_1.useState)({
        code: '',
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        payment_terms: '',
        notes: '',
        is_active: true,
    }), supplierForm = _q[0], setSupplierForm = _q[1];
    var loadOrders = function () {
        var params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (statusFilter)
            params.set('status', statusFilter);
        fetch("/api/purchase?".concat(params))
            .then(function (res) { return res.ok ? res.json() : { data: [], total: 0 }; })
            .then(function (data) {
            setOrders(data.data || []);
            setTotal(data.total || 0);
            setLoading(false);
        })
            .catch(function () { return setLoading(false); });
    };
    var loadSuppliers = function (search) {
        if (search === void 0) { search = ''; }
        setSuppliersLoading(true);
        var params = search ? "?search=".concat(encodeURIComponent(search)) : '';
        fetch("/api/suppliers".concat(params))
            .then(function (res) { return res.ok ? res.json() : { data: [] }; })
            .then(function (data) {
            setSuppliers(data.data || []);
            setSuppliersLoading(false);
        })
            .catch(function () { return setSuppliersLoading(false); });
    };
    (0, react_1.useEffect)(function () {
        (0, react_1.startTransition)(function () { return setLoading(true); });
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    (0, react_1.useEffect)(function () {
        (0, react_1.startTransition)(function () {
            if (activeTab === 'suppliers') {
                loadSuppliers(supplierSearch);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);
    var openCreateOrder = function () {
        setEditingOrder(null);
        setOrderForm({
            po_number: '',
            supplier_id: '',
            order_date: new Date().toISOString().split('T')[0],
            expected_delivery_date: '',
            notes: '',
            items: [{ product_id: '', quantity: 1, unit_price: 0, notes: '' }],
        });
        setShowOrderModal(true);
        loadSuppliers();
    };
    var openEditOrder = function (order) {
        setEditingOrder(order);
        setOrderForm({
            po_number: order.po_number,
            supplier_id: order.supplier_id || '',
            order_date: order.order_date,
            expected_delivery_date: order.expected_delivery_date || '',
            notes: order.notes || '',
            items: order.items && order.items.length > 0
                ? order.items.map(function (i) { return ({ product_id: i.product_id || '', quantity: i.quantity, unit_price: i.unit_price, notes: i.notes || '' }); })
                : [{ product_id: '', quantity: 1, unit_price: 0, notes: '' }],
        });
        setShowOrderModal(true);
        loadSuppliers();
    };
    var submitOrder = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var isEdit, method, body, res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    isEdit = !!editingOrder;
                    method = isEdit ? 'PUT' : 'POST';
                    body = isEdit ? __assign({ id: editingOrder.id }, orderForm) : orderForm;
                    return [4 /*yield*/, fetch('/api/purchase', {
                            method: method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _b.sent();
                    if (res.ok && data.success) {
                        react_hot_toast_1.default.success(isEdit ? '采购单已更新' : '采购单已创建');
                        setShowOrderModal(false);
                        loadOrders();
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
    var deleteOrder = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/purchase?id=".concat(id), { method: 'DELETE' })];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _b.sent();
                    if (res.ok && data.success) {
                        react_hot_toast_1.default.success('采购单已删除');
                        loadOrders();
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
    var addOrderItem = function () {
        setOrderForm(function (prev) { return (__assign(__assign({}, prev), { items: __spreadArray(__spreadArray([], prev.items, true), [{ product_id: '', quantity: 1, unit_price: 0, notes: '' }], false) })); });
    };
    var updateOrderItem = function (index, field, value) {
        setOrderForm(function (prev) { return (__assign(__assign({}, prev), { items: prev.items.map(function (item, i) {
                var _a;
                return (i === index ? __assign(__assign({}, item), (_a = {}, _a[field] = value, _a)) : item);
            }) })); });
    };
    var removeOrderItem = function (index) {
        setOrderForm(function (prev) { return (__assign(__assign({}, prev), { items: prev.items.filter(function (_, i) { return i !== index; }) })); });
    };
    // 供应商 CRUD
    var openCreateSupplier = function () {
        setEditingSupplier(null);
        setSupplierForm({
            code: '', name: '', contact_person: '', phone: '',
            email: '', address: '', payment_terms: '', notes: '', is_active: true,
        });
        setShowSupplierModal(true);
    };
    var openEditSupplier = function (supplier) {
        var _a;
        setEditingSupplier(supplier);
        setSupplierForm({
            code: supplier.code,
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            payment_terms: supplier.payment_terms || '',
            notes: supplier.notes || '',
            is_active: (_a = supplier.is_active) !== null && _a !== void 0 ? _a : true,
        });
        setShowSupplierModal(true);
    };
    var submitSupplier = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var isEdit, method, body, res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    isEdit = !!editingSupplier;
                    method = isEdit ? 'PUT' : 'POST';
                    body = isEdit ? __assign({ id: editingSupplier.id }, supplierForm) : supplierForm;
                    return [4 /*yield*/, fetch('/api/suppliers', {
                            method: method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _b.sent();
                    if (res.ok && data.success) {
                        react_hot_toast_1.default.success(isEdit ? '供应商已更新' : '供应商已创建');
                        setShowSupplierModal(false);
                        loadSuppliers(supplierSearch);
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
    var deleteSupplier = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/suppliers?id=".concat(id), { method: 'DELETE' })];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _b.sent();
                    if (res.ok && data.success) {
                        react_hot_toast_1.default.success('供应商已删除');
                        loadSuppliers(supplierSearch);
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
    var statusBadge = function (status) {
        var map = {
            draft: { color: 'bg-gray-100 text-gray-600', label: '草稿' },
            pending: { color: 'bg-yellow-100 text-yellow-700', label: '待审核' },
            approved: { color: 'bg-blue-100 text-blue-700', label: '已批准' },
            ordered: { color: 'bg-purple-100 text-purple-700', label: '已下单' },
            partial: { color: 'bg-orange-100 text-orange-700', label: '部分收货' },
            received: { color: 'bg-green-100 text-green-700', label: '已收货' },
            cancelled: { color: 'bg-red-100 text-red-700', label: '已取消' },
        };
        var m = map[status] || { color: 'bg-gray-100 text-gray-600', label: status };
        return <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium ".concat(m.color)}>{m.label}</span>;
    };
    var getSupplierName = function (id) { var _a; return ((_a = suppliers.find(function (s) { return s.id === id; })) === null || _a === void 0 ? void 0 : _a.name) || id; };
    var totalPages = Math.ceil(total / pageSize);
    return (<div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">采购管理</h1>

      {/* Tab 导航 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={function () { return setActiveTab('orders'); }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors ".concat(activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900')}>
          采购订单
        </button>
        <button onClick={function () { return setActiveTab('suppliers'); }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors ".concat(activeTab === 'suppliers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900')}>
          供应商管理
        </button>
      </div>

      {/* 采购订单 Tab */}
      {activeTab === 'orders' && (<>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">全部状态</option>
                <option value="draft">草稿</option>
                <option value="pending">待审核</option>
                <option value="approved">已批准</option>
                <option value="ordered">已下单</option>
                <option value="partial">部分收货</option>
                <option value="received">已收货</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <button onClick={openCreateOrder} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              创建采购单
            </button>
          </div>

          {loading ? (<div className="text-center py-12 text-gray-500">加载中...</div>) : orders.length === 0 ? (<div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">📥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无采购订单</h3>
              <p className="text-gray-500 mb-6">点击右上角&ldquo;创建采购单&rdquo;开始</p>
              <button onClick={openCreateOrder} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                创建采购单
              </button>
            </div>) : (<>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-4 py-3 font-medium">采购单号</th>
                        <th className="px-4 py-3 font-medium">供应商</th>
                        <th className="px-4 py-3 font-medium text-right">金额</th>
                        <th className="px-4 py-3 font-medium text-center">状态</th>
                        <th className="px-4 py-3 font-medium text-center">付款</th>
                        <th className="px-4 py-3 font-medium">日期</th>
                        <th className="px-4 py-3 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(function (order) {
                    var _a;
                    return (<tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs font-medium">{order.po_number}</td>
                          <td className="px-4 py-3 text-gray-600">{order.supplier_id ? getSupplierName(order.supplier_id) : '--'}</td>
                          <td className="px-4 py-3 text-right font-medium">¥{(_a = order.total_amount) === null || _a === void 0 ? void 0 : _a.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">{statusBadge(order.status)}</td>
                          <td className="px-4 py-3 text-center">{order.payment_status === 'paid' ? '已付款' : '未付款'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{order.order_date}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={function () { return openEditOrder(order); }} className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
                              <button onClick={function () { return deleteOrder(order.id); }} className="text-red-500 hover:text-red-700 text-sm">删除</button>
                            </div>
                          </td>
                        </tr>);
                })}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (<div className="flex justify-center items-center gap-2">
                  <button onClick={function () { setPage(function (p) { return Math.max(1, p - 1); }); loadOrders(); }} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">上一页</button>
                  <span className="text-sm text-gray-600">第 {page} / {totalPages} 页（共 {total} 条）</span>
                  <button onClick={function () { setPage(function (p) { return Math.min(totalPages, p + 1); }); loadOrders(); }} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">下一页</button>
                </div>)}
            </>)}
        </>)}

      {/* 供应商管理 Tab */}
      {activeTab === 'suppliers' && (<>
          <div className="flex justify-between items-center gap-4">
            <input type="text" value={supplierSearch} onChange={function (e) { return setSupplierSearch(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter')
            loadSuppliers(supplierSearch); }} placeholder="搜索供应商..." className="max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
            <button onClick={openCreateSupplier} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              新增供应商
            </button>
          </div>

          {suppliersLoading ? (<div className="text-center py-8 text-gray-500">加载中...</div>) : suppliers.length === 0 ? (<div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">🏢</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无供应商</h3>
              <p className="text-gray-500 mb-6">点击右上角&ldquo;新增供应商&rdquo;开始添加</p>
              <button onClick={openCreateSupplier} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">新增供应商</button>
            </div>) : (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">编码</th>
                      <th className="px-4 py-3 font-medium">名称</th>
                      <th className="px-4 py-3 font-medium">联系人</th>
                      <th className="px-4 py-3 font-medium">电话</th>
                      <th className="px-4 py-3 font-medium text-center">状态</th>
                      <th className="px-4 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(function (s) { return (<tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.code}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-gray-600">{s.contact_person || '--'}</td>
                        <td className="px-4 py-3 text-gray-600">{s.phone || '--'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium ".concat(s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                            {s.is_active ? '启用' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={function () { return openEditSupplier(s); }} className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
                            <button onClick={function () { return deleteSupplier(s.id); }} className="text-red-500 hover:text-red-700 text-sm">删除</button>
                          </div>
                        </td>
                      </tr>); })}
                  </tbody>
                </table>
              </div>
            </div>)}
        </>)}

      {/* 采购单弹窗 */}
      {showOrderModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto" onClick={function () { return setShowOrderModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingOrder ? '编辑采购单' : '创建采购单'}</h2>
            </div>
            <form onSubmit={submitOrder} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">采购单号</label>
                  <input type="text" value={orderForm.po_number} onChange={function (e) { return setOrderForm(function (prev) { return (__assign(__assign({}, prev), { po_number: e.target.value })); }); }} placeholder="留空自动生成" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                  <select value={orderForm.supplier_id} onChange={function (e) { return setOrderForm(function (prev) { return (__assign(__assign({}, prev), { supplier_id: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">请选择供应商</option>
                    {suppliers.filter(function (s) { return s.is_active; }).map(function (s) { return (<option key={s.id} value={s.id}>{s.name}</option>); })}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">下单日期</label>
                  <input type="date" value={orderForm.order_date} onChange={function (e) { return setOrderForm(function (prev) { return (__assign(__assign({}, prev), { order_date: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">预计到货</label>
                  <input type="date" value={orderForm.expected_delivery_date} onChange={function (e) { return setOrderForm(function (prev) { return (__assign(__assign({}, prev), { expected_delivery_date: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={orderForm.notes} onChange={function (e) { return setOrderForm(function (prev) { return (__assign(__assign({}, prev), { notes: e.target.value })); }); }} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              {/* 采购明细 */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">采购明细</h3>
                  <button type="button" onClick={addOrderItem} className="text-sm text-blue-600 hover:text-blue-800">+ 添加商品行</button>
                </div>
                {orderForm.items.map(function (item, index) { return (<div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-500">商品 {index + 1}</span>
                      {orderForm.items.length > 1 && (<button type="button" onClick={function () { return removeOrderItem(index); }} className="text-xs text-red-500 hover:text-red-700">删除</button>)}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">商品 ID</label>
                        <input type="text" value={item.product_id} onChange={function (e) { return updateOrderItem(index, 'product_id', e.target.value); }} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">数量</label>
                        <input type="number" value={item.quantity || ''} onChange={function (e) { return updateOrderItem(index, 'quantity', parseInt(e.target.value) || 0); }} min={1} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">单价</label>
                        <input type="number" value={item.unit_price || ''} onChange={function (e) { return updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0); }} min={0} step={0.01} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">小计</label>
                        <div className="px-2 py-1.5 text-sm font-medium text-gray-700">
                          ¥{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>); })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={function () { return setShowOrderModal(false); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  {editingOrder ? '保存修改' : '创建采购单'}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* 供应商弹窗 */}
      {showSupplierModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 pb-10 overflow-y-auto" onClick={function () { return setShowSupplierModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingSupplier ? '编辑供应商' : '新增供应商'}</h2>
            </div>
            <form onSubmit={submitSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <input type="text" value={supplierForm.code} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { code: e.target.value })); }); }} placeholder="留空自动生成" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称 *</label>
                  <input type="text" value={supplierForm.name} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { name: e.target.value })); }); }} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input type="text" value={supplierForm.contact_person} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { contact_person: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                  <input type="text" value={supplierForm.phone} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { phone: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"/>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input type="email" value={supplierForm.email} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { email: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">付款条件</label>
                  <input type="text" value={supplierForm.payment_terms} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { payment_terms: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                <input type="text" value={supplierForm.address} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { address: e.target.value })); }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={supplierForm.notes} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { notes: e.target.value })); }); }} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"/>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="supplier_active" checked={supplierForm.is_active} onChange={function (e) { return setSupplierForm(function (prev) { return (__assign(__assign({}, prev), { is_active: e.target.checked })); }); }} className="rounded border-gray-300"/>
                <label htmlFor="supplier_active" className="text-sm text-gray-700">启用</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={function () { return setShowSupplierModal(false); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  {editingSupplier ? '保存修改' : '创建供应商'}
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
