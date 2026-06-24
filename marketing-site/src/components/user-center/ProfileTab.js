"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var ProfileTab = function (_a) {
    var user = _a.user, profile = _a.profile, editUsername = _a.editUsername, setEditUsername = _a.setEditUsername, profileMsg = _a.profileMsg, handleSaveProfile = _a.handleSaveProfile;
    return (<div className="max-w-lg space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
        <input type="email" value={(user === null || user === void 0 ? void 0 : user.email) || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"/>
        <p className="text-xs text-gray-400 mt-1">邮箱暂不支持自行修改</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
        <input type="text" value={editUsername} onChange={function (e) { return setEditUsername(e.target.value); }} placeholder="输入昵称" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
        <input type="text" value={(profile === null || profile === void 0 ? void 0 : profile.role) === 'admin' ? '管理员' : '普通用户'} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">注册时间</label>
        <input type="text" value={(user === null || user === void 0 ? void 0 : user.created_at) ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"/>
      </div>
      {profileMsg && (<div className={"px-4 py-2 rounded-lg text-sm ".concat(profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {profileMsg.text}
        </div>)}
      <button onClick={handleSaveProfile} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
        保存修改
      </button>
    </div>);
};
exports.default = ProfileTab;
