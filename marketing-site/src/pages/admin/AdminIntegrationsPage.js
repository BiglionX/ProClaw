"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var AdminIntegrationsPage = function () {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)('all'), statusFilter = _a[0], setStatusFilter = _a[1];
    var _b = (0, react_1.useState)('all'), typeFilter = _b[0], setTypeFilter = _b[1];
    // 模拟集成数据
    var integrations = (0, react_1.useState)([
        {
            id: 'int-001',
            userId: 'user-001',
            userEmail: 'developer@example.com',
            name: '支付回调接口',
            type: 'webhook',
            endpointUrl: 'https://api.example.com/webhook/payment',
            authType: 'bearer',
            isActive: true,
            isApproved: true,
            lastTestedAt: '2024-04-14 10:30:00',
            testStatus: 'success',
            createdAt: '2024-04-10 09:15:00',
            notes: '用于接收支付成功通知',
        },
        {
            id: 'int-002',
            userId: 'user-002',
            userEmail: 'service@company.com',
            name: '用户同步API',
            type: 'api_endpoint',
            endpointUrl: 'https://sync.company.com/api/users',
            authType: 'api_key',
            isActive: true,
            isApproved: false,
            testStatus: 'pending',
            createdAt: '2024-04-12 14:20:00',
            notes: '需要同步用户信息到外部系统',
        },
        {
            id: 'int-003',
            userId: 'user-003',
            userEmail: 'admin@partner.com',
            name: 'OAuth登录集成',
            type: 'oauth',
            endpointUrl: 'https://auth.partner.com/oauth',
            authType: 'oauth2',
            isActive: false,
            isApproved: false,
            testStatus: 'failed',
            createdAt: '2024-04-13 16:45:00',
            notes: '第三方登录集成测试失败',
        },
        {
            id: 'int-004',
            userId: 'user-004',
            userEmail: 'dev@startup.io',
            name: '数据分析Webhook',
            type: 'webhook',
            endpointUrl: 'https://analytics.startup.io/events',
            authType: 'none',
            isActive: true,
            isApproved: true,
            lastTestedAt: '2024-04-14 08:15:00',
            testStatus: 'success',
            createdAt: '2024-04-11 11:30:00',
        },
    ])[0];
    var filteredIntegrations = integrations.filter(function (integration) {
        var matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'approved' && integration.isApproved) ||
            (statusFilter === 'pending' && !integration.isApproved && integration.testStatus === 'pending') ||
            (statusFilter === 'rejected' && !integration.isApproved && integration.testStatus === 'failed');
        var matchesType = typeFilter === 'all' || integration.type === typeFilter;
        return matchesStatus && matchesType;
    });
    var getStatusBadge = function (isApproved, testStatus) {
        if (isApproved) {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">已批准</span>;
        }
        else if (testStatus === 'failed') {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">已拒绝</span>;
        }
        else {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">待审批</span>;
        }
    };
    var getTypeBadge = function (type) {
        var styles = {
            webhook: 'bg-blue-100 text-blue-700',
            api_endpoint: 'bg-purple-100 text-purple-700',
            oauth: 'bg-orange-100 text-orange-700',
        };
        var labels = {
            webhook: 'Webhook',
            api_endpoint: 'API端点',
            oauth: 'OAuth',
        };
        return (<span className={"px-2 py-1 text-xs font-medium rounded-full ".concat(styles[type])}>
        {labels[type]}
      </span>);
    };
    var getTestStatusBadge = function (status) {
        var styles = {
            success: 'bg-green-100 text-green-700',
            failed: 'bg-red-100 text-red-700',
            pending: 'bg-yellow-100 text-yellow-700',
            never: 'bg-gray-100 text-gray-700',
        };
        var labels = {
            success: '成功',
            failed: '失败',
            pending: '待测试',
            never: '未测试',
        };
        return (<span className={"px-2 py-1 text-xs font-medium rounded-full ".concat(styles[status])}>
        {labels[status]}
      </span>);
    };
    var handleApprove = function (id) {
        console.log("\u6279\u51C6\u96C6\u6210: ".concat(id));
        // 实际应用中会调用API更新状态
    };
    var handleReject = function (id) {
        console.log("\u62D2\u7EDD\u96C6\u6210: ".concat(id));
        // 实际应用中会调用API更新状态
    };
    var handleTest = function (id) {
        console.log("\u6D4B\u8BD5\u96C6\u6210: ".concat(id));
        // 实际应用中会调用API进行测试
    };
    return (<div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button onClick={function () { return navigate('/admin'); }} className="mr-4 text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">集成审批管理</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">总集成数</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{integrations.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">已批准</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {integrations.filter(function (i) { return i.isApproved; }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">待审批</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {integrations.filter(function (i) { return !i.isApproved && i.testStatus !== 'failed'; }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">测试成功率</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {integrations.length > 0
            ? Math.round((integrations.filter(function (i) { return i.testStatus === 'success'; }).length / integrations.length) * 100)
            : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">审批状态</label>
              <select value={statusFilter} onChange={function (e) { return setStatusFilter(e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                <option value="all">全部</option>
                <option value="approved">已批准</option>
                <option value="pending">待审批</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">集成类型</label>
              <select value={typeFilter} onChange={function (e) { return setTypeFilter(e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                <option value="all">全部</option>
                <option value="webhook">Webhook</option>
                <option value="api_endpoint">API端点</option>
                <option value="oauth">OAuth</option>
              </select>
            </div>
          </div>
        </div>

        {/* Integrations Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    集成名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    端点URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    认证方式
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    测试状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIntegrations.map(function (integration) { return (<tr key={integration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                      {integration.notes && (<div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{integration.notes}</div>)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(integration.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{integration.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-xs" title={integration.endpointUrl}>
                        {integration.endpointUrl}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{integration.authType.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(integration.isApproved, integration.testStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTestStatusBadge(integration.testStatus)}
                      {integration.lastTestedAt && (<div className="text-xs text-gray-500 mt-1">{integration.lastTestedAt}</div>)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!integration.isApproved && integration.testStatus !== 'failed' && (<>
                          <button onClick={function () { return handleApprove(integration.id); }} className="text-green-600 hover:text-green-800 mr-3">
                            批准
                          </button>
                          <button onClick={function () { return handleReject(integration.id); }} className="text-red-600 hover:text-red-800 mr-3">
                            拒绝
                          </button>
                        </>)}
                      <button onClick={function () { return handleTest(integration.id); }} className="text-blue-600 hover:text-blue-800">
                        测试
                      </button>
                    </td>
                  </tr>); })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示 <span className="font-medium">1</span> 到 <span className="font-medium">{filteredIntegrations.length}</span> 条，共 <span className="font-medium">{filteredIntegrations.length}</span> 条
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
                  上一页
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
                  下一页
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>);
};
exports.default = AdminIntegrationsPage;
