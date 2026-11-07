//! ProClaw 批量导入中心 - 解析器（v1.2 P1 + v1.3 老格式扩展）
//!
//! 把上传的文件字节流转成 `Vec<ParsedRow>`：第一行作为标题行。
//! - CSV 完整实现（utf-8 / 自动 BOM 剥离）
//! - JSON 按数组对象格式解析为多行
//! - XLSX / XLS 走 v1.3 引入的 calamine 真解析（已不再 stub）
//!
//! v1.3 变更：
//! - 移除 `parse_xlsx_stub`
//! - 新增 `parse_xls_xlsx` 入口（基于 calamine，自动识别 .xls / .xlsx）

use crate::import::types::ParsedRow;
use std::collections::HashMap;

/// 解析后的整体结果
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ParseResult {
    pub rows: Vec<ParsedRow>,
    pub headers: Vec<String>, // 原始列名（保留顺序）
    pub format: String,       // csv / json / xlsx
    pub total_rows: usize,
}

/// 入口：根据 source_format 分发到具体解析器
///
/// v1.3 变更：xls / xlsx 不再是 stub，直接走 calamine 真解析。
/// 注意：calamine 解析需要文件路径（不能纯内存），所以 xls/xlsx 分支
/// 会通过临时文件方式传递：调用方应已把字节流写到 import_uploads/<batch_id>/ 下。
pub fn parse_bytes(bytes: &[u8], source_format: &str) -> Result<ParseResult, String> {
    match source_format {
        "csv" => parse_csv(bytes),
        "json" => parse_json(bytes),
        "xls" | "xlsx" => {
            // 把 bytes 写到临时文件，调用 calamine
            let temp_path = std::env::temp_dir().join(format!(
                "proclaw_import_{}.{}",
                std::process::id(),
                source_format
            ));
            std::fs::write(&temp_path, bytes).map_err(|e| format!("写临时文件失败: {}", e))?;
            let result = parse_xls_xlsx(&temp_path);
            let _ = std::fs::remove_file(&temp_path);
            result
        }
        other => Err(format!("不支持的文件格式: {}", other)),
    }
}

/// 从文件路径解析 xls / xlsx（calamine 真解析）
pub fn parse_xls_xlsx(path: &std::path::Path) -> Result<ParseResult, String> {
    use crate::import::header_detect::detect_header;

    let format = crate::import::parser_legacy::detect_format(path)?;
    let (_, all_rows) = crate::import::parser_legacy::parse_legacy_file(path, "generic")?;

    if all_rows.is_empty() {
        return Ok(ParseResult {
            rows: vec![],
            headers: vec![],
            format: format.to_string(),
            total_rows: 0,
        });
    }

    // 探测表头
    let report = detect_header(&all_rows);
    let data_start = report.structure.data_start_row;
    let headers = report.field_names.clone();

    let mut rows = Vec::new();
    for (i, raw_row) in all_rows.iter().skip(data_start).enumerate() {
        let mut fields = HashMap::new();
        for (idx, header) in headers.iter().enumerate() {
            let val = raw_row.get(idx).cloned().unwrap_or_default();
            fields.insert(header.clone(), val.trim().to_string());
        }
        rows.push(ParsedRow {
            row_index: i + 1,
            fields,
        });
    }

    let total_rows = rows.len();
    Ok(ParseResult {
        rows,
        headers,
        format: format.to_string(),
        total_rows,
    })
}

// ============================================
// CSV 解析
// ============================================

fn parse_csv(bytes: &[u8]) -> Result<ParseResult, String> {
    // 剥离 UTF-8 BOM（Excel 导出常见）
    let bytes = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &bytes[3..]
    } else {
        bytes
    };

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(bytes);

    let headers = rdr
        .headers()
        .map_err(|e| format!("读取 CSV 标题行失败: {}", e))?
        .iter()
        .map(|s| s.trim().to_string())
        .collect::<Vec<String>>();

    let mut rows = Vec::new();
    for (i, record) in rdr.records().enumerate() {
        let record = record.map_err(|e| format!("第 {} 行解析失败: {}", i + 2, e))?;
        let mut fields = HashMap::new();
        for (idx, header) in headers.iter().enumerate() {
            if let Some(cell) = record.get(idx) {
                fields.insert(header.clone(), cell.trim().to_string());
            }
        }
        rows.push(ParsedRow {
            row_index: i + 1, // 数据行 1-based（不含标题行）
            fields,
        });
    }

    let total_rows = rows.len();
    Ok(ParseResult {
        rows,
        headers,
        format: "csv".to_string(),
        total_rows,
    })
}

// ============================================
// JSON 解析（数组对象格式）
// ============================================

fn parse_json(bytes: &[u8]) -> Result<ParseResult, String> {
    #[derive(serde::Deserialize)]
    #[serde(untagged)]
    enum ArrayOrObject {
        Arr(Vec<serde_json::Map<String, serde_json::Value>>),
        One(serde_json::Map<String, serde_json::Value>),
    }

    let parsed: ArrayOrObject =
        serde_json::from_slice(bytes).map_err(|e| format!("JSON 解析失败: {}", e))?;

    let list = match parsed {
        ArrayOrObject::Arr(v) => v,
        ArrayOrObject::One(v) => vec![v],
    };

    if list.is_empty() {
        return Ok(ParseResult {
            rows: vec![],
            headers: vec![],
            format: "json".to_string(),
            total_rows: 0,
        });
    }

    // 取所有 key 的并集作为 headers
    let mut headers_set = std::collections::BTreeSet::new();
    for obj in &list {
        for k in obj.keys() {
            headers_set.insert(k.clone());
        }
    }
    let headers: Vec<String> = headers_set.into_iter().collect();

    let mut rows = Vec::with_capacity(list.len());
    for (i, obj) in list.iter().enumerate() {
        let mut fields = HashMap::new();
        for (k, v) in obj {
            let s = match v {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Null => String::new(),
                other => other.to_string().trim_matches('"').to_string(),
            };
            fields.insert(k.clone(), s);
        }
        rows.push(ParsedRow {
            row_index: i + 1,
            fields,
        });
    }

    let total_rows = rows.len();
    Ok(ParseResult {
        rows,
        headers,
        format: "json".to_string(),
        total_rows,
    })
}

// ============================================
// XLSX / XLS 解析（v1.3：calamine 真解析）
// ============================================
//
// v1.2 P1 的 parse_xlsx_stub 已删除。xls/xlsx 真解析由 parser_legacy.rs 提供。
// 见 `parse_xls_xlsx` 入口（calamine 走 .xls / .xlsx 双格式）。
//
// 保留注释以记录历史：v1.2 P1 阶段曾因安装包体积敏感，用 stub 提示用户另存 CSV；
// v1.3 改用 calamine（Rust 生态标准 xls/xlsx 库），体积 +1.8MB 可接受。

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_csv_basic() {
        let csv = "name,sku,price\niPhone 电池,SKU-001,199.0\n测试电池2,SKU-002,99.0";
        let result = parse_csv(csv.as_bytes()).unwrap();
        assert_eq!(result.headers, vec!["name", "sku", "price"]);
        assert_eq!(result.total_rows, 2);
        assert_eq!(result.rows[0].fields.get("sku").unwrap(), "SKU-001");
        assert_eq!(result.rows[1].fields.get("price").unwrap(), "99.0");
    }

    #[test]
    fn test_parse_csv_with_bom() {
        let mut bytes = vec![0xEF, 0xBB, 0xBF]; // UTF-8 BOM
        bytes.extend_from_slice("name,sku\nTom,001\nJerry,002".as_bytes());
        let result = parse_csv(&bytes).unwrap();
        assert_eq!(result.headers, vec!["name", "sku"]);
        assert_eq!(result.total_rows, 2);
    }

    #[test]
    fn test_parse_csv_empty() {
        let csv = "name,sku\n"; // 只有标题行
        let result = parse_csv(csv.as_bytes()).unwrap();
        assert_eq!(result.headers, vec!["name", "sku"]);
        assert_eq!(result.total_rows, 0);
    }

    #[test]
    fn test_parse_json_array() {
        let json = r#"[
            {"sku":"SKU-001","name":"iPhone 电池"},
            {"sku":"SKU-002","name":"测试电池"}
        ]"#;
        let result = parse_json(json.as_bytes()).unwrap();
        assert_eq!(result.total_rows, 2);
        // 字段名按字母序
        assert_eq!(result.headers, vec!["name", "sku"]);
        assert_eq!(result.rows[0].row_index, 1);
    }

    #[test]
    fn test_parse_json_single_object() {
        let json = r#"{"sku":"SKU-001","name":"iPhone 电池"}"#;
        let result = parse_json(json.as_bytes()).unwrap();
        assert_eq!(result.total_rows, 1);
        assert_eq!(result.rows[0].fields.get("sku").unwrap(), "SKU-001");
    }

    #[test]
    fn test_parse_dispatch_csv() {
        let bytes = b"name,sku\nA,1";
        let r = parse_bytes(bytes, "csv").unwrap();
        assert_eq!(r.format, "csv");
    }

    #[test]
    fn test_parse_dispatch_unknown() {
        assert!(parse_bytes(b"", "pdf").is_err());
    }
}
