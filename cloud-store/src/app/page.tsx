// 首页 - 商品列表
import ProductCard from '@/components/ProductCard';
import { getProducts } from '@/lib/api';
import Link from 'next/link';

export const revalidate = 60; // 60秒重新验证一次

export default async function HomePage() {
  const { data: products, total } = await getProducts(1, 12);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero 区域 */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          欢迎来到 ProClaw 商城
        </h1>
        <p className="text-xl mb-8 opacity-90">
          品质生活，轻松购物
        </p>
        <Link
          href="#products"
          className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
        >
          浏览商品
        </Link>
      </section>

      {/* 商品列表 */}
      <section id="products">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">热门商品</h2>
        
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">暂无商品，敬请期待...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* 分页信息 */}
            <div className="mt-12 text-center text-gray-600">
              共 {total} 个商品
            </div>
          </>
        )}
      </section>

      {/* 特色区域 */}
      <section className="mt-16 bg-gray-50 rounded-2xl p-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          为什么选择我们？
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl mb-4">🚚</div>
            <h3 className="text-xl font-semibold mb-2">快速配送</h3>
            <p className="text-gray-600">下单后24小时内发货，快速送达</p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">💯</div>
            <h3 className="text-xl font-semibold mb-2">品质保证</h3>
            <p className="text-gray-600">所有商品均经过严格质量检测</p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">优惠价格</h3>
            <p className="text-gray-600">直接对接厂家，价格更优惠</p>
          </div>
        </div>
      </section>
    </div>
  );
}
