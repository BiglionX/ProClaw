// ProClaw Cloud 托管版 - 商品详情页

import Link from 'next/link';

export default function ProductDetailPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">📦</div>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">商品详情</h1>
      <p className="text-gray-600 text-lg mb-8 max-w-lg mx-auto">
        ProClaw Cloud 托管版商品管理请使用后台商品管理页面进行 SPU/SKU 管理。
      </p>
      <Link
        href="/app/products"
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        前往商品管理
      </Link>
    </div>
  );
}
