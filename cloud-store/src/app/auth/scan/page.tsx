// ProClaw Cloud-Store - ProClaw Shop 扫码登录页面
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ScanLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  
  // 预生成二维码图案（静态）
  const qrPattern: boolean[] = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true];

  const [status, setStatus] = useState<'loading' | 'scanning' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在连接...');
  
  // 验证登录码
  const verifyCode = useCallback(async () => {
    if (!code) {
      setStatus('error');
      setMessage('无效的登录码');
      return;
    }

    try {
      const res = await fetch('/api/auth/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code }),
      });

      const result = await res.json();

      if (result.success && result.data.verified) {
        setStatus('success');
        setMessage('登录成功！正在跳转...');

        // 保存登录状态
        localStorage.setItem('tenant_id', result.data.tenant_id);
        localStorage.setItem('is_admin', 'true');

        // 跳转到商户后台
        setTimeout(() => {
          router.push('/tenant/dashboard');
        }, 1500);
      } else {
        setStatus('error');
        setMessage(result.error || '登录验证失败');
      }
    } catch {
      setStatus('error');
      setMessage('网络错误，请重试');
    }
  }, [code, router]);

  useEffect(() => {
    if (code) {
      // 短暂延迟后显示扫描状态
      const timer1 = setTimeout(() => {
        setStatus('scanning');
        setMessage('请用 ProClaw 桌面端扫码登录');
      }, 1000);

      // 验证
      const timer2 = setTimeout(() => {
        verifyCode();
      }, 1500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [code, verifyCode]);
  
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ProClaw Shop</h1>
          <p className="text-gray-500 mt-2">ProClaw Shop 扫码登录</p>
        </div>
        
        {/* 状态显示 */}
        <div className="mb-8">
          {status === 'loading' && (
            <div className="animate-pulse">
              <div className="w-48 h-48 mx-auto bg-gray-200 rounded-xl" />
            </div>
          )}
          
          {status === 'scanning' && (
            <div className="relative">
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl border-2 border-dashed border-blue-300 flex items-center justify-center">
                {/* 二维码占位 */}
                <div className="w-32 h-32 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {qrPattern.map((filled, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-sm ${
                          filled ? 'bg-white' : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* 扫描动画 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-1 bg-blue-500 animate-pulse rounded-full" />
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="w-48 h-48 mx-auto bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-24 h-24 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-48 h-48 mx-auto bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-24 h-24 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
        
        {/* 消息 */}
        <div className={`text-lg font-medium ${
          status === 'success' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' : 'text-gray-700'
        }`}>
          {message}
        </div>
        
        {/* 提示 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-sm">
            💡 <strong>提示：</strong><br/>
            1. 在 ProClaw 桌面端打开「管理我的商城」<br/>
            2. 点击「扫码登录」生成二维码<br/>
            3. 用此页面扫描二维码即可登录
          </p>
        </div>
        
        {/* 重新加载 */}
        {status === 'error' && (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            重新扫码
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScanLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-48 h-48 bg-gray-300 rounded-xl" />
        </div>
      </div>
    }>
      <ScanLoginContent />
    </Suspense>
  );
}
