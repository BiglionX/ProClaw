//! 三个老系统导出文件的业务正确性测试。
//!
//! 桌面端路径：`import_create_batch_inner` 建批次，`import_execute_legacy_inner` 写业务表。
//! 断言阈值按业务要求固定，不因为当前实现放宽。

use std::path::{Path, PathBuf};
use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};

use proclaw_desktop::database::Database;
use proclaw_desktop::import::commands::{import_create_batch_inner, import_execute_legacy_inner};
use proclaw_desktop::import::types::LegacyExecuteRequest;

struct FileReport {
    file: String,
    raw_rows: String,
    stored_rows: String,
    distinct: String,
    aggregated: String,
    assertion: String,
}

fn block_on<F: std::future::Future>(fut: F) -> F::Output {
    fn noop(_: *const ()) {}
    fn clone_raw(data: *const ()) -> RawWaker {
        RawWaker::new(data, &VTABLE)
    }
    static VTABLE: RawWakerVTable = RawWakerVTable::new(clone_raw, noop, noop, noop);
    let waker = unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) };
    let mut cx = Context::from_waker(&waker);
    let mut fut = std::pin::pin!(fut);
    match fut.as_mut().poll(&mut cx) {
        Poll::Ready(value) => value,
        Poll::Pending => panic!("import_create_batch_inner 返回了 Pending"),
    }
}

fn import_lock() -> std::sync::MutexGuard<'static, ()> {
    static LOCK: std::sync::OnceLock<std::sync::Mutex<()>> = std::sync::OnceLock::new();
    LOCK.get_or_init(|| std::sync::Mutex::new(()))
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

fn sample_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../fixtures/legacy-import")
        .join(name)
}

fn scalar(conn: &rusqlite::Connection, sql: &str) -> Result<i64, String> {
    conn.query_row(sql, [], |row| row.get(0))
        .map_err(|e| format!("{sql} -> {e}"))
}

fn has_column(conn: &rusqlite::Connection, table: &str, column: &str) -> bool {
    let sql = format!("PRAGMA table_info({table})");
    let mut stmt = match conn.prepare(&sql) {
        Ok(stmt) => stmt,
        Err(_) => return false,
    };
    let names = stmt.query_map([], |row| row.get::<_, String>(1));
    match names {
        Ok(rows) => rows.filter_map(|r| r.ok()).any(|name| name == column),
        Err(_) => false,
    }
}

fn cleanup_seed(conn: &rusqlite::Connection) {
    for sql in [
        "DELETE FROM sales_order_items",
        "DELETE FROM sales_orders",
        "DELETE FROM customer_contacts",
        "DELETE FROM product_sku",
        "DELETE FROM products",
        "DELETE FROM customers",
        "DELETE FROM suppliers",
        "DELETE FROM import_batch_errors",
        "DELETE FROM import_batches",
        "DELETE FROM categories",
    ] {
        if let Err(e) = conn.execute(sql, []) {
            eprintln!("cleanup {sql}: {e}");
        }
    }
}

fn execute_batch(db: &mut Database, batch_id: &str) -> Result<(), String> {
    import_execute_legacy_inner(
        db,
        LegacyExecuteRequest {
            batch_id: batch_id.to_string(),
            column_mapping: std::collections::HashMap::new(),
            default_values: None,
            skip_errors: Some(true),
            aggregation_rules: None,
            skip_category_auto_create: Some(false),
        },
    )
    .map(|_| ())
}

#[test]
fn e2e_import_three_files() {
    let _guard = import_lock();
    let dir = std::env::temp_dir().join(format!("proclaw-e2e-import-{}", std::process::id()));
    std::fs::create_dir_all(&dir).expect("创建临时目录");
    let db_path = dir.join("e2e.db");
    println!("临时库: {}", db_path.display());

    let mut db = Database::new(db_path).expect("打开临时 SQLite");
    db.initialize().expect("按现有 migration / schema 建表");
    cleanup_seed(db.connection());

    let mut failures: Vec<String> = Vec::new();
    let soft: Vec<String> = Vec::new();
    let mut reports: Vec<FileReport> = Vec::new();
    let mut chain_errors: Vec<String> = Vec::new();

    import_one(
        &mut db,
        "客户导出_20260701114803.xls",
        "customers",
        "xls",
        &mut reports,
        &mut failures,
        &mut chain_errors,
    );
    import_one(
        &mut db,
        "供应商导出_20260701112136.xls",
        "suppliers",
        "xls",
        &mut reports,
        &mut failures,
        &mut chain_errors,
    );
    import_one(
        &mut db,
        "商品导出_20260701235503.xlsx",
        "products",
        "xlsx",
        &mut reports,
        &mut failures,
        &mut chain_errors,
    );

    assert_customers(db.connection(), &mut reports, &mut failures);
    assert_suppliers(db.connection(), &mut reports, &mut failures);
    assert_products(db.connection(), &mut reports, &mut failures);
    assert_batches(db.connection(), &mut failures);

    println!("\n| 文件 | 原始行 | 落库行数 | DISTINCT | 聚合? | 断言 |");
    println!("|---|---:|---:|---|---|---|");
    for row in &reports {
        println!(
            "| {} | {} | {} | {} | {} | {} |",
            row.file, row.raw_rows, row.stored_rows, row.distinct, row.aggregated, row.assertion
        );
    }

    let imported_any = reports.iter().any(|row| {
        row.stored_rows.parse::<i64>().unwrap_or(0) > 0
    });
    let verdict = if !chain_errors.is_empty() && !imported_any {
        format!("链路不通，错误是 {}", chain_errors.join("；"))
    } else if failures.is_empty() && soft.is_empty() && chain_errors.is_empty() {
        "桌面端可正确导入，聚合生效".to_string()
    } else if imported_any || !soft.is_empty() {
        let mut missing = failures.clone();
        missing.extend(soft.clone());
        missing.extend(chain_errors.clone());
        format!("可导入但聚合缺失/部分缺失，需补 {}", missing.join("；"))
    } else {
        format!(
            "链路不通，错误是 {}",
            chain_errors
                .iter()
                .chain(failures.iter())
                .cloned()
                .collect::<Vec<_>>()
                .join("；")
        )
    };
    println!("\n判定: {verdict}");

    if !failures.is_empty() || !chain_errors.is_empty() {
        panic!("{verdict}");
    }
}

fn import_one(
    db: &mut Database,
    filename: &str,
    target_type: &str,
    source_format: &str,
    reports: &mut Vec<FileReport>,
    failures: &mut Vec<String>,
    chain_errors: &mut Vec<String>,
) {
    let path = sample_path(filename);
    let bytes = match std::fs::read(&path) {
        Ok(bytes) => bytes,
        Err(e) => {
            let msg = format!("{filename} 读取失败: {e}");
            chain_errors.push(msg.clone());
            reports.push(FileReport {
                file: filename.to_string(),
                raw_rows: "-".into(),
                stored_rows: "0".into(),
                distinct: "-".into(),
                aggregated: "-".into(),
                assertion: "FAIL 读文件".into(),
            });
            failures.push(msg);
            return;
        }
    };
    println!(
        "\n== {filename} bytes={} target={target_type} format={source_format}",
        bytes.len()
    );
    let created = block_on(import_create_batch_inner(
        db,
        target_type,
        filename,
        source_format,
        &bytes,
        None,
        None,
    ));
    let created = match created {
        Ok(created) => created,
        Err(e) => {
            let msg = format!("{filename} import_create_batch_inner: {e}");
            chain_errors.push(msg.clone());
            reports.push(FileReport {
                file: filename.to_string(),
                raw_rows: "-".into(),
                stored_rows: "0".into(),
                distinct: "-".into(),
                aggregated: "-".into(),
                assertion: "FAIL 建批次".into(),
            });
            failures.push(msg);
            return;
        }
    };
    println!(
        "  create batch={} total_rows={}",
        created.batch_id, created.total_rows
    );
    if let Err(e) = execute_batch(db, &created.batch_id) {
        let msg = format!("{filename} import_execute_legacy_inner: {e}");
        chain_errors.push(msg.clone());
        reports.push(FileReport {
            file: filename.to_string(),
            raw_rows: created.total_rows.to_string(),
            stored_rows: "0".into(),
            distinct: "-".into(),
            aggregated: "-".into(),
            assertion: "FAIL 落库".into(),
        });
        failures.push(msg);
        return;
    }
    reports.push(FileReport {
        file: filename.to_string(),
        raw_rows: created.total_rows.to_string(),
        stored_rows: "待统计".into(),
        distinct: "-".into(),
        aggregated: "-".into(),
        assertion: "待统计".into(),
    });
}

fn report_mut<'a>(reports: &'a mut [FileReport], filename: &str) -> &'a mut FileReport {
    reports
        .iter_mut()
        .find(|row| row.file == filename)
        .expect("报告行")
}

fn assert_customers(
    conn: &rusqlite::Connection,
    reports: &mut [FileReport],
    failures: &mut Vec<String>,
) {
    let filename = "客户导出_20260701114803.xls";
    let Ok(customers) = scalar(conn, "SELECT COUNT(*) FROM customers") else {
        failures.push("customers 表不可查询".into());
        return;
    };
    let contacts = scalar(conn, "SELECT COUNT(*) FROM customer_contacts").unwrap_or(-1);
    let multi = scalar(
        conn,
        "SELECT COUNT(*) FROM (
            SELECT c.code
            FROM customer_contacts cc
            JOIN customers c ON c.id = cc.customer_id
            GROUP BY c.code
            HAVING COUNT(*) > 1
        )",
    )
    .unwrap_or(-1);
    let distinct_code = scalar(conn, "SELECT COUNT(DISTINCT code) FROM customers").unwrap_or(-1);
    let customer_rows = scalar(conn, "SELECT COUNT(*) FROM customers").unwrap_or(-1);
    let nameless = scalar(
        conn,
        "SELECT COUNT(*) FROM customers c
         WHERE NOT EXISTS (
            SELECT 1 FROM customer_contacts cc
            WHERE cc.customer_id = c.id
              AND TRIM(IFNULL(cc.contact_name, '')) != ''
         )",
    )
    .unwrap_or(-1);

    println!("客户 customers={customers} contacts={contacts} multi={multi} distinct_code={distinct_code} nameless={nameless}");

    let mut marks = Vec::new();
    if customers != 6 {
        failures.push(format!("customers={customers}，预期 =6"));
        marks.push("FAIL 行数");
    } else {
        marks.push("PASS 行数");
    }
    if contacts != 7 {
        failures.push(format!("customer_contacts={contacts}，预期 =7"));
        marks.push("FAIL 联系人");
    } else {
        marks.push("PASS 联系人");
    }
    if multi != 1 {
        failures.push(format!("多联系人客户数={multi}，预期 =1"));
        marks.push("FAIL 多联系人");
    } else {
        marks.push("PASS 多联系人");
    }
    if distinct_code != customer_rows {
        failures.push(format!(
            "customer_code 不唯一：DISTINCT={distinct_code} COUNT={customer_rows}"
        ));
        marks.push("FAIL 唯一");
    } else {
        marks.push("PASS 唯一");
    }
    if nameless != 0 {
        failures.push(format!("{nameless} 个 customer_code 没有非空联系人姓名"));
        marks.push("FAIL 姓名");
    } else {
        marks.push("PASS 姓名");
    }

    let row = report_mut(reports, filename);
    if row.assertion.starts_with("FAIL") {
        return;
    }
    row.stored_rows = customers.to_string();
    row.distinct = distinct_code.to_string();
    row.aggregated = if customers == 6 { "是".into() } else { "否".into() };
    row.assertion = marks.join(" / ");
}

fn assert_suppliers(
    conn: &rusqlite::Connection,
    reports: &mut [FileReport],
    failures: &mut Vec<String>,
) {
    let filename = "供应商导出_20260701112136.xls";
    let Ok(suppliers) = scalar(conn, "SELECT COUNT(*) FROM suppliers") else {
        failures.push("suppliers 表不可查询".into());
        return;
    };
    let distinct_code = scalar(conn, "SELECT COUNT(DISTINCT code) FROM suppliers").unwrap_or(-1);
    let supplier_rows = scalar(conn, "SELECT COUNT(*) FROM suppliers").unwrap_or(-1);
    let categories = if has_column(conn, "suppliers", "supplier_category") {
        println!("supplier_category 在 suppliers 表上");
        scalar(
            conn,
            "SELECT COUNT(DISTINCT supplier_category) FROM suppliers
             WHERE supplier_category IS NOT NULL AND TRIM(supplier_category) != ''",
        )
        .unwrap_or(-1)
    } else {
        println!("suppliers 没有 supplier_category 列，类别在 categories.type='supplier'");
        scalar(
            conn,
            "SELECT COUNT(DISTINCT name) FROM categories
             WHERE type = 'supplier' AND name IS NOT NULL AND TRIM(name) != ''",
        )
        .unwrap_or(-1)
    };
    println!("供应商 suppliers={suppliers} distinct_code={distinct_code} categories={categories}");

    let mut marks = Vec::new();
    if suppliers != 8 {
        failures.push(format!("suppliers={suppliers}，预期 =8"));
        marks.push("FAIL 行数");
    } else {
        marks.push("PASS 行数");
    }
    if distinct_code != supplier_rows {
        failures.push(format!(
            "supplier_code 不唯一：DISTINCT={distinct_code} COUNT={supplier_rows}"
        ));
        marks.push("FAIL 唯一");
    } else {
        marks.push("PASS 唯一");
    }
    if categories < 3 {
        failures.push(format!("supplier_category distinct={categories}，预期 >=3"));
        marks.push("FAIL 类别");
    } else {
        marks.push("PASS 类别");
    }

    let row = report_mut(reports, filename);
    if row.assertion.starts_with("FAIL") {
        return;
    }
    row.stored_rows = suppliers.to_string();
    row.distinct = format!("code={distinct_code} cat={categories}");
    row.aggregated = if suppliers == 8 && distinct_code == supplier_rows {
        "是".into()
    } else {
        "否".into()
    };
    row.assertion = marks.join(" / ");
}

fn assert_products(
    conn: &rusqlite::Connection,
    reports: &mut [FileReport],
    failures: &mut Vec<String>,
) {
    let filename = "商品导出_20260701235503.xlsx";
    let Ok(products) = scalar(conn, "SELECT COUNT(*) FROM products") else {
        failures.push("products 表不可查询".into());
        return;
    };
    let distinct_sku = scalar(conn, "SELECT COUNT(DISTINCT sku) FROM products").unwrap_or(-1);
    let sku_rows = scalar(conn, "SELECT COUNT(*) FROM product_sku").unwrap_or(-1);
    let multi = scalar(
        conn,
        "SELECT COUNT(*) FROM (
            SELECT product_id FROM product_sku
            GROUP BY product_id
            HAVING COUNT(*) > 1
        )",
    )
    .unwrap_or(-1);
    println!("商品 products={products} distinct_sku={distinct_sku} product_sku={sku_rows} multi_sku_products={multi}");

    let mut marks = Vec::new();
    if products != 8 {
        failures.push(format!("products={products}，预期 =8"));
        marks.push("FAIL 行数");
    } else {
        marks.push("PASS 行数");
    }
    if sku_rows != 10 {
        failures.push(format!("product_sku={sku_rows}，预期 =10"));
        marks.push("FAIL SKU行");
    } else {
        marks.push("PASS SKU行");
    }
    if multi < 1 {
        failures.push(format!("multi_sku_products={multi}，预期 >=1"));
        marks.push("FAIL 多SKU");
    } else {
        marks.push("PASS 多SKU");
    }
    if distinct_sku != products {
        failures.push(format!(
            "products.sku 不唯一：DISTINCT={distinct_sku} COUNT={products}"
        ));
        marks.push("FAIL 唯一");
    } else {
        marks.push("PASS 唯一");
    }
    let bridged = scalar(
        conn,
        "SELECT COUNT(*) FROM product_spus WHERE spu_code IN (SELECT sku FROM products)",
    )
    .unwrap_or(-1);
    println!("product_spus 桥接行数={bridged}");
    if bridged != 8 {
        failures.push(format!(
            "product_spus 与 products.sku 重合数={bridged}，预期 =8"
        ));
        marks.push("FAIL SPU桥");
    } else {
        marks.push("PASS SPU桥");
    }
    match bridge_samples(conn) {
        Ok(samples) if !samples.is_empty() && samples.iter().all(|(_, n)| *n > 1) => {
            for (code, n) in &samples {
                println!("多SKU桥接 spu_code={code} product_sku={n}");
            }
            marks.push("PASS 多SKU桥");
        }
        Ok(samples) => {
            failures.push(format!(
                "多 SKU 桥接样本不足或关联失败: {:?}",
                samples
            ));
            marks.push("FAIL 多SKU桥");
        }
        Err(e) => {
            failures.push(format!("多 SKU 桥接查询失败: {e}"));
            marks.push("FAIL 多SKU桥");
        }
    }

    let row = report_mut(reports, filename);
    if row.assertion.starts_with("FAIL") {
        return;
    }
    row.stored_rows = products.to_string();
    row.distinct = distinct_sku.to_string();
    row.aggregated = if multi > 0 { "是".into() } else { "否".into() };
    row.assertion = marks.join(" / ");
}

fn bridge_samples(conn: &rusqlite::Connection) -> Result<Vec<(String, i64)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT spu.spu_code, COUNT(sku.id)
             FROM product_spus spu
             JOIN products p ON p.id = spu.id AND p.sku = spu.spu_code
             JOIN product_sku sku ON sku.product_id = p.id
             GROUP BY spu.spu_code
             HAVING COUNT(sku.id) > 1
             ORDER BY COUNT(sku.id) DESC
             LIMIT 3",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

struct TableCounts {
    customers: i64,
    customer_contacts: i64,
    suppliers: i64,
    products: i64,
    product_sku: i64,
    product_spus: i64,
}

fn table_counts(conn: &rusqlite::Connection) -> TableCounts {
    TableCounts {
        customers: scalar(conn, "SELECT COUNT(*) FROM customers").unwrap_or(-1),
        customer_contacts: scalar(conn, "SELECT COUNT(*) FROM customer_contacts").unwrap_or(-1),
        suppliers: scalar(conn, "SELECT COUNT(*) FROM suppliers").unwrap_or(-1),
        products: scalar(conn, "SELECT COUNT(*) FROM products").unwrap_or(-1),
        product_sku: scalar(conn, "SELECT COUNT(*) FROM product_sku").unwrap_or(-1),
        product_spus: scalar(conn, "SELECT COUNT(*) FROM product_spus").unwrap_or(-1),
    }
}

fn run_legacy(db: &mut Database, filename: &str, target_type: &str, source_format: &str) -> Result<(), String> {
    let bytes = std::fs::read(sample_path(filename)).map_err(|e| format!("{filename} 读取失败: {e}"))?;
    let created = block_on(import_create_batch_inner(
        db,
        target_type,
        filename,
        source_format,
        &bytes,
        None,
        None,
    ))?;
    execute_batch(db, &created.batch_id)
}

/// 同一份客户 / 供应商 / 商品文件连续导入两次，业务表行数必须不变。
#[test]
fn imports_are_idempotent() {
    let _guard = import_lock();
    let dir = std::env::temp_dir().join(format!(
        "proclaw-e2e-import-idem-{}",
        std::process::id()
    ));
    std::fs::create_dir_all(&dir).expect("创建临时目录");
    let db_path = dir.join("e2e.db");
    println!("临时库: {}", db_path.display());

    let mut db = Database::new(db_path).expect("打开临时 SQLite");
    db.initialize().expect("按现有 migration / schema 建表");
    cleanup_seed(db.connection());

    let files = [
        ("客户导出_20260701114803.xls", "customers", "xls"),
        ("供应商导出_20260701112136.xls", "suppliers", "xls"),
        ("商品导出_20260701235503.xlsx", "products", "xlsx"),
    ];
    for (filename, target, format) in files {
        run_legacy(&mut db, filename, target, format)
            .unwrap_or_else(|e| panic!("第一次导入失败 {filename}: {e}"));
    }
    let first = table_counts(db.connection());
    let first_bridged = scalar(
        db.connection(),
        "SELECT COUNT(*) FROM product_spus WHERE spu_code IN (SELECT sku FROM products)",
    )
    .unwrap_or_else(|e| panic!("第一次统计 product_spus 桥接失败: {e}"));
    println!(
        "第一次 customers={} contacts={} suppliers={} products={} product_sku={} product_spus={} bridged={}",
        first.customers,
        first.customer_contacts,
        first.suppliers,
        first.products,
        first.product_sku,
        first.product_spus,
        first_bridged
    );

    let mut second_errors = Vec::new();
    for (filename, target, format) in files {
        if let Err(e) = run_legacy(&mut db, filename, target, format) {
            let msg = format!("{filename}: {e}");
            println!("第二次导入失败 {msg}");
            second_errors.push(msg);
        }
    }
    let second = table_counts(db.connection());
    let second_bridged = scalar(
        db.connection(),
        "SELECT COUNT(*) FROM product_spus WHERE spu_code IN (SELECT sku FROM products)",
    )
    .unwrap_or_else(|e| panic!("第二次统计 product_spus 桥接失败: {e}"));
    println!(
        "第二次 customers={} contacts={} suppliers={} products={} product_sku={} product_spus={} bridged={}",
        second.customers,
        second.customer_contacts,
        second.suppliers,
        second.products,
        second.product_sku,
        second.product_spus,
        second_bridged
    );

    let pairs = [
        ("customers", first.customers, second.customers),
        ("customer_contacts", first.customer_contacts, second.customer_contacts),
        ("suppliers", first.suppliers, second.suppliers),
        ("products", first.products, second.products),
        ("product_sku", first.product_sku, second.product_sku),
        ("product_spus", first.product_spus, second.product_spus),
    ];
    let mut diffs = Vec::new();
    for (name, before, after) in pairs {
        if before != after {
            println!("❌ 重复导入累加：{name} 第一次 {before} 第二次 {after}");
            diffs.push(format!("{name} {before} -> {after}"));
        }
    }
    let mut expected_miss = Vec::new();
    let expect = [
        ("customers", second.customers, 6),
        ("customer_contacts", second.customer_contacts, 7),
        ("suppliers", second.suppliers, 8),
        ("products", second.products, 8),
        ("product_sku", second.product_sku, 10),
        ("product_spus_bridged", second_bridged, 8),
    ];
    for (name, actual, wanted) in expect {
        if actual != wanted {
            expected_miss.push(format!("{name}={actual}，预期 {wanted}"));
        }
    }
    if first_bridged != 8 {
        expected_miss.push(format!("第一次 product_spus_bridged={first_bridged}，预期 8"));
    }
    if diffs.is_empty() && second_errors.is_empty() && expected_miss.is_empty() {
        println!("重复导入幂等：六张表行数不变");
        return;
    }
    panic!(
        "重复导入不是幂等的。累加: [{}]。预期不符: [{}]。第二次错误: [{}]",
        diffs.join(", "),
        expected_miss.join(", "),
        second_errors.join(" | ")
    );
}

fn assert_batches(conn: &rusqlite::Connection, failures: &mut Vec<String>) {
    let count = scalar(conn, "SELECT COUNT(*) FROM import_batches").unwrap_or(-1);
    println!("\nimport_batches COUNT={count}");
    if count != 3 {
        failures.push(format!("import_batches COUNT={count}，预期 3"));
    }

    let mut stmt = match conn.prepare(
        "SELECT target_type, source_filename, row_count, status, processed_rows, success_rows, failed_rows, skipped_rows, notes
         FROM import_batches ORDER BY started_at",
    ) {
        Ok(stmt) => stmt,
        Err(e) => {
            failures.push(format!("读取 import_batches 失败: {e}"));
            return;
        }
    };
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<i64>>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, Option<i64>>(4)?,
            row.get::<_, Option<i64>>(5)?,
            row.get::<_, Option<i64>>(6)?,
            row.get::<_, Option<i64>>(7)?,
            row.get::<_, Option<String>>(8)?,
        ))
    });
    let rows = match rows {
        Ok(rows) => rows,
        Err(e) => {
            failures.push(format!("遍历 import_batches 失败: {e}"));
            return;
        }
    };
    for row in rows {
        let (
            target,
            filename,
            row_count,
            status,
            processed,
            success,
            failed,
            skipped,
            notes,
        ) = match row {
            Ok(row) => row,
            Err(e) => {
                failures.push(format!("读取批次行失败: {e}"));
                continue;
            }
        };
        let total_rows = match row_count {
            Some(n) => n,
            None => {
                failures.push(format!("{filename} 的 stats 解析不出 total_rows（row_count 为空）"));
                -1
            }
        };
        let notes = notes.unwrap_or_default().replace('"', "'");
        println!(
            "stats {target}: {{\"source_filename\":\"{filename}\",\"total_rows\":{total_rows},\"row_count\":{total_rows},\"status\":\"{status}\",\"processed_rows\":{},\"success_rows\":{},\"failed_rows\":{},\"skipped_rows\":{},\"notes\":\"{notes}\"}}",
            processed.unwrap_or(0),
            success.unwrap_or(0),
            failed.unwrap_or(0),
            skipped.unwrap_or(0),
        );
    }
}
