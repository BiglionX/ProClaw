// 商品卡片组件
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/api';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* 商品图片 */}
        <div className="relative h-48 bg-gray-200 flex items-center justify-center">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              width={200}
              height={200}
            />
          ) : (
            <span className="text-gray-400 text-6xl">📦</span>
          )}
        </div>

        {/* 商品信息 */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-4">
            <span className="text-2xl font-bold text-red-600">
              ¥{product.price.toFixed(2)}
            </span>
            
            {product.stock > 0 ? (
              <span className="text-sm text-green-600">有货 ({product.stock})</span>
            ) : (
              <span className="text-sm text-red-600">缺货</span>
            )}
          </div>

          {product.sku && (
            <p className="text-xs text-gray-500 mt-2">SKU: {product.sku}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
