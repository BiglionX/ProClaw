use serde::{Deserialize, Serialize};

// ==================== 基础产品类型 (旧版兼容) ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub min_stock: i32,
    pub max_stock: i32,
    pub current_stock: i32,
    pub image_url: Option<String>,
    pub barcode: Option<String>,
    pub is_active: bool,
    pub metadata: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub last_synced_at: Option<String>,
}

// ==================== SPU-SKU 电商架构类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSPU {
    pub id: String,
    pub spu_code: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit: String,
    pub is_on_sale: bool,
    pub status: String,
    pub metadata: Option<String>,
    pub skus: Vec<ProductSKU>,
    pub images: Vec<ProductImage>,
    pub sku_count: i32,
    pub total_stock: i32,
    pub min_price: f64,
    pub max_price: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSKU {
    pub id: String,
    pub spu_id: String,
    pub sku_code: String,
    pub specifications: String,
    pub spec_text: Option<String>,
    pub cost_price: f64,
    pub sell_price: f64,
    pub current_stock: i32,
    pub min_stock: i32,
    pub max_stock: i32,
    pub barcode: Option<String>,
    pub weight: Option<f64>,
    pub volume: Option<f64>,
    pub is_default: bool,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductImage {
    pub id: String,
    pub spu_id: String,
    pub image_url: String,
    pub image_type: String,
    pub sort_order: i32,
    pub is_primary: bool,
    pub created_at: String,
}

// ==================== 库存交易类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryTransaction {
    pub id: String,
    pub product_id: String,
    pub transaction_type: String,
    pub quantity: i32,
    pub reference_no: Option<String>,
    pub reason: Option<String>,
    pub performed_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub sync_status: String,
}

// ==================== 统计信息类型 ====================

#[derive(Debug, Serialize)]
pub struct DatabaseStats {
    pub products: i64,
    pub categories: i64,
    pub transactions: i64,
    pub pending_sync: i64,
}

// ==================== 迁移结果类型 ====================

#[derive(Debug, Serialize)]
pub struct MigrationResult {
    pub migrated_products: i32,
    pub created_spus: i32,
    pub created_skus: i32,
    pub migrated_images: i32,
    pub duration_ms: u64,
}
