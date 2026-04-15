import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SystemSettings {
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  lowBalanceThreshold: number;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxApiKeysPerUser: number;
  tokenExpiryDays: number;
  enableNotifications: boolean;
  supportEmail: string;
}

const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings>({
    rateLimitPerMinute: 60,
    rateLimitPerDay: 10000,
    lowBalanceThreshold: 10000,
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxApiKeysPerUser: 5,
    tokenExpiryDays: 365,
    enableNotifications: true,
    supportEmail: 'support@proclaw.cc',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // 模拟保存操作
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  const SettingSection: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ 
    title, 
    description, 
    children 
  }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
      {children}
    </div>
  );

  const ToggleSwitch: React.FC<{ 
    enabled: boolean; 
    onChange: (enabled: boolean) => void;
    label: string;
    description?: string;
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

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
              <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
            </div>
            <div className="flex items-center space-x-3">
              {saveSuccess && (
                <span className="text-sm text-green-600">✓ 设置已保存</span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Rate Limiting */}
        <SettingSection 
          title="API 速率限制" 
          description="配置用户 API 调用的频率限制"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每分钟请求限制
              </label>
              <input
                type="number"
                value={settings.rateLimitPerMinute}
                onChange={(e) => handleSettingChange('rateLimitPerMinute', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">每个用户每分钟最多允许的 API 调用次数</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每日请求限制
              </label>
              <input
                type="number"
                value={settings.rateLimitPerDay}
                onChange={(e) => handleSettingChange('rateLimitPerDay', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">每个用户每天最多允许的 API 调用次数</p>
            </div>
          </div>
        </SettingSection>

        {/* Token Settings */}
        <SettingSection 
          title="Token 管理" 
          description="配置 Token 余额和过期策略"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                低余额提醒阈值
              </label>
              <input
                type="number"
                value={settings.lowBalanceThreshold}
                onChange={(e) => handleSettingChange('lowBalanceThreshold', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">当用户 Token 余额低于此值时发送提醒</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token 过期天数
              </label>
              <input
                type="number"
                value={settings.tokenExpiryDays}
                onChange={(e) => handleSettingChange('tokenExpiryDays', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">购买的 Token 在多少天后过期（0 表示永不过期）</p>
            </div>
          </div>
        </SettingSection>

        {/* User Management */}
        <SettingSection 
          title="用户管理" 
          description="控制用户注册和账户相关设置"
        >
          <div className="divide-y divide-gray-200">
            <ToggleSwitch
              enabled={settings.allowRegistration}
              onChange={(value) => handleSettingChange('allowRegistration', value)}
              label="允许新用户注册"
              description="关闭后将禁止新用户注册账户"
            />
            <ToggleSwitch
              enabled={settings.requireEmailVerification}
              onChange={(value) => handleSettingChange('requireEmailVerification', value)}
              label="需要邮箱验证"
              description="新用户注册后必须验证邮箱才能使用服务"
            />
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每个用户最大 API Key 数量
              </label>
              <input
                type="number"
                value={settings.maxApiKeysPerUser}
                onChange={(e) => handleSettingChange('maxApiKeysPerUser', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                min="1"
                max="20"
              />
              <p className="text-xs text-gray-500 mt-1">限制每个用户可以创建的 API Key 数量</p>
            </div>
          </div>
        </SettingSection>

        {/* System Maintenance */}
        <SettingSection 
          title="系统维护" 
          description="控制系统维护和通知设置"
        >
          <div className="divide-y divide-gray-200">
            <ToggleSwitch
              enabled={settings.maintenanceMode}
              onChange={(value) => handleSettingChange('maintenanceMode', value)}
              label="维护模式"
              description="开启后所有 API 将返回维护中状态，用户无法使用服务"
            />
            <ToggleSwitch
              enabled={settings.enableNotifications}
              onChange={(value) => handleSettingChange('enableNotifications', value)}
              label="启用系统通知"
              description="向用户发送系统公告和重要通知"
            />
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支持邮箱
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">显示给用户的支持联系邮箱</p>
            </div>
          </div>
        </SettingSection>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">危险操作</h3>
          <p className="text-sm text-red-700 mb-4">以下操作不可撤销，请谨慎使用</p>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
              清除所有 API 使用日志
            </button>
            <button className="w-full px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
              重置所有用户 Token 余额
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSettingsPage;
