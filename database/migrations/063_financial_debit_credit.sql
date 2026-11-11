-- 轻量级双分录：financial_transactions 增加借贷金额。
-- 不改销售单、采购单、商品等主干表。
-- 已有库由 database.rs 按列检测后执行；重复执行时忽略 duplicate column。

ALTER TABLE financial_transactions ADD COLUMN debit_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE financial_transactions ADD COLUMN credit_amount REAL NOT NULL DEFAULT 0;
