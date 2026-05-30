// 云商城 - 购物车工具函数（localStorage 本地存储）
// 注意：旧版桌面端 API 调用函数已移除，云托管版使用 Supabase 直接查询

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
  stock: number;
  is_cloud_visible: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// ========== 购物车工具函数 ==========

/**
 * 从 localStorage 获取购物车
 */
export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
}

/**
 * 保存购物车到 localStorage
 */
export function saveCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cart', JSON.stringify(cart));
}

/**
 * 添加商品到购物车
 */
export function addToCart(product: Product, quantity = 1): CartItem[] {
  const cart = getCart();
  const existingItem = cart.find(item => item.product.id === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ product, quantity });
  }

  saveCart(cart);
  return cart;
}

/**
 * 从购物车移除商品
 */
export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart().filter(item => item.product.id !== productId);
  saveCart(cart);
  return cart;
}

/**
 * 更新购物车商品数量
 */
export function updateCartItemQuantity(productId: string, quantity: number): CartItem[] {
  const cart = getCart();
  const item = cart.find(item => item.product.id === productId);

  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    item.quantity = quantity;
  }

  saveCart(cart);
  return cart;
}

/**
 * 计算购物车总价
 */
export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
}

/**
 * 计算购物车商品总数
 */
export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

/**
 * 清空购物车
 */
export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cart');
}
