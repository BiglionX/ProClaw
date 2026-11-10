//! P0-06: 销售/采购/库存 quantity 与 unit_price 校验
//! - quantity 必须为正整数（> 0）
//! - unit_price 允许 0，禁止负数（>= 0）
//! - 违反时返回 422 Unprocessable Entity，错误含字段名

use axum::http::StatusCode;
use axum::Json;
use serde_json::{json, Value};

pub type ApiError = (StatusCode, Json<Value>);

/// 校验订单行 quantity / unit_price（销售、采购共用）
pub fn validate_order_item_qty_price(
    index: usize,
    quantity: i32,
    unit_price: f64,
) -> Result<(), ApiError> {
    if quantity <= 0 {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({
                "error": format!("items[{}].quantity must be a positive integer (> 0), got {}", index, quantity),
                "field": format!("items[{}].quantity", index),
            })),
        ));
    }
    if !(unit_price >= 0.0) {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({
                "error": format!("items[{}].unit_price must be >= 0, got {}", index, unit_price),
                "field": format!("items[{}].unit_price", index),
            })),
        ));
    }
    Ok(())
}

/// 校验库存变动数量：禁止 0（正=入库、负=出库）
pub fn validate_inventory_quantity(quantity: i32) -> Result<(), ApiError> {
    if quantity == 0 {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({
                "error": "quantity must not be 0 (positive = inbound, negative = outbound)",
                "field": "quantity",
            })),
        ));
    }
    Ok(())
}

/// Tauri / 非 HTTP 路径：返回纯字符串错误（含字段名）
pub fn validate_order_item_qty_price_str(
    index: usize,
    quantity: i32,
    unit_price: f64,
) -> Result<(), String> {
    if quantity <= 0 {
        return Err(format!(
            "items[{}].quantity must be a positive integer (> 0), got {}",
            index, quantity
        ));
    }
    if !(unit_price >= 0.0) {
        return Err(format!(
            "items[{}].unit_price must be >= 0, got {}",
            index, unit_price
        ));
    }
    Ok(())
}

pub fn validate_inventory_quantity_str(quantity: i32) -> Result<(), String> {
    if quantity == 0 {
        return Err("quantity must not be 0 (positive = inbound, negative = outbound)".to_string());
    }
    Ok(())
}

/// 金额保留两位小数。`0.1 * 3` 的二进制长尾在这里收成 `0.30`。
pub fn round_money(value: f64) -> f64 {
    if !value.is_finite() {
        return 0.0;
    }
    format!("{:.2}", value).parse::<f64>().unwrap_or(0.0)
}

/// 行金额：数量乘单价后再保留两位，供订单、退货和导入共用。
pub fn line_amount(quantity: i32, unit_price: f64) -> f64 {
    round_money(quantity as f64 * unit_price)
}

/// 用「分」比较收付款，避免两位小数相加后又比出长尾。
pub fn money_cents(value: f64) -> i64 {
    if !value.is_finite() {
        return 0;
    }
    format!("{:.2}", value)
        .replace('.', "")
        .parse::<i64>()
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    #[test]
    fn reject_negative_quantity_with_422_and_field() {
        let err = validate_order_item_qty_price(0, -10, 9.9).unwrap_err();
        assert_eq!(err.0, StatusCode::UNPROCESSABLE_ENTITY);
        let body = err.1 .0;
        assert!(body["error"].as_str().unwrap().contains("quantity"));
        assert_eq!(body["field"].as_str().unwrap(), "items[0].quantity");
    }

    #[test]
    fn reject_negative_unit_price_with_422_and_field() {
        let err = validate_order_item_qty_price(1, 2, -5.0).unwrap_err();
        assert_eq!(err.0, StatusCode::UNPROCESSABLE_ENTITY);
        let body = err.1 .0;
        assert!(body["error"].as_str().unwrap().contains("unit_price"));
        assert_eq!(body["field"].as_str().unwrap(), "items[1].unit_price");
    }

    #[test]
    fn allow_zero_unit_price() {
        assert!(validate_order_item_qty_price(0, 1, 0.0).is_ok());
    }

    #[test]
    fn reject_zero_inventory_quantity() {
        let err = validate_inventory_quantity(0).unwrap_err();
        assert_eq!(err.0, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(err.1 .0["field"].as_str().unwrap(), "quantity");
    }

    #[test]
    fn tenth_times_three_rounds_to_two_decimals() {
        let raw = 0.1_f64 * 3.0;
        assert!(
            format!("{:?}", raw).contains("0000000000004"),
            "未舍入的乘积应带有二进制长尾，实际 {:?}",
            raw
        );
        assert_eq!(format!("{:.2}", line_amount(3, 0.1)), "0.30");
        assert_eq!(money_cents(line_amount(3, 0.1)), 30);
        assert_eq!(money_cents(0.1) + money_cents(0.2), money_cents(0.3));
        assert_eq!(round_money(100.0), 100.0);
        assert_eq!(round_money(30.0) + round_money(70.0), 100.0);
    }
}
