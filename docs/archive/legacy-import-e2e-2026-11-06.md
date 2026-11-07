# 老系统三文件导入验证（2026-11-06）

样例目录：`test-old-date/`。桌面端链路是 Tauri 命令 `import_create_batch_inner` 建批次，`import_execute_legacy_inner` 落库。测试是 `src-tauri/tests/e2e_import.rs`，CI job 是 `rust-import-e2e`。

本地结果：`cargo test --test e2e_import -- --nocapture`，2 passed，201.28s。

| 测试 | 覆盖 |
|---|---|
| `e2e_import_three_files` | 三个文件各导入一次，核对行数、聚合、`product_spus` 桥接 |
| `imports_are_idempotent` | 同一批文件再导入一次，六张表行数不变 |

## 404 根因

`POST /api/import/batch` 和 `/api/import/create_batch` 返回 404，是因为 HTTP 服务没有注册导入路由。导入入口是 Tauri 命令 `import_create_batch`，前端 `createBatch` 走 `ipcInvoke`。无 token 的受保护 HTTP 路由返回 401，根路径 OPTIONS 是 CORS 200，`GET /api/health` 是 200。不要补一个不带认证的 HTTP 导入接口。

## 聚合数字

表头行不计入数据行。客户、商品按编号聚合；供应商一行一个。

| 文件 | 数据行 | 落库 | 聚合 |
|---|---:|---|---|
| `客户导出_20260701114803.xls` | 66 | 62 客户 + 66 联系人 | 4 个客户各 2 个联系人：`CNSHK0001` 张家玮、`CNSTW005` 罗菀诗、`CNSTW027` 林易瑲、`CNSTW077` 吴智动（第二联系人韩琼慧） |
| `供应商导出_20260701112136.xls` | 61 | 61 供应商，9 个供应商类别 | 编号唯一 |
| `商品导出_20260701235503.xlsx` | 22547 | 20288 商品 + 22547 `product_sku` | 2098 个商品有多个 SKU。键是 `*商品编号`，存在 `products.sku`（UNIQUE）。组内第 1 条变体用商品编号，其后是 `{编号}-{序号}`，序号从 2 起 |

`product_spus` 全表 20308 = 20288 条桥接 + 初始化时的 20 条演示 SPU。与 `products.sku` 重合的是 20288。

## 表头 bug

供应商分支曾经从第 0 行开始插。表头 B 列 `*供应商编号` 被当成一条供应商，结果是 62 而不是 61，并多建一个类别「供应商类别」（类别数 10 而不是 9）。

修复：找到 B 列包含「供应商编号」的行，数据从下一行开始；找不到则从 0 开始。客户和商品走的是解析后的聚合组，不扫原始表头行，没有这个问题。

## 幂等修复

覆盖语义：再次导入同一份文件，替换这些编号下的子表，不追加。

主表没有 `ON CONFLICT`。`customers.code`、`suppliers.code`、`products.sku` 都是先查再插；商品命中后更新名称和描述。供应商分支没有业务 DELETE。

原先子表只删当前 `batch_id`。新批次删不到旧行，于是：

- `customer_contacts` 66 变成 132
- `product_sku` 第二次插入撞上 `UNIQUE(sku)`，整段回滚，行数停在 22547

现在执行前按本次文件的业务键删除：

- 联系人：`customers.code` 落在本次客户编号里的行
- `product_sku`：本次变体 `sku`，以及本次商品编号已经对应的 `products` 下的全部变体

新行仍写入当前 `batch_id`。重复导入后：客户 62、联系人 66、供应商 61、商品 20288、`product_sku` 22547、桥接 `product_spus` 20288。

## 桥接方案

云店、SPU 列表和 `v_spu_inventory` 读 `product_spus.spu_code`，并 JOIN 复数表 `product_skus`。老导入写的是 `products.sku` 和单数表 `product_sku`。

已做：商品分支末尾 `INSERT OR IGNORE INTO product_spus`。`id = products.id`，`spu_code = products.sku`，名称空则用 sku。`category_id` / `brand_id` 留空，老类别在 `categories`，不是 `product_categories` / `brands`。范围限定为本批次 `product_sku.batch_id`。

`v_spu_inventory` 的 SKU 数和库存来自 `product_skus`：

```sql
COUNT(sku.id) AS sku_count,
COALESCE(SUM(sku.current_stock), 0) AS total_stock
FROM product_spus spu
LEFT JOIN product_skus sku ON spu.id = sku.spu_id AND sku.deleted_at IS NULL
```

只桥接 `product_spus` 之后，编号能列出来，SKU 数和库存仍是 0。

## 未做（不要丢）

### product_skus 同步，等业务决定

复数表必填是 `id`、`spu_id`、`sku_code`、`specifications`。外键列是 `spu_id`，唯一约束是 `UNIQUE(spu_id, sku_code)`，`sku_code` 没有格式校验。

若要把 22547 条单数 `product_sku` 同步过去：

- `spu_id` 用已经桥好的 `products.id`
- `sku_code` 直接用 `product_sku.sku`（`{编号}` 或 `{编号}-{序号}`）。演示数据的 `SKU-2026-*` 挂在另一批 `spu_id` 上
- `variant_name` 放到 `spec_text`
- `spec` 包成 JSON 再写入 `specifications`，空规格用 `{}`
- `barcode` 列两边都有，老导入没有写入，源是空的
- `batch_id` 在 `product_skus` 上不存在
- 组内第一条（`sku` 等于商品编号）要 `is_default = 1`，否则 `sku_stock` 找不到默认可扣的 SKU
- 导入库存是 0，同步后 SKU 数变为真实变体数，库存合计仍是 0

预估约 35 行，放在现有 `product_spus` 插入之后，用 `INSERT OR IGNORE`。本轮没有改这张表。

### import_rollback_batch 和覆盖语义冲突

撤销仍是 `DELETE FROM customer_contacts / product_sku / categories WHERE batch_id = ?1`，不删客户、供应商、商品主表，也不删 `product_spus`。

覆盖导入会先按业务键删掉旧子行，再插入带新 `batch_id` 的行。因此：

- 撤销上一次导入：子行已经换成新批次号，删不到，等于空操作
- 撤销最新一次导入：删掉当前联系人和 `product_sku`，不会把上一次的子行恢复回来
- `product_spus` 从第一次导入就在，撤销不动它

延后处理，但不能当成「撤销本批次 = 回到导入前」。

### 覆盖语义的界面提示

再次导入同一编号会替换该客户的联系人、该商品下的 SKU，不会在后面追加。主数据行保持原 id。执行前界面上还没有这句话。

## CI

`.github/workflows/ci.yml` 的 `rust-import-e2e` 在 Ubuntu 上执行：

```bash
cargo test --test e2e_import -- --nocapture --test-threads=1
```

超时 45 分钟。样例文件和 `src-tauri/tests/e2e_import.rs` 必须在仓库里，job 才能读到 `test-old-date/`。这两个路径在写这份报告时还没有被 git 跟踪。

## CI fixture 说明

CI 不读 `test-old-date/`。该目录已加入 `.gitignore`。

`scripts/gen_fixture.py` 从原始三个文件抽取脱敏样例，写到 `fixtures/legacy-import/`，文件名和表头结构不变。`e2e_import.rs` 只读这个目录。当前 fixture 的预期是：客户 6 / 联系人 7 / 多联系人 1，供应商 8 / 类别至少 3，商品 8 / `product_sku` 10 / 多 SKU 至少 1，`product_spus` 与 `products.sku` 重合 8。上面的 62 / 66 / 61 / 20288 / 22547 仍是全量文件的实测，不是 CI 断言。
