// ProClaw Cloud 托管版 - 销售管理页面
'use client';

import { useEffect, useState, startTransition } from 'react';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  customer_type: string;
  credit_limit: number;
  is_active: boolean;
  notes: string;
}

interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  order_date: string;
  expected_delivery_date: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  shipping_address: string;
  notes: string;
  created_at: string;
  items: SalesOrderItem[];
}

interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');

  // 销售单
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [statusFilter, setStatusFilter] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);

  // 客户
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // 表单
  const [orderForm, setOrderForm] = useState({
    so_number: '', customer_id: '', order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '', shipping_address: '', notes: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, notes: '' }],
  });

  const [customerForm, setCustomerForm] = useState({
    code: '', name: '', contact_person: '', phone: '', email: '',
    address: '', customer_type: 'individual', credit_limit: 0, notes: '', is_active: true,
  });

  const loadOrders = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/sales?${params}`)
      .then(res => res.ok ? res.json() : { data: [], total: 0 })
      .then(data => {
        setOrders(data.data || []); setTotal(data.total || 0); setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadCustomers = (search = '') => {
    setCustomersLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    fetch(`/api/customers${params}`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => { setCustomers(data.data || []); setCustomersLoading(false); })
      .catch(() => setCustomersLoading(false));
  };

  useEffect(() => { startTransition(() => { setLoading(true); loadOrders(); }); // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);
  useEffect(() => { startTransition(() => { if (activeTab === 'customers') loadCustomers(customerSearch); }); // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeTab]);

  const openCreateOrder = () => {
    setEditingOrder(null);
    setOrderForm({ so_number: '', customer_id: '', order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '', shipping_address: '', notes: '', items: [{ product_id: '', quantity: 1, unit_price: 0, notes: '' }] });
    setShowOrderModal(true);
    loadCustomers();
  };

  const openEditOrder = (order: SalesOrder) => {
    setEditingOrder(order);
    setOrderForm({
      so_number: order.so_number, customer_id: order.customer_id || '',
      order_date: order.order_date, expected_delivery_date: order.expected_delivery_date || '',
      shipping_address: order.shipping_address || '', notes: order.notes || '',
      items: order.items && order.items.length > 0
        ? order.items.map(i => ({ product_id: i.product_id || '', quantity: i.quantity, unit_price: i.unit_price, notes: i.notes || '' }))
        : [{ product_id: '', quantity: 1, unit_price: 0, notes: '' }],
    });
    setShowOrderModal(true);
    loadCustomers();
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingOrder;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { id: editingOrder!.id, ...orderForm } : orderForm;
      const res = await fetch('/api/sales', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(isEdit ? '销售单已更新' : '销售单已创建');
        setShowOrderModal(false);
        loadOrders();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch { toast.error('操作失败'); }
  };

  const deleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/sales?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) { toast.success('销售单已删除'); loadOrders(); }
      else { toast.error(data.error || '删除失败'); }
    } catch { toast.error('删除失败'); }
  };

  const addOrderItem = () => setOrderForm(prev => ({ ...prev, items: [...prev.items, { product_id: '', quantity: 1, unit_price: 0, notes: '' }] }));
  const updateOrderItem = (index: number, field: string, value: string | number) => setOrderForm(prev => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  const removeOrderItem = (index: number) => setOrderForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const openCreateCustomer = () => {
    setEditingCustomer(null);
    setCustomerForm({ code: '', name: '', contact_person: '', phone: '', email: '', address: '', customer_type: 'individual', credit_limit: 0, notes: '', is_active: true });
    setShowCustomerModal(true);
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerForm({
      code: c.code, name: c.name, contact_person: c.contact_person || '',
      phone: c.phone || '', email: c.email || '', address: c.address || '',
      customer_type: c.customer_type || 'individual', credit_limit: c.credit_limit || 0,
      notes: c.notes || '', is_active: c.is_active ?? true,
    });
    setShowCustomerModal(true);
  };

  const submitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingCustomer;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { id: editingCustomer!.id, ...customerForm } : customerForm;
      const res = await fetch('/api/customers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(isEdit ? '客户已更新' : '客户已创建');
        setShowCustomerModal(false);
        loadCustomers(customerSearch);
      } else { toast.error(data.error || '操作失败'); }
    } catch { toast.error('操作失败'); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) { toast.success('客户已删除'); loadCustomers(customerSearch); }
      else { toast.error(data.error || '删除失败'); }
    } catch { toast.error('删除失败'); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-600', label: '草稿' },
      pending: { color: 'bg-yellow-100 text-yellow-700', label: '待审核' },
      approved: { color: 'bg-blue-100 text-blue-700', label: '已批准' },
      delivered: { color: 'bg-green-100 text-green-700', label: '已发货' },
      completed: { color: 'bg-emerald-100 text-emerald-700', label: '已完成' },
      cancelled: { color: 'bg-red-100 text-red-700', label: '已取消' },
    };
    const m = map[status] || { color: 'bg-gray-100 text-gray-600', label: status };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>{m.label}</span>;
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">销售管理</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>销售订单</button>
        <button onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'customers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>客户管理</button>
      </div>

      {activeTab === 'orders' && (
        <>
          <div className="flex justify-between items-center">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">全部状态</option>
              <option value="draft">草稿</option><option value="pending">待审核</option><option value="approved">已批准</option>
              <option value="delivered">已发货</option><option value="completed">已完成</option><option value="cancelled">已取消</option>
            </select>
            <button onClick={openCreateOrder} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">创建销售单</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">📤</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无销售订单</h3>
              <p className="text-gray-500 mb-6">点击右上角创建销售单</p>
              <button onClick={openCreateOrder} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">创建销售单</button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-4 py-3 font-medium">销售单号</th>
                        <th className="px-4 py-3 font-medium">客户</th>
                        <th className="px-4 py-3 font-medium text-right">金额</th>
                        <th className="px-4 py-3 font-medium text-center">状态</th>
                        <th className="px-4 py-3 font-medium text-center">付款</th>
                        <th className="px-4 py-3 font-medium">日期</th>
                        <th className="px-4 py-3 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs font-medium">{order.so_number}</td>
                          <td className="px-4 py-3 text-gray-600">{order.customer_id ? getCustomerName(order.customer_id) : '--'}</td>
                          <td className="px-4 py-3 text-right font-medium">¥{order.total_amount?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">{statusBadge(order.status)}</td>
                          <td className="px-4 py-3 text-center">{order.payment_status === 'paid' ? '已付款' : '未付款'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{order.order_date}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => openEditOrder(order)} className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
                              <button onClick={() => deleteOrder(order.id)} className="text-red-500 hover:text-red-700 text-sm">删除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <button onClick={() => { setPage(p => Math.max(1, p - 1)); loadOrders(); }} disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">上一页</button>
                  <span className="text-sm text-gray-600">第 {page} / {totalPages} 页（共 {total} 条）</span>
                  <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); loadOrders(); }} disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">下一页</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'customers' && (
        <>
          <div className="flex justify-between items-center gap-4">
            <input type="text" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadCustomers(customerSearch); }}
              placeholder="搜索客户..." className="max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={openCreateCustomer} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">新增客户</button>
          </div>

          {customersLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : customers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无客户</h3>
              <button onClick={openCreateCustomer} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">新增客户</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">编码</th><th className="px-4 py-3 font-medium">名称</th>
                      <th className="px-4 py-3 font-medium">联系人</th><th className="px-4 py-3 font-medium">电话</th>
                      <th className="px-4 py-3 font-medium text-center">状态</th><th className="px-4 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.code}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-gray-600">{c.contact_person || '--'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.phone || '--'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.is_active ? '启用' : '停用'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditCustomer(c)} className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
                            <button onClick={() => deleteCustomer(c.id)} className="text-red-500 hover:text-red-700 text-sm">删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 销售单弹窗 */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto" onClick={() => setShowOrderModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingOrder ? '编辑销售单' : '创建销售单'}</h2>
            </div>
            <form onSubmit={submitOrder} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">销售单号</label>
                  <input type="text" value={orderForm.so_number} onChange={e => setOrderForm(prev => ({ ...prev, so_number: e.target.value }))} placeholder="留空自动生成" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户</label>
                  <select value={orderForm.customer_id} onChange={e => setOrderForm(prev => ({ ...prev, customer_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">请选择客户</option>
                    {customers.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">下单日期</label>
                  <input type="date" value={orderForm.order_date} onChange={e => setOrderForm(prev => ({ ...prev, order_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">预计发货</label>
                  <input type="date" value={orderForm.expected_delivery_date} onChange={e => setOrderForm(prev => ({ ...prev, expected_delivery_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">收货地址</label>
                <input type="text" value={orderForm.shipping_address} onChange={e => setOrderForm(prev => ({ ...prev, shipping_address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={orderForm.notes} onChange={e => setOrderForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">销售明细</h3>
                  <button type="button" onClick={addOrderItem} className="text-sm text-blue-600 hover:text-blue-800">+ 添加商品行</button>
                </div>
                {orderForm.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-500">商品 {index + 1}</span>
                      {orderForm.items.length > 1 && <button type="button" onClick={() => removeOrderItem(index)} className="text-xs text-red-500 hover:text-red-700">删除</button>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-0.5">商品 ID</label><input type="text" value={item.product_id} onChange={e => updateOrderItem(index, 'product_id', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none" /></div>
                      <div><label className="block text-xs text-gray-500 mb-0.5">数量</label><input type="number" value={item.quantity || ''} onChange={e => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 0)} min={1} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none" /></div>
                      <div><label className="block text-xs text-gray-500 mb-0.5">单价</label><input type="number" value={item.unit_price || ''} onChange={e => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)} min={0} step={0.01} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none" /></div>
                      <div><label className="block text-xs text-gray-500 mb-0.5">小计</label><div className="px-2 py-1.5 text-sm font-medium text-gray-700">¥{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowOrderModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">{editingOrder ? '保存修改' : '创建销售单'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 客户弹窗 */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 pb-10 overflow-y-auto" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingCustomer ? '编辑客户' : '新增客户'}</h2>
            </div>
            <form onSubmit={submitCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">编码</label>
                  <input type="text" value={customerForm.code} onChange={e => setCustomerForm(prev => ({ ...prev, code: e.target.value }))} placeholder="留空自动生成" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户名称 *</label>
                  <input type="text" value={customerForm.name} onChange={e => setCustomerForm(prev => ({ ...prev, name: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">联系人</label><input type="text" value={customerForm.contact_person} onChange={e => setCustomerForm(prev => ({ ...prev, contact_person: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">电话</label><input type="text" value={customerForm.phone} onChange={e => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label><input type="email" value={customerForm.email} onChange={e => setCustomerForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">信用额度</label><input type="number" value={customerForm.credit_limit || ''} onChange={e => setCustomerForm(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))} min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">地址</label><input type="text" value={customerForm.address} onChange={e => setCustomerForm(prev => ({ ...prev, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label><textarea value={customerForm.notes} onChange={e => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="customer_active" checked={customerForm.is_active} onChange={e => setCustomerForm(prev => ({ ...prev, is_active: e.target.checked }))} className="rounded border-gray-300" />
                <label htmlFor="customer_active" className="text-sm text-gray-700">启用</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">{editingCustomer ? '保存修改' : '创建客户'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
