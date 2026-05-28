// 云商城 API 调用函数
// 对接桌面端 Axum HTTP API

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const STORE_API_KEY = process.env.NEXT_PUBLIC_STORE_API_KEY || '';

// ========== 类型定义 ==========

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

export interface Store {
  id: string;
  user_id: string;
  subdomain: string;
  custom_domain?: string;
  api_key: string;
  status: string;
  plan_type: string;
  expires_at?: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  product_id: string;
  buyer_info: string;
  total_amount: number;
  status: string;
  shipping_address?: string;
  tracking_no?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// ========== API 调用函数 ==========

/**
 * 获取商城配置
 */
export async function getStore(): Promise<Store | null> {
  try {
    const response = await fetch(`${API_URL}/cloud-store`, {
      headers: {
        'X-API-Key': STORE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('获取商城配置失败:', error);
    return null;
  }
}

/**
 * 获取商品列表（云商城专用，仅返回 is_cloud_visible = 1 的商品）
 */
export async function getProducts(page = 1, pageSize = 20): Promise<{ data: Product[]; total: number }> {
  try {
    const response = await fetch(
      `${API_URL}/cloud-store/products?page=${page}&page_size=${pageSize}`,
      {
        headers: {
          'X-API-Key': STORE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      data: data.data || [],
      total: data.total || 0,
    };
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return { data: [], total: 0 };
  }
}

/**
 * 获取单个商品详情（云商城专用）
 */
export async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_URL}/cloud-store/products/${id}`, {
      headers: {
        'X-API-Key': STORE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('获取商品详情失败:', error);
    return null;
  }
}

/**
 * 创建订单
 */
export async function createOrder(orderData: {
  product_id: string;
  buyer_info: string;
  total_amount: number;
  shipping_address?: string;
  payment_method?: string;
}): Promise<Order | null> {
  try {
    const response = await fetch(`${API_URL}/cloud-store/callback/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': STORE_API_KEY,
      },
      body: JSON.stringify({
        store_id: process.env.NEXT_PUBLIC_DEFAULT_STORE_ID,
        ...orderData,
        status: 'pending',
        callback_status: 'pending',
        payment_method: orderData.payment_method || 'wechat',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('创建订单失败:', error);
    return null;
  }
}

/**
 * 获取订单列表
 */
export async function getOrders(status?: string): Promise<Order[]> {
  try {
    // 使用默认 store_id，实际项目中应该从上下文或用户登录信息获取
    const storeId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || 'default_store_id';
    const url = new URL(`${API_URL}/cloud-store/${storeId}/orders`);
    if (status) {
      url.searchParams.append('status', status);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-API-Key': STORE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return [];
  }
}

/**
 * 获取订单详情
 */
export async function getOrder(id: string): Promise<Order | null> {
  try {
    const storeId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || 'default_store_id';
    const response = await fetch(`${API_URL}/cloud-store/${storeId}/orders/${id}`, {
      headers: {
        'X-API-Key': STORE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return null;
  }
}

/**
 * 更新订单状态（用于模拟支付成功）
 */
export async function updateOrderStatus(id: string, status: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/cloud-store/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': STORE_API_KEY,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('更新订单状态失败:', error);
    return false;
  }
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
