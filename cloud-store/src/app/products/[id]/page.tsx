// 商品详情页
import { getProduct } from '@/lib/api';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';

interface ProductPageProps {
  params: {
    id: string;
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* 商品图片 */}
        <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 text-9xl">📦</span>
            </div>
          )}
        </div>

        {/* 商品信息 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {product.name}
          </h1>

          {product.sku && (
            <p className="text-gray-500 mb-4">SKU: {product.sku}</p>
          )}

          {product.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="mb-6">
            <span className="text-4xl font-bold text-red-600">
              ¥{product.price.toFixed(2)}
            </span>
          </div>

          <div className="mb-6">
            <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? `有货 (剩余 ${product.stock})` : '暂时缺货'}
            </span>
          </div>

          {/* 数量选择 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数量
            </label>
            <input
              type="number"
              min="1"
              max={product.stock}
              defaultValue="1"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="quantity"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-4">
            <AddToCartButton product={product} />
            <button className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-colors">
              立即购买
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
