// ProClaw Cloud 托管版 - 联系人管理页面
'use client';

import { useEffect, useState, startTransition } from 'react';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyForm: ContactForm = { name: '', phone: '', email: '', notes: '' };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadContacts = (searchTerm?: string) => {
    const url = searchTerm ? `/api/contacts?search=${encodeURIComponent(searchTerm)}` : '/api/contacts';
    fetch(url)
      .then(res => res.json())
      .then(result => {
        if (result.data) {
          startTransition(() => setContacts(result.data));
        }
      })
      .catch(() => toast.error('加载联系人失败'))
      .finally(() => startTransition(() => setLoading(false)));
  };

  useEffect(() => {
    loadContacts('');
  }, []);

  const handleSearch = () => {
    setLoading(true);
    loadContacts(search);
  };

  const openAdd = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('请填写联系人姓名');
      return;
    }
    setSaving(true);
    try {
      const url = editingContact ? '/api/contacts' : '/api/contacts';
      const method = editingContact ? 'PUT' : 'POST';
      const body = editingContact
        ? { id: editingContact.id, ...form }
        : form;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(editingContact ? '联系人已更新' : '联系人已创建');
        setShowModal(false);
        loadContacts();
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      startTransition(() => setSaving(false));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/contacts?id=${deleteId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success('联系人已删除');
        setDeleteId(null);
        loadContacts();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">联系人</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + 新增联系人
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="搜索姓名、电话..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
        >
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">加载中...</td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    {search ? '未找到匹配的联系人' : '暂无联系人，点击上方按钮新增'}
                  </td>
                </tr>
              ) : (
                contacts.map(contact => (
                  <tr key={contact.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{contact.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.phone || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.email || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-50 truncate">{contact.notes || '--'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        onClick={() => openEdit(contact)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteId(contact.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingContact ? '编辑联系人' : '新增联系人'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="联系人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="手机号或座机"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="电子邮箱"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                disabled={saving}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h2>
            <p className="text-gray-600 text-sm mb-6">删除后无法恢复，确定要删除该联系人吗？</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
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
