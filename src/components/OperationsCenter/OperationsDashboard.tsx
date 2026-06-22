import React, { useState, useEffect, useCallback } from 'react';
import { safeInvoke } from '../../lib/tauri';

// ==================== 运营中心主仪表板 ====================

const OperationsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'social' | 'approvals' | 'alerts' | 'usage'>('overview');

  const tabs = [
    { key: 'overview', label: '总览' },
    { key: 'seo', label: 'SEO 健康' },
    { key: 'social', label: '社媒数据' },
    { key: 'approvals', label: '待审核内容' },
    { key: 'alerts', label: '异常预警' },
    { key: 'usage', label: 'AI 用量' },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">运营中心</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          网站运营 AI Team 与多区域社媒运营数据总览
        </p>
      </div>

      {/* 标签页导航 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'seo' && <SEOHealthCard />}
      {activeTab === 'social' && <SocialMediaStats />}
      {activeTab === 'approvals' && <PendingContentList />}
      {activeTab === 'alerts' && <AlertList />}
      {activeTab === 'usage' && <AIUsageStats />}
    </div>
  );
};

// ==================== 总览标签 ====================

interface OverviewStats {
  aiUsage: number;
  aiUsageToday: number;
  userCount: number;
  enabledAgents: number;
  pendingContent: number;
  pendingApprovals: number;
  weekPosts: number;
  socialAccounts: number;
}

interface AiTeamStatus {
  name: string;
  agents: string[];
  status: 'running' | 'paused';
}

const TEAM_FALLBACK: AiTeamStatus[] = [
  { name: '网站运营 AI Team', agents: ['SEO 优化', '内容生成', '数据分析', '转化优化'], status: 'running' },
  { name: '欧美社媒 Team', agents: ['Twitter', 'Facebook', 'Instagram', 'LinkedIn'], status: 'running' },
  { name: '东南亚社媒 Team', agents: ['TikTok', 'Instagram', 'Facebook'], status: 'paused' },
  { name: '国内社媒 Team', agents: ['微信公众号', '小红书', '知乎', '微博'], status: 'running' },
];

const OverviewTab: React.FC = () => {
  const [stats, setStats] = React.useState<OverviewStats>({
    aiUsage: 0, aiUsageToday: 0, userCount: 0, enabledAgents: 0,
    pendingContent: 0, pendingApprovals: 0, weekPosts: 0, socialAccounts: 5,
  });
  const [teamStatus, setTeamStatus] = React.useState<AiTeamStatus[]>(TEAM_FALLBACK);

  React.useEffect(() => {
    const fetchOverviewStats = async () => {
      try {
        const res = await safeInvoke<Record<string, number>>('get_operations_overview_cmd', {});
        if (res) {
          setStats({
            aiUsage: Number(res.ai_usage_total ?? 0),
            aiUsageToday: Number(res.ai_usage_today ?? 0),
            userCount: Number(res.user_count ?? 0),
            enabledAgents: Number(res.enabled_agents ?? 0),
            pendingContent: Number(res.pending_content ?? 0),
            pendingApprovals: Number(res.pending_approvals ?? 0),
            weekPosts: Number(res.week_posts ?? 0),
            socialAccounts: Number(res.social_accounts ?? 5),
          });
        }
      } catch (e) {
        console.error('Failed to fetch overview stats:', e);
      }
    };
    const fetchTeams = async () => {
      try {
        const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>('get_operations_teams_cmd', {});
        const rows = res?.data ?? [];
        if (rows.length > 0) {
          setTeamStatus(rows.map((t) => ({
            name: String(t.name ?? ''),
            agents: Array.isArray(t.agents) ? t.agents.map(String) : [],
            status: (String(t.status ?? 'running') as AiTeamStatus['status']),
          })));
        }
      } catch {
        /* keep fallback */
      }
    };
    fetchOverviewStats();
    fetchTeams();
  }, []);

  const summaryCards = [
    { label: 'AI 总消耗', value: `${stats.aiUsage} PT`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: '本地用户', value: `${stats.userCount} 个`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: '社媒账号', value: `${stats.socialAccounts} 个`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: '待发布内容', value: `${stats.pendingContent} 条`, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: '进行中 Agent', value: `${stats.enabledAgents} 个`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: '本周发帖', value: `${stats.weekPosts} 条`, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {summaryCards.map((card, idx) => (
          <div key={idx} className={`${card.bg} rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">AI Team 运行状态</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {teamStatus.map((team, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{team.name}</h4>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                team.status === 'running'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {team.status === 'running' ? '运行中' : '已暂停'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.agents.map((agent, aidx) => (
                <span key={aidx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                  {agent}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== SEO 健康卡片 ====================

interface SeoMetric {
  label: string;
  value: string;
  detail: string;
  trend: 'up' | 'down' | 'warning';
}

interface SeoRecommendation {
  priority: '高' | '中' | '低';
  title: string;
  desc: string;
}

const SEO_FALLBACK_METRICS: SeoMetric[] = [
  { label: '关键词排名', value: '12 个跟踪', detail: '前10: 3个', trend: 'up' },
  { label: '页面加载时间', value: '2.8s', detail: '目标: 2.5s', trend: 'down' },
  { label: '死链数量', value: '2 个', detail: '需修复', trend: 'warning' },
  { label: '索引页面', value: '47 页', detail: '上周: 45', trend: 'up' },
];

const SEO_FALLBACK_RECOMMENDATIONS: SeoRecommendation[] = [
  { priority: '高', title: '首页加载速度优化', desc: 'LCP 3.2s，建议优化至 2.5s 以下' },
  { priority: '中', title: '缺失 meta description', desc: '3 个页面缺少 meta description' },
  { priority: '低', title: '内部链接优化', desc: '建议增加产品页之间的关联链接' },
];

const SEOHealthCard: React.FC = () => {
  const [metrics, setMetrics] = useState<SeoMetric[]>(SEO_FALLBACK_METRICS);
  const [recommendations, setRecommendations] = useState<SeoRecommendation[]>(SEO_FALLBACK_RECOMMENDATIONS);

  useEffect(() => {
    const loadSeo = async () => {
      try {
        const res = await safeInvoke<{
          metrics?: Array<Record<string, unknown>>;
          recommendations?: Array<Record<string, unknown>>;
        }>('get_operations_seo_cmd', {});
        const metricRows = res?.metrics ?? [];
        if (metricRows.length > 0) {
          setMetrics(metricRows.map((m) => ({
            label: String(m.label ?? ''),
            value: String(m.value ?? ''),
            detail: String(m.detail ?? ''),
            trend: (String(m.trend ?? 'up') as SeoMetric['trend']),
          })));
        }
        const recRows = res?.recommendations ?? [];
        if (recRows.length > 0) {
          setRecommendations(recRows.map((r) => ({
            priority: (String(r.priority ?? '中') as SeoRecommendation['priority']),
            title: String(r.title ?? ''),
            desc: String(r.desc ?? r.description ?? ''),
          })));
        }
      } catch {
        /* keep fallback */
      }
    };
    loadSeo();
  }, []);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.label}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{m.value}</div>
            <div className={`text-xs mt-1 ${
              m.trend === 'up' ? 'text-green-600' : m.trend === 'down' ? 'text-red-600' : 'text-orange-600'
            }`}>{m.detail}</div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">优化建议</h3>
      <div className="space-y-3">
        {recommendations.map((r, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                r.priority === '高' ? 'bg-red-100 text-red-700' :
                r.priority === '中' ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700'
              }`}>{r.priority}</span>
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">{r.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== 社媒数据统计 ====================

interface SocialAccount {
  platform: string;
  region: string;
  followers: string;
  engagement: string;
  status: 'active' | 'paused';
}

const SOCIAL_FALLBACK: SocialAccount[] = [
  { platform: 'Twitter/X', region: '欧美', followers: '1,247', engagement: '3.4%', status: 'active' },
  { platform: 'Facebook', region: '欧美', followers: '892', engagement: '2.1%', status: 'active' },
  { platform: 'Instagram', region: '欧美', followers: '1,568', engagement: '4.2%', status: 'active' },
  { platform: 'LinkedIn', region: '欧美', followers: '634', engagement: '2.8%', status: 'active' },
  { platform: 'TikTok', region: '东南亚', followers: '4,200', engagement: '6.5%', status: 'paused' },
  { platform: '微信公众号', region: '国内', followers: '2,100', engagement: '2.3%', status: 'active' },
  { platform: '小红书', region: '国内', followers: '1,468', engagement: '3.1%', status: 'active' },
];

const SocialMediaStats: React.FC = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>(SOCIAL_FALLBACK);

  useEffect(() => {
    const loadSocial = async () => {
      try {
        const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>(
          'get_operations_social_accounts_cmd',
          {},
        );
        const rows = res?.data ?? [];
        if (rows.length > 0) {
          setAccounts(rows.map((a) => ({
            platform: String(a.platform ?? ''),
            region: String(a.region ?? ''),
            followers: String(a.followers ?? ''),
            engagement: String(a.engagement ?? ''),
            status: (String(a.status ?? 'active') as SocialAccount['status']),
          })));
        }
      } catch {
        /* keep fallback */
      }
    };
    loadSocial();
  }, []);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400">平台</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400">区域</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">粉丝</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">互动率</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500 dark:text-gray-400">状态</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, idx) => (
              <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{a.platform}</td>
                <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{a.region}</td>
                <td className="py-3 px-2 text-right font-medium text-gray-900 dark:text-white">{a.followers}</td>
                <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{a.engagement}</td>
                <td className="py-3 px-2 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    a.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {a.status === 'active' ? '活跃' : '暂停'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== 待审核内容列表 ====================

const PendingContentList: React.FC = () => {
  const [items, setItems] = useState<Array<{
    id: string; title: string; source: string; status: 'pending' | 'approved' | 'rejected'; time: string;
  }>>([]);

  const loadItems = useCallback(async () => {
    try {
      const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>('get_operations_content_queue_cmd', {});
      const rows = res?.data ?? [];
      if (rows.length > 0) {
        setItems(rows.map((r) => ({
          id: String(r.id ?? ''),
          title: String(r.title ?? ''),
          source: String(r.source ?? ''),
          status: (String(r.status ?? 'pending') as 'pending' | 'approved' | 'rejected'),
          time: String(r.created_at ?? ''),
        })));
      }
    } catch {
      /* keep empty */
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    try {
      await safeInvoke('update_operations_content_status_cmd', { id, status });
      await loadItems();
    } catch {
      setItems(prev => {
        if (action === 'reject') return prev.filter(i => i.id !== id);
        return prev.map(i => i.id === id ? { ...i, status: 'approved' as const } : i);
      });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          待处理: {items.filter(i => i.status === 'pending').length} 条
        </span>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">{item.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.source} - {item.time}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                item.status === 'pending'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {item.status === 'pending' ? '待审核' : '已通过'}
              </span>
            </div>
            {item.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAction(item.id, 'approve')}
                  className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
                >
                  确认发布
                </button>
                <button
                  onClick={() => handleAction(item.id, 'reject')}
                  className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
                >
                  拒绝
                </button>
                <button className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors">
                  编辑
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== 异常预警列表 ====================

interface OpsAlert {
  level: 'warning' | 'info';
  title: string;
  desc: string;
  time: string;
}

function formatRelativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

const ALERTS_FALLBACK: OpsAlert[] = [
  { level: 'warning', title: '首页跳出率异常升高', desc: '首页跳出率从 35% 升至 52%', time: '30 分钟前' },
  { level: 'warning', title: '博客分类流量下降', desc: '技术博客分类流量下降 28%', time: '1 小时前' },
  { level: 'info', title: '东南亚社媒 Team 已暂停', desc: 'TikTok 账号需重新授权', time: '3 小时前' },
];

const AlertList: React.FC = () => {
  const [alerts, setAlerts] = useState<OpsAlert[]>(ALERTS_FALLBACK);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>(
          'get_operations_alerts_cmd',
          {},
        );
        const rows = res?.data ?? [];
        if (rows.length > 0) {
          setAlerts(rows.map((a) => ({
            level: (String(a.level ?? 'info') as OpsAlert['level']),
            title: String(a.title ?? ''),
            desc: String(a.desc ?? a.description ?? ''),
            time: formatRelativeTime(String(a.created_at ?? '')),
          })));
        }
      } catch {
        /* keep fallback */
      }
    };
    loadAlerts();
  }, []);

  return (
    <div className="space-y-3">
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className={`rounded-xl p-4 border ${
            alert.level === 'warning'
              ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
              : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`text-lg ${alert.level === 'warning' ? 'text-orange-500' : 'text-blue-500'}`}>
              {alert.level === 'warning' ? '\u26A0' : '\u2139'}
            </span>
            <div className="flex-1">
              <div className={`font-medium text-sm ${
                alert.level === 'warning' ? 'text-orange-800 dark:text-orange-300' : 'text-blue-800 dark:text-blue-300'
              }`}>{alert.title}</div>
              <div className={`text-xs mt-1 ${
                alert.level === 'warning' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'
              }`}>{alert.desc}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{alert.time}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== AI 用量统计标签 ====================

interface TenantUsage {
  tenant_id: string;
  tenant_name: string;
  today_usage: number;
  week_usage: number;
  month_usage: number;
  total_usage: number;
  user_count: number;
}

interface UsageRecord {
  id: string;
  user_id?: string;
  resource_type: string;
  tokens_used: number;
  endpoint: string | null;
  created_at: string;
}

const AIUsageStats: React.FC = () => {
  const [tenants, setTenants] = useState<TenantUsage[]>([]);
  const [recentRecords, setRecentRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({ today: 0, week: 0, month: 0, total: 0 });

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const res = await safeInvoke<{
          totals?: { today: number; week: number; month: number; total: number };
          recent_records?: UsageRecord[];
          user_stats?: Array<Record<string, unknown>>;
        }>('get_operations_usage_cmd', { limit: 20 });

        if (res?.totals) {
          setTotalStats({
            today: Number(res.totals.today ?? 0),
            week: Number(res.totals.week ?? 0),
            month: Number(res.totals.month ?? 0),
            total: Number(res.totals.total ?? 0),
          });
        }
        setRecentRecords((res?.recent_records ?? []) as UsageRecord[]);
        setTenants((res?.user_stats ?? []).map((u) => ({
          tenant_id: String(u.user_id ?? ''),
          tenant_name: String(u.user_name ?? '用户'),
          today_usage: Number(u.today_usage ?? 0),
          week_usage: Number(u.week_usage ?? 0),
          month_usage: Number(u.month_usage ?? 0),
          total_usage: Number(u.total_usage ?? 0),
          user_count: Number(u.user_count ?? 1),
        })));
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsageData();
  }, []);

  const resourceTypeNames: Record<string, string> = {
    ai_chat: 'AI 对话',
    ai_product_query: '商品查询',
    ai_order_ocr: '订单 OCR',
    ai_order_recognition: '订单识别',
    data_export: '数据导出',
    data_sync: '数据同步',
    other: '其他',
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      {/* 数据来源说明 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6 text-sm text-blue-700 dark:text-blue-300">
        <span className="font-medium">数据来源：</span>
        本地 SQLite（token_usage_logs + nvwax_usage_logs）
      </div>

      {/* 总计统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-4 text-white">
          <div className="text-sm opacity-80">今日消耗</div>
          <div className="text-2xl font-bold">{totalStats.today} PT</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl p-4 text-white">
          <div className="text-sm opacity-80">本周消耗</div>
          <div className="text-2xl font-bold">{totalStats.week} PT</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl p-4 text-white">
          <div className="text-sm opacity-80">本月消耗</div>
          <div className="text-2xl font-bold">{totalStats.month} PT</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <div className="text-sm opacity-80">累计消耗</div>
          <div className="text-2xl font-bold">{totalStats.total} PT</div>
        </div>
      </div>

      {/* 各租户用量 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">各用户用量排行</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-3">用户</th>
                <th className="pb-3">用户数</th>
                <th className="pb-3">今日</th>
                <th className="pb-3">本周</th>
                <th className="pb-3">本月</th>
                <th className="pb-3">累计</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {tenants.length > 0 ? (
                tenants
                  .sort((a, b) => b.month_usage - a.month_usage)
                  .map((tenant) => (
                    <tr key={tenant.tenant_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 font-medium text-gray-900 dark:text-white">{tenant.tenant_name}</td>
                      <td className="py-3 text-gray-500">{tenant.user_count}</td>
                      <td className="py-3 text-red-500">{tenant.today_usage}</td>
                      <td className="py-3 text-orange-500">{tenant.week_usage}</td>
                      <td className="py-3 text-blue-500">{tenant.month_usage}</td>
                      <td className="py-3 text-purple-500">{tenant.total_usage}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 最近消费记录 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">最近消费记录</h3>
        <div className="space-y-3">
          {recentRecords.length > 0 ? (
            recentRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {resourceTypeNames[record.resource_type] || record.resource_type}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">{formatDate(record.created_at)}</span>
                </div>
                <span className="text-red-500 font-medium">-{record.tokens_used} PT</span>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">暂无消费记录</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboard;
