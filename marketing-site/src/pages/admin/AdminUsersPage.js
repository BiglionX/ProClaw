"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var exportUtils_1 = require("../../lib/exportUtils");
var AdminUsersPage = function () {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)(''), searchTerm = _a[0], setSearchTerm = _a[1];
    var _b = (0, react_1.useState)('all'), roleFilter = _b[0], setRoleFilter = _b[1];
    var _c = (0, react_1.useState)('all'), statusFilter = _c[0], setStatusFilter = _c[1];
    // 模拟用户数据
    var users = (0, react_1.useState)([
        {
            id: '1',
            email: 'user1@example.com',
            username: '张三',
            role: 'user',
            status: 'active',
            createdAt: '2024-01-15',
            lastLogin: '2024-04-14',
        },
        {
            id: '2',
            email: 'admin@proclaw.cc',
            username: '管理员',
            role: 'admin',
            status: 'active',
            createdAt: '2024-01-01',
            lastLogin: '2024-04-14',
        },
        {
            id: '3',
            email: 'user2@example.com',
            username: '李四',
            role: 'user',
            status: 'inactive',
            createdAt: '2024-02-20',
            lastLogin: '2024-03-10',
        },
        {
            id: '4',
            email: 'user3@example.com',
            username: '王五',
            role: 'user',
            status: 'banned',
            createdAt: '2024-03-05',
            lastLogin: '2024-03-15',
        },
    ])[0];
    var filteredUsers = users.filter(function (user) {
        var _a;
        var matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ((_a = user.username) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchTerm.toLowerCase()));
        var matchesRole = roleFilter === 'all' || user.role === roleFilter;
        var matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });
    var getStatusColor = function (status) {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700';
            case 'inactive':
                return 'bg-gray-100 text-gray-700';
            case 'banned':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };
    var getRoleBadge = function (role) {
        return role === 'admin' ? (<span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
        管理员
      </span>) : (<span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
        用户
      </span>);
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
              <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            </div>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
              添加管理员
            </button>
            <exportUtils_1.ExportButton data={filteredUsers} filename="users" headers={[
            { key: 'email', label: '邮箱' },
            { key: 'username', label: '用户名' },
            { key: 'role', label: '角色' },
            { key: 'status', label: '状态' },
            { key: 'createdAt', label: '注册时间' },
            { key: 'lastLogin', label: '最后登录' },
        ]}>
              导出数据
            </exportUtils_1.ExportButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜索</label>
              <input type="text" value={searchTerm} onChange={function (e) { return setSearchTerm(e.target.value); }} placeholder="搜索邮箱或用户名..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
              <select value={roleFilter} onChange={function (e) { return setRoleFilter(e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                <option value="all">全部</option>
                <option value="user">用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select value={statusFilter} onChange={function (e) { return setStatusFilter(e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                <option value="all">全部</option>
                <option value="active">活跃</option>
                <option value="inactive">未活跃</option>
                <option value="banned">已禁用</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后登录
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(function (user) {
            var _a;
            return (<tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {((_a = user.username) === null || _a === void 0 ? void 0 : _a.charAt(0)) || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username || '未设置'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={"px-2 py-1 text-xs font-medium rounded-full ".concat(getStatusColor(user.status))}>
                        {user.status === 'active' ? '活跃' : user.status === 'inactive' ? '未活跃' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-900 hover:text-gray-700 mr-3">编辑</button>
                      <button className="text-red-600 hover:text-red-800">禁用</button>
                    </td>
                  </tr>);
        })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示 <span className="font-medium">1</span> 到 <span className="font-medium">{filteredUsers.length}</span> 条，共 <span className="font-medium">{filteredUsers.length}</span> 条
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
exports.default = AdminUsersPage;
