// ProClaw Shop - 订单成功页面
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {/* 成功图标 */}
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* 标题 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">订单提交成功！</h1>
        <p className="text-gray-500 mb-6">感谢您的购买，我们会尽快处理您的订单</p>
        
        {/* 订单号 */}
        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">订单号</p>
            <p className="font-mono font-semibold text-gray-900">{orderId}</p>
          </div>
        )}
        
        {/* 提示信息 */}
        <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">温馨提示</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 订单确认后，您将收到短信通知</li>
            <li>• 我们将在 24 小时内发货</li>
            <li>• 如有疑问，请联系商家客服</li>
          </ul>
        </div>
        
        {/* 操作按钮 */}
        <div className="space-y-3">
          <Link
            href="/orders"
            className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看我的订单
          </Link>
          <Link
            href="/"
            className="block w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            继续购物
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
