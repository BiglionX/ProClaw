import React, { useState } from 'react';

interface ApiKey {
  id: string;
  provider: string;
  key_name: string;
  is_active: boolean;
  used_count: number;
  created_at: string;
}

interface ApiKeyTabProps {
  apiKeys: ApiKey[];
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
}

const ApiKeyTab: React.FC<ApiKeyTabProps> = ({ apiKeys, setApiKeys }) => {
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyValue, setNewKeyValue] = useState('');

  const handleAddApiKey = () => {
    if (!newKeyName || !newKeyValue) return;
    const newKey: ApiKey = {
      id: Date.now().toString(),
      provider: newKeyProvider,
      key_name: newKeyName,
      is_active: true,
      used_count: 0,
      created_at: new Date().toISOString().split('T')[0],
    };
    setApiKeys([newKey, ...apiKeys]);
    setShowAddKey(false);
    setNewKeyName('');
    setNewKeyValue('');
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">管理您的 AI 提供商 API 密钥</p>
        <button
          onClick={() => setShowAddKey(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新增密钥
        </button>
      </div>

      {showAddKey && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-3">
          <h4 className="font-semibold text-gray-900">新增 API 密钥</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">密钥名称</label>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="例如: GPT-4 密钥"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">提供商</label>
              <select value={newKeyProvider} onChange={e => setNewKeyProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="deepseek">DeepSeek</option>
                <option value="google">Google</option>
                <option value="azure">Azure</option>
                <option value="ollama">Ollama (本地)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
              <input value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddApiKey} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">确认添加</button>
            <button onClick={() => setShowAddKey(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {apiKeys.map((key) => (
          <div key={key.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div>
                <span className="text-sm font-medium text-gray-900">{key.key_name}</span>
                <span className="text-xs text-gray-400 ml-2">{key.provider}</span>
              </div>
              <span className="text-xs text-gray-400">调用 {key.used_count.toLocaleString()} 次</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{key.created_at}</span>
              <button onClick={() => handleDeleteKey(key.id)} className="text-red-500 hover:text-red-700 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {apiKeys.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">暂无 API 密钥，点击上方按钮添加</p>
        )}
      </div>
    </div>
  );
};

export default ApiKeyTab;
