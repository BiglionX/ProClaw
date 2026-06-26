//! 数据导入共享类型
//!
//! 这些结构体与前端 `src/lib/importers/types.ts` 严格对齐（字段名 + snake_case 命名）。
//! 修改时需同步更新前端。

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

// ==================== 目标类型常量（v1.2 P1 扩展）====================

/// 商品库（MVP 已实现）
pub const TARGET_PRODUCTS: &str = "products";
/// 库存交易（P1 新增）
pub const TARGET_INVENTORY: &str = "inventory";
/// 采购订单（P1 新增）
pub const TARGET_PURCHASES: &str = "purchases";
/// 销售订单（P1 新增）
pub const TARGET_SALES: &str = "sales";
/// 供应商主数据（P1 新增）
pub const TARGET_SUPPLIERS: &str = "suppliers";
/// 客户主数据（P1 新增）
pub const TARGET_CUSTOMERS: &str = "customers";

/// 校验 target_type 字符串合法性（防止 SQL 注入 / 拼写错误）
pub fn is_valid_target(s: &str) -> bool {
    matches!(
        s,
        TARGET_PRODUCTS
            | TARGET_INVENTORY
            | TARGET_PURCHASES
            | TARGET_SALES
            | TARGET_SUPPLIERS
            | TARGET_CUSTOMERS
    )
}

/// 冲突处理策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConflictStrategy {
    /// 跳过（保留旧数据）
    Skip,
    /// 覆盖（UPDATE 已存在记录）
    Overwrite,
    /// 创建副本（追加 _copy2/_copy3 后缀）
    Duplicate,
}

impl ConflictStrategy {
    pub fn from_str(s: &str) -> Self {
        match s {
            "overwrite" => Self::Overwrite,
            "duplicate" => Self::Duplicate,
            _ => Self::Skip,
        }
    }
}

/// 导入批次（与 import_batches 表一一对应）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBatch {
    pub id: String,
    pub user_id: String,
    pub file_name: String,
    pub file_hash: Option<String>,
    pub file_size: Option<i64>,
    pub file_type: String,
    pub target_type: String,
    pub mapping_json: Option<String>,
    pub conflict_strategy: String,
    pub status: String,
    pub total_rows: i64,
    pub success_rows: i64,
    pub failed_rows: i64,
    pub skipped_rows: i64,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub error_report_json: Option<String>,
    pub created_at: String,
    // v1.3：Import Center 新增列
    pub last_heartbeat_at: Option<String>,
    pub processed_rows: i64,
    pub paused_reason: Option<String>,
}

/// 一行导入数据（源格式）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRow {
    /// 原始行号（1-based，包含表头时为数据起始行；前端约定从 1 开始）
    pub row_index: usize,
    /// 解析后以"源列名"为键的字符串字典
    pub raw: HashMap<String, String>,
}

/// 字段映射：源列 → 目标字段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMapping {
    pub source_column: String,
    /// 目标字段名，例如 "name" / "spu_code" / "cost_price"
    /// 若为空字符串表示"忽略此列"
    pub target_field: String,
}

/// 导入错误（行级 / 字段级）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImportError {
    pub row_index: usize,
    /// 字段名（"name" / "sell_price" 等），或 "_row" 表示整行级错误
    pub field: String,
    /// L1 格式 / L2 业务 / L3 引用
    pub level: String,
    /// 错误码（REQUIRED_EMPTY / TYPE_MISMATCH / DUPLICATE_KEY / OUT_OF_RANGE / ...）
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

/// 完整导入请求（前端发往后端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRequest {
    pub file_name: String,
    pub file_type: String, // xlsx | csv | json
    #[serde(default)]
    pub file_hash: Option<String>,
    pub rows: Vec<ImportRow>,
    pub mapping: Vec<FieldMapping>,
    pub conflict_strategy: String, // skip | overwrite | duplicate
    /// 目标类型（MVP 仅 'products'；P1 扩展 'inventory'/'purchases'/'sales'/'suppliers'/'customers'）
    /// 不在结构体里 serde default 是为了提醒：MVP 阶段前端未传时默认为 'products'，保持向后兼容
    #[serde(default = "default_target_type")]
    pub target_type: String,
    /// v1.3 新增：图片 zip 包在 AppData 内的相对路径（指向 `import_images/<hash>/`）
    /// 解析后由 executor 读取 `image_filename` 字段定位具体文件并复制到 `product_images`
    #[serde(default)]
    pub image_archive: Option<String>,
}

// ==================== 图片 zip 包结构（v1.3 新增）====================

/// 单个图片条目（在 zip 解压后由后端填充）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageManifestEntry {
    /// zip 内的原始文件名（含扩展名）
    pub archive_name: String,
    /// 解析后的 SPU 编码（来自文件名第一段 `SPU_x.png` 约定）；无法解析时为 None
    pub spu_code: Option<String>,
    /// 解析后的 SKU 编码（来自文件名 `_SKU` 段）；无法解析时为 None
    pub sku_code: Option<String>,
    pub size_bytes: u64,
    /// 解压后磁盘绝对路径
    pub local_path: String,
}

/// 图片 zip 包清单（前端通过 import_extract_images 命令获取）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageArchiveManifest {
    /// zip 文件解压后所在目录（AppData 内绝对路径）
    pub archive_dir: String,
    pub entries: Vec<ImageManifestEntry>,
    pub total_size: u64,
}

// ==================== 模板元数据（v1.3 C1 新增）====================

/// 单套模板的元数据（前端 importService.listTemplates 返回）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportTemplate {
    /// 模板 ID（与 target_type 一致：products / inventory / purchases / sales / suppliers-customers）
    pub name: String,
    /// 业务目标类型（用于向导预选）
    pub target_type: String,
    /// 磁盘上的 xlsx 文件名（含扩展名）
    pub file_name: String,
    /// 文件大小（字节）
    pub size_bytes: u64,
    /// SHA-256 十六进制（64 字符），用于校验完整性
    pub sha256: String,
}

/// v1.3 C1：模板目录名（AppData 内）
pub const TEMPLATE_DIR_NAME: &str = "import_templates";
/// v1.3 C1：模板文件名后缀
pub const TEMPLATE_FILENAME_SUFFIX: &str = "-template.xlsx";
/// v1.3 C1：示例图片 zip 名
pub const EXAMPLES_ZIP_NAME: &str = "examples.zip";

/// v1.3 C1：5 套模板定义（id, target_type, 中文名）
pub const TEMPLATE_DEFINITIONS: &[(&str, &str, &str)] = &[
    ("products", TARGET_PRODUCTS, "商品库模板"),
    ("inventory", TARGET_INVENTORY, "库存交易模板"),
    ("purchases", TARGET_PURCHASES, "采购订单模板"),
    ("sales", TARGET_SALES, "销售订单模板"),
    (
        "suppliers-customers",
        "suppliers-customers",
        "供应商与客户主数据模板",
    ),
];

fn default_target_type() -> String {
    TARGET_PRODUCTS.to_string()
}

// ==================== 目标相关必填字段定义（P1 新增）====================

/// 库存交易导入必填字段
pub const REQUIRED_INVENTORY_FIELDS: &[&str] =
    &["sku_code", "transaction_type", "quantity", "transaction_date"];
/// 采购订单导入必填字段（每行 = 1 个采购单 + 1 个 item，平铺结构）
pub const REQUIRED_PURCHASE_FIELDS: &[&str] = &[
    "po_number",
    "supplier_name",
    "order_date",
    "sku_code",
    "item_qty",
    "item_unit_price",
];
/// 销售订单导入必填字段（每行 = 1 个销售单 + 1 个 item，平铺结构）
pub const REQUIRED_SALES_FIELDS: &[&str] = &[
    "so_number",
    "customer_name",
    "order_date",
    "sku_code",
    "item_qty",
    "item_unit_price",
];
/// 供应商主数据必填字段
pub const REQUIRED_SUPPLIER_FIELDS: &[&str] = &["supplier_name"];
/// 客户主数据必填字段
pub const REQUIRED_CUSTOMER_FIELDS: &[&str] = &["customer_name"];

/// 按 target_type 提取必填字段（供 validator 与前端 UI 共享）
pub fn required_fields_for(target: &str) -> &'static [&'static str] {
    match target {
        TARGET_INVENTORY => REQUIRED_INVENTORY_FIELDS,
        TARGET_PURCHASES => REQUIRED_PURCHASE_FIELDS,
        TARGET_SALES => REQUIRED_SALES_FIELDS,
        TARGET_SUPPLIERS => REQUIRED_SUPPLIER_FIELDS,
        TARGET_CUSTOMERS => REQUIRED_CUSTOMER_FIELDS,
        // 商品库（MVP）：保留原有 'name' 必填语义
        _ => &["name"],
    }
}

/// 导入结果（执行后返回）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub batch_id: String,
    pub total: usize,
    pub success: usize,
    pub failed: usize,
    pub skipped: usize,
    pub errors: Vec<ImportError>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conflict_strategy_from_str() {
        assert_eq!(ConflictStrategy::from_str("skip"), ConflictStrategy::Skip);
        assert_eq!(
            ConflictStrategy::from_str("overwrite"),
            ConflictStrategy::Overwrite
        );
        assert_eq!(
            ConflictStrategy::from_str("duplicate"),
            ConflictStrategy::Duplicate
        );
        assert_eq!(ConflictStrategy::from_str("unknown"), ConflictStrategy::Skip);
        assert_eq!(ConflictStrategy::from_str(""), ConflictStrategy::Skip);
    }

    #[test]
    fn test_import_row_serde() {
        let mut raw = HashMap::new();
        raw.insert("name".to_string(), "可口可乐".to_string());
        let row = ImportRow {
            row_index: 2,
            raw,
        };
        let json = serde_json::to_string(&row).unwrap();
        let parsed: ImportRow = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.row_index, 2);
        assert_eq!(parsed.raw.get("name").unwrap(), "可口可乐");
    }

    // ==================== v1.2 P1 新增单测 ====================

    #[test]
    fn test_is_valid_target() {
        use super::{is_valid_target, TARGET_INVENTORY, TARGET_PRODUCTS, TARGET_PURCHASES, TARGET_SALES, TARGET_SUPPLIERS, TARGET_CUSTOMERS};
        // 全部 6 个目标应被识别为合法
        assert!(is_valid_target(TARGET_PRODUCTS));
        assert!(is_valid_target(TARGET_INVENTORY));
        assert!(is_valid_target(TARGET_PURCHASES));
        assert!(is_valid_target(TARGET_SALES));
        assert!(is_valid_target(TARGET_SUPPLIERS));
        assert!(is_valid_target(TARGET_CUSTOMERS));
        // 非法值
        assert!(!is_valid_target(""));
        assert!(!is_valid_target("foo"));
        assert!(!is_valid_target("INVENTORY")); // 大小写敏感
        assert!(!is_valid_target("inventory;")); // SQL 注入字符
    }

    #[test]
    fn test_required_fields_for_targets() {
        use super::{required_fields_for, TARGET_INVENTORY, TARGET_PURCHASES, TARGET_SALES};
        // 库存：sku + type + qty + date
        let inv = required_fields_for(TARGET_INVENTORY);
        assert!(inv.contains(&"sku_code"));
        assert!(inv.contains(&"transaction_type"));
        assert!(inv.contains(&"quantity"));
        assert!(inv.contains(&"transaction_date"));
        // 采购：po + supplier + date + sku + qty + price
        let po = required_fields_for(TARGET_PURCHASES);
        assert!(po.contains(&"po_number"));
        assert!(po.contains(&"supplier_name"));
        assert!(po.contains(&"item_qty"));
        assert_eq!(po.len(), 6);
        // 销售：so + customer + date + sku + qty + price
        let so = required_fields_for(TARGET_SALES);
        assert!(so.contains(&"so_number"));
        assert!(so.contains(&"customer_name"));
        assert_eq!(so.len(), 6);
    }

    #[test]
    fn test_import_request_with_target_type() {
        // 显式传 target_type
        let json = r#"{
            "file_name": "inv.xlsx",
            "file_type": "xlsx",
            "rows": [],
            "mapping": [],
            "conflict_strategy": "skip",
            "target_type": "inventory"
        }"#;
        let req: ImportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.target_type, "inventory");
    }

    #[test]
    fn test_import_request_default_target() {
        // 不传 target_type 时应默认 "products"（向后兼容 MVP 客户端）
        let json = r#"{
            "file_name": "products.xlsx",
            "file_type": "xlsx",
            "rows": [],
            "mapping": [],
            "conflict_strategy": "skip"
        }"#;
        let req: ImportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.target_type, "products");
    }

    // ==================== v1.3 新增单测 ====================

    #[test]
    fn test_import_request_with_image_archive() {
        // v1.3: image_archive 字段向后兼容（MVP 客户端不传时为 None）
        let json = r#"{
            "file_name": "products.xlsx",
            "file_type": "xlsx",
            "rows": [],
            "mapping": [],
            "conflict_strategy": "skip",
            "target_type": "products",
            "image_archive": "import_images/abc123"
        }"#;
        let req: ImportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.image_archive.as_deref(), Some("import_images/abc123"));
    }

    #[test]
    fn test_import_request_image_archive_optional() {
        // 不传 image_archive 时为 None
        let json = r#"{
            "file_name": "products.xlsx",
            "file_type": "xlsx",
            "rows": [],
            "mapping": [],
            "conflict_strategy": "skip",
            "target_type": "products"
        }"#;
        let req: ImportRequest = serde_json::from_str(json).unwrap();
        assert!(req.image_archive.is_none());
    }

    #[test]
    fn test_image_manifest_serde() {
        let entry = ImageManifestEntry {
            archive_name: "SP001_main.png".to_string(),
            spu_code: Some("SP001".to_string()),
            sku_code: None,
            size_bytes: 1024,
            local_path: "/tmp/import_images/abc/SP001_main.png".to_string(),
        };
        let manifest = ImageArchiveManifest {
            archive_dir: "/tmp/import_images/abc".to_string(),
            entries: vec![entry],
            total_size: 1024,
        };
        let json = serde_json::to_string(&manifest).unwrap();
        let parsed: ImageArchiveManifest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.entries.len(), 1);
        assert_eq!(parsed.entries[0].spu_code.as_deref(), Some("SP001"));
        assert_eq!(parsed.total_size, 1024);
    }
}
