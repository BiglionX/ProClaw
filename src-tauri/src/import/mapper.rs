//! 数据导入字段映射应用器
//!
//! 前端已做自动匹配（基于 string-similarity），后端仅做：
//! 1. 接受 mapping 列表
//! 2. 应用到 ImportRow.raw → 扁平化字段字典
//! 3. 提供 `apply_mapping` 公共函数供 executor.rs 复用

use crate::import::{ImportRequest, ImportRow};
use std::collections::HashMap;

/// 应用映射后的扁平字段字典
pub type FieldMap = HashMap<String, String>;

/// 把单个 ImportRow 按 mapping 转成扁平字段
pub fn apply_mapping_to_row(row: &ImportRow, mapping: &[(String, String)]) -> FieldMap {
    let mut out = FieldMap::new();
    for (src, dst) in mapping {
        if dst.is_empty() {
            continue;
        }
        if let Some(v) = row.raw.get(src) {
            out.insert(dst.clone(), v.clone());
        }
    }
    out
}

/// 批量：对整个 ImportRequest 的所有 rows 应用 mapping
pub fn apply_mapping(req: &ImportRequest) -> Vec<(usize, FieldMap)> {
    let mapping_pairs: Vec<(String, String)> = req
        .mapping
        .iter()
        .map(|m| (m.source_column.clone(), m.target_field.clone()))
        .collect();

    req.rows
        .iter()
        .map(|r| (r.row_index, apply_mapping_to_row(r, &mapping_pairs)))
        .collect()
}

/// 解析数字字段（带默认值 + 错误传播给调用方）
pub fn parse_f64(s: &str, default: f64) -> f64 {
    s.trim().parse::<f64>().unwrap_or(default)
}

/// 解析整数字段
pub fn parse_i64(s: &str, default: i64) -> i64 {
    s.trim().parse::<i64>().unwrap_or(default)
}

/// 解析布尔字段（支持 1/0/true/false/是/否/Y/N）
/// - 明确真值 → true
/// - 明确假值 → false（即使是 default=true 也返回 false）
/// - 空字符串或无法识别 → default
pub fn parse_bool(s: &str, default: bool) -> bool {
    let t = s.trim().to_lowercase();
    match t.as_str() {
        "1" | "true" | "是" | "y" | "yes" => true,
        "0" | "false" | "否" | "n" | "no" => false,
        "" => default,
        _ => default,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::FieldMapping;
    use std::collections::HashMap;

    fn make_row(idx: usize, pairs: &[(&str, &str)]) -> ImportRow {
        let mut raw = HashMap::new();
        for (k, v) in pairs {
            raw.insert(k.to_string(), v.to_string());
        }
        ImportRow {
            row_index: idx,
            raw,
        }
    }

    #[test]
    fn apply_full_mapping() {
        let row = make_row(2, &[("商品名称", "可乐"), ("售价", "3.5")]);
        let mapping = vec![
            ("商品名称".to_string(), "name".to_string()),
            ("售价".to_string(), "sell_price".to_string()),
        ];
        let fields = apply_mapping_to_row(&row, &mapping);
        assert_eq!(fields.get("name").unwrap(), "可乐");
        assert_eq!(fields.get("sell_price").unwrap(), "3.5");
    }

    #[test]
    fn apply_partial_mapping_ignores_missing() {
        let row = make_row(2, &[("商品名称", "可乐")]);
        let mapping = vec![
            ("商品名称".to_string(), "name".to_string()),
            ("售价".to_string(), "sell_price".to_string()),
        ];
        let fields = apply_mapping_to_row(&row, &mapping);
        assert_eq!(fields.len(), 1);
        assert!(fields.get("sell_price").is_none());
    }

    #[test]
    fn apply_ignores_empty_target() {
        let row = make_row(2, &[("商品名称", "可乐")]);
        let mapping = vec![("商品名称".to_string(), "".to_string())];
        let fields = apply_mapping_to_row(&row, &mapping);
        assert!(fields.is_empty());
    }

    #[test]
    fn apply_request_batch() {
        let rows = vec![make_row(2, &[("name", "A")]), make_row(3, &[("name", "B")])];
        let mapping = vec![FieldMapping {
            source_column: "name".to_string(),
            target_field: "name".to_string(),
        }];
        let req = ImportRequest {
            file_name: "x.xlsx".to_string(),
            file_type: "xlsx".to_string(),
            file_hash: None,
            rows,
            mapping,
            conflict_strategy: "skip".to_string(),
            target_type: "products".to_string(),
            image_archive: None,
        };
        let out = apply_mapping(&req);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].0, 2);
        assert_eq!(out[1].1.get("name").unwrap(), "B");
    }

    #[test]
    fn parse_helpers() {
        assert_eq!(parse_f64("3.5", 0.0), 3.5);
        assert_eq!(parse_f64("abc", 1.0), 1.0);
        assert_eq!(parse_i64("100", 0), 100);
        assert_eq!(parse_i64("", 50), 50);
        assert!(parse_bool("1", false));
        assert!(!parse_bool("0", true));
        assert!(parse_bool("是", false));
        assert!(!parse_bool("否", true));
    }
}
