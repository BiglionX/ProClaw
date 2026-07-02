//! ProClaw v1.3 老系统数据迁移 — 类别自动建档
//!
//! v1.2 P1 已有 `ensure_category` 在 executor.rs 中（仅商品 → product_categories 表）。
//! v1.3 扩展：
//! - 支持三类：'product' / 'supplier' / 'customer'
//! - 写入新的统一 `categories` 表
//! - 类别名清洗：去掉尾部 `/`（如 "采购代理/" → "采购代理"）
//! - 提供批量建档接口，返回 (created_count, skipped_count)

use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

/// 类别名清洗：去尾部 `/` / 前后空白
pub fn clean_category_name(raw: &str) -> String {
    raw.trim().trim_end_matches('/').trim().to_string()
}

/// 单个类别建档（不存在则创建），返回 category_id
pub fn ensure_category(
    conn: &rusqlite::Connection,
    category_type: &str,
    raw_name: &str,
) -> Result<Option<String>, String> {
    let name = clean_category_name(raw_name);
    if name.is_empty() {
        return Ok(None);
    }

    // 1) 已存在则直接返回
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM categories WHERE type = ?1 AND name = ?2",
            params![category_type, name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return Ok(Some(id));
    }

    // 2) 不存在则创建（source = 'import_legacy'）
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO categories (id, type, name, source, created_at)
         VALUES (?1, ?2, ?3, 'import_legacy', datetime('now'))",
        params![id, category_type, name],
    )
    .map_err(|e| format!("创建类别失败 ({}:{}): {}", category_type, name, e))?;

    Ok(Some(id))
}

/// 批量类别建档（去重），返回 (created_count, skipped_count)
///
/// 参数：
/// - `batch_id`：批次 id（写入 categories.batch_id 用于精准撤销）
pub fn bulk_ensure_categories(
    conn: &rusqlite::Connection,
    category_type: &str,
    raw_names: &[String],
    batch_id: &str,
) -> Result<(usize, usize), String> {
    let mut unique: Vec<String> = raw_names
        .iter()
        .map(|n| clean_category_name(n))
        .filter(|n| !n.is_empty())
        .collect();
    unique.sort();
    unique.dedup();

    let mut created = 0;
    let mut skipped = 0;

    for name in unique {
        // 直接走 INSERT 带 batch_id（不再依赖 ensure_category 的 source 检查）
        // 用 INSERT OR IGNORE 实现 created vs skipped 计数
        let existed_before: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM categories WHERE type = ?1 AND name = ?2)",
                params![category_type, name],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if existed_before {
            skipped += 1;
            continue;
        }

        let id = Uuid::new_v4().to_string();
        let inserted = conn.execute(
            "INSERT OR IGNORE INTO categories (id, type, name, source, batch_id, created_at)
             VALUES (?1, ?2, ?3, 'import_legacy', ?4, datetime('now'))",
            params![id, category_type, name, batch_id],
        )
        .map_err(|e| format!("批量创建类别失败 ({}:{}): {}", category_type, name, e))?;

        if inserted > 0 {
            created += 1;
        } else {
            // 并发场景：另一个批次刚插入了这条
            skipped += 1;
        }
    }

    Ok((created, skipped))
}

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_category_name() {
        assert_eq!(clean_category_name("采购代理/"), "采购代理");
        assert_eq!(clean_category_name("  电池  "), "电池");
        assert_eq!(clean_category_name("CNS/"), "CNS");
        assert_eq!(clean_category_name(""), "");
        assert_eq!(clean_category_name("/"), "");
    }
}