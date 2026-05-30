import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../lib/authStore';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getTokenBalanceSummary,
  getTokenPackages,
  getTokenConsumption,
  getPurchaseHistory,
  purchaseToken,
  getUserTokenConfig,
  updateUserTokenConfig,
} from '../lib/tokenService';
import type {
  TokenBalanceSummary,
  TokenConsumptionResult,
  UserTokenConfig,
} from '../types';

// ============================================================
// 类型定义
// ============================================================
interface ApiKey {
  id: string;
  provider: string;
  key_name: string;
  is_active: boolean;
  used_count: number;
  created_at: string;
}

interface TokenPackage {
  id: string;
  name: string;
  token_amount: number;
  price: number;
  discount_percentage: number;
}

interface TokenSale {
  id: string;
  amount: number;
  price: number;
  status: string;
  created_at: string;
}

interface Subscription {
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  billing_cycle: string;
}

// ============================================================
// 模拟数据
// ============================================================
const MOCK_API_KEYS: ApiKey[] = [
  { id: '1', provider: 'openai', key_name: 'GPT-4 密钥', is_active: true, used_count: 1234, created_at: '2026-01-15' },
  { id: '2', provider: 'deepseek', key_name: 'DeepSeek 密钥', is_active: true, used_count: 5678, created_at: '2026-02-20' },
];

const CLOUD_PLANS = [
  { key: 'free', name: '免费版', price: '¥0', products: '20 个', orders: '10 单/月', domain: '子域名' },
  { key: 'basic', name: '基础版', price: '¥29', products: '200 个', orders: '100 单/月', domain: '自定义域名' },
  { key: 'pro', name: '专业版', price: '¥99', products: '2000 个', orders: '2000 单/月', domain: '自定义域名' },
  { key: 'enterprise', name: '企业版', price: '¥299', products: '不限', orders: '不限', domain: '自定义域名' },
];

// ============================================================
// 主组件
// ============================================================
const UserCenterPage: React.FC = () => {
  const { user, profile, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // 各 Tab 数据状态
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [subscription, setSubscription] = useState<Subscription>({
    plan_type: 'pro', status: 'active', started_at: '2026-01-01',
    expires_at: '2026-12-31', auto_renew: true, billing_cycle: 'monthly',
  });

  // Profile 编辑
  const [editUsername, setEditUsername] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 密码修改
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // API 密钥
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Token
  const [tokenBalanceData, setTokenBalanceData] = useState<TokenBalanceSummary | null>(null);
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<TokenSale[]>([]);
  const [tokenConfig, setTokenConfig] = useState<UserTokenConfig | null>(null);
  const [consumptionPage, setConsumptionPage] = useState(1);
  const [consumptionData, setConsumptionData] = useState<TokenConsumptionResult | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [buyMsg, setBuyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(10000);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [autoRechargePkg, setAutoRechargePkg] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWechat, setNotifyWechat] = useState(false);

  // 云数据
  const [syncCount] = useState({ synced: 156, pending: 3 });
  const [storeOrders] = useState([
    { id: '#O20260529-001', customer: '张三', amount: '¥299', status: '待发货' },
    { id: '#O20260528-015', customer: '李四', amount: '¥159', status: '已发货' },
    { id: '#O20260527-008', customer: '王五', amount: '¥89', status: '已完成' },
  ]);

  const tabs = ['个人资料', '账号安全', '套餐订阅', 'API 密钥', 'Token 管理', '云数据管理'];

  useEffect(() => {
    setEditUsername(profile?.username || '');
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [profile]);

  // 保存个人资料
  const handleSaveProfile = async () => {
    if (!editUsername.trim()) return;
    setProfileMsg(null);
    try {
      await updateProfile({ username: editUsername.trim() });
      setProfileMsg({ type: 'success', text: '个人资料已更新' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch {
      setProfileMsg({ type: 'error', text: '更新失败，请重试' });
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (!oldPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ type: 'error', text: '请填写所有密码字段' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: '新密码与确认密码不一致' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: '新密码至少 6 位' });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setPwdMsg({ type: 'success', text: '密码已修改成功' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || '修改失败' });
    }
  };

  // 添加 API 密钥
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

  // 删除 API 密钥
  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  // Token 购买
  const handleBuyTokens = async (pkg: TokenPackage) => {
    if (!user) return;
    setTokenLoading(true);
    const result = await purchaseToken(user.id, pkg.id);
    setTokenLoading(false);
    if (result.success) {
      setBuyMsg({ type: 'success', text: `已购买 ${pkg.name}（${pkg.token_amount.toLocaleString()} Token），实付 ¥${(pkg.price * (1 - pkg.discount_percentage / 100)).toFixed(2)}` });
      // 刷新数据
      loadTokenData();
      setTimeout(() => setBuyMsg(null), 5000);
    } else {
      setBuyMsg({ type: 'error', text: result.error || '购买失败' });
      setTimeout(() => setBuyMsg(null), 5000);
    }
  };

  // Token 数据加载
  const loadTokenData = useCallback(async () => {
    if (!user) return;
    setTokenLoading(true);
    try {
      const [balance, packages, history, config, consumption] = await Promise.all([
        getTokenBalanceSummary(user.id),
        getTokenPackages(),
        getPurchaseHistory(user.id),
        getUserTokenConfig(user.id),
        getTokenConsumption(user.id, undefined, consumptionPage, 20),
      ]);
      if (balance) setTokenBalanceData(balance);
      if (packages) setTokenPackages(packages);
      if (history) setPurchaseHistory(history);
      if (config) {
        setTokenConfig(config);
        setLowBalanceThreshold(config.low_balance_threshold);
        setDailyLimit(config.daily_limit);
        setAutoRecharge(config.auto_recharge_enabled);
        setAutoRechargePkg(config.auto_recharge_package_id || '');
        setNotifyEmail(config.notification_email);
        setNotifyWechat(config.notification_wechat);
      }
      if (consumption) setConsumptionData(consumption);
    } catch (err) {
      console.error('加载 Token 数据失败:', err);
    } finally {
      setTokenLoading(false);
    }
  }, [user, consumptionPage]);

  // 保存 Token 配置
  const handleSaveTokenConfig = async () => {
    if (!user) return;
    const success = await updateUserTokenConfig(user.id, {
      low_balance_threshold: lowBalanceThreshold,
      daily_limit: dailyLimit,
      auto_recharge_enabled: autoRecharge,
      auto_recharge_package_id: autoRechargePkg || null,
      notification_email: notifyEmail,
      notification_wechat: notifyWechat,
    });
    if (success) {
      setConfigMsg({ type: 'success', text: '配置已保存' });
    } else {
      setConfigMsg({ type: 'error', text: '保存失败' });
    }
    setTimeout(() => setConfigMsg(null), 3000);
  };

  // 页面加载时获取 Token 数据
  useEffect(() => {
    if (activeTab === 4 && user) {
      loadTokenData();
    }
  }, [activeTab, user, loadTokenData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(profile?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile?.username || user?.email?.split('@')[0]}</h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {profile?.role === 'admin' ? '管理员' : '用户'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === i
                      ? 'text-black border-b-2 border-black'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* ================================================================ */}
            {/* Tab 0: 个人资料 */}
            {/* ================================================================ */}
            {activeTab === 0 && (
              <div className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">邮箱暂不支持自行修改</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    placeholder="输入昵称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <input
                    type="text"
                    value={profile?.role === 'admin' ? '管理员' : '普通用户'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">注册时间</label>
                  <input
                    type="text"
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                  />
                </div>
                {profileMsg && (
                  <div className={`px-4 py-2 rounded-lg text-sm ${
                    profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {profileMsg.text}
                  </div>
                )}
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  保存修改
                </button>
              </div>
            )}

            {/* ================================================================ */}
            {/* Tab 1: 账号安全 */}
            {/* ================================================================ */}
            {activeTab === 1 && (
              <div className="max-w-lg space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">修改密码</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                      <input
                        type="password"
                        value={oldPwd}
                        onChange={e => setOldPwd(e.target.value)}
                        placeholder="输入当前密码"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                      <input
                        type="password"
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        placeholder="至少 6 位"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                      <input
                        type="password"
                        value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        placeholder="再次输入新密码"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      />
                    </div>
                    {pwdMsg && (
                      <div className={`px-4 py-2 rounded-lg text-sm ${
                        pwdMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {pwdMsg.text}
                      </div>
                    )}
                    <button
                      onClick={handleChangePassword}
                      className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      修改密码
                    </button>
                  </div>
                </div>

                <hr className="border-gray-200" />

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">最近登录记录</h3>
                  <div className="space-y-2">
                    {[
                      { time: '2026-05-29 10:30', device: '桌面端 (Chrome)', ip: '192.168.1.100' },
                      { time: '2026-05-28 22:15', device: '移动端 (Safari)', ip: '10.0.0.5' },
                      { time: '2026-05-27 08:00', device: '桌面端 (Chrome)', ip: '192.168.1.100' },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-gray-900">{log.time}</span>
                          <span className="text-gray-500">{log.device}</span>
                        </div>
                        <span className="text-gray-400 text-xs">{log.ip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* Tab 2: 套餐订阅 */}
            {/* ================================================================ */}
            {activeTab === 2 && (
              <div className="space-y-6">
                {/* 当前套餐 */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">当前套餐</h3>
                      <p className="text-sm text-gray-500">
                        {subscription.billing_cycle === 'monthly' ? '月付' : '年付'} · {subscription.auto_renew ? '自动续费' : '手动续费'}
                      </p>
                    </div>
                    <span className="px-4 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-full">
                      {CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.name || subscription.plan_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">商品上限</span>
                      <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.products}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">月订单上限</span>
                      <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.orders}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">域名</span>
                      <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.domain}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">到期时间</span>
                      <p className="font-medium text-gray-900">{subscription.expires_at || '永久'}</p>
                    </div>
                  </div>
                </div>

                {/* 可选套餐 */}
                <h3 className="text-lg font-semibold text-gray-900">选择套餐</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {CLOUD_PLANS.map((plan) => {
                    const isCurrent = plan.key === subscription.plan_type;
                    const isDowngrade = CLOUD_PLANS.findIndex(p => p.key === plan.key) < CLOUD_PLANS.findIndex(p => p.key === subscription.plan_type);
                    return (
                      <div
                        key={plan.key}
                        className={`rounded-xl p-5 border-2 ${
                          isCurrent ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-400'
                        } transition-colors`}
                      >
                        {isCurrent && <span className="inline-block px-2 py-0.5 bg-gray-900 text-white text-xs rounded-full mb-2">当前</span>}
                        <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                        <p className="text-2xl font-extrabold text-gray-900 mt-1">{plan.price}</p>
                        <p className="text-xs text-gray-400 mb-3">月付</p>
                        <div className="space-y-1 text-sm text-gray-600 mb-4">
                          <p>商品: {plan.products}</p>
                          <p>订单: {plan.orders}</p>
                          <p>域名: {plan.domain}</p>
                        </div>
                        <button
                          disabled={isCurrent}
                          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                            isCurrent
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-900 text-white hover:bg-gray-800'
                          }`}
                          onClick={() => {
                            setSubscription(prev => ({ ...prev, plan_type: plan.key }));
                          }}
                        >
                          {isCurrent ? '当前套餐' : isDowngrade ? '降级' : '升级'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* Tab 3: API 密钥管理 */}
            {/* ================================================================ */}
            {activeTab === 3 && (
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
            )}

            {/* ================================================================ */}
            {/* Tab 4: Token 管理 */}
            {/* ================================================================ */}
            {activeTab === 4 && (
              <div className="space-y-6">
                {/* 加载中 */}
                {tokenLoading && (
                  <div className="text-center py-8 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    加载中...
                  </div>
                )}

                {!tokenLoading && (
                  <>
                    {/* 余额概览 */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-300">当前 Token 余额</p>
                        {tokenBalanceData && (
                          <span className="text-xs text-gray-400" title="余额 / 近30天日均消耗">
                            预估可用 {tokenBalanceData.estimated_days} 天
                          </span>
                        )}
                      </div>
                      <p className="text-4xl font-bold mb-3">
                        {tokenBalanceData ? tokenBalanceData.balance.toLocaleString() : '---'}
                        <span className="text-lg text-gray-300 ml-2">PT</span>
                      </p>
                      <div className="flex gap-6 text-sm text-gray-300">
                        <span>今日消耗: {tokenBalanceData ? tokenBalanceData.today_used.toLocaleString() : '---'} PT</span>
                        <span>近30日日均: {tokenBalanceData ? tokenBalanceData.daily_avg_30d.toLocaleString() : '---'} PT</span>
                      </div>
                      {dailyLimit > 0 && tokenBalanceData && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>日消耗上限: {dailyLimit.toLocaleString()} PT</span>
                            <span>{Math.min(Math.round((tokenBalanceData.today_used / dailyLimit) * 100), 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                (tokenBalanceData.today_used / dailyLimit) > 0.8
                                  ? 'bg-red-500'
                                  : (tokenBalanceData.today_used / dailyLimit) > 0.5
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((tokenBalanceData.today_used / dailyLimit) * 100, 100)}%` }}
                            />
                          </div>
                          {tokenBalanceData.today_used >= dailyLimit && (
                            <p className="text-xs text-red-400 mt-1">已到达每日消耗上限</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 消息提示 */}
                    {buyMsg && (
                      <div className={`px-4 py-3 rounded-lg text-sm ${
                        buyMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>{buyMsg.text}</div>
                    )}

                    {configMsg && (
                      <div className={`px-4 py-3 rounded-lg text-sm ${
                        configMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>{configMsg.text}</div>
                    )}

                    {/* Token 套餐购买 */}
                    <h3 className="text-lg font-semibold text-gray-900">购买 Token</h3>
                    <p className="text-xs text-gray-400 mb-3">1 PT = ¥0.001（即 1,000 PT = ¥1）</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {tokenPackages.map((pkg) => {
                        const finalPrice = pkg.price * (1 - pkg.discount_percentage / 100);
                        return (
                          <div key={pkg.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition-colors flex flex-col">
                            <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">¥{finalPrice.toFixed(0)}</p>
                            <p className="text-xs text-gray-400">
                              {pkg.discount_percentage > 0 && <span className="line-through mr-1">¥{pkg.price}</span>}
                              {pkg.discount_percentage > 0 && <span className="text-red-500">-{Math.round(pkg.discount_percentage)}%</span>}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">{pkg.token_amount.toLocaleString()} PT</p>
                            <p className="text-xs text-gray-400 mt-1">
                              单价 {(pkg.price / pkg.token_amount * 1000).toFixed(2)} 元/千PT
                            </p>
                            <div className="flex-grow"></div>
                            <button
                              onClick={() => handleBuyTokens(pkg)}
                              disabled={tokenLoading}
                              className="mt-4 w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                            >
                              {tokenLoading ? '处理中...' : '购买'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* 消费明细 */}
                    <h3 className="text-lg font-semibold text-gray-900 pt-4">消费明细</h3>
                    <div className="space-y-2">
                      {consumptionData && consumptionData.items.length > 0 ? (
                        consumptionData.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-900 text-xs">
                                {new Date(item.created_at).toLocaleString('zh-CN')}
                              </span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {item.resource_type}
                              </span>
                            </div>
                            <span className="font-medium text-orange-600">-{item.tokens_used} PT</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">暂无消费记录</p>
                      )}
                      {consumptionData && consumptionData.total > 20 && (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setConsumptionPage(p => Math.max(1, p - 1))}
                            disabled={consumptionPage === 1}
                            className="px-3 py-1 text-sm border rounded disabled:text-gray-300"
                          >
                            上一页
                          </button>
                          <span className="px-3 py-1 text-sm text-gray-500">
                            第 {consumptionPage} 页 / 共 {Math.ceil(consumptionData.total / 20)} 页
                          </span>
                          <button
                            onClick={() => setConsumptionPage(p => p + 1)}
                            disabled={consumptionPage * 20 >= consumptionData.total}
                            className="px-3 py-1 text-sm border rounded disabled:text-gray-300"
                          >
                            下一页
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 充值记录 */}
                    <h3 className="text-lg font-semibold text-gray-900 pt-4">充值记录</h3>
                    <div className="space-y-2">
                      {purchaseHistory.length > 0 ? (
                        purchaseHistory.map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-900">
                                {new Date(sale.created_at).toLocaleDateString('zh-CN')}
                              </span>
                              <span className="text-green-600 font-medium">+{sale.amount.toLocaleString()} PT</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">¥{sale.price.toFixed(2)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                sale.status === 'completed' ? 'bg-green-50 text-green-700' :
                                sale.status === 'refunded' ? 'bg-red-50 text-red-700' :
                                'bg-yellow-50 text-yellow-700'
                              }`}>
                                {sale.status === 'completed' ? '已完成' :
                                 sale.status === 'refunded' ? '已退款' : '处理中'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">暂无充值记录</p>
                      )}
                    </div>

                    {/* 余额预警配置 */}
                    <h3 className="text-lg font-semibold text-gray-900 pt-4">余额预警配置</h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">低余额提醒阈值 (PT)</label>
                          <input
                            type="number"
                            value={lowBalanceThreshold}
                            onChange={e => setLowBalanceThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                            min="0"
                            step="1000"
                          />
                          <p className="text-xs text-gray-400 mt-1">余额低于此值时发送提醒</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">每日消耗上限 (PT, 0=不限)</label>
                          <input
                            type="number"
                            value={dailyLimit}
                            onChange={e => setDailyLimit(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                            min="0"
                            step="1000"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={autoRecharge}
                          onChange={e => setAutoRecharge(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label className="text-sm text-gray-700">启用自动充值</label>
                        {autoRecharge && (
                          <select
                            value={autoRechargePkg}
                            onChange={e => setAutoRechargePkg(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                          >
                            <option value="">选择自动充值套餐</option>
                            {tokenPackages.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} className="rounded border-gray-300" />
                          邮件通知
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={notifyWechat} onChange={e => setNotifyWechat(e.target.checked)} className="rounded border-gray-300" />
                          微信通知
                        </label>
                      </div>
                      <button
                        onClick={handleSaveTokenConfig}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                        保存配置
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ================================================================ */}
            {/* Tab 5: 云数据管理 */}
            {/* ================================================================ */}
            {activeTab === 5 && (
              <div className="space-y-6">
                {/* 商城概览 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">云商城概览</h3>
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">已开通</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">子域名</span>
                      <p className="font-medium text-gray-900">mypro.proclaw.cc</p>
                    </div>
                    <div>
                      <span className="text-gray-500">当前套餐</span>
                      <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">状态</span>
                      <p className="font-medium text-green-600">运行中</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <a href="https://mypro.proclaw.cc" target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      访问商城
                    </a>
                    <button onClick={() => setActiveTab(2)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      管理套餐
                    </button>
                  </div>
                </div>

                {/* 数据同步 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">数据同步</h3>
                    <button className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      立即同步
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500">已同步商品</p>
                      <p className="text-2xl font-bold text-gray-900">{syncCount.synced}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500">待同步商品</p>
                      <p className="text-2xl font-bold text-orange-600">{syncCount.pending}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-700 mb-2">最近同步记录</p>
                    {[
                      { time: '2026-05-29 10:30', type: '增量同步', status: 'success' as const },
                      { time: '2026-05-29 08:15', type: '全量同步', status: 'success' as const },
                      { time: '2026-05-28 22:00', type: '增量同步', status: 'success' as const },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg">
                        <svg className={`w-4 h-4 ${log.status === 'success' ? 'text-green-500' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
                          {log.status === 'success'
                            ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            : <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          }
                        </svg>
                        <span className="text-gray-900">{log.time}</span>
                        <span className="text-gray-500">{log.type}</span>
                        <span className="text-green-600 text-xs ml-auto">成功</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 近期订单 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">近期订单</h3>
                    <span className="text-sm text-gray-500">本月 23 单 · 总销售额 ¥3,547</span>
                  </div>
                  <div className="space-y-2">
                    {storeOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-gray-900">{order.id}</span>
                          <span className="text-gray-500">{order.customer}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-900">{order.amount}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            order.status === '待发货' ? 'bg-yellow-50 text-yellow-700' :
                            order.status === '已发货' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UserCenterPage;
