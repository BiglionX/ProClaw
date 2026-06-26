//! 数据导入校验器（三级校验）
//!
//! - L1 格式校验：必填、类型、长度、范围（阻断）
//! - L2 业务校验：价格区间、库存范围、条形码格式（警告，可继续）
//! - L3 引用校验：分类/品牌需存在（阻断；按用户策略自动创建或中止）
//!
//! 所有校验函数返回 `Vec<ImportError>`，调用方决定是否阻断流程。

use crate::import::{
    required_fields_for, ImportError, ImportRequest, TARGET_CUSTOMERS, TARGET_INVENTORY,
    TARGET_PURCHASES, TARGET_SALES, TARGET_SUPPLIERS,
};
use std::collections::HashMap;

/// 商品库 SPU/SKU 必填字段定义（MVP 保留）
pub const REQUIRED_SPU_FIELDS: &[&str] = &["name"];
pub const REQUIRED_SKU_FIELDS: &[&str] = &["sku_code"];

/// 数值字段定义（key, min, max, allow_zero）
const NUMERIC_FIELDS: &[(&str, f64, f64, bool)] = &[
    ("cost_price", 0.0, 1_000_000.0, true),
    ("sell_price", 0.0, 1_000_000.0, true),
    ("current_stock", 0.0, 1_000_000.0, true),
    ("min_stock", 0.0, 1_000_000.0, true),
    ("max_stock", 0.0, 9_999_999.0, true),
    ("weight", 0.0, 10_000.0, true),
    ("volume", 0.0, 1_000.0, true),
    // P1 业务对象（库存/采购/销售）
    ("quantity", 0.0, 9_999_999.0, false),   // 库存/订单数量：禁止 0
    ("item_qty", 0.0, 9_999_999.0, false),   // 采购/销售明细数量：禁止 0
    ("item_unit_price", 0.0, 1_000_000.0, true), // 采购/销售明细单价：允许 0（赠品）
    ("unit_price", 0.0, 1_000_000.0, true),  // 库存交易单价
];

const TEXT_FIELDS_MAX_LEN: &[(&str, usize)] = &[
    ("name", 100),
    ("spu_code", 64),
    ("sku_code", 64),
    ("description", 5000),
    ("spec_text", 200),
    ("category_name", 50),
    ("brand_name", 50),
    ("unit", 10),
    ("barcode", 32),
    ("image_url", 2048),
    // P1 业务字段长度上限
    ("po_number", 64),
    ("so_number", 64),
    ("supplier_name", 100),
    ("supplier_phone", 32),
    ("supplier_contact", 50),
    ("supplier_email", 100),
    ("supplier_address", 200),
    ("supplier_payment_terms", 50),
    ("supplier_tax_number", 50),
    ("customer_name", 100),
    ("customer_phone", 32),
    ("customer_contact", 50),
    ("customer_email", 100),
    ("customer_address", 200),
    ("customer_tax_number", 50),
    ("reference_no", 64),
    ("transaction_type", 20),
    ("operator", 50),
    ("shipping_address", 200),
    ("expected_date", 20),
    ("order_date", 20),
    ("transaction_date", 20),
];

/// 库存交易类型白名单（与 schema.sql CHECK 约束一致）
pub const ALLOWED_TRANSACTION_TYPES: &[&str] = &["inbound", "outbound", "adjustment", "transfer"];

/// 解析后的一行（mapping 应用后）
#[derive(Debug, Clone, Default)]
pub struct ParsedRow {
    pub row_index: usize,
    pub fields: HashMap<String, String>,
}

/// 主入口：对整个 ImportRequest 做 L1 + L2 校验
///
/// MVP：仅校验商品库（name 必填 + 数值/文本范围 + 价格/库存业务规则）
/// P1：根据 target_type 路由到对应校验集合（库存/采购/销售/主数据）
pub fn validate_request(req: &ImportRequest) -> Vec<ImportError> {
    let mut errors = Vec::new();

    // 1. 先按 mapping 把 rows 转成 ParsedRow
    let parsed = match apply_mapping_internal(req) {
        Ok(p) => p,
        Err(e) => {
            errors.push(e);
            return errors;
        }
    };

    for row in &parsed {
        errors.extend(validate_row_l1(row));
        errors.extend(validate_row_l2(row));
        // P1：按 target_type 追加业务对象专属校验
        errors.extend(validate_row_for_target(row, &req.target_type));
    }

    errors
}

/// P1：根据 target_type 对一行做目标专属校验
pub fn validate_row_for_target(row: &ParsedRow, target: &str) -> Vec<ImportError> {
    let mut errors = Vec::new();

    // 0. 必填字段（target-specific）：商品库走 'name'，其他走 required_fields_for(target)
    let required: &[&str] = required_fields_for(target);
    for field_ref in required.iter() {
        let field: &str = field_ref;
        let val = row
            .fields
            .get(field)
            .map(|s| s.trim())
            .unwrap_or("");
        if val.is_empty() {
            errors.push(ImportError {
                row_index: row.row_index,
                field: field.to_string(),
                level: "L1".to_string(),
                code: "REQUIRED_EMPTY".to_string(),
                message: format!("字段 {} 必填", field),
                value: None,
            });
        }
    }

    // 1. 业务对象专属校验
    match target {
        TARGET_INVENTORY => errors.extend(validate_inventory_txn(row)),
        TARGET_PURCHASES => errors.extend(validate_purchase_order(row)),
        TARGET_SALES => errors.extend(validate_sales_order(row)),
        TARGET_SUPPLIERS | TARGET_CUSTOMERS => errors.extend(validate_contact(row, target)),
        // 商品库（MVP）必填 'name' 已通过 required_fields_for 返回 ["name"] 覆盖；不重复
        _ => {}
    }
    errors
}

/// 库存交易行校验（PRD §3.2）
fn validate_inventory_txn(row: &ParsedRow) -> Vec<ImportError> {
    let mut errors = Vec::new();
    let fields = &row.fields;

    // 必填（已在 validate_row_l1 的 REQUIRED_* 校验中覆盖通用项；这里补 transaction_type 白名单）
    let tx_type = fields
        .get("transaction_type")
        .map(|s| s.trim())
        .unwrap_or("");
    if !tx_type.is_empty() && !ALLOWED_TRANSACTION_TYPES.contains(&tx_type) {
        errors.push(ImportError {
            row_index: row.row_index,
            field: "transaction_type".to_string(),
            level: "L1".to_string(),
            code: "TYPE_MISMATCH".to_string(),
            message: format!(
                "transaction_type 必须是 {:?} 之一",
                ALLOWED_TRANSACTION_TYPES
            ),
            value: Some(tx_type.to_string()),
        });
    }

    // transaction_date 可解析性：要求非空且至少含 'YYYY' 或 '-' 或 '/'
    if let Some(d) = fields.get("transaction_date").map(|s| s.trim()) {
        if !d.is_empty() && !looks_like_date(d) {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "transaction_date".to_string(),
                level: "L2".to_string(),
                code: "DATE_FORMAT".to_string(),
                message: format!("日期格式无法识别：{}", d),
                value: Some(d.to_string()),
            });
        }
    }

    // quantity 业务校验：禁止 0（MVP 数值范围 [0, 9999999] 已强制，但 0 已被 NUMERIC_FIELDS 设为 false）
    // 已由通用数值校验覆盖；此处不再重复

    errors
}

/// 采购订单行校验（PRD §3.3）
fn validate_purchase_order(row: &ParsedRow) -> Vec<ImportError> {
    let mut errors = Vec::new();
    let fields = &row.fields;

    // order_date 可解析性
    if let Some(d) = fields.get("order_date").map(|s| s.trim()) {
        if !d.is_empty() && !looks_like_date(d) {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "order_date".to_string(),
                level: "L2".to_string(),
                code: "DATE_FORMAT".to_string(),
                message: format!("订单日期格式无法识别：{}", d),
                value: Some(d.to_string()),
            });
        }
    }

    // expected_date 可解析性（可选）
    if let Some(d) = fields.get("expected_date").map(|s| s.trim()) {
        if !d.is_empty() && !looks_like_date(d) {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "expected_date".to_string(),
                level: "L2".to_string(),
                code: "DATE_FORMAT".to_string(),
                message: format!("预计到货日期格式无法识别：{}", d),
                value: Some(d.to_string()),
            });
        }
    }

    // 业务校验：item_qty > 0（已在数值校验中体现）
    // 业务校验：item_unit_price >= 0（允许 0 赠品）
    errors
}

/// 销售订单行校验（PRD §3.4）
fn validate_sales_order(row: &ParsedRow) -> Vec<ImportError> {
    let mut errors = Vec::new();
    let fields = &row.fields;

    // order_date 可解析性
    if let Some(d) = fields.get("order_date").map(|s| s.trim()) {
        if !d.is_empty() && !looks_like_date(d) {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "order_date".to_string(),
                level: "L2".to_string(),
                code: "DATE_FORMAT".to_string(),
                message: format!("订单日期格式无法识别：{}", d),
                value: Some(d.to_string()),
            });
        }
    }

    // expected_date 可解析性（可选）
    if let Some(d) = fields.get("expected_date").map(|s| s.trim()) {
        if !d.is_empty() && !looks_like_date(d) {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "expected_date".to_string(),
                level: "L2".to_string(),
                code: "DATE_FORMAT".to_string(),
                message: format!("预计发货日期格式无法识别：{}", d),
                value: Some(d.to_string()),
            });
        }
    }

    errors
}

/// 供应商/客户主数据行校验（PRD §3.5）
fn validate_contact(row: &ParsedRow, target: &str) -> Vec<ImportError> {
    let mut errors = Vec::new();
    let fields = &row.fields;

    let name_field = match target {
        TARGET_SUPPLIERS => "supplier_name",
        TARGET_CUSTOMERS => "customer_name",
        _ => return errors,
    };
    let phone_field = match target {
        TARGET_SUPPLIERS => "supplier_phone",
        TARGET_CUSTOMERS => "customer_phone",
        _ => "",
    };
    let email_field = match target {
        TARGET_SUPPLIERS => "supplier_email",
        TARGET_CUSTOMERS => "customer_email",
        _ => "",
    };

    // email 格式（可选，提供时校验）
    if let Some(e) = fields.get(email_field).map(|s| s.trim()) {
        if !e.is_empty() && !looks_like_email(e) {
            errors.push(ImportError {
                row_index: row.row_index,
                field: email_field.to_string(),
                level: "L2".to_string(),
                code: "EMAIL_FORMAT".to_string(),
                message: format!("邮箱格式不规范：{}", e),
                value: Some(e.to_string()),
            });
        }
    }

    // phone 格式（可选，提供时校验为数字+短横线+加号+空格）
    if let Some(p) = fields.get(phone_field).map(|s| s.trim()) {
        if !p.is_empty() && !looks_like_phone(p) {
            errors.push(ImportError {
                row_index: row.row_index,
                field: phone_field.to_string(),
                level: "L2".to_string(),
                code: "PHONE_FORMAT".to_string(),
                message: format!("电话格式不规范：{}", p),
                value: Some(p.to_string()),
            });
        }
    }

    // 静默引入 name_field 防止未使用警告
    let _ = name_field;

    errors
}

/// 日期识别（粗略）：必须包含 4 位年份
fn looks_like_date(s: &str) -> bool {
    if s.len() < 4 {
        return false;
    }
    // 提取数字段
    let has_year = s
        .chars()
        .collect::<Vec<_>>()
        .windows(4)
        .any(|w| w.iter().all(|c| c.is_ascii_digit()));
    has_year && (s.contains('-') || s.contains('/') || s.contains('.'))
}

/// 邮箱识别：必须包含 '@' 且 '@' 后有 '.' 
fn looks_like_email(s: &str) -> bool {
    if let Some(at_pos) = s.find('@') {
        let after_at = &s[at_pos + 1..];
        after_at.contains('.') && !after_at.starts_with('.') && !after_at.ends_with('.')
    } else {
        false
    }
}

/// 电话识别：允许数字、+、-、空格、括号，长度 6~20
fn looks_like_phone(s: &str) -> bool {
    if s.len() < 6 || s.len() > 20 {
        return false;
    }
    s.chars()
        .all(|c| c.is_ascii_digit() || matches!(c, '+' | '-' | ' ' | '(' | ')'))
}

// ==================== 公共导出（供前端 / executor 复用必填清单）====================

/// 公共：按 target 列出全部必填字段名（顺序与 required_fields_for 一致）
pub fn required_fields_public(target: &str) -> Vec<String> {
    required_fields_for(target).iter().map(|s| s.to_string()).collect()
}

/// 对单个 row 做 L1（格式）校验
pub fn validate_row_l1(row: &ParsedRow) -> Vec<ImportError> {
    let mut errors = Vec::new();

    // 1.1 必填：name
    let name = row.fields.get("name").map(|s| s.trim()).unwrap_or("");
    if name.is_empty() {
        errors.push(ImportError {
            row_index: row.row_index,
            field: "name".to_string(),
            level: "L1".to_string(),
            code: "REQUIRED_EMPTY".to_string(),
            message: "商品名称不能为空".to_string(),
            value: None,
        });
    }

    // 1.2 SKU 必填：若提供了 sku_code 字段则非空
    if let Some(sku_code) = row.fields.get("sku_code") {
        if !sku_code.trim().is_empty() && sku_code.trim().len() > 64 {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "sku_code".to_string(),
                level: "L1".to_string(),
                code: "TOO_LONG".to_string(),
                message: format!("SKU 编码长度 {} 超过 64", sku_code.len()),
                value: Some(sku_code.clone()),
            });
        }
    }

    // 1.3 数值字段类型 + 范围
    for (key, min, max, allow_zero) in NUMERIC_FIELDS {
        if let Some(s) = row.fields.get(*key) {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                continue;
            }
            match trimmed.parse::<f64>() {
                Ok(v) => {
                    let mut out_of_range = false;
                    let mut reason = format!("字段 {} 值 {} 超出范围 [{}, {}]", key, v, min, max);
                    if v < *min || v > *max {
                        out_of_range = true;
                    } else if !*allow_zero && v == 0.0 {
                        out_of_range = true;
                        reason = format!("字段 {} 不允许为 0", key);
                    }
                    if out_of_range {
                        errors.push(ImportError {
                            row_index: row.row_index,
                            field: key.to_string(),
                            level: "L1".to_string(),
                            code: "OUT_OF_RANGE".to_string(),
                            message: reason,
                            value: Some(trimmed.to_string()),
                        });
                    }
                }
                Err(_) => {
                    errors.push(ImportError {
                        row_index: row.row_index,
                        field: key.to_string(),
                        level: "L1".to_string(),
                        code: "TYPE_MISMATCH".to_string(),
                        message: format!("字段 {} 必须是数字，当前值：{}", key, trimmed),
                        value: Some(trimmed.to_string()),
                    });
                }
            }
        }
    }

    // 1.4 文本长度
    for (key, max) in TEXT_FIELDS_MAX_LEN {
        if let Some(s) = row.fields.get(*key) {
            if s.chars().count() > *max {
                errors.push(ImportError {
                    row_index: row.row_index,
                    field: key.to_string(),
                    level: "L1".to_string(),
                    code: "TOO_LONG".to_string(),
                    message: format!("字段 {} 长度 {} 超过 {}", key, s.chars().count(), max),
                    value: Some(s.clone()),
                });
            }
        }
    }

    errors
}

/// 对单个 row 做 L2（业务）校验
pub fn validate_row_l2(row: &ParsedRow) -> Vec<ImportError> {
    let mut errors = Vec::new();

    // 2.1 售价 < 成本价
    let cost = row
        .fields
        .get("cost_price")
        .and_then(|s| s.trim().parse::<f64>().ok());
    let sell = row
        .fields
        .get("sell_price")
        .and_then(|s| s.trim().parse::<f64>().ok());
    if let (Some(c), Some(s)) = (cost, sell) {
        if c > 0.0 && s < c {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "sell_price".to_string(),
                level: "L2".to_string(),
                code: "PRICE_BELOW_COST".to_string(),
                message: format!("售价 {} 低于成本价 {}", s, c),
                value: Some(s.to_string()),
            });
        }
        // 成本 > 售价 10 倍：可能是定价错误
        if s > 0.0 && c > s * 10.0 {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "cost_price".to_string(),
                level: "L2".to_string(),
                code: "COST_TOO_HIGH".to_string(),
                message: format!(
                    "成本价 {} 超过售价 {} 的 10 倍，请确认",
                    c, s
                ),
                value: Some(c.to_string()),
            });
        }
    }

    // 2.2 最低库存 > 最高库存
    let min_s = row
        .fields
        .get("min_stock")
        .and_then(|s| s.trim().parse::<f64>().ok());
    let max_s = row
        .fields
        .get("max_stock")
        .and_then(|s| s.trim().parse::<f64>().ok());
    if let (Some(lo), Some(hi)) = (min_s, max_s) {
        if lo > hi {
            errors.push(ImportError {
                row_index: row.row_index,
                field: "min_stock".to_string(),
                level: "L1".to_string(),
                code: "MIN_EXCEEDS_MAX".to_string(),
                message: format!("最低库存 {} 大于最高库存 {}", lo, hi),
                value: Some(lo.to_string()),
            });
        }
    }

    // 2.3 条形码格式：EAN-13/UPC-A 必须为纯数字且长度符合
    if let Some(bc) = row.fields.get("barcode").map(|s| s.trim()) {
        if !bc.is_empty() {
            let len = bc.len();
            let is_valid = (len == 13 || len == 12 || len == 8 || len == 14)
                && bc.chars().all(|c| c.is_ascii_digit());
            if !is_valid {
                errors.push(ImportError {
                    row_index: row.row_index,
                    field: "barcode".to_string(),
                    level: "L2".to_string(),
                    code: "BARCODE_FORMAT".to_string(),
                    message: format!(
                        "条形码格式不规范（{} 位），建议 EAN-13/UPC-A",
                        len
                    ),
                    value: Some(bc.to_string()),
                });
            }
        }
    }

    // 2.4 图片 URL 长度校验已在 L1 处理；L2 不做重复校验

    errors
}

/// 内部函数：把 ImportRequest 的 rows 按 mapping 转成 ParsedRow
fn apply_mapping_internal(req: &ImportRequest) -> Result<Vec<ParsedRow>, ImportError> {
    let mut result = Vec::with_capacity(req.rows.len());
    for row in &req.rows {
        let mut fields = HashMap::new();
        for m in &req.mapping {
            if m.target_field.is_empty() {
                continue; // 忽略
            }
            if let Some(v) = row.raw.get(&m.source_column) {
                fields.insert(m.target_field.clone(), v.clone());
            }
        }
        result.push(ParsedRow {
            row_index: row.row_index,
            fields,
        });
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::{FieldMapping, ImportRow};

    fn row(idx: usize, pairs: &[(&str, &str)]) -> ImportRow {
        let mut raw = HashMap::new();
        for (k, v) in pairs {
            raw.insert(k.to_string(), v.to_string());
        }
        ImportRow {
            row_index: idx,
            raw,
        }
    }

    fn req_with(rows: Vec<ImportRow>, mapping: Vec<FieldMapping>) -> ImportRequest {
        ImportRequest {
            file_name: "test.xlsx".to_string(),
            file_type: "xlsx".to_string(),
            file_hash: None,
            rows,
            mapping,
            conflict_strategy: "skip".to_string(),
            target_type: "products".to_string(),
            image_archive: None,
        }
    }

    #[test]
    fn l1_required_name_empty() {
        let rows = vec![row(2, &[("商品名称", "")])];
        let mapping = vec![FieldMapping {
            source_column: "商品名称".to_string(),
            target_field: "name".to_string(),
        }];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors
            .iter()
            .any(|e| e.code == "REQUIRED_EMPTY" && e.field == "name"));
    }

    #[test]
    fn l1_type_mismatch_numeric() {
        let rows = vec![row(2, &[("name", "X"), ("售价", "abc")])];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "售价".to_string(),
                target_field: "sell_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.iter().any(|e| e.code == "TYPE_MISMATCH"));
    }

    #[test]
    fn l1_price_negative() {
        let rows = vec![row(2, &[("name", "X"), ("售价", "-1")])];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "售价".to_string(),
                target_field: "sell_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.iter().any(|e| e.code == "OUT_OF_RANGE"));
    }

    #[test]
    fn l1_stock_negative() {
        let rows = vec![row(2, &[("name", "X"), ("库存", "-5")])];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "库存".to_string(),
                target_field: "current_stock".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors
            .iter()
            .any(|e| e.code == "OUT_OF_RANGE" && e.field == "current_stock"));
    }

    #[test]
    fn l1_min_exceeds_max() {
        let rows = vec![row(2, &[("name", "X"), ("最低库存", "100"), ("最高库存", "50")])];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "最低库存".to_string(),
                target_field: "min_stock".to_string(),
            },
            FieldMapping {
                source_column: "最高库存".to_string(),
                target_field: "max_stock".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.iter().any(|e| e.code == "MIN_EXCEEDS_MAX"));
    }

    #[test]
    fn l2_price_below_cost() {
        let rows = vec![row(2, &[("name", "X"), ("成本", "10"), ("售价", "5")])];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "成本".to_string(),
                target_field: "cost_price".to_string(),
            },
            FieldMapping {
                source_column: "售价".to_string(),
                target_field: "sell_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.iter().any(|e| e.code == "PRICE_BELOW_COST"));
    }

    #[test]
    fn l2_cost_too_high() {
        let rows = vec![row(2, &[("name", "X"), ("成本", "100"), ("售价", "5")])];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "成本".to_string(),
                target_field: "cost_price".to_string(),
            },
            FieldMapping {
                source_column: "售价".to_string(),
                target_field: "sell_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.iter().any(|e| e.code == "COST_TOO_HIGH"));
    }

    #[test]
    fn l2_barcode_format_warn() {
        let rows = vec![row(2, &[("name", "X"), ("条形码", "abc")])];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "条形码".to_string(),
                target_field: "barcode".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.iter().any(|e| e.code == "BARCODE_FORMAT"));
    }

    #[test]
    fn l1_text_too_long() {
        let long_name = "X".repeat(150);
        let rows = vec![row(2, &[("name", long_name.as_str())])];
        let mapping = vec![FieldMapping {
            source_column: "name".to_string(),
            target_field: "name".to_string(),
        }];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.iter().any(|e| e.code == "TOO_LONG"));
    }

    #[test]
    fn happy_path_no_errors() {
        let rows = vec![row(
            2,
            &[
                ("name", "可口可乐"),
                ("售价", "3.5"),
                ("库存", "100"),
                ("条形码", "6901234567890"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "name".to_string(),
                target_field: "name".to_string(),
            },
            FieldMapping {
                source_column: "售价".to_string(),
                target_field: "sell_price".to_string(),
            },
            FieldMapping {
                source_column: "库存".to_string(),
                target_field: "current_stock".to_string(),
            },
            FieldMapping {
                source_column: "条形码".to_string(),
                target_field: "barcode".to_string(),
            },
        ];
        let errors = validate_request(&req_with(rows, mapping));
        assert!(errors.is_empty(), "期望无错误，实际：{:?}", errors);
    }

    // ==================== v1.2 P1 新增单测（库存/采购/销售/主数据）====================

    fn req_with_target(
        rows: Vec<ImportRow>,
        mapping: Vec<FieldMapping>,
        target: &str,
    ) -> ImportRequest {
        ImportRequest {
            file_name: "test.xlsx".to_string(),
            file_type: "xlsx".to_string(),
            file_hash: None,
            rows,
            mapping,
            conflict_strategy: "skip".to_string(),
            target_type: target.to_string(),
            image_archive: None,
        }
    }

    #[test]
    fn p1_inventory_invalid_transaction_type() {
        // 库存交易 transaction_type 必须是白名单之一
        let rows = vec![row(
            2,
            &[
                ("SKU", "SKU-001"),
                ("类型", "xyz"),
                ("数量", "10"),
                ("日期", "2026-06-26"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "SKU".to_string(),
                target_field: "sku_code".to_string(),
            },
            FieldMapping {
                source_column: "类型".to_string(),
                target_field: "transaction_type".to_string(),
            },
            FieldMapping {
                source_column: "数量".to_string(),
                target_field: "quantity".to_string(),
            },
            FieldMapping {
                source_column: "日期".to_string(),
                target_field: "transaction_date".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "inventory"));
        assert!(
            errors.iter().any(|e| e.code == "TYPE_MISMATCH"
                && e.field == "transaction_type"),
            "应检测到 transaction_type 不在白名单"
        );
    }

    #[test]
    fn p1_inventory_invalid_date_format() {
        // 日期无法识别：缺少 4 位年份
        let rows = vec![row(
            2,
            &[
                ("SKU", "SKU-001"),
                ("类型", "inbound"),
                ("数量", "10"),
                ("日期", "abc"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "SKU".to_string(),
                target_field: "sku_code".to_string(),
            },
            FieldMapping {
                source_column: "类型".to_string(),
                target_field: "transaction_type".to_string(),
            },
            FieldMapping {
                source_column: "数量".to_string(),
                target_field: "quantity".to_string(),
            },
            FieldMapping {
                source_column: "日期".to_string(),
                target_field: "transaction_date".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "inventory"));
        assert!(
            errors.iter().any(|e| e.code == "DATE_FORMAT"),
            "应检测到 transaction_date 格式错误"
        );
    }

    #[test]
    fn p1_inventory_quantity_zero_rejected() {
        // 数量 = 0 应被拒绝（NUMERIC_FIELDS 设为 allow_zero=false）
        let rows = vec![row(
            2,
            &[
                ("SKU", "SKU-001"),
                ("类型", "inbound"),
                ("数量", "0"),
                ("日期", "2026-06-26"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "SKU".to_string(),
                target_field: "sku_code".to_string(),
            },
            FieldMapping {
                source_column: "类型".to_string(),
                target_field: "transaction_type".to_string(),
            },
            FieldMapping {
                source_column: "数量".to_string(),
                target_field: "quantity".to_string(),
            },
            FieldMapping {
                source_column: "日期".to_string(),
                target_field: "transaction_date".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "inventory"));
        assert!(
            errors.iter().any(|e| e.code == "OUT_OF_RANGE" && e.field == "quantity"),
            "数量 0 应被数值范围校验拒绝"
        );
    }

    #[test]
    fn p1_purchase_supplier_required() {
        // 采购单 supplier_name 必填（缺则 required_empty）
        let rows = vec![row(
            2,
            &[
                ("PO", "PO-001"),
                ("日期", "2026-06-26"),
                ("SKU", "SKU-001"),
                ("数量", "10"),
                ("单价", "5.0"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "PO".to_string(),
                target_field: "po_number".to_string(),
            },
            FieldMapping {
                source_column: "日期".to_string(),
                target_field: "order_date".to_string(),
            },
            FieldMapping {
                source_column: "SKU".to_string(),
                target_field: "sku_code".to_string(),
            },
            FieldMapping {
                source_column: "数量".to_string(),
                target_field: "item_qty".to_string(),
            },
            FieldMapping {
                source_column: "单价".to_string(),
                target_field: "item_unit_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "purchases"));
        assert!(
            errors.iter().any(|e| e.code == "REQUIRED_EMPTY"
                && e.field == "supplier_name"),
            "应检测到 supplier_name 必填缺失"
        );
    }

    #[test]
    fn p1_purchase_item_qty_zero_rejected() {
        // item_qty = 0 应被拒绝
        let rows = vec![row(
            2,
            &[
                ("PO", "PO-001"),
                ("供应商", "广州贸易"),
                ("日期", "2026-06-26"),
                ("SKU", "SKU-001"),
                ("数量", "0"),
                ("单价", "5.0"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "PO".to_string(),
                target_field: "po_number".to_string(),
            },
            FieldMapping {
                source_column: "供应商".to_string(),
                target_field: "supplier_name".to_string(),
            },
            FieldMapping {
                source_column: "日期".to_string(),
                target_field: "order_date".to_string(),
            },
            FieldMapping {
                source_column: "SKU".to_string(),
                target_field: "sku_code".to_string(),
            },
            FieldMapping {
                source_column: "数量".to_string(),
                target_field: "item_qty".to_string(),
            },
            FieldMapping {
                source_column: "单价".to_string(),
                target_field: "item_unit_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "purchases"));
        assert!(
            errors.iter().any(|e| e.code == "OUT_OF_RANGE" && e.field == "item_qty"),
            "item_qty=0 应被数值校验拒绝"
        );
    }

    #[test]
    fn p1_purchase_invalid_date() {
        // order_date 格式无法识别
        let rows = vec![row(
            2,
            &[
                ("PO", "PO-001"),
                ("供应商", "广州贸易"),
                ("日期", "notadate"),
                ("SKU", "SKU-001"),
                ("数量", "10"),
                ("单价", "5.0"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "PO".to_string(),
                target_field: "po_number".to_string(),
            },
            FieldMapping {
                source_column: "供应商".to_string(),
                target_field: "supplier_name".to_string(),
            },
            FieldMapping {
                source_column: "日期".to_string(),
                target_field: "order_date".to_string(),
            },
            FieldMapping {
                source_column: "SKU".to_string(),
                target_field: "sku_code".to_string(),
            },
            FieldMapping {
                source_column: "数量".to_string(),
                target_field: "item_qty".to_string(),
            },
            FieldMapping {
                source_column: "单价".to_string(),
                target_field: "item_unit_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "purchases"));
        assert!(
            errors.iter().any(|e| e.code == "DATE_FORMAT" && e.field == "order_date"),
            "应检测到 order_date 格式错误"
        );
    }

    #[test]
    fn p1_sales_customer_required() {
        // 销售单 customer_name 必填
        let rows = vec![row(
            2,
            &[
                ("SO", "SO-001"),
                ("日期", "2026-06-26"),
                ("SKU", "SKU-001"),
                ("数量", "5"),
                ("单价", "10.0"),
            ],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "SO".to_string(),
                target_field: "so_number".to_string(),
            },
            FieldMapping {
                source_column: "日期".to_string(),
                target_field: "order_date".to_string(),
            },
            FieldMapping {
                source_column: "SKU".to_string(),
                target_field: "sku_code".to_string(),
            },
            FieldMapping {
                source_column: "数量".to_string(),
                target_field: "item_qty".to_string(),
            },
            FieldMapping {
                source_column: "单价".to_string(),
                target_field: "item_unit_price".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "sales"));
        assert!(
            errors.iter().any(|e| e.code == "REQUIRED_EMPTY"
                && e.field == "customer_name"),
            "应检测到 customer_name 必填缺失"
        );
    }

    #[test]
    fn p1_supplier_invalid_email() {
        // 供应商邮箱格式不规范
        let rows = vec![row(
            2,
            &[("供应商", "广州贸易"), ("邮箱", "not-an-email")],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "供应商".to_string(),
                target_field: "supplier_name".to_string(),
            },
            FieldMapping {
                source_column: "邮箱".to_string(),
                target_field: "supplier_email".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "suppliers"));
        assert!(
            errors.iter().any(|e| e.code == "EMAIL_FORMAT"
                && e.field == "supplier_email"),
            "应检测到 supplier_email 格式错误"
        );
    }

    #[test]
    fn p1_customer_invalid_phone() {
        // 客户电话格式不规范（长度过短）
        let rows = vec![row(
            2,
            &[("客户", "张三"), ("电话", "123")],
        )];
        let mapping = vec![
            FieldMapping {
                source_column: "客户".to_string(),
                target_field: "customer_name".to_string(),
            },
            FieldMapping {
                source_column: "电话".to_string(),
                target_field: "customer_phone".to_string(),
            },
        ];
        let errors = validate_request(&req_with_target(rows, mapping, "customers"));
        assert!(
            errors.iter().any(|e| e.code == "PHONE_FORMAT"
                && e.field == "customer_phone"),
            "应检测到 customer_phone 格式错误"
        );
    }
}
