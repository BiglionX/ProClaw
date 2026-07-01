//! ProClaw 批量导入中心 - 类型与常量定义（v1.2 P1）
//!
//! 六类业务对象导入：商品 / 库存 / 采购 / 销售 / 供应商 / 客户
//! 与 [database/migrations/060_import_batches.sql] 字段严格对齐。

// 预留 API：让前端能拿到字段定义与必填列表（未在后端使用的部分加 allow）
#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================
// 1. 目标类型枚举
// ============================================

/// 业务对象导入目标
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportTarget {
    /// 商品库（products 表）
    Products,
    /// 库存交易（inventory_transactions 表）
    Inventory,
    /// 采购订单（purchase_orders + purchase_order_items）
    Purchases,
    /// 销售订单（sales_orders + sales_order_items）
    Sales,
    /// 供应商（suppliers 表）
    Suppliers,
    /// 客户（customers 表）
    Customers,
}

impl ImportTarget {
    pub fn as_str(&self) -> &'static str {
        match self {
            ImportTarget::Products => "products",
            ImportTarget::Inventory => "inventory",
            ImportTarget::Purchases => "purchases",
            ImportTarget::Sales => "sales",
            ImportTarget::Suppliers => "suppliers",
            ImportTarget::Customers => "customers",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "products" => Some(ImportTarget::Products),
            "inventory" => Some(ImportTarget::Inventory),
            "purchases" => Some(ImportTarget::Purchases),
            "sales" => Some(ImportTarget::Sales),
            "suppliers" => Some(ImportTarget::Suppliers),
            "customers" => Some(ImportTarget::Customers),
            _ => None,
        }
    }

    /// 中文展示名
    pub fn display_name(&self) -> &'static str {
        match self {
            ImportTarget::Products => "商品库",
            ImportTarget::Inventory => "库存交易",
            ImportTarget::Purchases => "采购订单",
            ImportTarget::Sales => "销售订单",
            ImportTarget::Suppliers => "供应商",
            ImportTarget::Customers => "客户",
        }
    }
}

// ============================================
// 2. 批次状态枚举
// ============================================

/// 批次状态机：见 [database/migrations/060_import_batches.sql] 注释
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BatchStatus {
    Pending,
    Parsing,
    Mapping,
    Validating,
    Importing,
    Paused,
    Retrying,
    Success,
    Partial,
    Failed,
    Cancelled,
}

impl BatchStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            BatchStatus::Pending => "pending",
            BatchStatus::Parsing => "parsing",
            BatchStatus::Mapping => "mapping",
            BatchStatus::Validating => "validating",
            BatchStatus::Importing => "importing",
            BatchStatus::Paused => "paused",
            BatchStatus::Retrying => "retrying",
            BatchStatus::Success => "success",
            BatchStatus::Partial => "partial",
            BatchStatus::Failed => "failed",
            BatchStatus::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "pending" => BatchStatus::Pending,
            "parsing" => BatchStatus::Parsing,
            "mapping" => BatchStatus::Mapping,
            "validating" => BatchStatus::Validating,
            "importing" => BatchStatus::Importing,
            "paused" => BatchStatus::Paused,
            "retrying" => BatchStatus::Retrying,
            "success" => BatchStatus::Success,
            "partial" => BatchStatus::Partial,
            "failed" => BatchStatus::Failed,
            "cancelled" => BatchStatus::Cancelled,
            _ => BatchStatus::Pending,
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            BatchStatus::Success
                | BatchStatus::Partial
                | BatchStatus::Failed
                | BatchStatus::Cancelled
        )
    }
}

// ============================================
// 3. 字段定义与必填字段映射
// ============================================

/// 字段元数据（仅序列化，不反序列化；前端自己维护字段定义）
#[derive(Debug, Clone, Serialize)]
pub struct FieldDef {
    pub key: &'static str,        // 内部字段名
    pub label: &'static str,      // 中文显示
    pub aliases: &'static [&'static str], // 同义词（中英文）
    pub required: bool,
    pub field_type: &'static str, // "string" / "number" / "date" / "boolean"
    pub example: &'static str,
}

/// 一行数据已映射后的字段表（key = 字段名, value = 单元格字符串值）
pub type FieldMap = HashMap<String, String>;

/// 单行解析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedRow {
    pub row_index: usize, // 1-based，第 1 行 = 标题后的第一行数据
    pub fields: FieldMap,
}

// ============================================
// 4. 主表 / 错误表（与 DB 字段一一对应）
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBatch {
    pub id: String,
    pub target_type: String,
    pub source_filename: String,
    pub source_format: String, // csv / xlsx / json
    pub source_size: Option<i64>,
    pub source_path: Option<String>,
    pub row_count: Option<i64>,
    pub column_mapping: Option<String>, // JSON
    pub status: String,
    pub processed_rows: i64,
    pub success_rows: i64,
    pub failed_rows: i64,
    pub skipped_rows: i64,
    pub error_summary: Option<String>,
    pub dedup_key: Option<String>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub performed_by: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBatchError {
    pub id: String,
    pub batch_id: String,
    pub row_index: i64,
    pub field_name: Option<String>,
    pub error_code: String,
    pub error_message: String,
    pub raw_value: Option<String>,
    pub phase: String,
    pub created_at: Option<String>,
}

// ============================================
// 5. 命令层入参
// ============================================

/// 创建批次入参
#[derive(Debug, Clone, Deserialize)]
pub struct ImportRequest {
    pub target_type: String,
    pub source_filename: String,
    pub source_format: String, // csv / xlsx / json
    pub source_base64: Option<String>, // 文件内容 base64（避免依赖 fs 权限）
    pub performed_by: Option<String>,
    pub notes: Option<String>,
}

/// 校验请求
#[derive(Debug, Clone, Deserialize)]
pub struct ValidateRequest {
    pub batch_id: String,
    pub column_mapping: HashMap<String, String>, // 列名 → 字段 key
    pub default_values: Option<HashMap<String, String>>,
}

/// 执行请求（用户点击「开始导入」后）
#[derive(Debug, Clone, Deserialize)]
pub struct ExecuteRequest {
    pub batch_id: String,
    pub column_mapping: HashMap<String, String>,
    pub default_values: Option<HashMap<String, String>>,
    pub skip_errors: Option<bool>, // 单行错误是否跳过（默认 true）
}

// ============================================
// 6. 各目标必填字段表（用于向导 Step 3 字段映射页）
// ============================================

/// 商品库字段定义
pub const FIELDS_PRODUCTS: &[FieldDef] = &[
    FieldDef { key: "sku",          label: "SKU 编码",       aliases: &["sku", "SKU", "商品编码", "商品代码", "货号"],        required: true,  field_type: "string", example: "SKU-001" },
    FieldDef { key: "name",         label: "商品名称",       aliases: &["name", "商品名称", "名称", "品名", "产品名"],         required: true,  field_type: "string", example: "iPhone 15 电池" },
    FieldDef { key: "category",     label: "分类",           aliases: &["category", "分类", "品类", "商品分类"],                 required: false, field_type: "string", example: "iPhone 15 系列" },
    FieldDef { key: "brand",        label: "品牌",           aliases: &["brand", "品牌", "牌子"],                             required: false, field_type: "string", example: "Apple" },
    FieldDef { key: "unit",         label: "单位",           aliases: &["unit", "单位", "计量单位"],                         required: false, field_type: "string", example: "块" },
    FieldDef { key: "cost_price",   label: "成本价",         aliases: &["cost_price", "cost", "成本价", "进价", "进货价"],     required: false, field_type: "number", example: "80.00" },
    FieldDef { key: "sell_price",   label: "销售价",         aliases: &["sell_price", "price", "售价", "销售价", "零售价"],     required: false, field_type: "number", example: "199.00" },
    FieldDef { key: "current_stock", label: "初始库存",      aliases: &["current_stock", "stock", "库存", "初始库存", "期初库存"], required: false, field_type: "number", example: "50" },
    FieldDef { key: "min_stock",    label: "最低库存",       aliases: &["min_stock", "min", "最低库存", "安全库存"],           required: false, field_type: "number", example: "5" },
    FieldDef { key: "max_stock",    label: "最高库存",       aliases: &["max_stock", "max", "最高库存", "最大库存"],           required: false, field_type: "number", example: "999" },
    FieldDef { key: "barcode",      label: "条形码",         aliases: &["barcode", "条形码", "条码"],                         required: false, field_type: "string", example: "6931234560001" },
    FieldDef { key: "description",  label: "商品描述",       aliases: &["description", "描述", "商品描述", "备注"],            required: false, field_type: "string", example: "原装电池" },
];

/// 库存交易字段定义
pub const FIELDS_INVENTORY: &[FieldDef] = &[
    FieldDef { key: "sku",          label: "SKU 编码",       aliases: &["sku", "SKU", "商品编码"],                            required: true,  field_type: "string", example: "SKU-001" },
    FieldDef { key: "transaction_type", label: "交易类型",   aliases: &["transaction_type", "type", "交易类型", "类型"],      required: true,  field_type: "string", example: "inbound" },
    FieldDef { key: "quantity",     label: "数量",           aliases: &["quantity", "qty", "数量"],                          required: true,  field_type: "number", example: "10" },
    FieldDef { key: "transaction_date", label: "交易日期",   aliases: &["transaction_date", "date", "日期", "交易日期"],       required: false, field_type: "date",   example: "2026-07-01" },
    FieldDef { key: "reference_no", label: "参考单号",       aliases: &["reference_no", "ref", "参考单号", "关联单号"],        required: false, field_type: "string", example: "PO-2026-001" },
    FieldDef { key: "reason",       label: "原因",           aliases: &["reason", "原因", "理由"],                           required: false, field_type: "string", example: "采购入库" },
    FieldDef { key: "notes",        label: "备注",           aliases: &["notes", "备注", "note"],                             required: false, field_type: "string", example: "" },
];

/// 采购订单字段定义
pub const FIELDS_PURCHASES: &[FieldDef] = &[
    FieldDef { key: "po_number",    label: "采购单号",       aliases: &["po_number", "po", "采购单号", "单号"],                required: true,  field_type: "string", example: "PO-2026-001" },
    FieldDef { key: "supplier",     label: "供应商",         aliases: &["supplier", "供应商名称"],                            required: true,  field_type: "string", example: "深圳电池供应商" },
    FieldDef { key: "order_date",   label: "采购日期",       aliases: &["order_date", "采购日期", "日期"],                    required: true,  field_type: "date",   example: "2026-07-01" },
    FieldDef { key: "sku",          label: "SKU 编码",       aliases: &["sku", "SKU", "商品编码"],                            required: true,  field_type: "string", example: "SKU-001" },
    FieldDef { key: "quantity",     label: "数量",           aliases: &["quantity", "qty", "数量"],                          required: true,  field_type: "number", example: "10" },
    FieldDef { key: "unit_price",   label: "单价",           aliases: &["unit_price", "price", "单价"],                      required: true,  field_type: "number", example: "80.00" },
    FieldDef { key: "expected_delivery_date", label: "预计到货日期", aliases: &["expected_delivery_date", "到货日期"],        required: false, field_type: "date",   example: "2026-07-08" },
    FieldDef { key: "status",       label: "状态",           aliases: &["status", "状态"],                                   required: false, field_type: "string", example: "confirmed" },
    FieldDef { key: "notes",        label: "备注",           aliases: &["notes", "备注"],                                    required: false, field_type: "string", example: "" },
];

/// 销售订单字段定义
pub const FIELDS_SALES: &[FieldDef] = &[
    FieldDef { key: "so_number",    label: "销售单号",       aliases: &["so_number", "so", "销售单号", "单号"],                required: true,  field_type: "string", example: "SO-2026-001" },
    FieldDef { key: "customer",     label: "客户",           aliases: &["customer", "客户名称"],                              required: true,  field_type: "string", example: "手机维修店 A" },
    FieldDef { key: "order_date",   label: "销售日期",       aliases: &["order_date", "销售日期", "日期"],                    required: true,  field_type: "date",   example: "2026-07-01" },
    FieldDef { key: "sku",          label: "SKU 编码",       aliases: &["sku", "SKU", "商品编码"],                            required: true,  field_type: "string", example: "SKU-001" },
    FieldDef { key: "quantity",     label: "数量",           aliases: &["quantity", "qty", "数量"],                          required: true,  field_type: "number", example: "1" },
    FieldDef { key: "unit_price",   label: "单价",           aliases: &["unit_price", "price", "单价", "售价"],              required: true,  field_type: "number", example: "199.00" },
    FieldDef { key: "status",       label: "状态",           aliases: &["status", "状态"],                                   required: false, field_type: "string", example: "delivered" },
    FieldDef { key: "notes",        label: "备注",           aliases: &["notes", "备注"],                                    required: false, field_type: "string", example: "" },
];

/// 供应商字段定义
pub const FIELDS_SUPPLIERS: &[FieldDef] = &[
    FieldDef { key: "name",         label: "供应商名称",     aliases: &["name", "供应商名称", "名称"],                        required: true,  field_type: "string", example: "深圳电池供应商" },
    FieldDef { key: "code",         label: "供应商编码",     aliases: &["code", "供应商编码", "编码"],                        required: false, field_type: "string", example: "SUP-001" },
    FieldDef { key: "contact_person", label: "联系人",       aliases: &["contact_person", "contact", "联系人"],               required: false, field_type: "string", example: "张三" },
    FieldDef { key: "phone",        label: "电话",           aliases: &["phone", "电话", "联系电话"],                        required: false, field_type: "string", example: "13800138000" },
    FieldDef { key: "email",        label: "邮箱",           aliases: &["email", "邮箱", "电子邮箱"],                        required: false, field_type: "string", example: "supplier@example.com" },
    FieldDef { key: "address",      label: "地址",           aliases: &["address", "地址"],                                  required: false, field_type: "string", example: "" },
    FieldDef { key: "tax_number",   label: "税号",           aliases: &["tax_number", "税号"],                                required: false, field_type: "string", example: "" },
];

/// 客户字段定义
pub const FIELDS_CUSTOMERS: &[FieldDef] = &[
    FieldDef { key: "name",         label: "客户名称",       aliases: &["name", "客户名称", "名称"],                          required: true,  field_type: "string", example: "手机维修店 A" },
    FieldDef { key: "code",         label: "客户编码",       aliases: &["code", "客户编码", "编码"],                          required: false, field_type: "string", example: "CUS-001" },
    FieldDef { key: "contact_person", label: "联系人",       aliases: &["contact_person", "contact", "联系人"],               required: false, field_type: "string", example: "李四" },
    FieldDef { key: "phone",        label: "电话",           aliases: &["phone", "电话", "联系电话"],                        required: false, field_type: "string", example: "13900139000" },
    FieldDef { key: "email",        label: "邮箱",           aliases: &["email", "邮箱"],                                    required: false, field_type: "string", example: "" },
    FieldDef { key: "address",      label: "地址",           aliases: &["address", "地址"],                                  required: false, field_type: "string", example: "" },
    FieldDef { key: "customer_type", label: "客户类型",      aliases: &["customer_type", "客户类型"],                        required: false, field_type: "string", example: "company" },
];

/// 各目标的完整字段定义表（key = target, value = 字段列表）
pub const TARGET_FIELDS: &[(&str, &[FieldDef])] = &[
    ("products",  FIELDS_PRODUCTS),
    ("inventory", FIELDS_INVENTORY),
    ("purchases", FIELDS_PURCHASES),
    ("sales",     FIELDS_SALES),
    ("suppliers", FIELDS_SUPPLIERS),
    ("customers", FIELDS_CUSTOMERS),
];

/// 各目标的必填字段 key 列表（与 FieldDef.required 字段冗余但便于验证快速访问）
pub const REQUIRED_FIELDS_BY_TARGET: &[(&str, &[&str])] = &[
    ("products",  &["sku", "name"]),
    ("inventory", &["sku", "transaction_type", "quantity"]),
    ("purchases", &["po_number", "supplier", "order_date", "sku", "quantity", "unit_price"]),
    ("sales",     &["so_number", "customer", "order_date", "sku", "quantity", "unit_price"]),
    ("suppliers", &["name"]),
    ("customers", &["name"]),
];

/// 通过 target key 查找字段定义
pub fn fields_for(target: &str) -> Option<&'static [FieldDef]> {
    TARGET_FIELDS.iter().find(|(k, _)| *k == target).map(|(_, v)| *v)
}

/// 通过 target key 查找必填字段列表
pub fn required_fields_for(target: &str) -> &'static [&'static str] {
    REQUIRED_FIELDS_BY_TARGET
        .iter()
        .find(|(k, _)| *k == target)
        .map(|(_, v)| *v)
        .unwrap_or(&[])
}

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_target_roundtrip() {
        for target in [
            ImportTarget::Products,
            ImportTarget::Inventory,
            ImportTarget::Purchases,
            ImportTarget::Sales,
            ImportTarget::Suppliers,
            ImportTarget::Customers,
        ] {
            let s = target.as_str();
            let back = ImportTarget::from_str(s).unwrap();
            assert_eq!(target, back);
        }
    }

    #[test]
    fn test_status_roundtrip() {
        for status in [
            BatchStatus::Pending,
            BatchStatus::Parsing,
            BatchStatus::Mapping,
            BatchStatus::Validating,
            BatchStatus::Importing,
            BatchStatus::Paused,
            BatchStatus::Retrying,
            BatchStatus::Success,
            BatchStatus::Partial,
            BatchStatus::Failed,
            BatchStatus::Cancelled,
        ] {
            let s = status.as_str();
            let back = BatchStatus::from_str(s);
            assert_eq!(status, back);
        }
    }

    #[test]
    fn test_required_fields_for_each_target() {
        assert!(!required_fields_for("products").is_empty());
        assert!(!required_fields_for("inventory").is_empty());
        assert!(!required_fields_for("purchases").is_empty());
        assert!(!required_fields_for("sales").is_empty());
        assert!(!required_fields_for("suppliers").is_empty());
        assert!(!required_fields_for("customers").is_empty());
        assert!(required_fields_for("unknown").is_empty());
    }

    #[test]
    fn test_fields_for_each_target_has_sku() {
        for (key, fields) in TARGET_FIELDS {
            if key == &"suppliers" || key == &"customers" {
                continue; // 供应商/客户没有 sku 字段
            }
            assert!(
                fields.iter().any(|f| f.key == "sku"),
                "{} 缺少 sku 字段",
                key
            );
        }
    }

    #[test]
    fn test_status_terminal() {
        assert!(BatchStatus::Success.is_terminal());
        assert!(BatchStatus::Partial.is_terminal());
        assert!(BatchStatus::Failed.is_terminal());
        assert!(BatchStatus::Cancelled.is_terminal());
        assert!(!BatchStatus::Pending.is_terminal());
        assert!(!BatchStatus::Importing.is_terminal());
    }
}
