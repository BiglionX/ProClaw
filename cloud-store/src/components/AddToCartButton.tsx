// 加入购物车按钮组件
'use client';

import { useState } from 'react';
import { Product } from '@/lib/api';
import { addToCart } from '@/lib/api';

interface AddToCartButtonProps {
  product: Product;
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    const quantityInput = document.getElementById('quantity') as HTMLInputElement;
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    addToCart(product, quantity);
    setIsAdded(true);
    
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
        isAdded
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {isAdded ? '已加入购物车 ✓' : '加入购物车'}
    </button>
  );
}
