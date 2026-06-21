# 应付/应收台账与对账管理需求文档 (PRD)

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../../RELEASE_NOTES_v1.0.0.md) §"双模式架构 - 财务：损益报表/现金流/应收应付对账" |
| **覆盖率** | ~85%（财务对账/台账核心模块已上线；跨期对账与自动核销部分简化为手动） |
| **代码入口** | `src/pages/FinancePage.tsx`（1569 行）、`src/pages/ProfitLossPage.tsx`、`src/pages/CashFlowPage.tsx`、`src-tauri/src/finance_commands.rs`、`src-tauri/src/services/subscription_service.rs` |
| **数据库依赖** | `database/complete_schema.sql`（accounts/financial_transactions/sales_orders/purchase_orders） |
| **测试覆盖** | `e2e/finance.spec.ts` |
| **差异与遗留** | 应付/应收台账与对账主流程已落地；自动化核销与跨期冲账待 v1.x |
| **后续动作** | 维持现状；按需补齐自动化核销 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，财务对账模块上线 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

> 文档状态：草稿 | 优先级：P1~P2 | 版本：v1.0 | 日期：2026-06-05

---

## 一、现状分析

### 1.1 已有能力

| 功能 | 状态 | 说明 |
|------|------|------|
| AR 计算 | ✅ | `SUM(sales_orders.total_amount - paid_amount)` 自动计算 |
| AP 计算 | ✅ | `SUM(purchase_orders.total_amount - paid_amount)` 自动计算 |
| 财务概览页面 | ✅ | FinancePage 展示 AR/AP 汇总数字 |
| 供应商/客户邮箱 | ✅ | suppliers.email / customers.email 字段已存在 |
| 系统通知基础设施 | ✅ | WebSocket 通知通道已存在 |
| 定时调度模式 | ✅ | cloud_backup 已有 schedule 配置模式可复用 |

### 1.2 核心缺失

| 缺失环节 | 影响 |
|----------|------|
| **无付款/收款录入** | paid_amount 始终为 0，AR/AP 计算无实际意义 |
| **无付款台账** | 无法追溯每笔付款的时间、方式、经手人 |
| **无对账单生成** | 无法向客户/供应商出具正式对账文件 |
| **无自动提醒** | 无人值守时超期账款无预警 |
| **无导出/发送** | 无法将对账单以 PDF 发送给联系人 |
| **退货不调整账务** | 退货确认后应收/应付余额未更新 |

---

## 二、改造目标

构建完整的"付款/收款记录 → 台账汇总 → 对账单生成 → 自动提醒 → 发送/下载"闭环，将财务对账模块完善度从 **10% 提升至 90%**。

---

## 三、用户故事

| 编号 | 用户 | 需求 | 目的 |
|------|------|------|------|
| US-01 | 财务 | 我能对采购订单录入付款（金额/日期/方式/备注），系统自动更新应付余额 | 记录实际付款 |
| US-02 | 财务 | 我能对销售订单录入收款，系统自动更新应收余额 | 记录实际收款 |
| US-03 | 财务 | 我能查看每个供应商/客户的应收应付汇总及未清项明细 | 掌握账款全貌 |
| US-04 | 财务 | 我能按三种格式（交易明细/余额/未清项）生成对账单 | 灵活对账 |
| US-05 | 财务 | 我能将对账单以 PDF 下载到本地 | 线下归档 |
| US-06 | 财务 | 我能将对账单以 PDF 发送到客户/供应商的联系邮箱 | 线上发送 |
| US-07 | 财务 | 我能设置自动对账提醒：指定日期/周期/额度阈值触发 | 无人值守监控 |
| US-08 | 财务 | 退货确认后系统自动生成退款记录并调整 AR/AP | 账务自动闭环 |
| US-09 | 财务 | 系统在触发提醒时发送系统内通知和/或邮件通知 | 及时预警 |

---

## 四、功能需求详述

### 4.1 P1 — 付款/收款记录

#### 4.1.1 采购订单付款录入

**入口**：采购订单详情对话框 → 「记录付款」按钮（所有非取消状态订单均可）

**付款对话框**：
- 付款金额（默认订单未付金额，可修改为部分付款）
- 付款日期（默认当天）
- 付款方式（下拉选择：银行转账/现金/支票/支付宝/微信/其他）
- 凭证号（可选，如银行流水号）
- 备注（可选）

**逻辑**：
- 记录到 `payment_transactions` 表，`order_type='purchase'`
- 更新 `purchase_orders.paid_amount` + `payment_status`
  - paid_amount >= total_amount → `paid`
  - paid_amount > 0 → `partial`
  - 否则 → `unpaid`

#### 4.1.2 销售订单收款录入

**入口**：销售订单详情对话框 → 「记录收款」按钮

**收款对话框**：与付款表单相同

**逻辑**：
- 记录到 `payment_transactions` 表，`order_type='sales'`
- 更新 `sales_orders.paid_amount` + `payment_status`
  - 同上

#### 4.1.3 付款历史查看

在订单详情对话框中新增「付款记录」区域或子表格，展示该订单的所有交易流水。

### 4.2 P1 — 应付/应收台账汇总

#### 4.2.1 供应商应付汇总

**位置**：财务页面新增 Tab「应付台账」或供应链页面

**表格维度**：按供应商分组

| 列 | 说明 |
|---|------|
| 供应商 | 名称 + 编码 |
| 采购总额 | 所有未取消订单金额合计 |
| 已付金额 | 已记录付款合计 |
| 未付余额 | 采购总额 - 已付金额 |
| 逾期天数 | 超出信用期的天数（基于付款条件和订单日期） |
| 订单数 | 未结清订单数量 |

点击展开 → 该供应商的所有未清采购订单明细

#### 4.2.2 客户应收汇总

与应付类似，按客户分组，维度包括销售总额、已收金额、未收余额、逾期天数等。

### 4.3 P2 — 对账单生成

#### 4.3.1 对账单首页

**位置**：财务页面新增「对账单」Tab

**功能**：
1. **选择对象**：单选某个供应商或客户，或批量选择
2. **选择期间**：日期范围选择器
3. **选择格式**：三种对账单类型
4. **预览/生成**：点击生成对账单

#### 4.3.2 三种对账单格式

| 类型 | 内容 | 适用场景 |
|------|------|---------|
| **A 交易明细对账单** | 期间内所有交易流水（订单/付款/退货）逐笔列出，含日期、单据号、摘要、借方/贷方金额、余额 | 全面对账 |
| **B 余额对账单** | 期初余额 + 本期发生额(借/贷) + 期末余额 | 快速对账 |
| **C 未清项对账单** | 仅列出截至对账日尚未结清的订单/退货单 | 催款/催付 |

#### 4.3.3 对账单 PDF

- 使用 Rust `printpdf` 库生成 PDF
- 页面包含：抬头（公司名称+Logo）、对账单标题、期间、对方信息、明细表格、合计、制单人、日期
- 暂不使用模板引擎，直接代码构建 PDF 布局

### 4.4 P2 — 对账单发送/下载

#### 4.4.1 PDF 下载

调用 Tauri save dialog 选择保存路径，将 PDF 写入本地文件。

#### 4.4.2 PDF 邮件发送

- 使用 Rust `lettre` crate 发送 SMTP 邮件
- 设置中配置 SMTP 服务器（发件人邮箱、SMTP 地址、端口、账号密码）
- 发送时取 `suppliers.email` 或 `customers.email` 作为收件人
- PDF 作为附件

#### 4.4.3 系统内通知

通过现有 WebSocket 通知通道发送对账单生成完成通知，用户可点击查看。

#### 4.4.4 联系人管理增强

- 确保供应商/客户信息中联系方式完整
- 支持设置默认收件人（可多个）

### 4.5 P2 — 自动对账提醒

#### 4.5.1 提醒规则配置

**入口**：财务页面 →「提醒设置」

**规则字段**：
| 字段 | 说明 |
|------|------|
| 名称 | 规则名称（如"月度客户催款"） |
| 对象范围 | 全部/指定供应商/指定客户 |
| 触发条件 | 按日期（每月X日）/按周期（每N天）/按额度（未付余额 > X元） |
| 对账单格式 | 选择三种格式之一 |
| 操作 | 发送系统通知 / 发送邮件 / 两者 |
| 收件人 | 跟随对象联系邮箱 / 指定额外邮箱 |
| 启用状态 | 开启/关闭 |

**示例规则**：
- 每月1日自动生成上月所有客户的未清项对账单，邮件发送
- 每周一检查所有供应商应付余额，若超过 50000 则发送系统通知
- 某客户未付余额超过 100000 时立即触发催款邮件

#### 4.5.2 提醒执行

Tauri 后台定时任务（Rust side）：
1. 每 5 分钟扫描一次 `reconciliation_rules` 表
2. 匹配当前时间满足触发条件的规则
3. 执行对账单生成 + 发送/通知
4. 记录执行日志

### 4.6 P1 — 退货自动调整 AR/AP

#### 4.6.1 采购退货确认时

- 确认采购退货时，自动在 `payment_transactions` 中插入一条退款记录
- `order_type='purchase_return'`, `transaction_type='refund'`
- 更新 `purchase_returns.refund_amount`

#### 4.6.2 销售退货确认时

- 确认销售退货时，自动在 `payment_transactions` 中插入一条退款记录
- `order_type='sales_return'`, `transaction_type='refund'`
- 更新 `sales_returns.refund_amount`

---

## 五、数据库设计

### 5.1 付款交易表 (新增)

```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    order_type TEXT NOT NULL CHECK(order_type IN ('purchase', 'sales', 'purchase_return', 'sales_return')),
    order_id TEXT NOT NULL,               -- 关联的订单/退货单 ID
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('payment', 'receipt', 'refund')),
    amount REAL NOT NULL,                 -- 交易金额（正数）
    transaction_date DATE NOT NULL,
    payment_method TEXT,                  -- bank_transfer / cash / check / alipay / wechat / other
    voucher_no TEXT,                      -- 凭证号（如银行流水号）
    notes TEXT,
    created_by TEXT,
    counterparty_id TEXT,                 -- 对方 ID（supplier_id 或 customer_id）
    counterparty_name TEXT,               -- 对方名称（冗余，方便查询）
    counterparty_type TEXT,               -- 'supplier' / 'customer'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### 5.2 对账规则表 (新增)

```sql
CREATE TABLE IF NOT EXISTS reconciliation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                   -- 规则名称
    enabled INTEGER DEFAULT 1,           -- 是否启用
    scope_type TEXT,                      -- 'all' / 'supplier' / 'customer'
    scope_ids TEXT,                       -- 逗号分隔的 ID 列表（scope_type 不为 all 时）
    trigger_type TEXT NOT NULL,           -- 'date' / 'period' / 'amount'
    trigger_config TEXT NOT NULL,         -- JSON: {"day": 1} / {"interval_days": 7} / {"min_amount": 100000}
    statement_format TEXT NOT NULL,       -- 'detail' / 'balance' / 'open_items'
    action_type TEXT NOT NULL,            -- 'notification' / 'email' / 'both'
    extra_emails TEXT,                    -- 额外收件邮箱（逗号分隔）
    last_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 对账单日志表 (新增)

```sql
CREATE TABLE IF NOT EXISTS reconciliation_logs (
    id TEXT PRIMARY KEY,
    rule_id TEXT REFERENCES reconciliation_rules(id),
    counterparty_type TEXT,
    counterparty_id TEXT,
    counterparty_name TEXT,
    statement_format TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_via TEXT,                        -- 'download' / 'email' / 'notification'
    sent_to TEXT,                         -- 收件地址/路径
    status TEXT DEFAULT 'success',        -- 'success' / 'failed'
    error_message TEXT
);
```

### 5.4 系统配置扩展

在 `system_config` 中添加 SMTP 配置：
| key | value |
|-----|-------|
| `smtp_host` | SMTP 服务器地址 |
| `smtp_port` | 端口 |
| `smtp_username` | 用户名 |
| `smtp_password` | 密码（加密存储） |
| `smtp_from_email` | 发件人邮箱 |
| `smtp_from_name` | 发件人名称 |
| `company_name` | 公司名称（对账单抬头） |

---

## 六、后端 API 设计

### 6.1 Rust Tauri 命令

| 命令 | 功能 | 优先级 |
|------|------|--------|
| `record_purchase_payment` | 记录采购付款 + 更新订单 paid_amount | P1 |
| `record_sales_receipt` | 记录销售收款 + 更新订单 paid_amount | P1 |
| `get_payment_history` | 获取指定订单的付款历史 | P1 |
| `get_ar_ap_summary` | 获取 AR/AP 汇总（按客户/供应商维度） | P1 |
| `get_ar_ap_detail` | 获取某个供应商/客户的未清项明细 | P1 |
| `generate_statement` | 生成对账单 PDF 返回文件路径 | P2 |
| `send_statement_email` | 将对账单 PDF 邮件发送给联系人 | P2 |
| `create_reconciliation_rule` | 创建对账提醒规则 | P2 |
| `update_reconciliation_rule` | 修改规则 | P2 |
| `delete_reconciliation_rule` | 删除规则 | P2 |
| `get_reconciliation_rules` | 获取规则列表 | P2 |
| `set_smtp_config` | 设置 SMTP 邮件配置 | P2 |
| `get_smtp_config` | 获取 SMTP 配置（密码脱敏） | P2 |
| `check_reconciliation_rules` | 手动触发规则检查 | P2 |

### 6.2 新增 Rust 文件

| 文件 | 内容 |
|------|------|
| `src-tauri/src/payment_commands.rs` | 付款/收款记录命令 |
| `src-tauri/src/reconciliation_commands.rs` | 对账单生成/发送/提醒规则命令 |

### 6.3 新增 TypeScript 服务文件

| 文件 | 内容 |
|------|------|
| `src/lib/paymentService.ts` | 付款/收款 API 封装 |
| `src/lib/reconciliationService.ts` | 对账单 API 封装 |

### 6.4 新增 Rust 依赖 (Cargo.toml)

```toml
printpdf = "0.7"      # PDF 生成
lettre = "0.11"       # SMTP 邮件发送
```

---

## 七、前端 UI 设计

### 7.1 财务页面改造

#### 7.1.1 新增 Tab 结构

```
财务页面
├── 财务概览 (已有)        ← 原内容
├── 应付台账 (新增)        ← 供应商维度 AP 汇总
├── 应收台账 (新增)        ← 客户维度 AR 汇总
├── 对账单 (新增)          ← 生成/下载/发送对账单
└── 提醒设置 (新增)        ← 自动对账提醒规则管理
```

#### 7.1.2 订单详情对话框

**采购订单详情** 新增元素：
- 底部操作栏增加「记录付款」按钮（非取消/已付状态显示）
- 明细表格下方增加「付款记录」子表格

**销售订单详情** 新增元素：
- 底部操作栏增加「记录收款」按钮
- 明细表格下方增加「收款记录」子表格

#### 7.1.3 付款/收款对话框

简单模态对话框：
- 金额（自动填入未付金额，可编辑）
- 日期（DatePicker）
- 付款方式（Select）
- 凭证号（TextField）
- 备注（TextField）
- 确认/取消按钮

#### 7.1.4 对账单页面

```
┌─────────────────────────────────────────┐
│ 对象选择: [全部供应商 ▼] [全部客户 ▼]   │
│ 期间: [2026-01-01] ~ [2026-06-05]      │
│ 格式: ○ 交易明细  ○ 余额  ○ 未清项    │
│ 操作: [生成预览] [下载PDF] [发送邮件]   │
├─────────────────────────────────────────┤
│                                         │
│          对账单预览区域                    │
│                                         │
└─────────────────────────────────────────┘
```

#### 7.1.5 提醒设置页面

规则列表（Card 布局）+ 新增/编辑对话框

```
┌──────────────────────────────────────┐
│ 规则名称: 月度客户催款                │
│ 对象: 全部客户                        │
│ 触发: 每月 1 日                       │
│ 格式: 未清项对账单                     │
│ 动作: 邮件发送                        │
│ ────────                               │
│ [编辑] [删除] [立即执行] [⚡启用]     │
└──────────────────────────────────────┘
```

---

## 八、实施计划

| 阶段 | 任务 | 预估工期 | 依赖 |
|------|------|---------|------|
| **Phase 1** | 数据库迁移（payment_transactions + 规则表） | 0.5天 | 无 |
| **Phase 2** | Rust: payment_commands.rs（付款/收款/台账） | 1天 | Phase 1 |
| **Phase 3** | Rust: 退货自动调整 AR/AP | 0.5天 | Phase 2 |
| **Phase 4** | TS 服务层 + UI: 付款/收款对话框 + 台账页面 | 1.5天 | Phase 2 |
| **Phase 5** | Rust: reconciliation_commands.rs（PDF+邮件+规则） | 1.5天 | Phase 1 |
| **Phase 6** | TS 服务层 + UI: 对账单页面 + 提醒设置页面 | 1天 | Phase 5 |

---

## 九、验收标准

- [ ] 采购订单可录入付款，金额正确更新 paid_amount 和 payment_status
- [ ] 销售订单可录入收款，金额正确更新 paid_amount 和 payment_status
- [ ] 订单详情可查看付款/收款历史流水
- [ ] 应付台账按供应商展示未付余额，支持展开未清项明细
- [ ] 应收台账按客户展示未收余额，支持展开未清项明细
- [ ] 可生成交易明细/余额/未清项三种格式对账单
- [ ] 对账单可预览、下载 PDF
- [ ] 对账单可发送邮件至联系人邮箱
- [ ] 可创建/编辑/删除自动对账提醒规则
- [ ] 规则支持日期触发、周期触发、额度触发
- [ ] 触发时可发送系统通知和/或邮件
- [ ] 确认采购退货后自动记录退款到 payment_transactions
- [ ] 确认销售退货后自动记录退款到 payment_transactions
- [ ] SMTP 配置可设置和测试
- [ ] 所有操作有 loading 状态和反馈提示
