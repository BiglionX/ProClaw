// Sprint 2.4 E1: admin/login/page.tsx → 改造 OIDC 跳转提示
const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-web\\app\\[locale]\\admin\\login\\page.tsx';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

// 替换 login 成功后的逻辑
const old_ = `    try {
      const response = await adminApi.login(username, password);
      console.log('[Admin Login Page] Login successful');
      
      // 清除普通用户的认证状态，避免冲突
      localStorage.removeItem('token');
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('userInfo');
      
      // 保存管理员 token
      localStorage.setItem('admin_token', response.data.token);
      localStorage.setItem('admin_info', JSON.stringify(response.data.admin));
      
      // 同时设置普通用户 token（兼容旧代码和通用组件如通知栏）
      // 将管理员信息也保存到 user_info，这样 useAuth 和普通 API 调用都能正常工作
      localStorage.setItem('user_token', response.data.token);
      localStorage.setItem('user_info', JSON.stringify({
        id: response.data.admin.id,
        email: response.data.admin.email,
        name: response.data.admin.username || response.data.admin.email,
        role: 'admin', // 标记为管理员角色
        isAdmin: true
      }));
      
      console.log('[Admin Login Page] Tokens saved. Redirecting to dashboard...');
      
      // 直接跳转，不使用 reload
      window.location.replace('/admin/dashboard');
    } catch (err: unknown) {`;

const new_ = `    try {
      // Sprint 2.4: admins 表独立登录保留为兼容流程
      // 登录成功不再写 localStorage（Sprint 2.3 已清理），改提示走 OIDC
      const response = await adminApi.login(username, password);
      console.log('[Admin Login Page] Legacy login successful:', response.data.admin.email);

      // 提示用户走 OIDC 流程以激活管理权限
      setOidcPrompt(response.data.admin.email);
    } catch (err: unknown) {`;

if (c.includes(old_)) {
  c = c.replace(old_, new_);
}

// 在 useState 声明后增加 oidcPrompt state
const oldState = `  const [loading, setLoading] = useState(false);`;
const newState = `  const [loading, setLoading] = useState(false);
  const [oidcPrompt, setOidcPrompt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Sprint 2.4: 倒计时跳 OIDC issuer
  useEffect(() => {
    if (oidcPrompt === null) return;
    if (countdown <= 0) {
      const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
      window.location.href = \`\${issuer}/oauth/authorize?...\`;
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [oidcPrompt, countdown]);`;

const oldImports = `import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Shield, Lock, User, Eye, EyeOff } from 'lucide-react';`;
const newImports = `import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Shield, Lock, User, Eye, EyeOff, ExternalLink } from 'lucide-react';`;

if (c.includes(oldState)) c = c.replace(oldState, newState);
if (c.includes(oldImports)) c = c.replace(oldImports, newImports);

// 增加 OIDC 跳转提示 UI（在 form 后）
const oldFormEnd = `          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>首次使用？请联系系统管理员创建账户</p>
          </div>
        </div>
      </div>
    </div>
  );
}`;
const newFormEnd = `          {/* OIDC 跳转提示（Sprint 2.4: 老 admin 登录成功后引导走 OIDC） */}
          {oidcPrompt && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                账号 <span className="font-mono">{oidcPrompt}</span> 已通过验证。
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                请回 OIDC 入口完成 SSO 登录以激活管理权限（{countdown} 秒后跳转）。
              </p>
              <a
                href={process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc'}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
              >
                立即跳转 <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>首次使用？请联系系统管理员创建账户</p>
          </div>
        </div>
      </div>
    </div>
  );
}`;

if (c.includes(oldFormEnd)) c = c.replace(oldFormEnd, newFormEnd);

// 修改 catch 错误提示
const oldCatch = `      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || '登录失败，请检查用户名和密码');`;
const newCatch = `      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || '登录失败，请检查用户名和密码');`;

if (c.includes(oldCatch)) c = c.replace(oldCatch, newCatch);

fs.writeFileSync(p, c, 'utf8');
console.log('OK: admin/login/page.tsx updated (OIDC prompt added)');
