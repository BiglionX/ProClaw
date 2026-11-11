# 桌面端功能完成度 backlog

只读扫描干净 worktree `82e769c`（tree 与 `origin/main` `2fa9d14` 相同）。本文件写在主工作区，本轮不提交。没有改产品代码，没有写测试。

扫描范围：`src-tauri/src/*_commands.rs`、`src-tauri/src/api/*.rs`、`lib.rs`、`invoke_handler.rs`，以及 `src/lib/*Service.ts`、`src/pages`、`src/lib/hooks` 里能对上的 `invoke`。用 grep 分类，没有逐行通读每个命令。

默认 feature 是 `custom-protocol` + `inventory`（`src-tauri/Cargo.toml` 约 131 行）。`virtual_company` 不在默认构建里。

CI（`.github/workflows/ci.yml` 约 88–97 行）跑：

- `cargo test --test e2e_import`
- `cargo test --locked --lib`（因此下面标了 `#[cfg(test)]` 且编进默认 lib 的测试会进 CI）
- `cargo test --locked --test integration_test --test sales_outbound_test --test sales_return_test`

## 已有真实 SQLite 测试且进 CI

| 模块 | 主要命令/文件 | 是否注册 | 前端是否调用 | 现有测试 | 完成度判断 | 阻塞项/风险 | 证据 |
|---|---|---|---|---|---|---|---|
| 采购入库/退货库存 | `receive_purchase_order_cmd`、`confirm_purchase_return` | 是，inventory | 是，`purchaseService.ts`、`purchaseReturnService.ts` | 内存库断言 SKU/商品库存。`purchase_return_commands.rs` 把 `purchase_stock_tests.rs` 编进 lib | 入库/退货确认有真实库测试。采购单 CRUD 其余命令没有同等覆盖 | 主工作区 `purchase_commands.rs` 是冻结 WIP，补测试不要碰那份工作区文件 | `purchase_stock_tests.rs:16`、`purchase_return_commands.rs:445`、`invoke_handler.rs:272`、`purchaseService.ts:177` |
| 销售出库 | `submit_sales_order_on_conn` | 是 | 是，`salesService.ts` | `sales_outbound_test.rs` 用 `Database::new_in_memory` | 提交出库有集成测试 | `get_sales_order_detail` 未注册，见下文 | `tests/sales_outbound_test.rs:8`、`salesService.ts:168` |
| 销售退货 | `confirm_sales_return` 等 | 是 | 是，`salesReturnService.ts` | `sales_return_test.rs` 内存库 | 退货确认有集成测试 | 退货单更新类命令未逐条核对 | `tests/sales_return_test.rs:9`、`salesReturnService.ts:94` |
| 库存流水 | `create_inventory_transaction` 等 | 是 | 是，`inventoryService.ts` | `inventory_commands.rs` 内存库：入库、出库、库存不足回滚 | 流水写入有真实库测试 | 未覆盖全部查询分支 | `inventory_commands.rs:309`、`inventoryService.ts:52`、`invoke_handler.rs:97` |
| 库存校准/老化 | `calibrate_stock`、`check_negative_aging` 等 | 是 | 是，`inventoryCalibrationService.ts` | 两个命令文件都有 `Database::new_in_memory` | 核心路径有 lib 测试 | 前端调用面比测试面宽 | `inventory_calibration_commands.rs:623`、`inventory_aging_commands.rs:514`、`inventoryCalibrationService.ts:119` |
| 销售 HTTP 扣库存 | `api/sales_orders.rs` | HTTP 已挂路由 | 桌面走 Tauri 命令，不走这条 HTTP | `#[cfg(test)]` 内存库 | HTTP 扣库存有测试 | 与 Tauri `submit_sales_order_cmd` 是两条路径 | `api/sales_orders.rs:759`、`api/mod.rs:132` |
| 导入 | `import_*` | 是 | 导入中心页面 | lib 内多组测试 + CI `e2e_import` | 导入是当前 CI 最完整的一块 | 不在本轮改动范围 | `ci.yml:88`、`import/executor.rs:905` |

`sku_stock.rs`、`database.rs`、`commands/mod.rs` 也有会进 `cargo test --lib` 的测试。`api/finance.rs:223` 的 `test_get_profit_loss_report` 只是 `assert!(true)`，不算真实覆盖。

## 可独立测试但零 Rust 测试

这些命令已注册，前端有真实 `invoke`，命令文件里没有 `#[cfg(test)]`。本轮没有逐行审外键。补测试前要先做一次 approvals 那种空串外键抽查。

| 模块 | 主要命令/文件 | 是否注册 | 前端是否调用 | 现有测试 | 完成度判断 | 阻塞项/风险 | 证据 |
|---|---|---|---|---|---|---|---|
| 对账 | `generate_statement`、规则与 SMTP | 是 | 是，`reconciliationService.ts`；`useFinance.ts` 也读规则 | 无 Rust 测试。前端若有测试也只是 service mock 级别 | 可独立测 | 发信依赖 SMTP，单测应把生成对账单和发信拆开 | `invoke_handler.rs:249`、`reconciliationService.ts:39`、`useFinance.ts:19` |
| 用户 | `create_user_cmd`、`get_users_cmd` 等 | 是 | 是，`userManagementService.ts`；`UserCenterPage.tsx` 改资料和密码 | 无 | 可独立测 | `users` 是多处外键父表，先抽查写入列再写测试 | `invoke_handler.rs:221`、`userManagementService.ts:148`、`UserCenterPage.tsx:164` |
| 订阅/Token | `subscribe_plan_cmd` 等 | 是 | 是，`subscriptionService.ts`、`userCenterService.ts` | 无 | 可独立测 | 套餐表有 `user_id REFERENCES users(id)` | `invoke_handler.rs:314`、`subscriptionService.ts:117` |
| 消息/联系人 | `send_message`、`get_contacts` 等 | 是 | 是，`contactService.ts` | 无 Rust 命令测试 | 可独立测 | 未审消息表外键 | `invoke_handler.rs:327`、`contactService.ts:598` |
| 团队 | `create_team` 等 | 是 | 是，`TeamsPage.tsx`、`demoBootstrap.ts` | 无 | 可独立测 | 无 | `invoke_handler.rs:214`、`TeamsPage.tsx:217` |
| 云店 | `get_cloud_store`、优惠券、订单 | 是 | 是，`cloudStoreService.ts`。优惠券调用在 `StoreCoupons.tsx` 里是注释 | 前端 `cloudStoreService.test.ts` 是 mock | 主路径可测；优惠券 UI 未接上 | 文件很大，一次只测店铺读写 | `invoke_handler.rs:348`、`cloudStoreService.ts:354`、`StoreCoupons.tsx:114` |
| 财务报表命令 | `get_profit_loss_report`、`get_cash_flow_report`、`get_financial_summary` | 是 | 是，`financeService.ts`、`useFinance.ts` | 命令文件无测试。HTTP 侧测试是空断言 | 已提交版本可对命令本身写库测试 | 主工作区 WIP 把这三条改成调用未跟踪的 `finance_ledger`。干净树上不要按 WIP 来测 | `invoke_handler.rs:163`、`financeService.ts:51`、`api/finance.rs:226` |
| 采购/销售其余 CRUD | 创建、列表、确认、取消、发货 | 是 | 是，两个 Service | 只有入库、出库、退货确认有库测试 | 其余命令零测试 | `get_sales_order_detail` 未注册，见下 | `salesService.ts:137`、`purchaseService.ts:146` |
| 行业包 | 餐饮/美业/宠物/便利/酒水/手机配件/生鲜/汽配/五金/装修/团购 | 是，无 feature 门控 | 页面有调用，例如 `PosPage.tsx` 餐饮、`BoardingPage.tsx` 宠物。其余名字在 `commandValidator.ts` | 无 Rust 测试 | 可独立测，优先级低于进销存主路径 | 页面里有演示假数据，先确认哪条是真 invoke | `invoke_handler.rs:518`、`PosPage.tsx:327`、`BoardingPage.tsx:148` |
| 通话/邀请/托盘/备份/秘书 BAP/品牌分类 | 各自 `*_commands.rs` | 是 | 有对应 service 或页面 | 无命令级 Rust 测试。`setup_commands.rs:370` 有测试，但是安装向导，不是这些业务 | 可后补 | 无已知外键事故 | `callService.ts:71`、`cloudBackupService.ts:42`、`secretaryBap.ts:23`、`trayService.ts:49` |

## 半成品 / 已知 bug

| 模块 | 主要命令/文件 | 是否注册 | 前端是否调用 | 现有测试 | 完成度判断 | 阻塞项/风险 | 证据 |
|---|---|---|---|---|---|---|---|
| 付款汇总 | `get_ar_ap_summary_cmd` | 是 | 是，财务页两个页签 | 只有 mock | 半成品 | 列下标 bug。详见 `docs/payment-known-issue.md`。写入路径没有 approvals 那种空串外键 | `payment_commands.rs:269`、`FinancePage.tsx:73` |
| 审批 | `create_approval_cmd`、HTTP `api/approvals.rs` | Tauri 与 HTTP 都注册 | 桌面 `src/` 没有 service 调用，只有 `commandValidator.ts` 白名单。HTTP 路由是活的 | 测试封存在 `D:\BigLionX\_proclaw_approvals_hold\`，未提交 | 半成品 | `requested_by`/`approved_by` 写 `''`。详见 `docs/approvals-known-issue.md`。等主工作区 user id WIP | `invoke_handler.rs:232`、`api/mod.rs:266`、`approval_commands.rs:10` |
| 销售订单详情 | `get_sales_order_detail` | 否。`invoke_handler.rs` 没有这个名字 | 是，`salesService.ts` | 无 | 新发现的注册缺口，本轮不修 | 详情 invoke 在默认桌面里对不上命令 | `sales_commands.rs:266`、`salesService.ts:159` |
| 财务 HTTP 测试 | `api/finance.rs` | 路由已挂 | 桌面走 Tauri | `assert!(true)` | 测试是空的，不能当覆盖 | 不要把这个测试算进 CI 绿 | `api/finance.rs:223`、`api/mod.rs:171` |

`virtual_company` 门控的 Agent 市场、财务 Agent、`agent_commands` 在默认二进制里不注册（`invoke_handler.rs` 约 378 行起有 `cfg`）。`financeAgentService.ts`、`agentManagerStore.ts` 仍会 invoke。默认 CI 也不会编译这些模块里的测试。这是 feature 缺口，不是未跟踪文件。本轮不改 feature。

## 依赖未跟踪模块（不纳入本轮）

干净树 `lib.rs:2` 的注释写明这些模块还没进 git。`git ls-files` 在干净树里找不到它们。主工作区状态是未跟踪：

| 文件 | 主工作区 | 干净树 | 说明 |
|---|---|---|---|
| `src-tauri/src/finance_ledger.rs` | `??` | 无 | payment WIP 测试、以及主工作区里的 finance/sales/purchase/approval 改动引用它。已提交的 payment/finance 命令不引用它 |
| `src-tauri/src/hermes_commands.rs` | `??` | 无 | 主工作区 `lib.rs` / `invoke_handler.rs` WIP 才挂上 |
| `src-tauri/src/password_storage_commands.rs` | `??` | 无 | 同上 |

`sku_stock` 已经在干净树 `lib.rs` 里 `pub mod`，注释里把它和上面三个写在一起，注释过时。不要为了改注释去动代码。

## 疑似死代码 / 未接线

| 项 | 判断 | 证据 |
|---|---|---|
| `schema.sql` 的 `payments` 表 | 有 `created_by REFERENCES users(id)`，没有插入语句。活表是 `payment_transactions` | `src/db/schema.sql:609`、`database.rs:589` |
| 云店优惠券 invoke | 创建/删除/改状态在页面里被注释 | `StoreCoupons.tsx:114` |
| 审批桌面命令 | 已注册，桌面 service 没有调用方。HTTP 仍在用，不是整模块死代码 | `commandValidator.ts:91`、`api/mod.rs:266` |
| `get_sales_order_detail` | 命令写了，handler 没登记，前端在调。是断线，不是死代码 | `sales_commands.rs:266`、`salesService.ts:159` |

## 建议优先级（只建议，本轮不执行）

1. **付款汇总 bug，适合作为下一个独立修复轮次。** 它在已提交的 `get_ar_ap_summary_cmd` 里，复现不需要 `finance_ledger`。前置条件：不要在主工作区那份 +214/−35 的 `payment_commands.rs` 上改。先决定这份 WIP 是落地还是先搁在一边。然后在干净树上先写一条会失败的内存库回归（有订单时汇总非空，且 `total_amount`/`paid_amount` 对得上第 7、第 8 列），再只改列下标。不要把 `finance_ledger.rs` 带进这一轮。
2. **审批。** 等主工作区真实 user id WIP 落地，再把 `D:\BigLionX\_proclaw_approvals_hold\` 的测试拿回来重跑。在那之前不要提交封存的测试。
3. **`get_sales_order_detail` 注册缺口。** 小，但是前端已经在调。单独一轮，先读完函数体再决定是补注册还是改前端命令名。本轮只记录。
4. **对账、用户、订阅。** 前端在用、零 Rust 测试。补测试前各做一次外键抽查，避免再踩 approvals 的空串问题。
5. **行业包。** 已注册且有页面，零 Rust 测试。排在进销存主路径之后。
6. **`finance_ledger` / `hermes_commands` / `password_storage_commands`。** 不纳入，直到它们自己的提交轮次。
