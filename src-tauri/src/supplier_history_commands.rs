use crate::database::Database;
use rusqlite::{params, Connection};
use std::sync::Mutex;

const SUPPLIER_HISTORY_SQL: &str = "
SELECT
    poi.product_id AS id,
    COALESCE(NULLIF(spu.name, ''), NULLIF(p.name, ''), poi.product_id) AS name,
    COALESCE(NULLIF(spu.spu_code, ''), NULLIF(p.sku, ''), '') AS code,
    COUNT(DISTINCT po.id) AS order_count,
    COALESCE(SUM(poi.quantity), 0) AS total_quantity,
    MAX(po.order_date) AS last_order_date,
    (
        SELECT poi2.unit_price
        FROM purchase_order_items poi2
        INNER JOIN purchase_orders po2 ON po2.id = poi2.purchase_order_id
        WHERE po2.supplier_id = ?1
          AND poi2.product_id = poi.product_id
          AND po2.deleted_at IS NULL
          AND po2.status != 'cancelled'
        ORDER BY po2.order_date DESC, po2.created_at DESC, poi2.rowid DESC
        LIMIT 1
    ) AS last_unit_price
FROM purchase_order_items poi
INNER JOIN purchase_orders po ON po.id = poi.purchase_order_id
LEFT JOIN products p ON p.id = poi.product_id
LEFT JOIN product_spus spu ON spu.id = poi.product_id
WHERE po.supplier_id = ?1
  AND po.deleted_at IS NULL
  AND po.status != 'cancelled'
GROUP BY poi.product_id
ORDER BY last_order_date DESC, name ASC
LIMIT 50
";

pub fn query_supplier_history_products(
    conn: &Connection,
    supplier_id: &str,
) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn.prepare(SUPPLIER_HISTORY_SQL).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![supplier_id], |row| {
            let order_count = row_i64(row, 3)?;
            let total_quantity = row_i64(row, 4)?;
            let last_unit_price = row_f64(row, 6)?;
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "code": row.get::<_, String>(2)?,
                "order_count": order_count,
                "total_quantity": total_quantity,
                "last_order_date": row.get::<_, String>(5)?,
                "last_unit_price": last_unit_price,
            }))
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn row_i64(row: &rusqlite::Row, idx: usize) -> rusqlite::Result<i64> {
    match row.get::<_, i64>(idx) {
        Ok(value) => Ok(value),
        Err(_) => row.get::<_, f64>(idx).map(|value| value as i64),
    }
}

fn row_f64(row: &rusqlite::Row, idx: usize) -> rusqlite::Result<f64> {
    match row.get::<_, f64>(idx) {
        Ok(value) => Ok(value),
        Err(_) => row.get::<_, i64>(idx).map(|value| value as f64),
    }
}

/// 查询某供应商历史上采购过的商品。不改表，只读 purchase_orders / purchase_order_items。
#[tauri::command]
pub fn get_supplier_history_products(
    db: tauri::State<Mutex<Database>>,
    supplier_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let supplier_id = supplier_id.trim();
    if supplier_id.is_empty() {
        return Err("supplier_id is required".to_string());
    }
    let db = db.lock().map_err(|e| e.to_string())?;
    query_supplier_history_products(db.connection(), supplier_id)
}

#[cfg(test)]
mod tests {
    use super::query_supplier_history_products;
    use crate::database::Database;
    use rusqlite::params;

    fn insert_product(conn: &rusqlite::Connection, id: &str, sku: &str, name: &str, spu_code: Option<&str>) {
        conn.execute(
            "INSERT INTO products (id, sku, name, unit, cost_price, current_stock)
             VALUES (?1, ?2, ?3, '件', 10, 0)",
            params![id, sku, name],
        )
        .unwrap();
        if let Some(code) = spu_code {
            conn.execute(
                "INSERT INTO product_spus (id, spu_code, name) VALUES (?1, ?2, ?3)",
                params![id, code, name],
            )
            .unwrap();
        }
    }

    fn insert_order(
        conn: &rusqlite::Connection,
        order_id: &str,
        supplier_id: &str,
        order_date: &str,
        status: &str,
        lines: &[(&str, i32, f64)],
    ) {
        conn.execute(
            "INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, status, total_amount)
             VALUES (?1, ?2, ?3, ?4, ?5, 0)",
            params![order_id, format!("PO-{order_id}"), supplier_id, order_date, status],
        )
        .unwrap();
        for (index, (product_id, qty, price)) in lines.iter().enumerate() {
            let total = *qty as f64 * price;
            conn.execute(
                "INSERT INTO purchase_order_items
                    (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
                params![format!("line-{order_id}-{index}"), order_id, product_id, qty, price, total],
            )
            .unwrap();
        }
    }

    #[test]
    fn supplier_history_uses_latest_price_and_skips_other_suppliers() {
        let db = Database::new_in_memory().unwrap();
        db.initialize().unwrap();
        let conn = db.connection();

        conn.execute("INSERT INTO suppliers (id, name) VALUES ('sup-a', '甲'), ('sup-b', '乙'), ('sup-empty', '丙')", [])
            .unwrap();
        insert_product(conn, "p1", "SKU-OLD", "电池", Some("SPU-BAT"));
        insert_product(conn, "p2", "SKU-CBL", "数据线", Some("SPU-CBL"));
        insert_product(conn, "p-legacy", "SKU-LEG", "旧商品", None);
        insert_product(conn, "p-other", "SKU-OTH", "别人的货", Some("SPU-OTH"));

        insert_order(conn, "po-old", "sup-a", "2026-01-01", "confirmed", &[("p1", 2, 10.0)]);
        insert_order(conn, "po-mid", "sup-a", "2026-02-15", "received", &[("p2", 1, 5.0)]);
        insert_order(conn, "po-legacy", "sup-a", "2026-02-20", "draft", &[("p-legacy", 3, 4.0)]);
        insert_order(conn, "po-new", "sup-a", "2026-03-01", "confirmed", &[("p1", 4, 12.5)]);
        insert_order(conn, "po-cancel", "sup-a", "2026-04-01", "cancelled", &[("p1", 9, 99.0)]);
        insert_order(conn, "po-del", "sup-a", "2026-05-01", "confirmed", &[("p1", 8, 77.0)]);
        conn.execute("UPDATE purchase_orders SET deleted_at = '2026-05-02' WHERE id = 'po-del'", [])
            .unwrap();
        insert_order(conn, "po-b", "sup-b", "2026-06-01", "confirmed", &[("p-other", 1, 3.0)]);

        let rows = query_supplier_history_products(conn, "sup-a").unwrap();
        assert_eq!(rows.len(), 3, "{rows:?}");
        assert_eq!(rows[0]["id"], "p1");
        assert_eq!(rows[0]["name"], "电池");
        assert_eq!(rows[0]["code"], "SPU-BAT");
        assert_eq!(rows[0]["order_count"], 2);
        assert_eq!(rows[0]["total_quantity"], 6);
        assert_eq!(rows[0]["last_order_date"], "2026-03-01");
        assert_eq!(rows[0]["last_unit_price"], 12.5);

        assert_eq!(rows[1]["id"], "p-legacy");
        assert_eq!(rows[1]["name"], "旧商品");
        assert_eq!(rows[1]["code"], "SKU-LEG");
        assert_eq!(rows[1]["last_unit_price"], 4.0);

        assert_eq!(rows[2]["id"], "p2");
        assert!(query_supplier_history_products(conn, "sup-empty").unwrap().is_empty());
        let other = query_supplier_history_products(conn, "sup-b").unwrap();
        assert_eq!(other.len(), 1);
        assert_eq!(other[0]["id"], "p-other");
    }
}
