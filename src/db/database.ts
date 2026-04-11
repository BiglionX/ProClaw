import { invoke } from '@tauri-apps/api/core'

// 产品类型定义
export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category_id?: string
  unit: string
  cost_price: number
  sell_price: number
  min_stock: number
  max_stock: number
  current_stock: number
  image_url?: string
  barcode?: string
  is_active: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  sync_status: 'pending' | 'synced' | 'conflict'
  last_synced_at?: string
}

// 产品分类类型定义
export interface ProductCategory {
  id: string
  name: string
  description?: string
  parent_id?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  sync_status: 'pending' | 'synced' | 'conflict'
}

// 库存交易类型定义
export interface InventoryTransaction {
  id: string
  product_id: string
  transaction_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer'
  quantity: number
  reference_no?: string
  reason?: string
  performed_by?: string
  notes?: string
  created_at: string
  sync_status: 'pending' | 'synced' | 'conflict'
}

/**
 * 数据库服务类
 * 通过 Tauri IPC 调用 Rust 后端进行数据库操作
 */
export class DatabaseService {
  // ==================== 产品管理 ====================
  
  /**
   * 创建产品
   */
  static async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sync_status'>): Promise<Product> {
    return await invoke('create_product', { product })
  }
  
  /**
   * 获取所有产品
   */
  static async getProducts(): Promise<Product[]> {
    return await invoke('get_products')
  }
  
  /**
   * 根据 ID 获取产品
   */
  static async getProductById(id: string): Promise<Product | null> {
    return await invoke('get_product_by_id', { id })
  }
  
  /**
   * 根据 SKU 获取产品
   */
  static async getProductBySku(sku: string): Promise<Product | null> {
    return await invoke('get_product_by_sku', { sku })
  }
  
  /**
   * 更新产品
   */
  static async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return await invoke('update_product', { id, updates })
  }
  
  /**
   * 删除产品(软删除)
   */
  static async deleteProduct(id: string): Promise<void> {
    return await invoke('delete_product', { id })
  }
  
  // ==================== 分类管理 ====================
  
  /**
   * 创建分类
   */
  static async createCategory(category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at' | 'sync_status'>): Promise<ProductCategory> {
    return await invoke('create_category', { category })
  }
  
  /**
   * 获取所有分类
   */
  static async getCategories(): Promise<ProductCategory[]> {
    return await invoke('get_categories')
  }
  
  // ==================== 库存管理 ====================
  
  /**
   * 记录库存交易
   */
  static async recordTransaction(transaction: Omit<InventoryTransaction, 'id' | 'created_at' | 'sync_status'>): Promise<InventoryTransaction> {
    return await invoke('record_transaction', { transaction })
  }
  
  /**
   * 获取产品的库存交易历史
   */
  static async getProductTransactions(productId: string): Promise<InventoryTransaction[]> {
    return await invoke('get_product_transactions', { productId })
  }
  
  // ==================== 同步管理 ====================
  
  /**
   * 获取待同步的记录
   */
  static async getPendingSyncRecords(): Promise<Array<{ table: string; records: any[] }>> {
    return await invoke('get_pending_sync_records')
  }
  
  /**
   * 标记记录为已同步
   */
  static async markAsSynced(table: string, recordId: string): Promise<void> {
    return await invoke('mark_as_synced', { table, recordId })
  }
  
  // ==================== 数据库信息 ====================
  
  /**
   * 获取数据库统计信息
   */
  static async getDatabaseStats(): Promise<{
    products: number
    categories: number
    transactions: number
    pending_sync: number
  }> {
    return await invoke('get_database_stats')
  }
  
  // ==================== 同步管理 ====================
  
  /**
   * 启动数据同步
   */
  static async startSync(): Promise<string> {
    return await invoke('start_sync')
  }
  
  /**
   * 获取同步状态
   */
  static async getSyncStatus(): Promise<{
    pending_operations: number
    conflicts: number
    last_sync?: string
    status: 'syncing' | 'synced'
  }> {
    return await invoke('get_sync_status')
  }
}

// 导出默认实例
export const db = DatabaseService
