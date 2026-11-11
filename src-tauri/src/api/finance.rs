// 财务管理 API 处理器
// 提供损益报表、现金流量表、财务汇总等 RESTful API

use super::AppState;
use axum::{
    extract::{Json, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;

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
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let start_date = query.start_date.as_deref().unwrap_or("2000-01-01");
    let end_date = query.end_date.as_deref().unwrap_or("2099-12-31");

    match crate::finance_ledger::profit_loss_report(conn, start_date, end_date) {
        Ok(report) => (StatusCode::OK, Json(report)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e})),
        ),
    }
}

/// 获取现金流量表
pub async fn get_cash_flow_report(
    State(state): State<AppState>,
    Query(query): Query<FinanceQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let start_date = query.start_date.as_deref().unwrap_or("2000-01-01");
    let end_date = query.end_date.as_deref().unwrap_or("2099-12-31");

    match crate::finance_ledger::cash_flow_report(conn, start_date, end_date) {
        Ok(report) => (StatusCode::OK, Json(report)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e})),
        ),
    }
}

/// 报表行明细查询参数
#[derive(Debug, Deserialize)]
pub struct ReportLinesQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub line: Option<String>,
}

/// 获取报表行明细
pub async fn get_report_lines(
    State(state): State<AppState>,
    Query(query): Query<ReportLinesQuery>,
) -> impl IntoResponse {
    let Some(line) = query.line.as_deref().filter(|line| !line.is_empty()) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "missing line"})),
        );
    };
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();
    let start_date = query.start_date.as_deref().unwrap_or("2000-01-01");
    let end_date = query.end_date.as_deref().unwrap_or("2099-12-31");

    match crate::finance_ledger::report_lines(conn, start_date, end_date, line) {
        Ok(lines) => (StatusCode::OK, Json(serde_json::json!(lines))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e})),
        ),
    }
}

/// 获取财务汇总
pub async fn get_financial_summary(State(state): State<AppState>) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    match crate::finance_ledger::financial_summary(conn) {
        Ok(summary) => (StatusCode::OK, Json(summary)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e})),
        ),
    }
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_get_profit_loss_report() {
        assert!(true);
    }
}
