import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '../../lib/exportUtils';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'user' | 'order' | 'revenue' | 'api_usage' | 'token';
  fields: string[];
  filters: Record<string, any>;
  createdAt: string;
}

const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // 模拟报表模板
  const [templates] = useState<ReportTemplate[]>([
    {
      id: 'template-1',
      name: '用户增长报表',
      description: '展示新用户注册趋势和活跃度分析',
      type: 'user',
      fields: ['date', 'new_users', 'active_users', 'retention_rate'],
      filters: { status: 'all' },
      createdAt: '2024-04-01',
    },
    {
      id: 'template-2',
      name: '收入分析报表',
      description: '详细的收入和订单统计分析',
      type: 'revenue',
      fields: ['date', 'orders', 'revenue', 'avg_order_value', 'conversion_rate'],
      filters: { status: 'completed' },
      createdAt: '2024-04-01',
    },
    {
      id: 'template-3',
      name: 'API使用报表',
      description: 'API调用量、Token消耗和性能分析',
      type: 'api_usage',
      fields: ['date', 'total_calls', 'tokens_used', 'avg_response_time', 'error_rate'],
      filters: {},
      createdAt: '2024-04-05',
    },
    {
      id: 'template-4',
      name: 'Token销售报表',
      description: 'Token套餐销售和用户使用分析',
      type: 'token',
      fields: ['date', 'packages_sold', 'tokens_sold', 'revenue', 'top_users'],
      filters: {},
      createdAt: '2024-04-10',
    },
  ]);

  // 模拟报表数据
  const [reportData] = useState({
    summary: {
      totalRecords: 1234,
      dateRange: '2024-03-15 ~ 2024-04-14',
      generatedAt: new Date().toLocaleString('zh-CN'),
    },
    chartData: [
      { date: '2024-04-08', value: 156, growth: 12 },
      { date: '2024-04-09', value: 178, growth: 14 },
      { date: '2024-04-10', value: 145, growth: -8 },
      { date: '2024-04-11', value: 189, growth: 18 },
      { date: '2024-04-12', value: 201, growth: 22 },
      { date: '2024-04-13', value: 167, growth: -5 },
      { date: '2024-04-14', value: 198, growth: 15 },
    ],
    tableData: [
      { metric: '总用户数', value: '1,234', change: '+12%', trend: 'up' },
      { metric: '活跃用户', value: '856', change: '+8%', trend: 'up' },
      { metric: '新用户', value: '156', change: '+23%', trend: 'up' },
      { metric: '留存率', value: '69.4%', change: '-2%', trend: 'down' },
      { metric: '平均会话', value: '12m 34s', change: '+5%', trend: 'up' },
    ],
  });

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const getTemplateColor = (type: string) => {
    const colors = {
      user: 'bg-blue-100 text-blue-700 border-blue-300',
      order: 'bg-purple-100 text-purple-700 border-purple-300',
      revenue: 'bg-green-100 text-green-700 border-green-300',
      api_usage: 'bg-orange-100 text-orange-700 border-orange-300',
      token: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const maxValue = Math.max(...reportData.chartData.map(d => d.value));

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
              <h1 className="text-2xl font-bold text-gray-900">自定义报表生成</h1>
            </div>
            <div className="flex space-x-3">
              <ExportButton
                data={reportData.tableData}
                filename={`report_${selectedTemplate || 'custom'}`}
                headers={[
                  { key: 'metric', label: '指标' },
                  { key: 'value', label: '数值' },
                  { key: 'change', label: '变化' },
                  { key: 'trend', label: '趋势' },
                ]}
              >
                导出报表
              </ExportButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Template Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">选择报表模板</h3>
              <div className="space-y-3">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900">{template.name}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTemplateColor(template.type)}`}>
                        {template.type === 'user' ? '用户' : 
                         template.type === 'revenue' ? '收入' :
                         template.type === 'api_usage' ? 'API' : 'Token'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Report Configuration */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">报表配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  >
                    <option value="7d">近7天</option>
                    <option value="30d">近30天</option>
                    <option value="90d">近90天</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>

                {dateRange === 'custom' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => setCustomDateStart(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => setCustomDateEnd(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分组方式</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  >
                    <option value="day">按天</option>
                    <option value="week">按周</option>
                    <option value="month">按月</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">包含图表</div>
                    <div className="text-xs text-gray-500">在报表中显示可视化图表</div>
                  </div>
                  <button
                    onClick={() => setIncludeCharts(!includeCharts)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      includeCharts ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        includeCharts ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || !selectedTemplate}
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      生成中...
                    </span>
                  ) : (
                    '生成报表'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">报表预览</h3>
                <div className="text-sm text-gray-600">
                  生成时间: {reportData.summary.generatedAt}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 mb-1">总记录数</div>
                  <div className="text-2xl font-bold text-blue-900">{reportData.summary.totalRecords.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 mb-1">时间范围</div>
                  <div className="text-sm font-semibold text-green-900">{reportData.summary.dateRange}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-600 mb-1">数据点</div>
                  <div className="text-2xl font-bold text-purple-900">{reportData.chartData.length}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm text-orange-600 mb-1">指标数量</div>
                  <div className="text-2xl font-bold text-orange-900">{reportData.tableData.length}</div>
                </div>
              </div>

              {/* Chart Visualization */}
              {includeCharts && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">趋势图</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {reportData.chartData.map((data, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-20 text-xs text-gray-600">{data.date.slice(5)}</div>
                          <div className="flex-1 mx-3">
                            <div className="bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all ${
                                  data.growth >= 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${(data.value / maxValue) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="w-24 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{data.value}</span>
                            <span className={`text-xs ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.growth >= 0 ? '+' : ''}{data.growth}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">详细数据</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">指标</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数值</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">变化</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">趋势</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.tableData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.metric}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.value}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${row.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {row.change}
                          </td>
                          <td className="px-4 py-3">
                            {row.trend === 'up' ? (
                              <span className="inline-flex items-center text-green-600">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                上升
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-red-600">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                下降
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminReportsPage;
