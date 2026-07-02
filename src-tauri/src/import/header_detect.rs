//! ProClaw v1.3 老系统数据迁移 — 表头结构探测
//!
//! 解决两行表头 / 分段标题的识别：
//! - 供应商导出.xls / 商品导出.xlsx / 客户导出.xls 都有"基础信息"标题行
//! - 客户导出.xls 还有"联系信息"分段（合并单元格）
//!
//! 算法：扫描前 5 行
//!   1) 检测"分段标题行"：该行只有 1-2 个非空单元格
//!   2) 检测"字段名行"：含 * 前缀的列 / 出现在别名词典中
//!   3) 数据起始行 = 字段名行 + 1

use serde::{Deserialize, Serialize};

/// 探测到的表头结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderStructure {
    /// 字段名所在行（0-based，从原始数据起算）
    pub header_row_index: usize,
    /// 数据起始行（0-based，header_row_index + 1）
    pub data_start_row: usize,
    /// 分段标题列表：(起始列, 结束列, 标题)
    /// 例：客户表的 [(0, 8, "基础信息"), (8, 14, "联系信息")]
    pub segment_titles: Vec<SegmentTitle>,
    /// 探测时识别的格式
    pub detection_confidence: f32, // 0.0 ~ 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentTitle {
    pub start_col: usize,
    pub end_col: usize,
    pub title: String,
}

/// 探测结果统计（用于 UI 展示）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderDetectionReport {
    pub structure: HeaderStructure,
    pub field_names: Vec<String>,        // header_row 提取的字段名
    pub sample_rows: Vec<Vec<String>>,   // data_start_row 起 3 行预览
    pub two_row_detected: bool,
    pub segmented_detected: bool,
}

/// 主入口：从二维表数据探测表头结构
///
/// `rows` 是 calamine / csv / json 解析后得到的 `Vec<Vec<String>>`
pub fn detect_header(rows: &[Vec<String>]) -> HeaderDetectionReport {
    let mut report = HeaderDetectionReport {
        structure: HeaderStructure {
            header_row_index: 0,
            data_start_row: 1,
            segment_titles: Vec::new(),
            detection_confidence: 0.0,
        },
        field_names: Vec::new(),
        sample_rows: Vec::new(),
        two_row_detected: false,
        segmented_detected: false,
    };

    if rows.is_empty() {
        return report;
    }

    // 1) 扫描前 5 行，找分段标题行
    let segment_row = find_segment_row(rows);
    if let Some(idx) = segment_row {
        report.segmented_detected = true;
        report.structure.segment_titles = extract_segments(&rows[idx]);
        // 字段名行 = 分段行 + 1
        let header_idx = idx + 1;
        if header_idx < rows.len() {
            report.structure.header_row_index = header_idx;
            report.structure.data_start_row = header_idx + 1;
            report.two_row_detected = true;
        }
    } else {
        // 没找到分段标题，按单行表头处理
        // 字段名行 = 第一行非空 + 含 * 前缀 / 别名词典
        let header_idx = find_header_row(rows);
        report.structure.header_row_index = header_idx;
        report.structure.data_start_row = header_idx + 1;
    }

    // 2) 提取字段名（去掉 * 前缀）
    let header_idx = report.structure.header_row_index;
    if header_idx < rows.len() {
        report.field_names = rows[header_idx]
            .iter()
            .map(|s| s.trim().trim_start_matches('*').trim().to_string())
            .collect();
    }

    // 3) 取 3 行样例数据
    let data_start = report.structure.data_start_row;
    for i in data_start..(data_start + 3).min(rows.len()) {
        report.sample_rows.push(rows[i].clone());
    }

    // 4) 置信度
    let mut confidence = 0.5_f32;
    if report.two_row_detected {
        confidence += 0.3;
    }
    if report.segmented_detected {
        confidence += 0.2;
    }
    report.structure.detection_confidence = confidence.min(1.0);

    report
}

/// 找"分段标题行"：该行只有 1-2 个非空单元格，且非空单元格文本长度 > 1（不是空 / 单字符）
fn find_segment_row(rows: &[Vec<String>]) -> Option<usize> {
    for (i, row) in rows.iter().take(5).enumerate() {
        let non_empty: Vec<(usize, &String)> = row
            .iter()
            .enumerate()
            .filter(|(_, s)| !s.trim().is_empty())
            .collect();

        // 分段行特征：1-2 个非空 + 总列数 ≥ 3 + 非空文本是中文标题（>= 2 字符）
        if non_empty.len() >= 1 && non_empty.len() <= 2 && row.len() >= 3 {
            let has_chinese_title = non_empty
                .iter()
                .any(|(_, s)| s.trim().chars().count() >= 2);
            if has_chinese_title {
                return Some(i);
            }
        }
    }
    None
}

/// 提取分段（合并单元格）：把连续的非空单元格扩展为 [start_col, end_col] 范围
fn extract_segments(row: &[String]) -> Vec<SegmentTitle> {
    let mut segments = Vec::new();
    let mut current_start: Option<usize> = None;
    let mut current_title = String::new();

    for (i, cell) in row.iter().enumerate() {
        let trimmed = cell.trim();
        if !trimmed.is_empty() {
            // 新分段开始
            if let Some(start) = current_start {
                // 收尾上一个分段
                segments.push(SegmentTitle {
                    start_col: start,
                    end_col: i.saturating_sub(1),
                    title: current_title.clone(),
                });
            }
            current_start = Some(i);
            current_title = trimmed.to_string();
        }
    }

    // 收尾最后一个
    if let Some(start) = current_start {
        let last_col = row.len().saturating_sub(1);
        segments.push(SegmentTitle {
            start_col: start,
            end_col: last_col,
            title: current_title,
        });
    }

    segments
}

/// 单行表头模式：找"含 * 前缀或中文常见列名"的行
fn find_header_row(rows: &[Vec<String>]) -> usize {
    for (i, row) in rows.iter().take(5).enumerate() {
        let has_star = row.iter().any(|s| s.trim().starts_with('*'));
        let has_known = row.iter().any(|s| {
            let t = s.trim();
            t.contains("编号") || t.contains("名称") || t.contains("类别") || t.contains("电话")
                || t.contains("客户") || t.contains("供应商") || t.contains("商品")
        });
        if has_star || has_known {
            return i;
        }
    }
    0
}

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_two_row_header_basic() {
        // 模拟客户导出.xls 前 3 行
        let rows = vec![
            vec!["基础信息".into(), "".into(), "".into(), "".into(), "".into(), "".into(),
                 "".into(), "".into(), "联系信息".into(), "".into(), "".into(), "".into(),
                 "".into(), "".into()],
            vec!["客户类别".into(), "*客户编号".into(), "*客户名称".into(),
                 "纳税人识别号".into(), "开户银行".into(), "银行账号".into(),
                 "销售人员".into(), "客户等级".into(), "联系人".into(), "手机".into(),
                 "座机".into(), "QQ/微信".into(), "联系地址".into(), "首要联系人".into()],
            vec!["CNS/".into(), "CNS001".into(), "李永南".into(), "".into(), "".into(),
                 "".into(), "狮妹".into(), "零售客户".into(), "李永南".into(),
                 "13414700036".into(), "".into(), "".into(), "广东省".into(), "是".into()],
        ];

        let report = detect_header(&rows);
        assert_eq!(report.structure.header_row_index, 1);
        assert_eq!(report.structure.data_start_row, 2);
        assert!(report.two_row_detected);
        assert!(report.segmented_detected);
        assert_eq!(report.structure.segment_titles.len(), 2);
        assert_eq!(report.structure.segment_titles[0].title, "基础信息");
        assert_eq!(report.structure.segment_titles[0].start_col, 0);
        assert_eq!(report.structure.segment_titles[1].title, "联系信息");
        assert_eq!(report.field_names.len(), 14);
        assert_eq!(report.field_names[1], "客户编号"); // * 前缀被剥掉
        assert_eq!(report.field_names[2], "客户名称");
    }

    #[test]
    fn test_single_row_header() {
        // 单行表头
        let rows = vec![
            vec!["sku".into(), "name".into(), "price".into()],
            vec!["SKU-001".into(), "Tom".into(), "100".into()],
        ];

        let report = detect_header(&rows);
        assert_eq!(report.structure.header_row_index, 0);
        assert_eq!(report.structure.data_start_row, 1);
        assert!(!report.two_row_detected);
        assert!(!report.segmented_detected);
        assert_eq!(report.field_names, vec!["sku", "name", "price"]);
    }

    #[test]
    fn test_two_row_header_suppliers() {
        // 供应商导出.xls 前 3 行
        let rows = vec![
            vec!["基础信息".into(), "".into(), "".into()],
            vec!["供应商类别".into(), "*供应商编号".into(), "*供应商名称".into()],
            vec!["采购代理/".into(), "DL01".into(), "周万省采购代理".into()],
        ];

        let report = detect_header(&rows);
        assert!(report.two_row_detected);
        assert_eq!(report.field_names, vec!["供应商类别", "供应商编号", "供应商名称"]);
        assert_eq!(report.sample_rows.len(), 1);
    }

    #[test]
    fn test_two_row_header_products() {
        // 商品导出.xlsx 前 3 行
        let rows = vec![
            vec!["基础信息".into(), "".into(), "".into(), "".into(), "".into()],
            vec!["商品类别".into(), "*商品编号".into(), "商品名称".into(),
                 "商品标签".into(), "规格型号".into()],
            vec!["小零件".into(), "V1XLJ1001".into(), "SAM Watch".into(),
                 "".into(), "".into()],
        ];

        let report = detect_header(&rows);
        assert!(report.two_row_detected);
        assert_eq!(report.field_names, vec!["商品类别", "商品编号", "商品名称",
                                             "商品标签", "规格型号"]);
    }

    #[test]
    fn test_extract_segments() {
        let row = vec!["基础信息".into(), "".into(), "".into(), "".into(), "".into(),
                       "".into(), "".into(), "".into(), "联系信息".into(), "".into()];
        let segs = extract_segments(&row);
        assert_eq!(segs.len(), 2);
        assert_eq!(segs[0].title, "基础信息");
        assert_eq!(segs[0].start_col, 0);
        assert_eq!(segs[1].title, "联系信息");
        assert_eq!(segs[1].start_col, 8);
    }
}