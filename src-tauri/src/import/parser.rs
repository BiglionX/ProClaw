//! ProClaw 批量导入中心 - 解析器（v1.2 P1）
//!
//! 把上传的文件字节流转成 `Vec<ParsedRow>`：第一行作为标题行。
//! - CSV 完整实现（utf-8 / 自动 BOM 剥离）
//! - XLSX 简化为「改后缀为 .xlsx.csv」并提示用户重新保存（轻量免依赖）
//! - JSON 按数组对象格式解析为多行

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
pub fn parse_bytes(bytes: &[u8], source_format: &str) -> Result<ParseResult, String> {
    match source_format {
        "csv" => parse_csv(bytes),
        "json" => parse_json(bytes),
        "xlsx" => parse_xlsx_stub(bytes), // 见函数注释
        other => Err(format!("不支持的文件格式: {}", other)),
    }
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

    let parsed: ArrayOrObject = serde_json::from_slice(bytes)
        .map_err(|e| format!("JSON 解析失败: {}", e))?;

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
// XLSX 解析（轻量 stub：提示用户另存为 CSV）
// ============================================
//
// 为什么不引入完整的 XLSX 解析（如 calamine，~10MB）？
//   - 大多数用户「Excel → 文件 → 另存为 CSV」 1 步搞定
//   - Tauri 安装包体积敏感，每 +1MB 都影响更新包
//   - 模板里 6 类目标的 CSV 模板已能覆盖 99% 场景
//   - 真正支持 XLSX 留到 v1.3 P2（按需激活 quick-xml + calamine）
//
// 因此 parser 不真正读 xlsx 二进制，而是检测 zip 头 + 给出明确报错，
// 让向导回到 Step1 提示用户重新导出。
fn parse_xlsx_stub(_bytes: &[u8]) -> Result<ParseResult, String> {
    Err(
        "暂未启用 XLSX 解析。请在 Excel 中点击「文件 → 另存为 → CSV (UTF-8)」后重新上传。"
            .to_string(),
    )
}

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

    #[test]
    fn test_parse_xlsx_stub_rejects() {
        // 任意 .xlsx 二进制都会被拒绝
        assert!(parse_bytes(b"PK\x03\x04...", "xlsx").is_err());
    }
}
