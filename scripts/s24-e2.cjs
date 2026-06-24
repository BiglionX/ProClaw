// Sprint 2.4 E2: [locale]/login/Client.tsx 删除 admin 折叠登录
const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-web\\app\\[locale]\\login\\Client.tsx';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

// 1. 删 import { adminApi }
const oldImport = `import { useAuth } from '@/hooks/useAuth';
import { startLogin } from '@/lib/oidc/login';
import { adminApi } from '@/lib/api/admin';
import { Card, Input, Alert } from '@/components/UI';
import { Mail, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';`;
const newImport = `import { useAuth } from '@/hooks/useAuth';
import { startLogin } from '@/lib/oidc/login';
import { Card, Input, Alert } from '@/components/UI';
import { Mail } from 'lucide-react';`;

if (c.includes(oldImport)) c = c.replace(oldImport, newImport);

// 2. 删 state 变量
const oldState = `  const [autoTriggered, setAutoTriggered] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);`;
const newState = `  const [autoTriggered, setAutoTriggered] = useState(false);`;

if (c.includes(oldState)) c = c.replace(oldState, newState);

// 3. 删 handleAdminLogin 函数
const oldHandler = `  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    try {
      const response = await adminApi.login(adminEmail, adminPassword);
      localStorage.setItem('admin_token', response.data.token);
      localStorage.setItem('admin_info', JSON.stringify(response.data.admin));
      window.location.replace('/admin/dashboard');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setAdminError(error.response?.data?.error || error.message || '管理员登录失败');
    } finally {
      setAdminLoading(false);
    }
  };

  const tOidcErr = (code: string): string => {`;
const newHandler = `  const tOidcErr = (code: string): string => {`;

if (c.includes(oldHandler)) c = c.replace(oldHandler, newHandler);

// 4. 替换 admin 折叠区域
const oldCollapse = `          {/* 管理员登录折叠入口（独立鉴权，不在 Sprint 2.2 OIDC 范围） */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setAdminOpen(!adminOpen)}
              className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <span>
                {tc('locale') === 'en' ? 'Admin sign-in (legacy)' : '管理员登录（保留入口）'}
              </span>
              {adminOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {adminOpen && (
              <form onSubmit={handleAdminLogin} className="mt-4">
                <div className="flex flex-col gap-2 w-full">
                  {adminError && (
                    <Alert type="error" message={adminError} closable onClose={() => setAdminError('')} />
                  )}
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder={tc('locale') === 'en' ? 'Admin email' : '管理员邮箱'}
                    prefix={<Mail size={16} />}
                    required
                  />
                  <Input
                    type={showAdminPwd ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    prefix={<Lock size={16} />}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowAdminPwd(!showAdminPwd)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="toggle"
                      >
                        {showAdminPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    required
                  />
                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full px-6 py-3 text-base font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-xl bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adminLoading ? (
                      <span>{tc('locale') === 'en' ? 'Signing in…' : '登录中…'}</span>
                    ) : (
                      <span>{tc('locale') === 'en' ? 'Admin sign-in' : '管理员登录'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-4 text-center">`;
const newCollapse = `          {/* Sprint 2.4: 管理员入口简化为单一链接，不再走折叠账号密码登录 */}
          <div className="mt-6 text-center">
            <Link
              href="/admin/login"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {tc('locale') === 'en' ? 'Admin? Sign in here' : '管理员？前往登录'}
            </Link>
          </div>

          <div className="mt-4 text-center">`;

if (c.includes(oldCollapse)) c = c.replace(oldCollapse, newCollapse);

// 5. 更新顶部注释
const oldComment = `/**
 * Login 客户端组件（Sprint 2.2）
 *
 * 入口策略：
 *   - 主入口：点击"使用 ProClaw 账号登录" → OIDC 跳 account.proclaw.cc
 *   - 自动入口：URL 带 ?return= 且未登录 → useEffect 自动触发 startLogin(return)
 *   - 错误展示：?error=&desc= 显示 OIDC 错误码
 *   - 管理员入口：折叠区域保留账号密码登录（admin 鉴权独立，不在 Sprint 2.2 范围）
 */`;
const newComment = `/**
 * Login 客户端组件（Sprint 2.4）
 *
 * 入口策略：
 *   - 主入口：点击"使用 ProClaw 账号登录" → OIDC 跳 account.proclaw.cc
 *   - 自动入口：URL 带 ?return= 且未登录 → useEffect 自动触发 startLogin(return)
 *   - 错误展示：?error=&desc= 显示 OIDC 错误码
 *   - 管理员入口：单一链接跳转 /admin/login（admin 鉴权走 OIDC is_admin）
 */`;

if (c.includes(oldComment)) c = c.replace(oldComment, newComment);

fs.writeFileSync(p, c, 'utf8');
console.log('OK: login/Client.tsx admin collapsible removed');
