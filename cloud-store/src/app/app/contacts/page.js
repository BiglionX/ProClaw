// ProClaw Cloud 托管版 - 联系人管理页面
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ContactsPage;
var react_1 = require("react");
var react_hot_toast_1 = require("react-hot-toast");
var emptyForm = { name: '', phone: '', email: '', notes: '' };
function ContactsPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), contacts = _a[0], setContacts = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(''), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)(false), showModal = _d[0], setShowModal = _d[1];
    var _e = (0, react_1.useState)(null), editingContact = _e[0], setEditingContact = _e[1];
    var _f = (0, react_1.useState)(emptyForm), form = _f[0], setForm = _f[1];
    var _g = (0, react_1.useState)(false), saving = _g[0], setSaving = _g[1];
    var _h = (0, react_1.useState)(null), deleteId = _h[0], setDeleteId = _h[1];
    var loadContacts = function (searchTerm) {
        var url = searchTerm ? "/api/contacts?search=".concat(encodeURIComponent(searchTerm)) : '/api/contacts';
        fetch(url)
            .then(function (res) { return res.json(); })
            .then(function (result) {
            if (result.data) {
                (0, react_1.startTransition)(function () { return setContacts(result.data); });
            }
        })
            .catch(function () { return react_hot_toast_1.default.error('加载联系人失败'); })
            .finally(function () { return (0, react_1.startTransition)(function () { return setLoading(false); }); });
    };
    (0, react_1.useEffect)(function () {
        loadContacts('');
    }, []);
    var handleSearch = function () {
        setLoading(true);
        loadContacts(search);
    };
    var openAdd = function () {
        setEditingContact(null);
        setForm(emptyForm);
        setShowModal(true);
    };
    var openEdit = function (contact) {
        setEditingContact(contact);
        setForm({
            name: contact.name,
            phone: contact.phone || '',
            email: contact.email || '',
            notes: contact.notes || '',
        });
        setShowModal(true);
    };
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var url, method, body, res, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!form.name.trim()) {
                        react_hot_toast_1.default.error('请填写联系人姓名');
                        return [2 /*return*/];
                    }
                    setSaving(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    url = editingContact ? '/api/contacts' : '/api/contacts';
                    method = editingContact ? 'PUT' : 'POST';
                    body = editingContact
                        ? __assign({ id: editingContact.id }, form) : form;
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _b.sent();
                    if (result.success) {
                        react_hot_toast_1.default.success(editingContact ? '联系人已更新' : '联系人已创建');
                        setShowModal(false);
                        loadContacts();
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || '保存失败');
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('保存失败');
                    return [3 /*break*/, 6];
                case 5:
                    (0, react_1.startTransition)(function () { return setSaving(false); });
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!deleteId)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("/api/contacts?id=".concat(deleteId), { method: 'DELETE' })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _b.sent();
                    if (result.success) {
                        react_hot_toast_1.default.success('联系人已删除');
                        setDeleteId(null);
                        loadContacts();
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || '删除失败');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('删除失败');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">联系人</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + 新增联系人
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <input type="text" placeholder="搜索姓名、电话..." value={search} onChange={function (e) { return setSearch(e.target.value); }} onKeyDown={function (e) { return e.key === 'Enter' && handleSearch(); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
        <button onClick={handleSearch} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
          搜索
        </button>
      </div>

      {/* 联系人表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">姓名</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">电话</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">邮箱</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">备注</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (<tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">加载中...</td>
                </tr>) : contacts.length === 0 ? (<tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    {search ? '未找到匹配的联系人' : '暂无联系人，点击上方按钮新增'}
                  </td>
                </tr>) : (contacts.map(function (contact) { return (<tr key={contact.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{contact.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.phone || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.email || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-50 truncate">{contact.notes || '--'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button onClick={function () { return openEdit(contact); }} className="text-blue-600 hover:text-blue-800 mr-3">
                        编辑
                      </button>
                      <button onClick={function () { return setDeleteId(contact.id); }} className="text-red-600 hover:text-red-800">
                        删除
                      </button>
                    </td>
                  </tr>); }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑模态框 */}
      {showModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={function () { return !saving && setShowModal(false); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={function (e) { return e.stopPropagation(); }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingContact ? '编辑联系人' : '新增联系人'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input type="text" value={form.name} onChange={function (e) { return setForm(__assign(__assign({}, form), { name: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="联系人姓名"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input type="text" value={form.phone} onChange={function (e) { return setForm(__assign(__assign({}, form), { phone: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="手机号或座机"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input type="email" value={form.email} onChange={function (e) { return setForm(__assign(__assign({}, form), { email: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="电子邮箱"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={form.notes} onChange={function (e) { return setForm(__assign(__assign({}, form), { notes: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" rows={3} placeholder="备注信息"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={function () { return setShowModal(false); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" disabled={saving}>
                取消
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>)}

      {/* 删除确认弹窗 */}
      {deleteId && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={function () { return setDeleteId(null); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4" onClick={function (e) { return e.stopPropagation(); }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h2>
            <p className="text-gray-600 text-sm mb-6">删除后无法恢复，确定要删除该联系人吗？</p>
            <div className="flex justify-end gap-3">
              <button onClick={function () { return setDeleteId(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
                取消
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                确认删除
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
