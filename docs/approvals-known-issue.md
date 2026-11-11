# 审批创建/通过违反 users 外键

本文件只记录已知问题，本轮不提交。

## 现象

`create_approval_cmd`（`src-tauri/src/approval_commands.rs`）和 `src-tauri/src/api/approvals.rs` 的 INSERT 把 `requested_by` 写成 `''`。approve / reject 把 `approved_by` 写成 `''`。

`approvals.requested_by` 和 `approvals.approved_by` 都是 `REFERENCES users(id)`。生产库打开 `PRAGMA foreign_keys=1`，空串对不上任何用户，审批创建返回 500。

## 历史

- `1450e14`（2026-05-24）引入时就已经写 `''`。桌面命令：`INSERT ... requested_by ... VALUES (..., '', 'pending', ...)`；通过/拒绝：`approved_by = ''`。HTTP API 同样是 `approved_by = ''`。
- `69cdae7`（2026-06-07）在 `database.rs` 打开 `PRAGMA foreign_keys=ON`。在此之前空串能写进去；打开外键之后变成约束失败。不是后来的回归。

## 当前状态

主工作区有未提交 WIP，正在给 create / approve / reject 加真实 `user_id`，并在通过时调用 `apply_approval_side_effects`。

审批测试已从干净 worktree 撤出，等 WIP 落地后再重跑。暂存目录：

- `D:\BigLionX\_proclaw_approvals_hold\approval_commands.rs`（含 `*_on_conn` 拆分的工作副本）
- `D:\BigLionX\_proclaw_approvals_hold\approval_commands_tests.rs`（未跟踪测试文件）
- `D:\BigLionX\_proclaw_approvals_hold\approvals-tests-wip.patch`（`approval_commands.rs` 相对 HEAD 的 diff）

上一轮在带测试、不带 WIP 修复的树上：`cargo test --offline --locked approval` 为 10 failed / 7 passed。失败原因就是 `requested_by = ''` 违反 `users(id)`。在没有这份 WIP、也没有上述测试文件的树上无法复现这组失败。

## 复现

WIP 落地并合入测试文件之后，在 `src-tauri` 执行：

```text
cargo test --offline --locked approval
```

测试文件路径：`src-tauri/src/approval_commands_tests.rs`（目前只在 `D:\BigLionX\_proclaw_approvals_hold\`）。
