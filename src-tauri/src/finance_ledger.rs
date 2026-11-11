//! 财务凭证。
//!
//! 销售「确认出库」写应收/收入、成本/库存。采购「收货」写库存/应付。
//! 这些分录都是 `transfer`，现金流量表只读 `payment_transactions`。
//! 报表查询集中在这里，Tauri 命令和 HTTP API 共用。

use rusqlite::{params, Connection, Transaction};
use uuid::Uuid;

const DEFAULT_CASH_ACCOUNT_ID: &str = "acct-cash-default";
const DEFAULT_CASH_ACCOUNT_CODE: &str = "1001";

const ID_AR: &str = "acct-ar-1122";
const CODE_AR: &str = "1122";
const ID_REVENUE: &str = "acct-revenue-6001";
const CODE_REVENUE: &str = "6001";
const ID_COGS: &str = "acct-cogs-6401";
const CODE_COGS: &str = "6401";
const ID_INVENTORY: &str = "acct-inventory-1405";
const CODE_INVENTORY: &str = "1405";
const ID_AP: &str = "acct-ap-2202";
const CODE_AP: &str = "2202";

/// 已出库：确认出库写入 confirmed，之后标记发货/送达只改状态。
const FULFILLED_SALES_STATUS_SQL: &str = "('confirmed', 'shipped', 'delivered')";

/// 确保存在默认现金科目，返回 account_id。
/// 销售确认出库和采购收货都不走这里。
pub fn ensure_default_cash_account(conn: &Connection) -> Result<String, String> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM accounts WHERE id = ?1 OR code = ?2 LIMIT 1",
            params![DEFAULT_CASH_ACCOUNT_ID, DEFAULT_CASH_ACCOUNT_CODE],
            |row| row.get(0),
        )
        .ok();
    if let Some(id) = existing {
        return Ok(id);
    }

    conn.execute(
        "INSERT INTO accounts (id, code, name, type, balance, is_active)
         VALUES (?1, ?2, '库存现金', 'asset', 0, 1)",
        params![DEFAULT_CASH_ACCOUNT_ID, DEFAULT_CASH_ACCOUNT_CODE],
    )
    .map_err(|e| format!("Failed to create default cash account: {}", e))?;
    Ok(DEFAULT_CASH_ACCOUNT_ID.to_string())
}

/// 旧的单边收入/费用备忘。销售出库和采购收货已改走借贷分录，不再调用。
pub fn post_order_voucher(
    tx: &Transaction<'_>,
    transaction_type: &str, // income | expense
    amount: f64,
    description: &str,
    reference_type: &str,
    reference_id: &str,
    created_by: Option<&str>,
) -> Result<(), String> {
    if amount <= 0.0 {
        return Ok(());
    }
    if transaction_type != "income" && transaction_type != "expense" {
        return Err(format!("Invalid voucher type: {}", transaction_type));
    }

    let exists: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM financial_transactions \
             WHERE reference_type = ?1 AND reference_id = ?2 AND deleted_at IS NULL)",
            params![reference_type, reference_id],
            |row| row.get(0),
        )
        .unwrap_or(false);
    if exists {
        return Ok(());
    }

    let account_id = {
        let existing: Option<String> = tx
            .query_row(
                "SELECT id FROM accounts WHERE id = ?1 OR code = ?2 LIMIT 1",
                params![DEFAULT_CASH_ACCOUNT_ID, DEFAULT_CASH_ACCOUNT_CODE],
                |row| row.get(0),
            )
            .ok();
        if let Some(id) = existing {
            id
        } else {
            tx.execute(
                "INSERT INTO accounts (id, code, name, type, balance, is_active)
                 VALUES (?1, ?2, '库存现金', 'asset', 0, 1)",
                params![DEFAULT_CASH_ACCOUNT_ID, DEFAULT_CASH_ACCOUNT_CODE],
            )
            .map_err(|e| e.to_string())?;
            DEFAULT_CASH_ACCOUNT_ID.to_string()
        }
    };

    let id = Uuid::new_v4().to_string();
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    tx.execute(
        "INSERT INTO financial_transactions \
         (id, transaction_date, description, transaction_type, amount, account_id, \
          reference_type, reference_id, created_by) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            today,
            description,
            transaction_type,
            amount,
            account_id,
            reference_type,
            reference_id,
            created_by,
        ],
    )
    .map_err(|e| format!("Failed to post financial voucher: {}", e))?;

    Ok(())
}

fn ensure_account(
    conn: &Connection,
    id: &str,
    code: &str,
    name: &str,
    account_type: &str,
) -> Result<String, String> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM accounts WHERE code = ?1 OR id = ?2 LIMIT 1",
            params![code, id],
            |row| row.get(0),
        )
        .ok();
    if let Some(found) = existing {
        return Ok(found);
    }
    conn.execute(
        "INSERT INTO accounts (id, code, name, type, balance, is_active)
         VALUES (?1, ?2, ?3, ?4, 0, 1)",
        params![id, code, name, account_type],
    )
    .map_err(|e| format!("Failed to create account {code}: {e}"))?;
    Ok(id.to_string())
}

fn sales_outbound_already_posted(conn: &Connection, order_id: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM financial_transactions ft
            JOIN accounts a ON a.id = ft.account_id
            WHERE ft.reference_type = 'sales_order'
              AND ft.reference_id = ?1
              AND ft.deleted_at IS NULL
              AND a.code IN ('1122', '6001', '6401', '1405')
         )",
        params![order_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

/// 默认 SKU 成本价；没有启用 SKU 时回退到 products.cost_price。
fn lookup_unit_cost(conn: &Connection, product_id: &str) -> Result<f64, String> {
    match conn.query_row(
        "SELECT COALESCE(cost_price, 0.0) FROM product_skus
         WHERE spu_id = ?1 AND deleted_at IS NULL AND IFNULL(is_active, 1) != 0
         ORDER BY IFNULL(is_default, 0) DESC, IFNULL(created_at, '') ASC
         LIMIT 1",
        params![product_id],
        |row| row.get(0),
    ) {
        Ok(cost) => Ok(cost),
        Err(rusqlite::Error::QueryReturnedNoRows) => product_cost(conn, product_id),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("no such table") {
                product_cost(conn, product_id)
            } else {
                Err(msg)
            }
        }
    }
}

fn product_cost(conn: &Connection, product_id: &str) -> Result<f64, String> {
    match conn.query_row(
        "SELECT COALESCE(cost_price, 0.0) FROM products WHERE id = ?1",
        params![product_id],
        |row| row.get(0),
    ) {
        Ok(cost) => Ok(cost),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0.0),
        Err(e) => Err(e.to_string()),
    }
}

fn order_cogs(conn: &Connection, order_id: &str) -> Result<f64, String> {
    let items: Vec<(String, i32)> = {
        let mut stmt = conn
            .prepare("SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![order_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    let mut total = 0.0;
    for (product_id, qty) in items {
        if qty <= 0 {
            continue;
        }
        total += qty as f64 * lookup_unit_cost(conn, &product_id)?;
    }
    Ok(total)
}

fn insert_journal_line(
    tx: &Transaction<'_>,
    transaction_date: &str,
    description: &str,
    debit_amount: f64,
    credit_amount: f64,
    account_id: &str,
    reference_type: &str,
    reference_id: &str,
    notes: &str,
    created_by: Option<&str>,
) -> Result<(), String> {
    let amount = debit_amount + credit_amount;
    if amount <= 0.0 {
        return Ok(());
    }
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO financial_transactions \
         (id, transaction_date, description, transaction_type, amount, \
          debit_amount, credit_amount, account_id, reference_type, reference_id, notes, created_by) \
         VALUES (?1, ?2, ?3, 'transfer', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            transaction_date,
            description,
            amount,
            debit_amount,
            credit_amount,
            account_id,
            reference_type,
            reference_id,
            notes,
            created_by,
        ],
    )
    .map_err(|e| format!("Failed to post journal line: {e}"))?;
    Ok(())
}

/// 销售确认出库：同一事务内写两对分录。金额为 0 的那一对跳过。
/// 已有这四类科目分录时幂等返回，不记库存现金。
pub fn post_sales_outbound_entries(
    tx: &Transaction<'_>,
    order_id: &str,
    created_by: Option<&str>,
) -> Result<(), String> {
    if sales_outbound_already_posted(tx, order_id)? {
        return Ok(());
    }

    let (total, order_date, so_number): (f64, String, String) = tx
        .query_row(
            "SELECT COALESCE(total_amount, 0.0), \
                    COALESCE(NULLIF(order_date, ''), date('now')), \
                    COALESCE(NULLIF(so_number, ''), id) \
             FROM sales_orders WHERE id = ?1",
            params![order_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| format!("Sales order {order_id} not found"))?;

    let txn_date = if order_date.len() >= 10 {
        order_date[..10].to_string()
    } else {
        order_date
    };
    let cogs = order_cogs(tx, order_id)?;

    if total > 0.0 {
        let ar = ensure_account(tx, ID_AR, CODE_AR, "应收账款", "asset")?;
        let revenue = ensure_account(tx, ID_REVENUE, CODE_REVENUE, "主营业务收入", "revenue")?;
        insert_journal_line(
            tx,
            &txn_date,
            &format!("{so_number} 借：应收账款"),
            total,
            0.0,
            &ar,
            "sales_order",
            order_id,
            "ar",
            created_by,
        )?;
        insert_journal_line(
            tx,
            &txn_date,
            &format!("{so_number} 贷：主营业务收入"),
            0.0,
            total,
            &revenue,
            "sales_order",
            order_id,
            "revenue",
            created_by,
        )?;
    }

    if cogs > 0.0 {
        let cogs_account = ensure_account(tx, ID_COGS, CODE_COGS, "主营业务成本", "expense")?;
        let inventory = ensure_account(tx, ID_INVENTORY, CODE_INVENTORY, "库存商品", "asset")?;
        insert_journal_line(
            tx,
            &txn_date,
            &format!("{so_number} 借：主营业务成本"),
            cogs,
            0.0,
            &cogs_account,
            "sales_order",
            order_id,
            "cogs",
            created_by,
        )?;
        insert_journal_line(
            tx,
            &txn_date,
            &format!("{so_number} 贷：库存商品"),
            0.0,
            cogs,
            &inventory,
            "sales_order",
            order_id,
            "inventory",
            created_by,
        )?;
    }

    Ok(())
}

/// 启动修复：已出库但还没有收入/成本分录的销售单，补写两对凭证。
pub fn backfill_missing_sales_entries(conn: &Connection) -> Result<usize, String> {
    let sql = format!(
        "SELECT id FROM sales_orders \
         WHERE status IN {FULFILLED_SALES_STATUS_SQL} AND deleted_at IS NULL \
           AND NOT EXISTS ( \
             SELECT 1 FROM financial_transactions ft \
             JOIN accounts a ON a.id = ft.account_id \
             WHERE ft.reference_type = 'sales_order' \
               AND ft.reference_id = sales_orders.id \
               AND ft.deleted_at IS NULL \
               AND a.code IN ('1122', '6001', '6401', '1405') \
           )"
    );
    let ids: Vec<String> = {
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };
    if ids.is_empty() {
        return Ok(0);
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let mut posted = 0usize;
    for id in &ids {
        if sales_outbound_already_posted(&tx, id)? {
            continue;
        }
        post_sales_outbound_entries(&tx, id, None)?;
        posted += 1;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(posted)
}

fn purchase_inbound_already_posted(conn: &Connection, order_id: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM financial_transactions ft
            JOIN accounts a ON a.id = ft.account_id
            WHERE ft.reference_type = 'purchase_order'
              AND ft.reference_id = ?1
              AND ft.deleted_at IS NULL
              AND a.code IN ('1405', '2202')
         )",
        params![order_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

/// 采购收货：借库存商品，贷应付账款。金额是订单总额。不记现金。
pub fn post_purchase_inbound_entries(
    tx: &Transaction<'_>,
    order_id: &str,
    created_by: Option<&str>,
) -> Result<(), String> {
    if purchase_inbound_already_posted(tx, order_id)? {
        return Ok(());
    }

    let (total, order_date, po_number): (f64, String, String) = tx
        .query_row(
            "SELECT COALESCE(total_amount, 0.0), \
                    COALESCE(NULLIF(order_date, ''), date('now')), \
                    COALESCE(NULLIF(po_number, ''), id) \
             FROM purchase_orders WHERE id = ?1",
            params![order_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| format!("Purchase order {order_id} not found"))?;

    if total <= 0.0 {
        return Ok(());
    }

    let txn_date = if order_date.len() >= 10 {
        order_date[..10].to_string()
    } else {
        order_date
    };
    let inventory = ensure_account(tx, ID_INVENTORY, CODE_INVENTORY, "库存商品", "asset")?;
    let ap = ensure_account(tx, ID_AP, CODE_AP, "应付账款", "liability")?;
    insert_journal_line(
        tx,
        &txn_date,
        &format!("{po_number} 借：库存商品"),
        total,
        0.0,
        &inventory,
        "purchase_order",
        order_id,
        "inventory",
        created_by,
    )?;
    insert_journal_line(
        tx,
        &txn_date,
        &format!("{po_number} 贷：应付账款"),
        0.0,
        total,
        &ap,
        "purchase_order",
        order_id,
        "ap",
        created_by,
    )?;
    Ok(())
}

/// 启动修复：已收货但还没有库存/应付分录的采购单，补写这一对。
pub fn backfill_missing_purchase_entries(conn: &Connection) -> Result<usize, String> {
    let ids: Vec<String> = {
        let mut stmt = conn
            .prepare(
                "SELECT id FROM purchase_orders \
                 WHERE status = 'received' AND deleted_at IS NULL \
                   AND NOT EXISTS ( \
                     SELECT 1 FROM financial_transactions ft \
                     JOIN accounts a ON a.id = ft.account_id \
                     WHERE ft.reference_type = 'purchase_order' \
                       AND ft.reference_id = purchase_orders.id \
                       AND ft.deleted_at IS NULL \
                       AND a.code IN ('1405', '2202') \
                   )",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };
    if ids.is_empty() {
        return Ok(0);
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let mut posted = 0usize;
    for id in &ids {
        if purchase_inbound_already_posted(&tx, id)? {
            continue;
        }
        post_purchase_inbound_entries(&tx, id, None)?;
        posted += 1;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(posted)
}

/// 现金流量表。只读真实收付款。销售退款冲减流入，采购退款冲减流出。
pub fn cash_flow_report(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
) -> Result<serde_json::Value, String> {
    let inflow: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(CASE \
                WHEN transaction_type = 'receipt' THEN amount \
                WHEN transaction_type = 'refund' AND order_type IN ('sales', 'sales_return') THEN -amount \
                ELSE 0 END), 0.0) \
             FROM payment_transactions \
             WHERE transaction_date >= ?1 AND transaction_date <= ?2 \
               AND deleted_at IS NULL",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let outflow: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(CASE \
                WHEN transaction_type = 'payment' THEN amount \
                WHEN transaction_type = 'refund' AND order_type IN ('purchase', 'purchase_return') THEN -amount \
                ELSE 0 END), 0.0) \
             FROM payment_transactions \
             WHERE transaction_date >= ?1 AND transaction_date <= ?2 \
               AND deleted_at IS NULL",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let net = inflow - outflow;
    Ok(serde_json::json!({
        "period": {"start": start_date, "end": end_date},
        "operating_activities": {
            "inflow": round_money(inflow),
            "outflow": round_money(outflow),
            "net": round_money(net),
        },
        "investing_activities": 0.0,
        "financing_activities": 0.0,
        "net_cash_flow": round_money(net),
    }))
}

fn round_money(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn sum_account_side(
    conn: &Connection,
    code: &str,
    side: &str,
    start_date: &str,
    end_date: &str,
) -> Result<f64, String> {
    let column = if side == "debit" {
        "debit_amount"
    } else {
        "credit_amount"
    };
    conn.query_row(
        &format!(
            "SELECT COALESCE(SUM(ft.{column}), 0.0) \
             FROM financial_transactions ft \
             JOIN accounts a ON a.id = ft.account_id \
             WHERE a.code = ?1 AND ft.deleted_at IS NULL \
               AND ft.transaction_date >= ?2 AND ft.transaction_date <= ?3"
        ),
        params![code, start_date, end_date],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

fn fallback_fulfilled_orders(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<(String, f64)>, String> {
    let sql = format!(
        "SELECT id, COALESCE(total_amount, 0.0) FROM sales_orders \
         WHERE order_date >= ?1 AND order_date <= ?2 \
           AND status IN {FULFILLED_SALES_STATUS_SQL} AND deleted_at IS NULL \
           AND NOT EXISTS ( \
             SELECT 1 FROM financial_transactions ft \
             JOIN accounts a ON a.id = ft.account_id \
             WHERE ft.reference_type = 'sales_order' \
               AND ft.reference_id = sales_orders.id \
               AND ft.deleted_at IS NULL \
               AND a.code IN ('1122', '6001', '6401', '1405') \
           )"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 利润表。凭证优先；没有收入/成本分录的已出库订单按订单额和当前 SKU 成本回退。
/// 已出库含 confirmed / shipped / delivered。不用采购单总额当成本。
pub fn profit_loss_report(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
) -> Result<serde_json::Value, String> {
    let mut revenue = sum_account_side(conn, CODE_REVENUE, "credit", start_date, end_date)?;
    let mut cogs = sum_account_side(conn, CODE_COGS, "debit", start_date, end_date)?;

    for (order_id, total) in fallback_fulfilled_orders(conn, start_date, end_date)? {
        revenue += total;
        cogs += order_cogs(conn, &order_id)?;
    }

    let gross_profit = revenue - cogs;
    let operating_expenses: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0.0) FROM financial_transactions \
             WHERE transaction_date >= ?1 AND transaction_date <= ?2 \
               AND transaction_type = 'expense' AND deleted_at IS NULL \
               AND (reference_type IS NULL OR reference_type != 'purchase_order')",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let net_profit = gross_profit - operating_expenses;
    let margin = if revenue > 0.0 {
        (net_profit / revenue) * 100.0
    } else {
        0.0
    };

    Ok(serde_json::json!({
        "period": {"start": start_date, "end": end_date},
        "revenue": round_money(revenue),
        "cost_of_goods_sold": round_money(cogs),
        "gross_profit": round_money(gross_profit),
        "operating_expenses": round_money(operating_expenses),
        "net_profit": round_money(net_profit),
        "profit_margin": round_money(margin),
    }))
}

fn report_line(
    id: String,
    date: String,
    doc_no: String,
    party: String,
    summary: String,
    amount: f64,
    source: &str,
    reference_type: String,
    reference_id: String,
) -> serde_json::Value {
    let reference_type = if reference_type.is_empty() {
        serde_json::Value::Null
    } else {
        serde_json::Value::String(reference_type)
    };
    let reference_id = if reference_id.is_empty() {
        serde_json::Value::Null
    } else {
        serde_json::Value::String(reference_id)
    };
    serde_json::json!({
        "id": id,
        "date": date,
        "doc_no": doc_no,
        "party": party,
        "summary": summary,
        "amount": round_money(amount),
        "source": source,
        "reference_type": reference_type,
        "reference_id": reference_id,
    })
}

fn customer_name(conn: &Connection, customer_id: &str) -> Result<String, String> {
    if customer_id.is_empty() {
        return Ok(String::new());
    }
    match conn.query_row(
        "SELECT name FROM customers WHERE id = ?1",
        params![customer_id],
        |row| row.get(0),
    ) {
        Ok(name) => Ok(name),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(String::new()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("no such table") {
                Ok(String::new())
            } else {
                Err(msg)
            }
        }
    }
}

struct JournalLine {
    id: String,
    date: String,
    doc_no: String,
    customer_id: String,
    summary: String,
    amount: f64,
    reference_type: String,
    reference_id: String,
}

fn journal_lines(
    conn: &Connection,
    code: &str,
    side: &str,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<JournalLine>, String> {
    let column = if side == "debit" {
        "debit_amount"
    } else {
        "credit_amount"
    };
    let sql = format!(
        "SELECT ft.id, ft.transaction_date, \
                COALESCE(NULLIF(so.so_number, ''), ft.reference_id, ''), \
                COALESCE(so.customer_id, ''), \
                ft.description, ft.{column}, \
                COALESCE(ft.reference_type, ''), COALESCE(ft.reference_id, '') \
         FROM financial_transactions ft \
         JOIN accounts a ON a.id = ft.account_id \
         LEFT JOIN sales_orders so \
           ON ft.reference_type = 'sales_order' AND so.id = ft.reference_id \
         WHERE a.code = ?1 AND ft.deleted_at IS NULL AND ft.{column} > 0 \
           AND ft.transaction_date >= ?2 AND ft.transaction_date <= ?3 \
         ORDER BY ft.transaction_date, ft.id"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![code, start_date, end_date], |row| {
            Ok(JournalLine {
                id: row.get(0)?,
                date: row.get(1)?,
                doc_no: row.get(2)?,
                customer_id: row.get(3)?,
                summary: row.get(4)?,
                amount: row.get(5)?,
                reference_type: row.get(6)?,
                reference_id: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

struct FallbackOrder {
    id: String,
    date: String,
    doc_no: String,
    customer_id: String,
    amount: f64,
}

fn fallback_order_rows(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<FallbackOrder>, String> {
    let sql = format!(
        "SELECT so.id, so.order_date, COALESCE(NULLIF(so.so_number, ''), so.id), \
                COALESCE(so.customer_id, ''), COALESCE(so.total_amount, 0.0) \
         FROM sales_orders so \
         WHERE so.order_date >= ?1 AND so.order_date <= ?2 \
           AND so.status IN {FULFILLED_SALES_STATUS_SQL} AND so.deleted_at IS NULL \
           AND NOT EXISTS ( \
             SELECT 1 FROM financial_transactions ft \
             JOIN accounts a ON a.id = ft.account_id \
             WHERE ft.reference_type = 'sales_order' \
               AND ft.reference_id = so.id \
               AND ft.deleted_at IS NULL \
               AND a.code IN ('1122', '6001', '6401', '1405') \
           ) \
         ORDER BY so.order_date, so.id"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(FallbackOrder {
                id: row.get(0)?,
                date: row.get(1)?,
                doc_no: row.get(2)?,
                customer_id: row.get(3)?,
                amount: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn sales_lines(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
    code: &str,
    side: &str,
    use_order_cogs: bool,
) -> Result<Vec<serde_json::Value>, String> {
    let mut lines = Vec::new();
    for row in journal_lines(conn, code, side, start_date, end_date)? {
        let party = customer_name(conn, &row.customer_id)?;
        lines.push(report_line(
            row.id,
            row.date,
            row.doc_no,
            party,
            row.summary,
            row.amount,
            "凭证",
            row.reference_type,
            row.reference_id,
        ));
    }
    for order in fallback_order_rows(conn, start_date, end_date)? {
        let amount = if use_order_cogs {
            order_cogs(conn, &order.id)?
        } else {
            order.amount
        };
        let party = customer_name(conn, &order.customer_id)?;
        lines.push(report_line(
            format!("fallback-{}-{}", if use_order_cogs { "cogs" } else { "revenue" }, order.id),
            order.date,
            order.doc_no,
            party,
            if use_order_cogs {
                "已出库订单成本回退".to_string()
            } else {
                "已出库订单收入回退".to_string()
            },
            amount,
            "回退",
            "sales_order".to_string(),
            order.id,
        ));
    }
    Ok(lines)
}

fn expense_lines(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT ft.id, ft.transaction_date, COALESCE(ft.reference_id, ''), \
                    COALESCE(a.name, ''), ft.description, ft.amount, \
                    COALESCE(ft.reference_type, ''), COALESCE(ft.reference_id, '') \
             FROM financial_transactions ft \
             LEFT JOIN accounts a ON a.id = ft.account_id \
             WHERE ft.transaction_date >= ?1 AND ft.transaction_date <= ?2 \
               AND ft.transaction_type = 'expense' AND ft.deleted_at IS NULL \
               AND (ft.reference_type IS NULL OR ft.reference_type != 'purchase_order') \
             ORDER BY ft.transaction_date, ft.id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(report_line(
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                "费用",
                row.get(6)?,
                row.get(7)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn cash_lines(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
    inflow: bool,
) -> Result<Vec<serde_json::Value>, String> {
    let direction_sql = if inflow {
        "ft.transaction_type = 'receipt' \
         OR (ft.transaction_type = 'refund' AND ft.order_type IN ('sales', 'sales_return'))"
    } else {
        "ft.transaction_type = 'payment' \
         OR (ft.transaction_type = 'refund' AND ft.order_type IN ('purchase', 'purchase_return'))"
    };
    let amount_sql = if inflow {
        "CASE WHEN ft.transaction_type = 'receipt' THEN ft.amount \
              WHEN ft.transaction_type = 'refund' AND ft.order_type IN ('sales', 'sales_return') THEN -ft.amount \
              ELSE 0 END"
    } else {
        "CASE WHEN ft.transaction_type = 'payment' THEN ft.amount \
              WHEN ft.transaction_type = 'refund' AND ft.order_type IN ('purchase', 'purchase_return') THEN -ft.amount \
              ELSE 0 END"
    };
    let sql = format!(
        "SELECT ft.id, ft.transaction_date, COALESCE(ft.voucher_no, ''), \
                COALESCE(ft.counterparty_name, ''), COALESCE(ft.payment_method, ''), \
                {amount_sql}, ft.transaction_type, ft.order_type, ft.order_id \
         FROM payment_transactions ft \
         WHERE ft.deleted_at IS NULL \
           AND ft.transaction_date >= ?1 AND ft.transaction_date <= ?2 \
           AND ({direction_sql}) \
         ORDER BY ft.transaction_date, ft.id"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            let kind: String = row.get(6)?;
            let source = if kind == "refund" {
                "退款"
            } else if inflow {
                "收款"
            } else {
                "付款"
            };
            Ok(report_line(
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                source,
                row.get(7)?,
                row.get(8)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 报表行明细。过滤与 `profit_loss_report` / `cash_flow_report` 相同，行金额合计等于对应汇总。
pub fn report_lines(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
    line: &str,
) -> Result<Vec<serde_json::Value>, String> {
    match line {
        "revenue" => sales_lines(conn, start_date, end_date, CODE_REVENUE, "credit", false),
        "cogs" => sales_lines(conn, start_date, end_date, CODE_COGS, "debit", true),
        "operating_expense" => expense_lines(conn, start_date, end_date),
        "cash_in" => cash_lines(conn, start_date, end_date, true),
        "cash_out" => cash_lines(conn, start_date, end_date, false),
        other => Err(format!("unknown report line: {other}")),
    }
}

/// 财务概览。本月收入只统计已出库销售单，本月支出只统计已收货采购单。
pub fn financial_summary(conn: &Connection) -> Result<serde_json::Value, String> {
    let revenue_sql = format!(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales_orders \
         WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now') \
           AND status IN {FULFILLED_SALES_STATUS_SQL} AND deleted_at IS NULL"
    );
    let monthly_revenue: f64 = conn
        .query_row(&revenue_sql, [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let monthly_expense: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total_amount), 0.0) FROM purchase_orders \
             WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now') \
               AND status = 'received' AND deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let receivable_sql = format!(
        "SELECT COALESCE(SUM(total_amount - paid_amount), 0.0) FROM sales_orders \
         WHERE payment_status != 'paid' AND deleted_at IS NULL \
           AND status IN {FULFILLED_SALES_STATUS_SQL}"
    );
    let accounts_receivable: f64 = conn
        .query_row(&receivable_sql, [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let accounts_payable: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total_amount - paid_amount), 0.0) FROM purchase_orders \
             WHERE payment_status != 'paid' AND status = 'received' AND deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let inventory_value: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(current_stock * cost_price), 0.0) FROM products \
             WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "monthly_revenue": round_money(monthly_revenue),
        "monthly_expense": round_money(monthly_expense),
        "monthly_profit": round_money(monthly_revenue - monthly_expense),
        "accounts_receivable": round_money(accounts_receivable),
        "accounts_payable": round_money(accounts_payable),
        "inventory_value": round_money(inventory_value),
        "working_capital": round_money(accounts_receivable - accounts_payable + inventory_value),
    }))
}

/// 审批通过时：按订单类型扣/加库存并写凭证。
/// 销售走确认出库双分录；采购仍是单边备忘。
pub fn apply_approval_side_effects(
    tx: &Transaction<'_>,
    target_type: &str,
    target_id: &str,
    actor_id: Option<&str>,
) -> Result<(), String> {
    if target_type == "sales_order" {
        let items: Vec<(String, i32)> = {
            let mut stmt = tx
                .prepare(
                    "SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?1",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![target_id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
                })
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?
        };

        for (pid, qty) in &items {
            if *qty <= 0 {
                return Err(format!("Invalid quantity {} for product {}", qty, pid));
            }
            if let Err(e) = crate::sku_stock::deduct_default_sku(tx, pid, *qty) {
                return Err(match e {
                    crate::sku_stock::SkuStockError::Insufficient { current, required } => {
                        format!(
                            "Insufficient stock for product {}. Current: {}, Required: {}",
                            pid, current, required
                        )
                    }
                    other => other.to_string(),
                });
            }
            let txn_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO inventory_transactions \
                 (id, product_id, transaction_type, quantity, reference_no, reason) \
                 VALUES (?1, ?2, 'outbound', ?3, ?4, 'approval_sales_order')",
                params![txn_id, pid, qty, target_id],
            )
            .map_err(|e| e.to_string())?;
        }

        post_sales_outbound_entries(tx, target_id, actor_id)?;
    } else if target_type == "purchase_order" {
        let items: Vec<(String, i32)> = {
            let mut stmt = tx
                .prepare(
                    "SELECT product_id, quantity FROM purchase_order_items WHERE purchase_order_id = ?1",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![target_id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
                })
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?
        };

        for (pid, qty) in &items {
            if *qty <= 0 {
                return Err(format!("Invalid quantity {} for product {}", qty, pid));
            }
            crate::sku_stock::apply_default_sku_delta(tx, pid, *qty).map_err(|e| e.to_string())?;
            let txn_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO inventory_transactions \
                 (id, product_id, transaction_type, quantity, reference_no, reason) \
                 VALUES (?1, ?2, 'inbound', ?3, ?4, 'approval_purchase_order')",
                params![txn_id, pid, qty, target_id],
            )
            .map_err(|e| e.to_string())?;
            let _ = tx.execute(
                "UPDATE purchase_order_items SET received_quantity = received_quantity + ?1 \
                 WHERE purchase_order_id = ?2 AND product_id = ?3",
                params![qty, target_id, pid],
            );
        }

        post_purchase_inbound_entries(tx, target_id, actor_id)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn ledger_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE accounts (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                balance REAL DEFAULT 0,
                is_active INTEGER DEFAULT 1
            );
            CREATE TABLE financial_transactions (
                id TEXT PRIMARY KEY,
                transaction_date TEXT NOT NULL,
                description TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                amount REAL NOT NULL,
                debit_amount REAL NOT NULL DEFAULT 0,
                credit_amount REAL NOT NULL DEFAULT 0,
                account_id TEXT NOT NULL,
                reference_type TEXT,
                reference_id TEXT,
                notes TEXT,
                created_by TEXT,
                deleted_at TEXT
            );
            CREATE TABLE sales_orders (
                id TEXT PRIMARY KEY,
                so_number TEXT,
                customer_id TEXT,
                order_date TEXT,
                status TEXT,
                total_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'unpaid',
                deleted_at TEXT
            );
            CREATE TABLE sales_order_items (
                id TEXT PRIMARY KEY,
                sales_order_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL
            );
            CREATE TABLE purchase_orders (
                id TEXT PRIMARY KEY,
                po_number TEXT,
                order_date TEXT,
                status TEXT,
                total_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'unpaid',
                deleted_at TEXT
            );
            CREATE TABLE products (
                id TEXT PRIMARY KEY,
                cost_price REAL DEFAULT 0,
                current_stock INTEGER DEFAULT 0,
                deleted_at TEXT
            );
            CREATE TABLE product_skus (
                id TEXT PRIMARY KEY,
                spu_id TEXT NOT NULL,
                cost_price REAL DEFAULT 0,
                is_default INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                deleted_at TEXT
            );",
        )
        .unwrap();
        conn
    }

    fn today(conn: &Connection) -> String {
        conn.query_row("SELECT date('now')", [], |row| row.get(0))
            .unwrap()
    }

    fn insert_sales_order(conn: &Connection, id: &str, status: &str, total: f64, order_date: &str) {
        conn.execute(
            "INSERT INTO sales_orders (id, so_number, customer_id, order_date, status, total_amount, paid_amount, payment_status)
             VALUES (?1, ?2, 'c1', ?3, ?4, ?5, 0, 'unpaid')",
            params![id, id, order_date, status, total],
        )
        .unwrap();
    }

    fn insert_sku(conn: &Connection, product_id: &str, cost: f64) {
        conn.execute(
            "INSERT INTO products (id, cost_price, current_stock) VALUES (?1, ?2, 10)",
            params![product_id, cost],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO product_skus (id, spu_id, cost_price, is_default, is_active, created_at)
             VALUES (?1, ?2, ?3, 1, 1, '2026-01-01')",
            params![format!("sku-{product_id}"), product_id, cost],
        )
        .unwrap();
    }

    fn side(conn: &Connection, code: &str, column: &str) -> f64 {
        conn.query_row(
            &format!(
                "SELECT COALESCE(SUM(ft.{column}), 0.0) \
                 FROM financial_transactions ft JOIN accounts a ON a.id = ft.account_id \
                 WHERE a.code = ?1 AND ft.deleted_at IS NULL"
            ),
            params![code],
            |row| row.get(0),
        )
        .unwrap()
    }

    #[test]
    fn draft_order_does_not_increase_monthly_revenue() {
        let conn = ledger_db();
        let day = today(&conn);
        let before = financial_summary(&conn).unwrap();
        assert_eq!(before["monthly_revenue"].as_f64(), Some(0.0));

        insert_sales_order(&conn, "so-draft", "draft", 500.0, &day);
        let after_draft = financial_summary(&conn).unwrap();
        assert_eq!(after_draft["monthly_revenue"].as_f64(), Some(0.0));

        insert_sales_order(&conn, "so-ok", "confirmed", 200.0, &day);
        insert_sales_order(&conn, "so-ship", "shipped", 30.0, &day);
        let after = financial_summary(&conn).unwrap();
        assert_eq!(after["monthly_revenue"].as_f64(), Some(230.0));

        conn.execute(
            "INSERT INTO purchase_orders (id, order_date, status, total_amount, payment_status)
             VALUES ('po-draft', ?1, 'draft', 999, 'unpaid'), ('po-recv', ?1, 'received', 15, 'unpaid')",
            params![day],
        )
        .unwrap();
        let expense = financial_summary(&conn).unwrap();
        assert_eq!(expense["monthly_expense"].as_f64(), Some(15.0));
        assert_eq!(expense["monthly_profit"].as_f64(), Some(215.0));
    }

    #[test]
    fn confirm_outbound_writes_revenue_and_cogs_pairs() {
        let mut conn = ledger_db();
        let day = today(&conn);
        insert_sales_order(&conn, "so-out", "confirmed", 200.0, &day);
        insert_sku(&conn, "p1", 30.0);
        conn.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price)
             VALUES ('i1', 'so-out', 'p1', 2, 100, 200)",
            [],
        )
        .unwrap();

        let tx = conn.transaction().unwrap();
        post_sales_outbound_entries(&tx, "so-out", None).unwrap();
        tx.commit().unwrap();

        assert_eq!(side(&conn, "1122", "debit_amount"), 200.0);
        assert_eq!(side(&conn, "6001", "credit_amount"), 200.0);
        assert_eq!(side(&conn, "6401", "debit_amount"), 60.0);
        assert_eq!(side(&conn, "1405", "credit_amount"), 60.0);

        let lines: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM financial_transactions WHERE reference_id = 'so-out'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(lines, 4);

        let cash: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM financial_transactions ft \
                 JOIN accounts a ON a.id = ft.account_id WHERE a.code = '1001'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(cash, 0);
    }

    #[test]
    fn profit_loss_matches_outbound_entries() {
        let mut conn = ledger_db();
        let day = today(&conn);
        insert_sales_order(&conn, "so-out", "confirmed", 200.0, &day);
        insert_sales_order(&conn, "so-draft", "draft", 500.0, &day);
        insert_sku(&conn, "p1", 30.0);
        conn.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price)
             VALUES ('i1', 'so-out', 'p1', 2, 100, 200)",
            [],
        )
        .unwrap();

        let tx = conn.transaction().unwrap();
        post_sales_outbound_entries(&tx, "so-out", None).unwrap();
        tx.commit().unwrap();

        let report = profit_loss_report(&conn, &day, &day).unwrap();
        assert_eq!(report["revenue"].as_f64(), Some(200.0));
        assert_eq!(report["cost_of_goods_sold"].as_f64(), Some(60.0));
        assert_eq!(report["gross_profit"].as_f64(), Some(140.0));
    }

    #[test]
    fn backfill_historical_orders_once_and_fallback_matches() {
        let conn = ledger_db();
        let day = today(&conn);
        insert_sku(&conn, "p1", 10.0);
        for (id, status, total, qty) in [
            ("so-c", "confirmed", 80.0, 4),
            ("so-s", "shipped", 50.0, 1),
            ("so-d", "delivered", 20.0, 2),
            ("so-draft", "draft", 999.0, 9),
        ] {
            insert_sales_order(&conn, id, status, total, &day);
            conn.execute(
                "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price)
                 VALUES (?1, ?2, 'p1', ?3, 1, ?3)",
                params![format!("item-{id}"), id, qty],
            )
            .unwrap();
        }

        let before = profit_loss_report(&conn, &day, &day).unwrap();
        assert_eq!(before["revenue"].as_f64(), Some(150.0));
        assert_eq!(before["cost_of_goods_sold"].as_f64(), Some(70.0));

        assert_eq!(backfill_missing_sales_entries(&conn).unwrap(), 3);
        let lines: i64 = conn
            .query_row("SELECT COUNT(*) FROM financial_transactions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(lines, 12);
        assert_eq!(backfill_missing_sales_entries(&conn).unwrap(), 0);
        let lines_again: i64 = conn
            .query_row("SELECT COUNT(*) FROM financial_transactions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(lines_again, 12);

        let after = profit_loss_report(&conn, &day, &day).unwrap();
        assert_eq!(after["revenue"].as_f64(), Some(150.0));
        assert_eq!(after["cost_of_goods_sold"].as_f64(), Some(70.0));
    }

    #[test]
    fn purchase_receive_posts_inventory_and_ap() {
        let conn = ledger_db();
        let day = today(&conn);
        conn.execute(
            "INSERT INTO purchase_orders (id, po_number, order_date, status, total_amount, payment_status)
             VALUES ('po1', 'PO-1', ?1, 'received', 300, 'unpaid')",
            params![day],
        )
        .unwrap();

        assert_eq!(backfill_missing_purchase_entries(&conn).unwrap(), 1);
        assert_eq!(side(&conn, "1405", "debit_amount"), 300.0);
        assert_eq!(side(&conn, "2202", "credit_amount"), 300.0);

        let kinds: Vec<String> = {
            let mut stmt = conn
                .prepare(
                    "SELECT transaction_type FROM financial_transactions WHERE reference_id = 'po1'",
                )
                .unwrap();
            let rows = stmt.query_map([], |row| row.get(0)).unwrap();
            rows.collect::<Result<Vec<_>, _>>().unwrap()
        };
        assert_eq!(kinds.len(), 2);
        assert!(kinds.iter().all(|kind| kind == "transfer"));

        let cash: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM financial_transactions ft \
                 JOIN accounts a ON a.id = ft.account_id WHERE a.code = '1001'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(cash, 0);
        assert_eq!(backfill_missing_purchase_entries(&conn).unwrap(), 0);
    }

    fn sum_line_amounts(lines: &[serde_json::Value]) -> f64 {
        round_money(
            lines
                .iter()
                .map(|line| line["amount"].as_f64().unwrap_or(0.0))
                .sum(),
        )
    }

    #[test]
    fn report_lines_sum_matches_statements() {
        let mut conn = ledger_db();
        let day = today(&conn);
        insert_sales_order(&conn, "so-out", "confirmed", 200.0, &day);
        insert_sales_order(&conn, "so-fallback", "confirmed", 80.0, &day);
        insert_sales_order(&conn, "so-draft", "draft", 500.0, &day);
        insert_sku(&conn, "p1", 30.0);
        insert_sku(&conn, "p2", 10.0);
        conn.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price)
             VALUES ('i1', 'so-out', 'p1', 2, 100, 200),
                    ('i2', 'so-fallback', 'p2', 2, 40, 80)",
            [],
        )
        .unwrap();

        let tx = conn.transaction().unwrap();
        post_sales_outbound_entries(&tx, "so-out", None).unwrap();
        tx.commit().unwrap();

        conn.execute(
            "INSERT INTO accounts (id, code, name, type) VALUES ('acct-exp', '6601', '销售费用', 'expense')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO financial_transactions \
             (id, transaction_date, description, transaction_type, amount, debit_amount, credit_amount, account_id, reference_type, reference_id) \
             VALUES ('exp1', ?1, '运费', 'expense', 25, 25, 0, 'acct-exp', NULL, NULL), \
                    ('exp-po', ?1, '采购备忘', 'expense', 999, 999, 0, 'acct-exp', 'purchase_order', 'po1')",
            params![day],
        )
        .unwrap();

        conn.execute_batch(
            "CREATE TABLE payment_transactions (
                id TEXT PRIMARY KEY,
                order_type TEXT NOT NULL,
                order_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                amount REAL NOT NULL,
                transaction_date TEXT NOT NULL,
                payment_method TEXT,
                voucher_no TEXT,
                counterparty_name TEXT,
                deleted_at TEXT
            );",
        )
        .unwrap();
        conn.execute(
            "INSERT INTO payment_transactions \
             (id, order_type, order_id, transaction_type, amount, transaction_date, payment_method, voucher_no, counterparty_name) \
             VALUES ('pay-in', 'sales', 'so-out', 'receipt', 80, ?1, '银行', 'V-1', '客户甲'), \
                    ('pay-refund', 'sales_return', 'sr-1', 'refund', 10, ?1, '现金', 'V-2', '客户甲'), \
                    ('pay-out', 'purchase', 'po1', 'payment', 40, ?1, '银行', 'V-3', '供应商乙')",
            params![day],
        )
        .unwrap();

        let report = profit_loss_report(&conn, &day, &day).unwrap();
        let revenue_lines = report_lines(&conn, &day, &day, "revenue").unwrap();
        let cogs_lines = report_lines(&conn, &day, &day, "cogs").unwrap();
        let expense_lines = report_lines(&conn, &day, &day, "operating_expense").unwrap();
        assert_eq!(sum_line_amounts(&revenue_lines), report["revenue"].as_f64().unwrap());
        assert_eq!(sum_line_amounts(&cogs_lines), report["cost_of_goods_sold"].as_f64().unwrap());
        assert_eq!(sum_line_amounts(&expense_lines), report["operating_expenses"].as_f64().unwrap());
        assert_eq!(report["revenue"].as_f64(), Some(280.0));
        assert_eq!(report["cost_of_goods_sold"].as_f64(), Some(80.0));
        assert_eq!(expense_lines.len(), 1);
        assert!(revenue_lines.iter().any(|line| line["source"] == "凭证"));
        assert!(revenue_lines.iter().any(|line| line["source"] == "回退"));
        assert!(revenue_lines.iter().all(|line| line["doc_no"] != "so-draft"));

        let cash = cash_flow_report(&conn, &day, &day).unwrap();
        let cash_in = report_lines(&conn, &day, &day, "cash_in").unwrap();
        let cash_out = report_lines(&conn, &day, &day, "cash_out").unwrap();
        assert_eq!(
            sum_line_amounts(&cash_in),
            cash["operating_activities"]["inflow"].as_f64().unwrap()
        );
        assert_eq!(
            sum_line_amounts(&cash_out),
            cash["operating_activities"]["outflow"].as_f64().unwrap()
        );
        assert_eq!(cash["operating_activities"]["inflow"].as_f64(), Some(70.0));
        assert_eq!(cash["operating_activities"]["outflow"].as_f64(), Some(40.0));
        assert!(report_lines(&conn, &day, &day, "unknown").is_err());
    }
}
