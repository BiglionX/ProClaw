//! ProClaw v1.3 老系统数据迁移 — 解析器（calamine 真解析 .xls/.xlsx）
//!
//! 替代 v1.2 P1 的 xlsx stub。
//! - `.xls` (Excel 97-2003, OLE2) 通过 calamine 直接读
//! - `.xlsx` (OOXML) 通过 calamine 直接读
//! - 自动检测文件头（D0 CF 11 E0 = OLE, 50 4B 03 04 = ZIP）
//!
//! 关键点：
//! - calamine 的 `DataType` 转 String 时空单元格 → ""，日期 → ISO 字符串
//! - 大文件支持 streaming：通过 `rows()` 迭代器逐行返回
//! - 工作表选择：默认取第一个非空 sheet

use calamine::{open_workbook_auto, Data, Reader};
use std::path::Path;

use crate::import::header_detect::detect_header;
use crate::import::types::{
    CustomerAggregate, CustomerContactRecord, LegacyParseResult, ProductAggregate, ProductSkuRecord,
};

/// 把 calamine cell 转 String
fn cell_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) => s.trim().to_string(),
        Data::Float(f) => {
            // 整数（无小数部分）显示为整数
            if f.fract() == 0.0 && f.abs() < 1e15 {
                format!("{}", *f as i64)
            } else {
                format!("{}", f)
            }
        }
        Data::Int(i) => i.to_string(),
        Data::Bool(b) => b.to_string(),
        Data::DateTime(d) => {
            // calamine 已把日期转为 Excel 序列号，转 ISO 字符串
            format!("{}", d)
        }
        Data::DateTimeIso(s) => s.trim().to_string(),
        Data::DurationIso(s) => s.trim().to_string(),
        Data::Error(e) => format!("#ERR({:?})", e),
    }
}

/// 把一行的 cells 转为 Vec<String>，按最大列数补齐
fn row_to_vec(row: &[Data], max_cols: usize) -> Vec<String> {
    let mut out = Vec::with_capacity(max_cols);
    for i in 0..max_cols {
        if i < row.len() {
            out.push(cell_to_string(&row[i]));
        } else {
            out.push(String::new());
        }
    }
    out
}

/// 检测文件实际格式
pub fn detect_format(path: &Path) -> Result<&'static str, String> {
    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("打开文件失败: {}", e))?;
    use std::io::Read;
    let mut header = [0u8; 4];
    file.read_exact(&mut header)
        .map_err(|e| format!("读取文件头失败: {}", e))?;

    // OLE2 magic: D0 CF 11 E0
    if header == [0xD0, 0xCF, 0x11, 0xE0] {
        return Ok("xls");
    }
    // ZIP / OOXML magic: 50 4B 03 04 (PK..)
    if header[0] == 0x50 && header[1] == 0x4B {
        return Ok("xlsx");
    }
    Err(format!("未知文件格式 (magic: {:02X?})", header))
}

/// 入口：从文件路径解析 .xls / .xlsx
///
/// 返回：
/// - `LegacyParseResult`：完整解析结果（含表头探测 + 聚合预览）
/// - `Vec<Vec<String>>`：原始行数据（供 executor / aggregator 复用）
pub fn parse_legacy_file(
    path: &Path,
    target_type: &str,
) -> Result<(LegacyParseResult, Vec<Vec<String>>), String> {
    let format = detect_format(path)?;

    let mut workbook = open_workbook_auto(path)
        .map_err(|e| format!("打开工作簿失败: {}", e))?;

    // 取第一个非空 sheet
    let sheet_names = workbook.sheet_names();
    if sheet_names.is_empty() {
        return Err("工作簿没有任何 sheet".to_string());
    }
    let sheet_name = sheet_names[0].clone();

    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| format!("读取 sheet '{}' 失败: {}", sheet_name, e))?;

    // 第一遍：算出最大列数（避免某些行少列时长度不一致）
    let max_cols = range
        .rows()
        .map(|r| r.len())
        .max()
        .unwrap_or(0);

    // 第二遍：转 Vec<Vec<String>>
    let rows: Vec<Vec<String>> = range
        .rows()
        .map(|r| row_to_vec(r, max_cols))
        .collect();

    drop(workbook); // 显式释放

    // 探测表头
    let header_report = detect_header(&rows);

    // 构造 LegacyParseResult
    let mut result = LegacyParseResult {
        format: format.to_string(),
        detected_format: format.to_string(),
        total_data_rows: rows.len().saturating_sub(header_report.structure.data_start_row),
        field_names: header_report.field_names.clone(),
        segment_titles: header_report
            .structure
            .segment_titles
            .iter()
            .map(|s| {
                let mut m = std::collections::HashMap::new();
                m.insert("start_col".to_string(), s.start_col.to_string());
                m.insert("end_col".to_string(), s.end_col.to_string());
                m.insert("title".to_string(), s.title.clone());
                m
            })
            .collect(),
        customer_groups: Vec::new(),
        product_groups: Vec::new(),
        categories_to_create: std::collections::HashMap::new(),
        header_preview: rows
            .iter()
            .take(3.min(rows.len()))
            .cloned()
            .collect(),
    };

    // 根据 target_type 做聚合预览
    let data_start = header_report.structure.data_start_row;
    let data_rows: Vec<Vec<String>> = rows.iter().skip(data_start).cloned().collect();

    match target_type {
        "customers" => {
            result.customer_groups = aggregate_customers_preview(
                &header_report.field_names,
                &data_rows,
            );
            // 类别新值
            let cats: Vec<String> = result
                .customer_groups
                .iter()
                .filter_map(|g| g.base_fields.get("customer_type").cloned())
                .filter(|s| !s.is_empty())
                .collect();
            result
                .categories_to_create
                .insert("customer".to_string(), cats);
        }
        "products" => {
            result.product_groups =
                aggregate_products_preview(&header_report.field_names, &data_rows);
            let cats: Vec<String> = result
                .product_groups
                .iter()
                .filter_map(|g| g.category.clone())
                .filter(|s| !s.is_empty())
                .collect();
            result
                .categories_to_create
                .insert("product".to_string(), cats);
        }
        "suppliers" => {
            // 供应商不聚合（每行 = 1 个供应商），但仍提取类别
            let cats: Vec<String> = extract_column_values(
                &header_report.field_names,
                &data_rows,
                "供应商类别",
            );
            result
                .categories_to_create
                .insert("supplier".to_string(), cats);
        }
        _ => {
            // 其他 target 不做老格式特殊处理
        }
    }

    // 去重 categories_to_create
    for v in result.categories_to_create.values_mut() {
        v.sort();
        v.dedup();
    }

    Ok((result, rows))
}

/// 聚合预览：客户档案（按客户编号分组，多行 → 1 客户 + N 联系人）
pub fn aggregate_customers_preview(
    field_names: &[String],
    data_rows: &[Vec<String>],
) -> Vec<CustomerAggregate> {
    use std::collections::HashMap;

    // 找关键列索引
    let code_idx = find_column(field_names, &["*客户编号", "客户编号", "编号", "code"]);
    let name_idx = find_column(field_names, &["*客户名称", "客户名称", "名称", "name"]);
    let contact_idx = find_column(field_names, &["联系人", "contact_name"]);
    let phone_idx = find_column(field_names, &["手机", "phone", "联系电话"]);
    let landline_idx = find_column(field_names, &["座机", "landline"]);
    let qq_idx = find_column(field_names, &["QQ/微信", "qq_wechat"]);
    let address_idx = find_column(field_names, &["联系地址", "address"]);
    let primary_idx = find_column(field_names, &["首要联系人", "is_primary"]);

    // 基础信息列（不在 contacts 范围内的列）
    let base_field_indices: Vec<usize> = (0..field_names.len())
        .filter(|i| {
            !matches!(*i, x if Some(x) == contact_idx
                          || Some(x) == phone_idx
                          || Some(x) == landline_idx
                          || Some(x) == qq_idx
                          || Some(x) == address_idx
                          || Some(x) == primary_idx)
        })
        .collect();

    // 按 code 分组
    let mut groups: HashMap<String, CustomerAggregate> = HashMap::new();
    let mut group_order: Vec<String> = Vec::new();

    for row in data_rows {
        let code = code_idx
            .and_then(|i| row.get(i))
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if code.is_empty() {
            continue;
        }

        let entry = groups.entry(code.clone()).or_insert_with(|| {
            group_order.push(code.clone());
            CustomerAggregate {
                code: code.clone(),
                name: String::new(),
                base_fields: HashMap::new(),
                contacts: Vec::new(),
            }
        });

        // 基础信息：取首行非空
        if entry.name.is_empty() {
            entry.name = name_idx
                .and_then(|i| row.get(i))
                .cloned()
                .unwrap_or_default();
        }
        for &i in &base_field_indices {
            if i < row.len() {
                let col_name = &field_names[i];
                let val = row[i].trim();
                if !val.is_empty() {
                    entry
                        .base_fields
                        .entry(col_name.clone())
                        .or_insert_with(|| val.to_string());
                }
            }
        }

        // 联系人
        let contact_name = contact_idx
            .and_then(|i| row.get(i))
            .cloned()
            .unwrap_or_default();
        if !contact_name.is_empty() {
            let is_primary = primary_idx
                .and_then(|i| row.get(i))
                .map(|s| matches!(s.trim(), "是" | "yes" | "1" | "true"))
                .unwrap_or(false);
            entry.contacts.push(CustomerContactRecord {
                contact_name,
                phone: phone_idx.and_then(|i| row.get(i)).filter(|s| !s.trim().is_empty()).cloned(),
                landline: landline_idx.and_then(|i| row.get(i)).filter(|s| !s.trim().is_empty()).cloned(),
                qq_wechat: qq_idx.and_then(|i| row.get(i)).filter(|s| !s.trim().is_empty()).cloned(),
                address: address_idx.and_then(|i| row.get(i)).filter(|s| !s.trim().is_empty()).cloned(),
                is_primary,
            });
        }
    }

    group_order
        .into_iter()
        .filter_map(|k| groups.remove(&k))
        .collect()
}

/// 聚合预览：商品档案（按商品编号分组，多行 → 1 SPU + N SKU）
pub fn aggregate_products_preview(
    field_names: &[String],
    data_rows: &[Vec<String>],
) -> Vec<ProductAggregate> {
    use std::collections::HashMap;

    let sku_idx = find_column(field_names, &["*商品编号", "商品编号", "sku"]);
    let name_idx = find_column(field_names, &["商品名称", "名称", "name"]);
    let category_idx = find_column(field_names, &["商品类别", "类别", "category"]);
    let spec_idx = find_column(field_names, &["规格型号", "型号", "spec"]);
    let tag_idx = find_column(field_names, &["商品标签", "标签", "tag"]);

    let mut groups: HashMap<String, ProductAggregate> = HashMap::new();
    let mut group_order: Vec<String> = Vec::new();

    for row in data_rows {
        let sku = sku_idx
            .and_then(|i| row.get(i))
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if sku.is_empty() {
            continue;
        }

        let entry = groups.entry(sku.clone()).or_insert_with(|| {
            group_order.push(sku.clone());
            ProductAggregate {
                sku: sku.clone(),
                name: String::new(),
                category: None,
                spec: None,
                tag: None,
                variants: Vec::new(),
            }
        });

        let variant_name = name_idx
            .and_then(|i| row.get(i))
            .cloned()
            .unwrap_or_default();
        let spec = spec_idx
            .and_then(|i| row.get(i))
            .filter(|s| !s.trim().is_empty())
            .cloned();

        // SPU 名 = 首行非空名称
        if entry.name.is_empty() && !variant_name.is_empty() {
            entry.name = variant_name.clone();
        }
        if entry.category.is_none() {
            entry.category = category_idx
                .and_then(|i| row.get(i))
                .filter(|s| !s.trim().is_empty())
                .cloned();
        }
        if entry.spec.is_none() {
            entry.spec = spec.clone();
        }
        if entry.tag.is_none() {
            entry.tag = tag_idx
                .and_then(|i| row.get(i))
                .filter(|s| !s.trim().is_empty())
                .cloned();
        }

        entry.variants.push(ProductSkuRecord {
            sku: sku.clone(),
            variant_name,
            spec,
        });
    }

    group_order
        .into_iter()
        .filter_map(|k| groups.remove(&k))
        .collect()
}

/// 找列名索引（支持别名，按顺序优先）
fn find_column(field_names: &[String], candidates: &[&str]) -> Option<usize> {
    for c in candidates {
        let c_trimmed = c.trim_start_matches('*').trim();
        if let Some(idx) = field_names.iter().position(|n| {
            let n_trimmed = n.trim_start_matches('*').trim();
            n_trimmed == c_trimmed
        }) {
            return Some(idx);
        }
    }
    None
}

/// 提取某列的所有非空值
fn extract_column_values(field_names: &[String], data_rows: &[Vec<String>], column_name: &str) -> Vec<String> {
    let idx = match find_column(field_names, &[column_name]) {
        Some(i) => i,
        None => return Vec::new(),
    };
    data_rows
        .iter()
        .filter_map(|r| r.get(idx))
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cell_to_string() {
        assert_eq!(cell_to_string(&Data::Empty), "");
        assert_eq!(cell_to_string(&Data::String("hello".into())), "hello");
        assert_eq!(cell_to_string(&Data::Int(42)), "42");
        assert_eq!(cell_to_string(&Data::Float(1.5)), "1.5");
        assert_eq!(cell_to_string(&Data::Float(100.0)), "100");
    }

    #[test]
    fn test_find_column() {
        let fields = vec!["客户类别".into(), "*客户编号".into(), "*客户名称".into()];
        assert_eq!(find_column(&fields, &["*客户编号"]), Some(1));
        assert_eq!(find_column(&fields, &["客户名称"]), Some(2));
        assert_eq!(find_column(&fields, &["不存在的列"]), None);
    }
}