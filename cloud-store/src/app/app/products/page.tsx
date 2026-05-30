// ProClaw Cloud 托管版 - 商品管理页面
'use client';

import { useEffect, useState, startTransition } from 'react';
import toast from 'react-hot-toast';

interface Sku {
  id?: string;
  spu_id?: string;
  sku_code: string;
  specifications: Record<string, string>;
  spec_text: string;
  cost_price: number;
  sell_price: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  is_default: boolean;
}

interface Product {
  id: string;
  name: string;
  spu_code: string;
  subtitle: string;
  description: string;
  category_id: string;
  unit: string;
  sell_price: number;
  current_stock: number;
  status: string;
  is_on_sale: boolean;
  skus: Sku[];
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 表单状态
  const [form, setForm] = useState({
    name: '',
    spu_code: '',
    subtitle: '',
    description: '',
    category_id: '',
    unit: '件',
    is_on_sale: true,
    skus: [{ sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' } as Sku],
  });

  // 定义请求函数（所有 setState 都在 .then 回调中，不会触发 Cascading Renders 警告）
  const loadProducts = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/products?${params}`)
      .then(res => res.ok ? res.json() : { data: [], total: 0 })
      .then(data => {
        setProducts(data.data || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  // 初始加载
  useEffect(() => {
    startTransition(() => {
      setLoading(true);
    });
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = () => {
    setPage(1);
    setLoading(true);
    loadProducts();
  };

  // 翻页
  const goToPage = (newPage: number) => {
    setPage(newPage);
    setLoading(true);
    loadProducts();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch();
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      spu_code: '',
      subtitle: '',
      description: '',
      category_id: '',
      unit: '件',
      is_on_sale: true,
      skus: [{ sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' } as Sku],
    });
    setShowModal(true);
  };

  const openEditModal = async (product: Product) => {
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
        ? product.skus.map(s => ({
            sku_code: s.sku_code || '',
            sell_price: s.sell_price || 0,
            cost_price: s.cost_price || 0,
            current_stock: s.current_stock || 0,
            min_stock: s.min_stock || 0,
            max_stock: s.max_stock || 999999,
            specifications: s.specifications || {},
            spec_text: s.spec_text || '',
          }) as Sku)
        : [{ sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' } as Sku],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingProduct;
      const url = '/api/products';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { id: editingProduct!.id, ...form }
        : form;

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(isEdit ? '商品已更新' : '商品创建成功');
        setShowModal(false);
        loadProducts();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('商品已删除');
        setShowDeleteConfirm(null);
        loadProducts();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const addSkuRow = () => {
    setForm(prev => ({
      ...prev,
      skus: [...prev.skus, { sku_code: '', sell_price: 0, cost_price: 0, current_stock: 0, min_stock: 0, specifications: {}, spec_text: '' } as Sku],
    }));
  };

  const removeSkuRow = (index: number) => {
    setForm(prev => ({
      ...prev,
      skus: prev.skus.filter((_, i) => i !== index),
    }));
  };

  const updateSku = (index: number, field: keyof Sku, value: string | number | boolean | Record<string, string>) => {
    setForm(prev => ({
      ...prev,
      skus: prev.skus.map((sku, i) => (i === index ? { ...sku, [field]: value } : sku)),
    }));
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          新增商品
        </button>
      </div>

      {/* 搜索与筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索商品名称..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            搜索
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          <option value="on_sale">上架</option>
          <option value="draft">草稿</option>
          <option value="discontinued">下架</option>
        </select>
      </div>

      {/* 商品列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无商品</h3>
          <p className="text-gray-500 mb-6">点击右上角&ldquo;新增商品&rdquo;开始添加</p>
          <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            新增商品
          </button>
        </div>
      ) : (
        <>
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
                  {products.map((product) => {
                    const defaultSku = product.skus?.find(s => s.is_default) || product.skus?.[0];
                    return (
                      <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{product.spu_code}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{product.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium">
                            {defaultSku ? `¥${defaultSku.sell_price?.toFixed(2)}` : '¥0.00'}
                          </span>
                          {product.skus && product.skus.length > 1 && (
                            <span className="text-gray-400 text-xs ml-1">({product.skus.length}规格)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={defaultSku && defaultSku.current_stock <= (defaultSku.min_stock || 0) ? 'text-red-600 font-medium' : ''}>
                            {defaultSku?.current_stock ?? '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{product.unit || '件'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'on_sale' ? 'bg-green-100 text-green-700' :
                            product.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {product.status === 'on_sale' ? '上架' : product.status === 'draft' ? '草稿' : '下架'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(product.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {page} / {totalPages} 页（共 {total} 条）
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* 新增/编辑商品弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
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
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SPU编码</label>
                  <input
                    type="text"
                    value={form.spu_code}
                    onChange={e => setForm(prev => ({ ...prev, spu_code: e.target.value }))}
                    placeholder="留空自动生成"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">副标题</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <input
                    type="text"
                    value={form.category_id}
                    onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
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
                <input
                  type="checkbox"
                  id="is_on_sale"
                  checked={form.is_on_sale}
                  onChange={e => setForm(prev => ({ ...prev, is_on_sale: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_on_sale" className="text-sm text-gray-700">上架</label>
              </div>

              {/* SKU 列表 */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">SKU 规格</h3>
                  <button
                    type="button"
                    onClick={addSkuRow}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + 添加规格
                  </button>
                </div>

                {form.skus.map((sku, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">规格 {index + 1}</span>
                      {form.skus.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSkuRow(index)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">规格描述</label>
                        <input
                          type="text"
                          value={sku.spec_text}
                          onChange={e => updateSku(index, 'spec_text', e.target.value)}
                          placeholder="如: 红色/L"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">SKU编码</label>
                        <input
                          type="text"
                          value={sku.sku_code}
                          onChange={e => updateSku(index, 'sku_code', e.target.value)}
                          placeholder="留空自动生成"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">售价</label>
                        <input
                          type="number"
                          value={sku.sell_price || ''}
                          onChange={e => updateSku(index, 'sell_price', parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.01}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">成本价</label>
                        <input
                          type="number"
                          value={sku.cost_price || ''}
                          onChange={e => updateSku(index, 'cost_price', parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.01}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">库存</label>
                        <input
                          type="number"
                          value={sku.current_stock || ''}
                          onChange={e => updateSku(index, 'current_stock', parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">最低库存</label>
                        <input
                          type="number"
                          value={sku.min_stock || ''}
                          onChange={e => updateSku(index, 'min_stock', parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {editingProduct ? '保存修改' : '创建商品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-6">删除后无法恢复，确定要删除该商品吗？</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
