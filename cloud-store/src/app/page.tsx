// ProClaw Cloud 托管版 - 首页
// 面向未登录用户的登录引导页

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 via-purple-600 to-indigo-700">
      {/* 导航栏 */}
      <nav className="flex items-center justify-between px-6 py-4 text-white">
        <div className="text-2xl font-bold">ProClaw Cloud</div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg border border-white/30 hover:bg-white/10 transition-colors"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 rounded-lg bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
          >
            免费注册
          </Link>
        </div>
      </nav>

      {/* Hero 区域 */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32 text-center text-white">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          云端经营，智能管理
        </h1>
        <p className="text-xl md:text-2xl mb-4 text-blue-100">
          无需安装，按量付费
        </p>
        <p className="text-lg text-blue-200/80 mb-12 max-w-2xl mx-auto">
          ProClaw Cloud 为中小商户提供云端进销存管理、AI 智能助手、
          实时消息沟通的一站式经营平台。浏览器打开即用，数据安全存于云端。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            免费开始使用
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 border-2 border-white/40 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            已有账号？登录
          </Link>
        </div>

        {/* 功能特点 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-semibold mb-2">进销存管理</h3>
            <p className="text-blue-100/80 text-sm">
              商品管理、采购入库、销售出库、库存盘点，一站式搞定
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI 智能助手</h3>
            <p className="text-blue-100/80 text-sm">
              AI 订单识别、智能分析、经营建议，让数据说话
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-semibold mb-2">按 Token 计费</h3>
            <p className="text-blue-100/80 text-sm">
              按实际使用量付费，用完即止。新用户赠送 1000 Token
            </p>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="text-center py-8 text-blue-200/60 text-sm">
        &copy; 2026 ProClaw Cloud. All rights reserved.
      </footer>
    </div>
  );
}
