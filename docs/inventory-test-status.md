# 进销存测试状态交接

记录桌面端进销存核心路径的测试基线。本文只描述已经进 `main` 的覆盖，不改变产品行为。

## 当前基线

| 项 | 值 |
|---|---|
| `main` | `6f7c1e2948537ae14d1c777344761fdc915efa20` |
| `origin/main` | `6f7c1e2948537ae14d1c777344761fdc915efa20` |
| 干净树 | `D:\BigLionX\_proclaw_clean_a18dd19` |
| `cargo test --offline --locked` | 169 passed; 0 failed |
| CI | 七个 job 全绿：[run 42473972469](https://github.com/BiglionX/ProClaw/actions/runs/42473972469) |

169 的构成：lib 146、`e2e_import` 2、`integration_test` 14、`sales_outbound_test` 2、`sales_return_test` 5。`src/main.rs` 与 doc-tests 为 0。

## 已覆盖的进销存路径

| 模块 | 测试文件 | 关键断言 | commit |
|---|---|---|---|
| 采购入库写 `product_skus` | `src-tauri/src/purchase_stock_tests.rs`（`ordered_default_sku_stock_increases_on_purchase_receive`） | 确认收货后，默认 SKU 的 `current_stock` 增加，更早的非默认 SKU 不变 | `e2ef60a`，入口在 `c02c935` 改为 `*_on_conn` |
| 采购退货回减 | 同上（`ordered_default_sku_stock_decreases_on_purchase_return`） | 退货确认后，默认 SKU 库存按退货数量回减 | `e2ef60a` / `c02c935` |
| HTTP 收货 | 同上（`ordered_default_sku_stock_increases_on_http_receive`） | HTTP 收货走同一默认 SKU，库存增加 | `e2ef60a` |
| 销售出库 `shipped_quantity` + 库存扣减 | `src-tauri/tests/sales_outbound_test.rs`（`submit_sets_shipped_quantity_and_deducts_default_sku`） | 出库把 `shipped_quantity` 写成该行数量，并扣默认 SKU | `a18dd19` |
| 库存不足回滚 | 同上（`submit_insufficient_stock_keeps_shipped_quantity_and_stock`） | 默认 SKU 不足且未开负库存时整单回滚，`shipped_quantity` 与库存都不变 | `a18dd19` |
| `sku_stock` 默认优先 | `src-tauri/src/sku_stock.rs`（`default_sku_is_preferred_over_earlier_enabled_sku`） | 更早的非默认 SKU 库存 8、默认 SKU 库存 10，扣 3 后默认行 10→7，非默认行仍为 8 | `62e9a4c` |
| `sku_stock` 回退 | 同上（`falls_back_to_earliest_enabled_sku_when_none_is_default`） | 只有一条 `is_default = 0` 的启用 SKU，库存 8，扣 1 返回 `Ok`，库存变为 7 | `62e9a4c` |
| `sku_stock` 零启用 | 同上（`no_enabled_sku_returns_no_sku_and_leaves_rows_unchanged`） | 停用或已删除的 SKU 不被选中；`deduct` 返回 `NoSku`（「没有启用的默认 SKU」），库存不变 | `62e9a4c` |
| `sku_stock` 库存不足 | 同上（`deduct_more_than_stock_errors_and_leaves_rows_unchanged`） | 默认 SKU 库存 2、扣 5，返回 `Insufficient { current: 2, required: 5 }`，默认行仍为 2，另一条 SKU 不变 | `62e9a4c` |
| `sku_stock` 带符号增量 | 同上（`apply_signed_delta_updates_current_stock`） | 10 加 6 得 16，再减 4 得 12；`v_spu_inventory.total_stock` 也是 12 | `62e9a4c` |
| `apply_p0_06` 迁移约束与幂等 | `src-tauri/src/database.rs`（`apply_p0_06_corrects_legacy_rows_enforces_checks_and_is_idempotent`） | 非正数量改为 1、负单价改为 0、数量为 0 的库存流水删除、库存低于 `-999999` 被钳制；迁移后负数量/负单价插入被 CHECK 拒绝；连续调用两次结果一致 | `6f7c1e2` |

## 设计语义

`find_default_sku_id` 在该商品启用且未删除的 SKU 中，按 `is_default DESC, created_at ASC` 取第一行：优先 `is_default = 1`，否则回退到最早创建的启用 SKU。这是第 2 批的设计语义，不是 bug。`NoSku` 只在没有任何启用且未删除的 SKU 时返回。

如果未来要改成「无默认 SKU 就拒绝出库」，需要单独的产品决策，并处理已经依赖回退语义的历史数据，不能当成测试缺口顺手改。

## 剩余缺口

以下不在本轮范围：

- `src-tauri/src/api/inventory.rs`
- `validate_*_str`
- 前端 e2e 是否纳入桌面端测试

## 复现

在 `src-tauri` 下执行：

```text
cargo test --offline --locked
```

对应的干净 worktree 是 `D:\BigLionX\_proclaw_clean_a18dd19`。主工作区有未提交改动，不要在主工作区用这份命令代替干净树结果。
