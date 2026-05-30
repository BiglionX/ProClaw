// ProClaw Cloud 托管版 - 结算页面
// 云托管版不提供在线商城结算功能，请通过 Token 计费系统使用服务
'use client';

import Link from 'next/link';

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">🏪</div>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">ProClaw Cloud 托管版</h1>
      <p className="text-gray-600 text-lg mb-8 max-w-lg mx-auto">
        云托管版专注于为企业提供进销存管理、AI 智能助手和实时通信服务。
        如需在线商城功能，建议使用 ProClaw 桌面版。
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/app/dashboard"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          前往仪表板
        </Link>
        <Link
          href="/app/token-billing"
          className="bg-yellow-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
        >
          Token 计费
        </Link>
      </div>
    </div>
  );
}
