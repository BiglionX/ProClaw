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
import ProfileTab from '../components/user-center/ProfileTab';
import SecurityTab from '../components/user-center/SecurityTab';
import SubscriptionTab from '../components/user-center/SubscriptionTab';
import ApiKeyTab from '../components/user-center/ApiKeyTab';
import TokenTab from '../components/user-center/TokenTab';
import CloudDataTab from '../components/user-center/CloudDataTab';

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

  // Token
  const [tokenBalanceData, setTokenBalanceData] = useState<TokenBalanceSummary | null>(null);
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<TokenSale[]>([]);
  const [, setTokenConfig] = useState<UserTokenConfig | null>(null);
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

  // Token 购买
  const handleBuyTokens = async (pkg: TokenPackage) => {
    if (!user) return;
    setTokenLoading(true);
    const result = await purchaseToken(user.id, pkg.id);
    setTokenLoading(false);
    if (result.success) {
      setBuyMsg({ type: 'success', text: `已购买 ${pkg.name}（${pkg.token_amount.toLocaleString()} Token），实付 ¥${(pkg.price * (1 - pkg.discount_percentage / 100)).toFixed(2)}` });
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

  // 渲染当前 Tab 内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <ProfileTab
            user={user}
            profile={profile}
            editUsername={editUsername}
            setEditUsername={setEditUsername}
            profileMsg={profileMsg}
            handleSaveProfile={handleSaveProfile}
          />
        );
      case 1:
        return (
          <SecurityTab
            oldPwd={oldPwd}
            setOldPwd={setOldPwd}
            newPwd={newPwd}
            setNewPwd={setNewPwd}
            confirmPwd={confirmPwd}
            setConfirmPwd={setConfirmPwd}
            pwdMsg={pwdMsg}
            handleChangePassword={handleChangePassword}
          />
        );
      case 2:
        return (
          <SubscriptionTab
            subscription={subscription}
            setSubscription={setSubscription}
          />
        );
      case 3:
        return (
          <ApiKeyTab
            apiKeys={apiKeys}
            setApiKeys={setApiKeys}
          />
        );
      case 4:
        return (
          <TokenTab
            tokenBalanceData={tokenBalanceData}
            tokenPackages={tokenPackages}
            purchaseHistory={purchaseHistory}
            consumptionData={consumptionData}
            tokenLoading={tokenLoading}
            consumptionPage={consumptionPage}
            setConsumptionPage={setConsumptionPage}
            buyMsg={buyMsg}
            configMsg={configMsg}
            lowBalanceThreshold={lowBalanceThreshold}
            setLowBalanceThreshold={setLowBalanceThreshold}
            dailyLimit={dailyLimit}
            setDailyLimit={setDailyLimit}
            autoRecharge={autoRecharge}
            setAutoRecharge={setAutoRecharge}
            autoRechargePkg={autoRechargePkg}
            setAutoRechargePkg={setAutoRechargePkg}
            notifyEmail={notifyEmail}
            setNotifyEmail={setNotifyEmail}
            notifyWechat={notifyWechat}
            setNotifyWechat={setNotifyWechat}
            handleBuyTokens={handleBuyTokens}
            handleSaveTokenConfig={handleSaveTokenConfig}
          />
        );
      case 5:
        return (
          <CloudDataTab
            subscription={subscription}
            setActiveTab={setActiveTab}
          />
        );
      default:
        return null;
    }
  };

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
            {renderTabContent()}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UserCenterPage;
