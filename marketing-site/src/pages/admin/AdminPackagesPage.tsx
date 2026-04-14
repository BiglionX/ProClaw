import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '../../lib/exportUtils';

interface TokenPackage {
  id: string;
  name: string;
  description?: string;
  tokenAmount: number;
  price: number;
  currency: string;
  discountPercentage: number;
  isActive: boolean;
  sortOrder: number;
}

const AdminPackagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TokenPackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tokenAmount: 0,
    price: 0,
    currency: 'CNY',
    discountPercentage: 0,
    isActive: true,
    sortOrder: 0
  });

  // 模拟套餐数据
  const [packages, setPackages] = useState<TokenPackage[]>([
    {
      id: '1',
      name: '体验套餐',
      description: '适合初次体验用户',
      tokenAmount: 10000,
      price: 99,
      currency: 'CNY',
      discountPercentage: 0,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: '2',
      name: '标准套餐',
      description: '适合个人开发者',
      tokenAmount: 50000,
      price: 399,
      currency: 'CNY',
      discountPercentage: 20,
      isActive: true,
      sortOrder: 2,
    },
    {
      id: '3',
      name: '专业套餐',
      description: '适合专业用户和小团队',
      tokenAmount: 200000,
      price: 1299,
      currency: 'CNY',
      discountPercentage: 35,
      isActive: true,
      sortOrder: 3,
    },
    {
      id: '4',
      name: '企业套餐',
      description: '适合企业和大型团队',
      tokenAmount: 1000000,
      price: 4999,
      currency: 'CNY',
      discountPercentage: 50,
      isActive: true,
      sortOrder: 4,
    },
  ]);

  // 处理编辑点击
  const handleEditClick = (pkg: TokenPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      tokenAmount: pkg.tokenAmount,
      price: pkg.price,
      currency: pkg.currency,
      discountPercentage: pkg.discountPercentage,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder
    });
    setShowEditModal(true);
  };

  // 切换套餐状态
  const togglePackageStatus = (id: string) => {
    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === id ? { ...pkg, isActive: !pkg.isActive } : pkg
      )
    );
  };

  // 处理添加套餐
  const handleAddPackage = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPackage: TokenPackage = {
      id: Date.now().toString(), // 简单生成ID
      name: formData.name,
      description: formData.description,
      tokenAmount: formData.tokenAmount,
      price: formData.price,
      currency: formData.currency,
      discountPercentage: formData.discountPercentage,
      isActive: formData.isActive,
      sortOrder: formData.sortOrder
    };
    
    setPackages(prev => [...prev, newPackage]);
    setShowAddModal(false);
    resetForm();
  };

  // 处理更新套餐
  const handleUpdatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPackage) return;
    
    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === editingPackage.id ? { ...pkg, ...formData } : pkg
      )
    );
    
    setShowEditModal(false);
    setEditingPackage(null);
    resetForm();
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tokenAmount: 0,
      price: 0,
      currency: 'CNY',
      discountPercentage: 0,
      isActive: true,
      sortOrder: 0
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Token 套餐管理</h1>
            </div>
            <div className="flex space-x-3">
              <ExportButton
                data={packages}
                filename="packages"
                headers={[
                  { key: 'name', label: '套餐名称' },
                  { key: 'description', label: '描述' },
                  { key: 'tokenAmount', label: 'Token数量' },
                  { key: 'price', label: '价格' },
                  { key: 'currency', label: '货币' },
                  { key: 'discountPercentage', label: '折扣' },
                  { key: 'isActive', label: '状态' },
                  { key: 'sortOrder', label: '排序' },
                ]}
              >
                导出套餐
              </ExportButton>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                添加套餐
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">总套餐数</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{packages.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">活跃套餐</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {packages.filter(p => p.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">最低价格</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              ¥{Math.min(...packages.map(p => p.price))}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">最高折扣</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {Math.max(...packages.map(p => p.discountPercentage))}%
            </p>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {pkg.isActive ? '活跃' : '停用'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Token 数量</span>
                    <span className="text-sm font-medium text-gray-900">{pkg.tokenAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">价格</span>
                    <span className="text-lg font-bold text-gray-900">¥{pkg.price}</span>
                  </div>
                  {pkg.discountPercentage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">折扣</span>
                      <span className="text-sm font-medium text-purple-600">{pkg.discountPercentage}% OFF</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">排序</span>
                    <span className="text-sm font-medium text-gray-900">#{pkg.sortOrder}</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4 border-t">
                  <button 
                    onClick={() => handleEditClick(pkg)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    编辑
                  </button>
                  <button 
                    onClick={() => togglePackageStatus(pkg.id)}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    {pkg.isActive ? '停用' : '启用'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">添加新套餐</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddPackage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">套餐名称</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    placeholder="例如：高级套餐" 
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    rows={3} 
                    placeholder="套餐描述..." 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token 数量</label>
                    <input 
                      type="number" 
                      value={formData.tokenAmount}
                      onChange={(e) => setFormData({...formData, tokenAmount: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                      placeholder="100000" 
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">价格 (¥)</label>
                    <input 
                      type="number" 
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                      placeholder="999" 
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">折扣 (%)</label>
                  <input 
                    type="number" 
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({...formData, discountPercentage: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    placeholder="0" 
                    min="0" 
                    max="100" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">排序</label>
                  <input 
                    type="number" 
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    placeholder="1" 
                    min="0"
                  />
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    激活状态
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    取消
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {showEditModal && editingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">编辑套餐</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdatePackage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">套餐名称</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    placeholder="例如：高级套餐" 
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    rows={3} 
                    placeholder="套餐描述..." 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token 数量</label>
                    <input 
                      type="number" 
                      value={formData.tokenAmount}
                      onChange={(e) => setFormData({...formData, tokenAmount: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                      placeholder="100000" 
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">价格 (¥)</label>
                    <input 
                      type="number" 
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                      placeholder="999" 
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">折扣 (%)</label>
                  <input 
                    type="number" 
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({...formData, discountPercentage: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    placeholder="0" 
                    min="0" 
                    max="100" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">排序</label>
                  <input 
                    type="number" 
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" 
                    placeholder="1" 
                    min="0"
                  />
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="editIsActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                  />
                  <label htmlFor="editIsActive" className="ml-2 block text-sm text-gray-700">
                    激活状态
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    取消
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    更新
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPackagesPage;
