/**
 * ApiService - 数据访问层
 * 优先从服务器获取数据，离线时回退到本地真实业务表。
 *
 * 对应 PRD v11.0 第2节：手机端独立数据库设计
 */

import { getApiClient } from './AuthService';
import { getConnectionMode } from './ConnectionManager';
import { getDatabase } from './DatabaseFactory';
import { writeChangeLog } from './ChangeLogManager';
import { generateId } from '../utils/generateId';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';
import { showToast } from '../components/Toast';
import { normalizeOutboundError, OUTBOUND_ERROR_MESSAGE } from '../lib/fetchWithTimeout';
import {
  incrementRetryCount,
  hasExceededMaxRetries,
  calculateNextRetryDelay,
  DEFAULT_MAX_RETRIES,
} from './SyncRetryPolicy';

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

export type ContactType = 'customer' | 'supplier' | 'colleague' | 'friend';

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
  friend: '朋友',
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

/** 审计 M1：generateId 从 ../utils/generateId 共享导入 */
const localGenerateId = (): string => generateId('local_');

/**
 * 基于商品ID生成确定性SKU ID，避免每次同步生成新ID导致行无限增长
 * 审计 E4：syncProductsToLocal 需要稳定的 SKU ID 以匹配已有行
 */
const generateDeterministicSkuId = (productId: string): string => {
  return `sku_default_${productId}`;
};

/**
 * 生成订单号
 */
const generateOrderNumber = (): string => {
  const prefix = 'SO';
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${rand}`;
};

/**
 * 获取商品列表（优先服务器，离线回退本地 product_spu + product_sku 表）
 */
export const getProducts = async (params?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> => {
  try {
    const mode = getConnectionMode();

    if (mode === 'offline') {
      return await getProductsFromLocal(params);
    }

    const client = await getApiClient();
    const response = await client.get('/api/products', { params });

    // 同步到本地数据库
    await syncProductsToLocal(response.data);

    return response.data;
  } catch (error) {
    const normalized = normalizeOutboundError(error);
    logger.warn('[ApiService] Failed to get products from server, using local DB:', getErrorMessage(error));
    showToast('error', '服务器访问失败', `${normalized}\n已切换到本地数据`);
    return await getProductsFromLocal(params);
  }
};

/**
 * 从本地 product_spu + product_sku 表查询商品
 */
const getProductsFromLocal = async (params?: any): Promise<Product[]> => {
  try {
    const db = getDatabase();
    let query = `
      SELECT spu.id, spu.name, spu.description, spu.category_id as category,
             sku.sku_code as sku, sku.sell_price as price, sku.current_stock as stock_quantity
      FROM product_spu spu
      LEFT JOIN product_sku sku ON sku.spu_id = spu.id AND sku.is_default = 1
      WHERE spu.deleted_at IS NULL
    `;
    const args: any[] = [];

    if (params?.search) {
      query += ' AND (spu.name LIKE ? OR sku.sku_code LIKE ?)';
      args.push(`%${params.search}%`, `%${params.search}%`);
    }
    if (params?.category) {
      query += ' AND spu.category_id = ?';
      args.push(params.category);
    }

    query += ' ORDER BY spu.updated_at DESC LIMIT ? OFFSET ?';
    args.push(params?.limit || 50, params?.offset || 0);

    const results = await db.getAllAsync(query, args);
    return results as Product[];
  } catch (error) {
    logger.warn('[ApiService] Failed to get products from local:', error);
    return [];
  }
};

/**
 * 将服务器商品数据同步到本地 product_spu / product_sku 表
 */
const syncProductsToLocal = async (products: Product[]): Promise<void> => {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    for (const product of products) {
      // 审计 W21：spu_code 为 UNIQUE NOT NULL，必须提供；服务器 Product.sku 映射为 spu_code，回退到 product.id
      const spuCode = product.sku || product.id;
      await db.runAsync(
        `INSERT OR REPLACE INTO product_spu (id, spu_code, name, description, category_id, last_modified, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'clean', ?, ?)`,
        [product.id, spuCode, product.name, product.description || '', product.category || '', now, now, now]
      );

      // 插入或更新默认 SKU（审计 E4：使用确定性 ID 以匹配已有行）
      await db.runAsync(
        `INSERT OR REPLACE INTO product_sku (id, spu_id, sku_code, sell_price, current_stock, is_default, last_modified, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, 'clean', ?, ?)`,
        [generateDeterministicSkuId(product.id), product.id, product.sku, product.price, product.stock_quantity, now, now, now]
      );
    }
  } catch (error) {
    logger.warn('[ApiService] Failed to sync products to local:', error);
  }
};

/**
 * 获取客户列表（优先服务器，离线回退本地 customers 表）
 */
export const getCustomers = async (params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Customer[]> => {
  try {
    const mode = getConnectionMode();

    if (mode === 'offline') {
      return await getCustomersFromLocal(params);
    }

    const client = await getApiClient();
    const response = await client.get('/api/customers', { params });

    await syncCustomersToLocal(response.data);

    return response.data;
  } catch (error) {
    const normalized = normalizeOutboundError(error);
    logger.warn('[ApiService] Failed to get customers from server, using local DB:', getErrorMessage(error));
    showToast('error', '服务器访问失败', `${normalized}\n已切换到本地数据`);
    return await getCustomersFromLocal(params);
  }
};

/**
 * 从本地 customers 表查询客户
 */
const getCustomersFromLocal = async (params?: any): Promise<Customer[]> => {
  try {
    const db = getDatabase();
    let query = 'SELECT * FROM customers WHERE 1=1';
    const args: any[] = [];

    if (params?.search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      args.push(`%${params.search}%`, `%${params.search}%`);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    args.push(params?.limit || 50, params?.offset || 0);

    const results = await db.getAllAsync(query, args);
    return results as Customer[];
  } catch (error) {
    logger.warn('[ApiService] Failed to get customers from local:', error);
    return [];
  }
};

/**
 * 将服务器客户数据同步到本地 customers 表
 */
const syncCustomersToLocal = async (customers: Customer[]): Promise<void> => {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    for (const customer of customers) {
      await db.runAsync(
        `INSERT OR REPLACE INTO customers (id, name, phone, email, address, company, contact_type, last_modified, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'clean', ?, ?)`,
        [customer.id, customer.name, customer.phone || '', customer.email || '',
         customer.address || '', customer.company || '', customer.contact_type || 'customer',
         now, now, now]
      );
    }
  } catch (error) {
    logger.warn('[ApiService] Failed to sync customers to local:', error);
  }
};

/**
 * 创建销售订单
 * 优先通过服务器创建，离线时写入本地 sales_orders + sales_order_items 表
 * 并自动记录 change_log 变更
 */
export const createSalesOrder = async (orderData: {
  customer_id: string;
  items: OrderItem[];
  notes?: string;
}): Promise<Order> => {
  try {
    const mode = getConnectionMode();

    if (mode === 'offline') {
      // 离线模式直接写入本地数据库
      const localOrder = await createLocalSalesOrder(orderData);
      // 同时加入离线队列以便后续同步到服务器
      await addToOfflineQueue('POST', '/api/sales_orders', orderData);
      return localOrder;
    }

    const client = await getApiClient();
    const response = await client.post('/api/sales_orders', orderData);

    // 将服务器创建的订单同步到本地
    await syncOrderToLocal(response.data);

    return response.data;
  } catch (error) {
    const normalized = normalizeOutboundError(error);
    logger.warn('[ApiService] Failed to create order, writing to local DB:', getErrorMessage(error));
    showToast('error', '服务器访问失败', `${normalized}\n订单已保存到本地，将在网络恢复后同步`);

    // 网络失败时写入本地
    const localOrder = await createLocalSalesOrder(orderData);
    await addToOfflineQueue('POST', '/api/sales_orders', orderData);
    return localOrder;
  }
};

/**
 * 在本地数据库创建销售订单
 */
const createLocalSalesOrder = async (orderData: {
  customer_id: string;
  items: OrderItem[];
  notes?: string;
}): Promise<Order> => {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const orderId = localGenerateId();
  const orderNumber = generateOrderNumber();
  const totalAmount = orderData.items.reduce((sum, item) => sum + (item.subtotal || item.quantity * item.unit_price), 0);

  // 插入订单主表
  await db.runAsync(
    `INSERT INTO sales_orders (id, order_number, customer_id, total_amount, status, notes, last_modified, sync_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, 'pending', ?, ?)`,
    [orderId, orderNumber, orderData.customer_id, totalAmount, orderData.notes || '', now, now, now]
  );

  // 插入订单明细
  for (const item of orderData.items) {
    const itemId = localGenerateId();
    await db.runAsync(
      `INSERT INTO sales_order_items (id, order_id, sku_id, sku_code, product_name, quantity, unit_price, subtotal, last_modified, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [itemId, orderId, item.product_id, item.product_id, item.product_name,
       item.quantity, item.unit_price, item.subtotal || item.quantity * item.unit_price,
       now, now]
    );
  }

  // 记录变更日志
  await writeChangeLog(db, 'sales_orders', orderId, 'insert', undefined, JSON.stringify({
    order_number: orderNumber,
    customer_id: orderData.customer_id,
    total_amount: totalAmount,
    status: 'draft',
  }));

  logger.log('[ApiService] Created local sales order:', orderNumber);

  return {
    id: orderId,
    order_number: orderNumber,
    order_type: 'sales',
    customer_id: orderData.customer_id,
    total_amount: totalAmount,
    status: 'draft',
    items: orderData.items,
    created_at: new Date(now * 1000).toISOString(),
  };
};

/**
 * 将服务器订单同步到本地
 */
const syncOrderToLocal = async (order: Order): Promise<void> => {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    await db.runAsync(
      `INSERT OR REPLACE INTO sales_orders (id, order_number, customer_id, total_amount, status, last_modified, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'clean', ?, ?)`,
      [order.id, order.order_number, order.customer_id || '', order.total_amount, order.status, now, now, now]
    );

    if (order.items) {
      for (let idx = 0; idx < order.items.length; idx++) {
        const item = order.items[idx];
        // 审计 V1 修复：基于 orderId + product_id + index 生成确定性 ID，避免同商品多行碰撞
        const itemId = `item_${order.id}_${item.product_id}_${idx}`;
        await db.runAsync(
          `INSERT OR REPLACE INTO sales_order_items (id, order_id, sku_id, sku_code, product_name, quantity, unit_price, subtotal, last_modified, sync_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'clean', ?)`,
          [itemId, order.id, item.product_id, item.product_id, item.product_name,
           item.quantity, item.unit_price, item.subtotal, now, now]
        );
      }
    }
  } catch (error) {
    logger.warn('[ApiService] Failed to sync order to local:', error);
  }
};

/**
 * 添加到离线队列（保留，作为云端同步的回退机制）
 */
const addToOfflineQueue = async (
  method: string,
  endpoint: string,
  payload: any
): Promise<void> => {
  try {
    const db = getDatabase();
    // 审计 H7/D8：补充 created_at 列（Schema 定义为 NOT NULL）
    await db.runAsync(
      'INSERT INTO offline_queue (endpoint, method, payload, created_at) VALUES (?, ?, ?, ?)',
      [endpoint, method, JSON.stringify(payload), Math.floor(Date.now() / 1000)]
    );
    logger.log('[ApiService] Added to offline queue:', endpoint);
  } catch (error) {
    logger.warn('[ApiService] Failed to add to offline queue:', error);
    throw error;
  }
};

// 离线队列同步重试由 SyncRetryPolicy 持久化到 offline_queue.retry_count

/**
 * 同步离线队列到服务器
 */
export const syncOfflineQueue = async (): Promise<void> => {
  try {
    const mode = getConnectionMode();

    if (mode === 'offline') {
      logger.log('[ApiService] Cannot sync in offline mode');
      return;
    }

    const db = getDatabase();
    const BATCH_SIZE = 100;
    const nowSec = Math.floor(Date.now() / 1000);
    const results: any[] = await db.getAllAsync(
      `SELECT * FROM offline_queue
       WHERE COALESCE(next_retry_at, 0) <= ?
       ORDER BY created_at ASC LIMIT ?`,
      [nowSec, BATCH_SIZE]
    );

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
        logger.log('[ApiService] Synced offline item:', row.id);
      } catch (error) {
        const itemId = row.id;
        const newAttempts = await incrementRetryCount(db, itemId);
        if (hasExceededMaxRetries(newAttempts, DEFAULT_MAX_RETRIES)) {
          logger.warn('[ApiService] Offline item exceeded max retries, removing:', itemId);
          await db.runAsync('DELETE FROM offline_queue WHERE id = ?', [itemId]);
        } else {
          const delayMs = calculateNextRetryDelay(newAttempts);
          const nextRetryAt = nowSec + Math.ceil(delayMs / 1000);
          await db.runAsync(
            'UPDATE offline_queue SET next_retry_at = ? WHERE id = ?',
            [nextRetryAt, itemId]
          );
          logger.warn(
            `[ApiService] Failed to sync item ${itemId} (attempt ${newAttempts}/${DEFAULT_MAX_RETRIES}):`,
            error
          );
        }
        continue;
      }
    }
  } catch (error) {
    logger.warn('[ApiService] Failed to sync offline queue:', error);
  }
};

export default {
  getProducts,
  getCustomers,
  createSalesOrder,
  syncOfflineQueue,
};
