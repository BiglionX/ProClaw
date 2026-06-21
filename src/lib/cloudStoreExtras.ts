export interface ProductReview {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  content?: string;
  images: string[];
  reply?: string;
  reply_time?: number;
  created_at: string;
}

export interface StoreCoupon {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_amount: number;
  max_uses: number;
  used_count: number;
  start_time: number;
  end_time: number;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
}

export async function fetchStoreReviews(_productId?: string): Promise<ProductReview[]> {
  return [
    {
      id: '1',
      user_id: 'u1',
      user_name: '张三',
      rating: 5,
      content: '商品质量很好，物流也很快！',
      images: [],
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: 'u2',
      user_name: '李四',
      rating: 4,
      content: '还不错，性价比高。',
      images: [],
      reply: '感谢您的好评！',
      reply_time: Date.now(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

export async function fetchStoreCoupons(): Promise<StoreCoupon[]> {
  return [
    {
      id: '1',
      code: 'WELCOME10',
      discount_type: 'fixed',
      discount_value: 10,
      min_amount: 0,
      max_uses: 100,
      used_count: 5,
      start_time: Date.now() - 86400000,
      end_time: Date.now() + 30 * 86400000,
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      code: 'SAVE20',
      discount_type: 'percentage',
      discount_value: 20,
      min_amount: 100,
      max_uses: 0,
      used_count: 12,
      start_time: Date.now() - 86400000,
      end_time: Date.now() + 7 * 86400000,
      status: 'active',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}