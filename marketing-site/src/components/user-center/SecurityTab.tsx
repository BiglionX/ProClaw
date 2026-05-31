import React from 'react';

interface SecurityTabProps {
  oldPwd: string;
  setOldPwd: (v: string) => void;
  newPwd: string;
  setNewPwd: (v: string) => void;
  confirmPwd: string;
  setConfirmPwd: (v: string) => void;
  pwdMsg: { type: 'success' | 'error'; text: string } | null;
  handleChangePassword: () => void;
}

const SecurityTab: React.FC<SecurityTabProps> = ({
  oldPwd,
  setOldPwd,
  newPwd,
  setNewPwd,
  confirmPwd,
  setConfirmPwd,
  pwdMsg,
  handleChangePassword,
}) => {
  return (
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
  );
};

export default SecurityTab;
