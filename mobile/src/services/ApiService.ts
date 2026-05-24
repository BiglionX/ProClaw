import { getApiClient } from './AuthService';
import { getConnectionMode } from './ConnectionManager';
import { getDatabase } from './DatabaseService';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category?: string;
  image_url?: string;
}

export type ContactType = 'customer' | 'supplier' | 'colleague';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_type?: ContactType;
  company?: string;
  position?: string;
  department?: string;
}

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  customer: '客户',
  supplier: '供应商',
  colleague: '同事',
};

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: 'sales' | 'purchase';
  customer_id?: string;
  supplier_id?: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
  created_at: string;
}

export const getProducts = async (params?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> => {
  try {
    const mode = getConnectionMode();
    
    if (mode === 'offline') {
      return await getProductsFromCache(params);
    }

    const client = await getApiClient();
    const response = await client.get('/api/products', { params });
    
    // Cache products
    await cacheProducts(response.data);
    
    return response.data;
  } catch (error: any) {
    console.warn('Failed to get products from server, using cache:', error?.message);
    return await getProductsFromCache(params);
  }
};

const getProductsFromCache = async (params?: any): Promise<Product[]> => {
  try {
    const db = getDatabase();
    let query = 'SELECT * FROM products_cache WHERE 1=1';
    const args: any[] = [];

    if (params?.search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      args.push(`%${params.search}%`, `%${params.search}%`);
    }

    query += ' ORDER BY cached_at DESC LIMIT ? OFFSET ?';
    args.push(params?.limit || 50, params?.offset || 0);

    const results = await db.getAllAsync(query, args);
    return results as Product[];
  } catch (error) {
    console.warn('Failed to get from cache:', error);
    return [];
  }
};

const cacheProducts = async (products: Product[]): Promise<void> => {
  try {
    const db = getDatabase();
    
    for (const product of products) {
      await db.runAsync(
        `INSERT OR REPLACE INTO products_cache 
         (id, sku, name, price, stock_quantity, cached_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [product.id, product.sku, product.name, product.price, product.stock_quantity]
      );
    }
  } catch (error) {
    console.warn('Failed to cache products:', error);
  }
};

export const getCustomers = async (params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Customer[]> => {
  try {
    const mode = getConnectionMode();

    if (mode === 'offline') {
      return await getCustomersFromCache(params);
    }

    const client = await getApiClient();
    const response = await client.get('/api/customers', { params });

    await cacheCustomers(response.data);

    return response.data;
  } catch (error: any) {
    console.warn('Failed to get customers from server, using cache:', error?.message);
    return await getCustomersFromCache(params);
  }
};

const getCustomersFromCache = async (params?: any): Promise<Customer[]> => {
  try {
    const db = getDatabase();
    let query = 'SELECT * FROM customers_cache WHERE 1=1';
    const args: any[] = [];

    if (params?.search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      args.push(`%${params.search}%`, `%${params.search}%`);
    }

    query += ' ORDER BY cached_at DESC LIMIT ? OFFSET ?';
    args.push(params?.limit || 50, params?.offset || 0);

    const results = await db.getAllAsync(query, args);
    return results as Customer[];
  } catch (error) {
    console.warn('Failed to get customers from cache:', error);
    return [];
  }
};

const cacheCustomers = async (customers: Customer[]): Promise<void> => {
  try {
    const db = getDatabase();

    for (const customer of customers) {
      await db.runAsync(
        `INSERT OR REPLACE INTO customers_cache
         (id, name, phone, email, address, cached_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [customer.id, customer.name, customer.phone || '', customer.email || '', customer.address || '']
      );
    }
  } catch (error) {
    console.warn('Failed to cache customers:', error);
  }
};

export const createSalesOrder = async (orderData: {
  customer_id: string;
  items: OrderItem[];
  notes?: string;
}): Promise<Order> => {
  try {
    const mode = getConnectionMode();
    
    if (mode === 'offline') {
      await addToOfflineQueue('POST', '/api/sales_orders', orderData);
      throw new Error('当前为离线模式，订单已加入同步队列');
    }

    const client = await getApiClient();
    const response = await client.post('/api/sales_orders', orderData);
    
    return response.data;
  } catch (error: any) {
    if (error.message?.includes('离线模式')) {
      throw error;
    }
    
    console.warn('Failed to create order, queuing offline:', error?.message);
    await addToOfflineQueue('POST', '/api/sales_orders', orderData);
    throw new Error('网络连接失败，订单已加入同步队列');
  }
};

const addToOfflineQueue = async (
  method: string,
  endpoint: string,
  payload: any
): Promise<void> => {
  try {
    const db = getDatabase();
    await db.runAsync(
      'INSERT INTO offline_queue (endpoint, method, payload) VALUES (?, ?, ?)',
      [endpoint, method, JSON.stringify(payload)]
    );
    console.log('Added to offline queue:', endpoint);
  } catch (error) {
    console.warn('Failed to add to offline queue:', error);
    throw error;
  }
};

export const syncOfflineQueue = async (): Promise<void> => {
  try {
    const mode = getConnectionMode();
    
    if (mode === 'offline') {
      console.log('Cannot sync in offline mode');
      return;
    }

    const db = getDatabase();
    const results: any[] = await db.getAllAsync('SELECT * FROM offline_queue ORDER BY created_at ASC');

    const client = await getApiClient();
    
    for (const row of results) {
      try {
        const payload = JSON.parse(row.payload);
        
        await client.request({
          method: row.method,
          url: row.endpoint,
          data: payload
        });
        
        await db.runAsync('DELETE FROM offline_queue WHERE id = ?', [row.id]);
        console.log('Synced offline item:', row.id);
      } catch (error) {
        console.warn('Failed to sync item:', row.id);
      }
    }
  } catch (error) {
    console.warn('Failed to sync offline queue:', error);
  }
};

export default {
  getProducts,
  getCustomers,
  createSalesOrder,
  syncOfflineQueue
};
