// Admin Token 监控面板
// 全局 Token 消耗概览、异常告警、定价规则管理

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTokenPricingRules, getTokenPackages } from '../lib/tokenService';
import type { TokenPricingRule, TokenPackage } from '../types';

interface TokenStats {
  total_consumed_today: number;
  total_consumed_month: number;
  total_revenue: number;
  total_purchased: number;
  active_users_today: number;
  low_balance_users: number;
}

interface AnomalyUser {
  user_id: string;
  today_consumed: number;
  daily_avg_7d: number;
  ratio: number;
  last_recharge_days: number;
  risk: 'high' | 'medium' | 'low';
}

interface DebtUser {
  user_id: string;
  balance: number;
  status: string;
  days_overdue: number;
  last_active: string | null;
}

const AdminTokenMonitorPage: React.FC = () => {
  const [stats, setStats] = useState<TokenStats>({
    total_consumed_today: 0,
    total_consumed_month: 0,
    total_revenue: 0,
    total_purchased: 0,
    active_users_today: 0,
    low_balance_users: 0,
  });
  const [pricingRules, setPricingRules] = useState<TokenPricingRule[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<TokenPricingRule | null>(null);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [anomalyUsers, setAnomalyUsers] = useState<AnomalyUser[]>([]);
  const [debtUsers, setDebtUsers] = useState<DebtUser[]>([]);
  const [activeSection, setActiveSection] = useState<'overview' | 'pricing' | 'anomalies' | 'debt'>('overview');

  // 加载统计数据
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        // 今日消耗
        const { data: todayData } = await supabase
          .from('api_usage_logs')
          .select('tokens_used', { count: 'exact' })
          .gte('created_at', new Date().toISOString().split('T')[0]);

        const todayTotal = todayData?.reduce((sum, r) => sum + (r.tokens_used || 0), 0) || 0;

        // 本月消耗
        const monthStart = new Date();
        monthStart.setDate(1);
        const { data: monthData } = await supabase
          .from('api_usage_logs')
          .select('tokens_used')
          .gte('created_at', monthStart.toISOString().split('T')[0]);

        const monthTotal = monthData?.reduce((sum, r) => sum + (r.tokens_used || 0), 0) || 0;

        // 总收入
        const { data: revenueData } = await supabase
          .from('token_sales')
          .select('price')
          .eq('status', 'completed');

        const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.price || 0), 0) || 0;

        // 总销售量
        const { data: purchasedData } = await supabase
          .from('token_sales')
          .select('amount')
          .eq('status', 'completed');

        const totalPurchased = purchasedData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

        // 今日活跃用户数
        const { count: activeToday } = await supabase
          .from('api_usage_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]);

        // 低余额用户数
        const { data: lowBalanceData } = await supabase
          .from('user_token_config')
          .select('user_id')
          .lte('low_balance_threshold', 10000);

        const { data: balanceData } = await supabase
          .from('token_balances')
          .select('user_id, balance')
          .in('user_id', lowBalanceData?.map(c => c.user_id) || []);

        const lowBalanceCount = balanceData?.filter(b => {
          const config = lowBalanceData?.find(c => c.user_id === b.user_id);
          return config && b.balance < 10000;
        }).length || 0;

        setStats({
          total_consumed_today: todayTotal,
          total_consumed_month: monthTotal,
          total_revenue: totalRevenue,
          total_purchased: totalPurchased,
          active_users_today: activeToday || 0,
          low_balance_users: lowBalanceCount,
        });

        // 加载定价规则和套餐
        const [rules, pkgs] = await Promise.all([
          getTokenPricingRules(),
          getTokenPackages(),
        ]);
        setPricingRules(rules);
        setPackages(pkgs);

        // 加载异常消耗告警（近7天日均消耗突增超过均值3倍的用户）
        const anomalyData = await loadAnomalyUsersInternal();
        setAnomalyUsers(anomalyData);

        // 加载欠费用户列表
        const debtData = await loadDebtUsersInternal();
        setDebtUsers(debtData);
      } catch (err: any) {
        console.error('加载 Token 监控数据失败:', err);
        if (!import.meta.env.VITE_SUPABASE_URL?.startsWith('http')) {
          setError('演示模式：Supabase 未配置，无法加载实时数据');
        } else {
          setError(err.message || '加载失败');
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);


// =====================
// 辅助函数：异常消耗检测
// =====================

async function loadAnomalyUsersInternal(): Promise<AnomalyUser[]> {
  try {
    // 获取今日有消耗记录的用户
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentLogs } = await supabase
      .from('api_usage_logs')
      .select('user_id, tokens_used, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!recentLogs || recentLogs.length === 0) return [];

    // 按用户分组
    const userMap = new Map<string, { dailyTotals: Map<string, number>; total: number }>();
    for (const log of recentLogs) {
      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, { dailyTotals: new Map(), total: 0 });
      }
      const entry = userMap.get(log.user_id)!;
      const day = log.created_at?.slice(0, 10) || 'unknown';
      entry.dailyTotals.set(day, (entry.dailyTotals.get(day) || 0) + (log.tokens_used || 0));
      entry.total += log.tokens_used || 0;
    }

    // 检查是否有充值记录
    const { data: recentSales } = await supabase
      .from('token_sales')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('status', 'completed');

    const recentlyRecharged = new Set(recentSales?.map(s => s.user_id) || []);

    // 获取今日消耗
    const today = new Date().toISOString().slice(0, 10);
    const anomalies: AnomalyUser[] = [];

    for (const [userId, data] of userMap.entries()) {
      const daysWithData = data.dailyTotals.size;
      if (daysWithData < 2) continue;

      const dailyAvg = data.total / daysWithData;
      const todayConsumed = data.dailyTotals.get(today) || 0;

      if (todayConsumed > dailyAvg * 3 && todayConsumed > 5000) {
        anomalies.push({
          user_id: userId,
          today_consumed: todayConsumed,
          daily_avg_7d: Math.round(dailyAvg),
          ratio: Math.round((todayConsumed / (dailyAvg || 1)) * 10) / 10,
          last_recharge_days: recentlyRecharged.has(userId) ? 0 : 8,
          risk: todayConsumed > dailyAvg * 5 ? 'high' : 'medium',
        });
      }
    }

    return anomalies.sort((a, b) => b.ratio - a.ratio).slice(0, 20);
  } catch (err) {
    console.error('加载异常消耗数据失败:', err);
    return [];
  }
}

async function loadDebtUsersInternal(): Promise<DebtUser[]> {
  try {
    const { data: debtData } = await supabase
      .from('token_balances')
      .select('user_id, balance')
      .lte('balance', 0);

    if (!debtData || debtData.length === 0) return [];

    // 查询这些用户的最近扣费失败记录
    const userIds = debtData.map(d => d.user_id);
    const { data: failLogs } = await supabase
      .from('api_usage_logs')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .eq('endpoint', 'insufficient_balance')
      .order('created_at', { ascending: false });

    const failMap = new Map<string, string>();
    if (failLogs) {
      for (const log of failLogs) {
        if (!failMap.has(log.user_id)) {
          failMap.set(log.user_id, log.created_at);
        }
      }
    }

    return debtData.map(d => {
      const lastFail = failMap.get(d.user_id);
      const daysOverdue = lastFail
        ? Math.round((Date.now() - new Date(lastFail).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      let status = 'warning';
      if (daysOverdue > 30) status = 'archived';
      else if (daysOverdue > 7) status = 'suspended';
      else if (daysOverdue > 3) status = 'readonly';

      return {
        user_id: d.user_id,
        balance: d.balance,
        status,
        days_overdue: daysOverdue,
        last_active: lastFail || null,
      };
    });
  } catch (err) {
    console.error('加载欠费用户数据失败:', err);
    return [];
  }
}

// =====================
// 状态标签辅助函数
// =====================

function DebtStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    warning: 'bg-yellow-50 text-yellow-700',
    readonly: 'bg-orange-50 text-orange-700',
    suspended: 'bg-red-50 text-red-700',
    archived: 'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    warning: '警告',
    readonly: '只读',
    suspended: '停服',
    archived: '归档',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const styles: Record<string, string> = {
    high: 'bg-red-50 text-red-700',
    medium: 'bg-yellow-50 text-yellow-700',
    low: 'bg-green-50 text-green-700',
  };
  const labels: Record<string, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[risk] || ''}`}>
      {labels[risk] || risk}
    </span>
  );
}

// =====================
// 定价规则编辑弹窗
// =====================

const EditPricingRuleModal: React.FC<{
  rule: TokenPricingRule | null;
  onClose: () => void;
  onSave: () => void;
}> = ({ rule, onClose, onSave }) => {
  const isNew = !rule;
  const [form, setForm] = useState({
    resource_type: rule?.resource_type || '',
    action_name: rule?.action_name || '',
    description: rule?.description || '',
    pt_cost: rule?.pt_cost || 0,
    unit: rule?.unit || 'per_request',
    is_active: rule?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await supabase.from('token_pricing_rules').insert({
          resource_type: form.resource_type,
          action_name: form.action_name,
          description: form.description,
          pt_cost: form.pt_cost,
          unit: form.unit,
          is_active: form.is_active,
          sort_order: 99,
        });
      } else if (rule) {
        await supabase
          .from('token_pricing_rules')
          .update({
            resource_type: form.resource_type,
            action_name: form.action_name,
            description: form.description,
            pt_cost: form.pt_cost,
            unit: form.unit,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rule.id);
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error('保存定价规则失败:', err);
      alert('保存失败: ' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!rule || isNew) return;
    setSaving(true);
    try {
      await supabase
        .from('token_pricing_rules')
        .update({ is_active: !rule.is_active, updated_at: new Date().toISOString() })
        .eq('id', rule.id);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('切换状态失败:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{isNew ? '新建定价规则' : '编辑定价规则'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">资源类型 (resource_type)</label>
            <input
              type="text"
              value={form.resource_type}
              onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="例如: product_sync"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作名称</label>
            <input
              type="text"
              value={form.action_name}
              onChange={e => setForm(f => ({ ...f, action_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">说明</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消耗 PT</label>
              <input
                type="number"
                value={form.pt_cost}
                onChange={e => setForm(f => ({ ...f, pt_cost: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">计费单位</label>
              <select
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="per_request">per_request</option>
                <option value="per_item">per_item</option>
                <option value="per_month">per_month</option>
                <option value="per_day">per_day</option>
                <option value="per_mb_month">per_mb_month</option>
                <option value="per_item_month">per_item_month</option>
                <option value="per_hundred_month">per_hundred_month</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div>
            {!isNew && (
              <button
                onClick={handleToggleActive}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  form.is_active
                    ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {form.is_active ? '停用此规则' : '启用此规则'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.resource_type || !form.action_name}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
          {error}
        </div>
      )}

      {/* 概览统计 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Token 消耗概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">今日消耗</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_consumed_today.toLocaleString()}</p>
            <p className="text-xs text-gray-400">PT</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">本月消耗</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_consumed_month.toLocaleString()}</p>
            <p className="text-xs text-gray-400">PT</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">总收入</p>
            <p className="text-2xl font-bold text-green-600">¥{stats.total_revenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400">Token 销售</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">已售 Token</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_purchased.toLocaleString()}</p>
            <p className="text-xs text-gray-400">PT</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">今日活跃用户</p>
            <p className="text-2xl font-bold text-blue-600">{stats.active_users_today}</p>
            <p className="text-xs text-gray-400">有操作记录</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">低余额用户</p>
            <p className="text-2xl font-bold text-orange-600">{stats.low_balance_users}</p>
            <p className="text-xs text-gray-400">余额 &lt; 阈值</p>
          </div>
        </div>
      </div>

      {/* 功能区域 Tab */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 -mb-px">
          {[
            { key: 'overview', label: '概览' },
            { key: 'pricing', label: `定价规则 (${pricingRules.length})` },
            { key: 'anomalies', label: `异常告警 (${anomalyUsers.length})` },
            { key: 'debt', label: `欠费用户 (${debtUsers.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as typeof activeSection)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeSection === tab.key
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 定价规则管理 */}
      {activeSection === 'pricing' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Token 消耗定价规则</h2>
            <button
              onClick={() => setShowNewRuleForm(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              + 新建规则
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">操作类型</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">名称</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">说明</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">消耗 PT</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">计费单位</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pricingRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{rule.resource_type}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{rule.action_name}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{rule.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{rule.pt_cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{rule.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        rule.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rule.is_active ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="text-xs text-gray-500 hover:text-gray-900 underline"
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
                {pricingRules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      暂无定价规则数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 异常消耗告警 */}
      {activeSection === 'anomalies' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">异常消耗告警</h2>
          <p className="text-sm text-gray-500 mb-4">检测今日消耗突增超过近7天日均消耗3倍以上的用户</p>
          {anomalyUsers.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">用户 ID</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">今日消耗</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">近7日日均</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">突增倍数</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">风险等级</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">近7天充值</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {anomalyUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{user.user_id.slice(0, 12)}...</td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600">{user.today_consumed.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{user.daily_avg_7d.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{user.ratio}x</td>
                      <td className="px-4 py-3 text-center"><RiskBadge risk={user.risk} /></td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {user.last_recharge_days > 7 ? `${user.last_recharge_days}天无充值` : '有充值'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="text-lg mb-1">暂无异常消耗</p>
              <p className="text-sm">所有用户今日消耗均在正常范围内</p>
            </div>
          )}
        </div>
      )}

      {/* 欠费用户列表 */}
      {activeSection === 'debt' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">欠费用户列表</h2>
          {debtUsers.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">用户 ID</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">余额</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">逾期天数</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">最后活跃</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {debtUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{user.user_id.slice(0, 12)}...</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{user.balance}</td>
                      <td className="px-4 py-3 text-center"><DebtStatusBadge status={user.status} /></td>
                      <td className="px-4 py-3 text-right text-gray-600">{user.days_overdue} 天</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">
                        {user.last_active ? new Date(user.last_active).toLocaleString('zh-CN') : '无记录'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="text-lg mb-1">暂无欠费用户</p>
              <p className="text-sm">所有用户账户状态正常</p>
            </div>
          )}
        </div>
      )}

      {/* Token 套餐管理 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Token 充值套餐</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {packages.map((pkg) => {
            const finalPrice = pkg.price * (1 - pkg.discount_percentage / 100);
            return (
              <div key={pkg.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                <p className="text-lg font-bold text-gray-900 mt-1">¥{finalPrice.toFixed(0)}</p>
                <p className="text-xs text-gray-400">
                  {pkg.discount_percentage > 0 && <span className="line-through mr-1">¥{pkg.price}</span>}
                  {pkg.discount_percentage > 0 && <span className="text-red-500">-{pkg.discount_percentage}%</span>}
                </p>
                <p className="text-sm text-gray-600 mt-1">{pkg.token_amount.toLocaleString()} PT</p>
                <p className="text-xs text-gray-400 mt-1">
                  单价 {(pkg.price / pkg.token_amount * 1000).toFixed(2)} 元/千PT
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 最新消耗记录（Top 20） */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">最新 Token 消耗</h2>
        <LatestConsumptionLogs />
      </div>

      {/* 编辑弹窗 */}
      {(editingRule || showNewRuleForm) && (
        <EditPricingRuleModal
          rule={editingRule}
          onClose={() => { setEditingRule(null); setShowNewRuleForm(false); }}
          onSave={async () => {
            const rules = await getTokenPricingRules();
            setPricingRules(rules);
            const anomalyData = await loadAnomalyUsersInternal();
            setAnomalyUsers(anomalyData);
            const debtData = await loadDebtUsersInternal();
            setDebtUsers(debtData);
          }}
        />
      )}
    </div>
  );
};


// =====================
// 最新消耗记录子组件
// =====================

const LatestConsumptionLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('api_usage_logs')
          .select('id, user_id, resource_type, tokens_used, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('加载消耗记录失败:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-400">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-medium text-gray-600">用户 ID</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">资源类型</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">消耗 PT</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">时间</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.user_id?.slice(0, 8)}...</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{log.resource_type || '-'}</span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-orange-600">{log.tokens_used}</td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs">
                {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                暂无消耗记录
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTokenMonitorPage;
