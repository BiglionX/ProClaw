import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  type: 'cleanup' | 'backup' | 'report' | 'notification' | 'sync';
  schedule: string;
  status: 'active' | 'paused' | 'failed';
  lastRun?: string;
  nextRun?: string;
  successRate: number;
  totalRuns: number;
}

const AdminTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'failed'>('all');

  // 模拟任务数据
  const [tasks] = useState<ScheduledTask[]>([
    {
      id: 'task-001',
      name: '清理过期Token',
      description: '每天清理过期的Token记录',
      type: 'cleanup',
      schedule: '每天 02:00',
      status: 'active',
      lastRun: '2024-04-14 02:00:15',
      nextRun: '2024-04-15 02:00:00',
      successRate: 99.5,
      totalRuns: 365,
    },
    {
      id: 'task-002',
      name: '数据库备份',
      description: '每周日进行完整数据库备份',
      type: 'backup',
      schedule: '每周日 03:00',
      status: 'active',
      lastRun: '2024-04-14 03:00:22',
      nextRun: '2024-04-21 03:00:00',
      successRate: 100,
      totalRuns: 52,
    },
    {
      id: 'task-003',
      name: '生成周报',
      description: '每周一生成平台运营周报',
      type: 'report',
      schedule: '每周一 08:00',
      status: 'active',
      lastRun: '2024-04-08 08:00:10',
      nextRun: '2024-04-15 08:00:00',
      successRate: 98.2,
      totalRuns: 48,
    },
    {
      id: 'task-004',
      name: '发送余额提醒',
      description: '每小时检查并发送低余额提醒',
      type: 'notification',
      schedule: '每小时',
      status: 'active',
      lastRun: '2024-04-14 15:00:05',
      nextRun: '2024-04-14 16:00:00',
      successRate: 97.8,
      totalRuns: 8760,
    },
    {
      id: 'task-005',
      name: '同步外部数据',
      description: '每30分钟同步外部API数据',
      type: 'sync',
      schedule: '每30分钟',
      status: 'failed',
      lastRun: '2024-04-14 14:30:45',
      nextRun: '-',
      successRate: 85.3,
      totalRuns: 17520,
    },
    {
      id: 'task-006',
      name: '清理日志文件',
      description: '每月1号清理30天前的日志',
      type: 'cleanup',
      schedule: '每月1号 01:00',
      status: 'paused',
      lastRun: '2024-04-01 01:00:30',
      nextRun: '-',
      successRate: 100,
      totalRuns: 12,
    },
  ]);

  const filteredTasks = tasks.filter(task => 
    statusFilter === 'all' || task.status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    const labels = {
      active: '运行中',
      paused: '已暂停',
      failed: '失败',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      cleanup: 'bg-blue-100 text-blue-700',
      backup: 'bg-purple-100 text-purple-700',
      report: 'bg-green-100 text-green-700',
      notification: 'bg-orange-100 text-orange-700',
      sync: 'bg-indigo-100 text-indigo-700',
    };
    const labels = {
      cleanup: '清理',
      backup: '备份',
      report: '报表',
      notification: '通知',
      sync: '同步',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type as keyof typeof styles]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    );
  };

  const handleToggleTask = (id: string) => {
    console.log(`切换任务状态: ${id}`);
  };

  const handleRunNow = (id: string) => {
    console.log(`立即执行任务: ${id}`);
  };

  const handleViewLogs = (id: string) => {
    console.log(`查看任务日志: ${id}`);
  };

  const activeTasks = tasks.filter(t => t.status === 'active').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const avgSuccessRate = tasks.reduce((sum, t) => sum + t.successRate, 0) / tasks.length;

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
              <h1 className="text-2xl font-bold text-gray-900">自动化任务管理</h1>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              添加任务
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">总任务数</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{tasks.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">运行中</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{activeTasks}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">失败任务</p>
            <p className="text-2xl font-bold text-red-600 mt-2">{failedTasks}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">平均成功率</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">{avgSuccessRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">状态筛选：</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            >
              <option value="all">全部</option>
              <option value="active">运行中</option>
              <option value="paused">已暂停</option>
              <option value="failed">失败</option>
            </select>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.name}</h3>
                    {getTypeBadge(task.type)}
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">执行计划</div>
                  <div className="text-sm font-medium text-gray-900">{task.schedule}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">上次执行</div>
                  <div className="text-sm text-gray-900">{task.lastRun || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">下次执行</div>
                  <div className="text-sm text-gray-900">{task.nextRun || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">成功率</div>
                  <div className="flex items-center">
                    <div className="flex-1 mr-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            task.successRate >= 95 ? 'bg-green-500' :
                            task.successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${task.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{task.successRate}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  总执行次数: <span className="font-medium text-gray-900">{task.totalRuns.toLocaleString()}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRunNow(task.id)}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    立即执行
                  </button>
                  <button
                    onClick={() => handleViewLogs(task.id)}
                    className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    查看日志
                  </button>
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      task.status === 'active'
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {task.status === 'active' ? '暂停' : '启用'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">添加新任务</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">任务名称</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="例如：每日数据清理" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">任务描述</label>
                  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" rows={3} placeholder="任务描述..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">任务类型</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                      <option value="cleanup">清理</option>
                      <option value="backup">备份</option>
                      <option value="report">报表</option>
                      <option value="notification">通知</option>
                      <option value="sync">同步</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">执行频率</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                      <option value="hourly">每小时</option>
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cron 表达式</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="0 2 * * *" />
                  <p className="text-xs text-gray-500 mt-1">例如：0 2 * * * 表示每天凌晨2点执行</p>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    取消
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    创建任务
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

export default AdminTasksPage;
