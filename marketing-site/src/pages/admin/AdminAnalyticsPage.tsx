import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalApiCalls: number;
  apiCallsToday: number;
  totalTokensSold: number;
  tokensSoldToday: number;
  totalRevenue: number;
  revenueToday: number;
  averageSessionDuration: string;
  topEndpoints: Array<{ endpoint: string; calls: number; percentage: number }>;
  userGrowth: Array<{ date: string; users: number }>;
  apiUsageByHour: Array<{ hour: number; calls: number }>;
  tokenUsageByUser: Array<{ userId: string; email: string; tokensUsed: number }>;
}

const AdminAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // 模拟分析数据
  const [analytics] = useState<AnalyticsData>({
    totalUsers: 1234,
    activeUsers: 856,
    newUsersToday: 23,
    totalApiCalls: 567890,
    apiCallsToday: 12345,
    totalTokensSold: 10000000,
    tokensSoldToday: 150000,
    totalRevenue: 125680.50,
    revenueToday: 2340.00,
    averageSessionDuration: '12m 34s',
    topEndpoints: [
      { endpoint: '/api/chat', calls: 234567, percentage: 41.3 },
      { endpoint: '/api/completion', calls: 156789, percentage: 27.6 },
      { endpoint: '/api/embeddings', calls: 89012, percentage: 15.7 },
      { endpoint: '/api/images', calls: 56789, percentage: 10.0 },
      { endpoint: '/api/audio', calls: 30733, percentage: 5.4 },
    ],
    userGrowth: [
      { date: '2024-04-08', users: 15 },
      { date: '2024-04-09', users: 18 },
      { date: '2024-04-10', users: 22 },
      { date: '2024-04-11', users: 19 },
      { date: '2024-04-12', users: 25 },
      { date: '2024-04-13', users: 21 },
      { date: '2024-04-14', users: 23 },
    ],
    apiUsageByHour: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      calls: Math.floor(Math.random() * 1000) + 200,
    })),
    tokenUsageByUser: [
      { userId: 'user-001', email: 'user1@example.com', tokensUsed: 125000 },
      { userId: 'user-002', email: 'user2@example.com', tokensUsed: 98000 },
      { userId: 'user-003', email: 'user3@example.com', tokensUsed: 87500 },
      { userId: 'user-004', email: 'user4@example.com', tokensUsed: 76000 },
      { userId: 'user-005', email: 'user5@example.com', tokensUsed: 65000 },
    ],
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const maxApiCalls = Math.max(...analytics.apiUsageByHour.map(h => h.calls));

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
              <h1 className="text-2xl font-bold text-gray-900">使用统计分析</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === '7d' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                近7天
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === '30d' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                近30天
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === '90d' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                近90天
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总用户数</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(analytics.totalUsers)}</p>
                <p className="text-xs text-green-600 mt-1">+{analytics.newUsersToday} 今日新增</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API 调用总量</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(analytics.totalApiCalls)}</p>
                <p className="text-xs text-blue-600 mt-1">+{formatNumber(analytics.apiCallsToday)} 今日</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Token 销售总量</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(analytics.totalTokensSold)}</p>
                <p className="text-xs text-green-600 mt-1">+{formatNumber(analytics.tokensSoldToday)} 今日</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总收入</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">¥{formatNumber(analytics.totalRevenue)}</p>
                <p className="text-xs text-green-600 mt-1">+¥{analytics.revenueToday.toFixed(2)} 今日</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">用户增长趋势</h3>
            <div className="space-y-3">
              {analytics.userGrowth.map((day, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600">{day.date.slice(5)}</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(day.users / 30) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 text-right">{day.users}</div>
                </div>
              ))}
            </div>
          </div>

          {/* API Usage by Hour */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API 使用时段分布</h3>
            <div className="space-y-2">
              {analytics.apiUsageByHour.map((hourData) => (
                <div key={hourData.hour} className="flex items-center">
                  <div className="w-12 text-xs text-gray-600">{hourData.hour.toString().padStart(2, '0')}:00</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${(hourData.calls / maxApiCalls) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-16 text-xs text-gray-600 text-right">{hourData.calls}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Endpoints and Token Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top API Endpoints */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">热门 API 端点</h3>
            <div className="space-y-4">
              {analytics.topEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{endpoint.endpoint}</span>
                      <span className="text-sm text-gray-600">{endpoint.percentage}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${endpoint.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatNumber(endpoint.calls)} 次调用</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Token Users */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Token 使用排行</h3>
            <div className="space-y-3">
              {analytics.tokenUsageByUser.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">{user.userId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatNumber(user.tokensUsed)}</div>
                    <div className="text-xs text-gray-500">Tokens</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalyticsPage;
