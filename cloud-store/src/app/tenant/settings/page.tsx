// ProClaw Cloud-Store - ProClaw Shop 设置页面
'use client';

import { useState, useEffect } from 'react';

interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  layout: 'card' | 'list' | 'grid';
  style: 'modern' | 'classic' | 'minimal';
  font_family: string;
  border_radius: 'none' | 'small' | 'medium' | 'large';
  product_display: 'image_focus' | 'info_focus' | 'balanced';
  banner_style: 'carousel' | 'grid' | 'fullwidth';
}

export default function StoreSettingsPage() {
  const [theme, setTheme] = useState<ThemeConfig>({
    primary_color: '#3B82F6',
    secondary_color: '#60A5FA',
    accent_color: '#F59E0B',
    layout: 'grid',
    style: 'modern',
    font_family: 'Inter, system-ui, sans-serif',
    border_radius: 'medium',
    product_display: 'balanced',
    banner_style: 'carousel',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    wechat: '',
    email: '',
  });

  useEffect(() => {
    // 加载当前设置
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/theme');
        const data = await res.json();
        if (data.success) {
          setTheme(data.data.theme);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSaveTheme = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/ai/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: '主题设置已保存' });
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/ai/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_type: 'default',
          style_preference: 'modern',
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTheme(data.data.theme);
        setMessage({ type: 'success', text: `AI 主题生成成功，消耗 ${data.data.tokens_consumed} Token` });
      } else {
        setMessage({ type: 'error', text: data.error || '生成失败' });
      }
    } catch {
      setMessage({ type: 'error', text: 'AI 生成失败' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">ProClaw Shop 设置</h1>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* 主题设置 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">主题设置</h2>
              <p className="text-sm text-gray-500 mt-1">自定义商城外观风格</p>
            </div>
            <button
              onClick={handleAIGenerate}
              disabled={generating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {generating ? 'AI 生成中...' : 'AI 生成主题'}
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* 颜色设置 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主色调
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.primary_color}
                    onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.primary_color}
                    onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  辅助色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.secondary_color}
                    onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.secondary_color}
                    onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  强调色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.accent_color}
                    onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.accent_color}
                    onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 布局设置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品布局
                </label>
                <select
                  value={theme.layout}
                  onChange={(e) => setTheme({ ...theme, layout: e.target.value as ThemeConfig['layout'] })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="grid">网格布局</option>
                  <option value="list">列表布局</option>
                  <option value="card">卡片布局</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  风格
                </label>
                <select
                  value={theme.style}
                  onChange={(e) => setTheme({ ...theme, style: e.target.value as ThemeConfig['style'] })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="modern">现代</option>
                  <option value="classic">经典</option>
                  <option value="minimal">简约</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  圆角
                </label>
                <select
                  value={theme.border_radius}
                  onChange={(e) => setTheme({ ...theme, border_radius: e.target.value as ThemeConfig['border_radius'] })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="none">无</option>
                  <option value="small">小</option>
                  <option value="medium">中</option>
                  <option value="large">大</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner 样式
                </label>
                <select
                  value={theme.banner_style}
                  onChange={(e) => setTheme({ ...theme, banner_style: e.target.value as ThemeConfig['banner_style'] })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="carousel">轮播</option>
                  <option value="grid">网格</option>
                  <option value="fullwidth">全宽</option>
                </select>
              </div>
            </div>

            {/* 预览 */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">主题预览</h3>
              <div 
                className="p-6 rounded-lg border-2"
                style={{ 
                  backgroundColor: `${theme.primary_color}10`,
                  borderColor: theme.primary_color 
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: theme.primary_color }}
                  >
                    Logo
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: theme.primary_color }}>示例商城</div>
                    <div className="text-sm text-gray-500">Store Preview</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i}
                      className="aspect-square rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: theme.secondary_color }}
                    >
                      Product {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveTheme}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>

        {/* 联系信息 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">联系信息</h2>
            <p className="text-sm text-gray-500 mt-1">设置商城联系方式</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系电话
              </label>
              <input
                type="text"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="138-xxxx-xxxx"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                微信号
              </label>
              <input
                type="text"
                value={contactInfo.wechat}
                onChange={(e) => setContactInfo({ ...contactInfo, wechat: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="your-wechat"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="contact@example.com"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
