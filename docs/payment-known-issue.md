# 付款应收应付汇总列下标错误

本文件只记录已知问题，本轮不提交，也不修。

## 现象

`get_ar_ap_summary_cmd`（`src-tauri/src/payment_commands.rs`，约 240 行）把查询列下标读错了。

供应商查询（约 251–264 行）列序是：

| 下标 | 列 |
|---|---|
| 0–5 | `supplier_id`、name、code、email、contact_person、phone |
| 6 | `COUNT(po.id)`（整数） |
| 7 | `SUM(po.total_amount)` |
| 8 | `SUM(po.paid_amount)` |
| 9 | 子查询 `ledger_total` |

读取在约 269–284 行：`row.get::<f64>(6)` 当作 `total_amount`，`row.get::<f64>(7)` 当作 `paid_amount`。第 8 列已付金额没有读。第 9 列 `ledger_total` 选出来了，没有放进 JSON。

客户查询（约 296–306 行）同样从第 6 列起错一位：第 6 列是 `COUNT`，第 7 列是 `SUM(total_amount)`，第 8 列才是 `SUM(paid_amount)`。读取在约 310–325 行。

## 影响

rusqlite 不能把 INTEGER 的 `COUNT` 读成 `f64`。这一行变成 `Err`。供应商循环约 287 行、客户循环约 329 行都是 `rows.flatten()`，错误行被丢掉。有未取消订单时，汇总返回空列表。

财务页会打到这条命令：`src/lib/hooks/useFinance.ts` 的 `useARAPSummary`（约 63–66 行）调用 `getARAPSummary`；`src/pages/FinancePage.tsx` 约 73–74 行在供应商/客户页签启用它。`src/lib/paymentService.ts` 约 107–111 行的 `getARAPSummary` 调用 `get_ar_ap_summary_cmd`。

明细命令 `get_ar_ap_detail_cmd` 的下标是对的。`FinancePage.tsx` 约 841 行另调 `getARAPDetail`。

## 写入路径现状

`record_payment_cmd` / `record_receipt_cmd` 写入 `payment_transactions`（`database.rs` 约 589–605 行）。该表没有外键。`created_by` 是调用方传入的 `Option`，可以是 NULL。

前端 `src/components/PaymentDialog.tsx` 约 66–67 行调用 `recordPurchasePayment` / `recordSalesReceipt` 时不传 `createdBy`。`paymentService.ts` 因此传 `null`。

`src/db/schema.sql` 约 609–618 行另有 `payments` 表，`created_by REFERENCES users(id)`。命令不写这张表，全库没有 `INSERT INTO payments`。

已提交代码里这些命令不引用 `finance_ledger`。命令在 `invoke_handler.rs` 约 238–246 行注册，经 `tauri::State<Mutex<Database>>` 拿连接。没有 Rust `#[cfg(test)]`。`paymentService.test.ts` 只 mock `invoke`。

## 与主工作区 WIP 的关系

主工作区未提交的 `src-tauri/src/payment_commands.rs` 相对 HEAD 是 +214/−35。它抽出 `record_sales_receipt`、`query_ar_ap_summary`。新测试里有 `use crate::finance_ledger::cash_flow_report`。`src-tauri/src/finance_ledger.rs` 仍是未跟踪文件。

## 结论

半成品。汇总在有订单时是空的，这是已提交代码上的产品 bug。修复和补测试要等这份 payment WIP 落地，或单独开一轮只改已提交的 `get_ar_ap_summary_cmd`。本轮不修、不写测试。
