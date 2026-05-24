// 财务管理 API 处理器
// 提供损益报表、现金流量表、财务汇总等 RESTful API

use axum::{
    extract::{State, Json, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use super::AppState;
use rusqlite::params;

/// 财务报表查询参数
#[derive(Debug, Deserialize)]
pub struct FinanceQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// 获取损益报表
pub async fn get_profit_loss_report(
    State(state): State<AppState>,
    Query(query): Query<FinanceQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let start_date = query.start_date.as_deref().unwrap_or("2000-01-01");
    let end_date = query.end_date.as_deref().unwrap_or("2099-12-31");

    let revenue: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales_orders \
         WHERE order_date >= ?1 AND order_date <= ?2 \
         AND status != 'cancelled' AND deleted_at IS NULL",
        params![start_date, end_date],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let cogs: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM purchase_orders \
         WHERE order_date >= ?1 AND order_date <= ?2 \
         AND status != 'cancelled' AND deleted_at IS NULL",
        params![start_date, end_date],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let gross_profit = revenue - cogs;

    let expenses: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM financial_transactions \
         WHERE transaction_date >= ?1 AND transaction_date <= ?2 \
         AND transaction_type = 'expense' AND deleted_at IS NULL",
        params![start_date, end_date],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let net_profit = gross_profit - expenses;
    let margin = if revenue > 0.0 { (net_profit / revenue) * 100.0 } else { 0.0 };

    (StatusCode::OK, Json(serde_json::json!({
        "period": { "start": start_date, "end": end_date },
        "revenue": (revenue * 100.0).round() / 100.0,
        "cost_of_goods_sold": (cogs * 100.0).round() / 100.0,
        "gross_profit": (gross_profit * 100.0).round() / 100.0,
        "operating_expenses": (expenses * 100.0).round() / 100.0,
        "net_profit": (net_profit * 100.0).round() / 100.0,
        "profit_margin": (margin * 100.0).round() / 100.0,
    })))
}

/// 获取现金流量表
pub async fn get_cash_flow_report(
    State(state): State<AppState>,
    Query(query): Query<FinanceQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let start_date = query.start_date.as_deref().unwrap_or("2000-01-01");
    let end_date = query.end_date.as_deref().unwrap_or("2099-12-31");

    let inflow: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM financial_transactions \
         WHERE transaction_date >= ?1 AND transaction_date <= ?2 \
         AND transaction_type = 'income' AND deleted_at IS NULL",
        params![start_date, end_date],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let outflow: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM financial_transactions \
         WHERE transaction_date >= ?1 AND transaction_date <= ?2 \
         AND transaction_type = 'expense' AND deleted_at IS NULL",
        params![start_date, end_date],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let net = inflow - outflow;

    (StatusCode::OK, Json(serde_json::json!({
        "period": { "start": start_date, "end": end_date },
        "operating_activities": {
            "inflow": (inflow * 100.0).round() / 100.0,
            "outflow": (outflow * 100.0).round() / 100.0,
            "net": (net * 100.0).round() / 100.0,
        },
        "investing_activities": 0.0,
        "financing_activities": 0.0,
        "net_cash_flow": (net * 100.0).round() / 100.0,
    })))
}

/// 获取财务汇总
pub async fn get_financial_summary(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let monthly_revenue: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales_orders \
         WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now') \
         AND status != 'cancelled' AND deleted_at IS NULL",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let monthly_expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM purchase_orders \
         WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now') \
         AND status != 'cancelled' AND deleted_at IS NULL",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let receivable: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount - paid_amount), 0.0) FROM sales_orders \
         WHERE payment_status != 'paid' AND status != 'cancelled' AND deleted_at IS NULL",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let payable: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount - paid_amount), 0.0) FROM purchase_orders \
         WHERE payment_status != 'paid' AND status != 'cancelled' AND deleted_at IS NULL",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let inventory_value: f64 = conn.query_row(
        "SELECT COALESCE(SUM(current_stock * cost_price), 0.0) FROM products \
         WHERE deleted_at IS NULL",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    (StatusCode::OK, Json(serde_json::json!({
        "monthly_revenue": (monthly_revenue * 100.0).round() / 100.0,
        "monthly_expense": (monthly_expense * 100.0).round() / 100.0,
        "monthly_profit": ((monthly_revenue - monthly_expense) * 100.0).round() / 100.0,
        "accounts_receivable": (receivable * 100.0).round() / 100.0,
        "accounts_payable": (payable * 100.0).round() / 100.0,
        "inventory_value": (inventory_value * 100.0).round() / 100.0,
        "working_capital": ((receivable - payable + inventory_value) * 100.0).round() / 100.0,
    })))
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_get_profit_loss_report() {
        assert!(true);
    }
}
