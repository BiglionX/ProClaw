# ProClaw 数据库架构

## 📊 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    ProClaw Database Schema                   │
│                     Version 2.0.0                            │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┐     ┌──────────────────────────┐
│   Marketing Site System  │     │   Main App System        │
│   (营销网站系统)          │     │   (主应用系统)            │
├──────────────────────────┤     ├──────────────────────────┤
│                          │     │                          │
│  👤 User Management      │     │  📦 Product Management   │
│  ├─ profiles             │     │  ├─ product_categories   │
│  ├─ api_keys             │     │  ├─ brands               │
│  ├─ token_sales          │     │  └─ products             │
│  ├─ token_balances       │     │                          │
│  ├─ external_integrations│     │  📊 Inventory & Sales    │
│  ├─ api_usage_logs       │     │  ├─ inventory_transactions│
│  ├─ token_packages       │     │  ├─ suppliers            │
│  └─ system_settings      │     │  ├─ purchase_orders      │
│                          │     │  ├─ purchase_order_items │
│  💰 Token Economy        │     │  ├─ customers            │
│  ├─ Purchase Flow        │     │  ├─ sales_orders         │
│  ├─ Usage Tracking       │     │  ├─ sales_order_items    │
│  └─ Balance Management   │     │                          │
│                          │     │  💵 Financial Management │
│                          │     │  ├─ accounts             │
│                          │     │  └─ financial_transactions│
└──────────────────────────┘     └──────────────────────────┘
         │                                  │
         └──────────┬───────────────────────┘
                    │
         ┌──────────▼──────────┐
         │  Supabase Auth      │
         │  (Authentication)   │
         └─────────────────────┘
```

## 🔗 表关系图

### 营销网站系统

```
profiles (用户资料)
    ├── api_keys (API密钥)
    │   └── api_usage_logs (使用日志)
    ├── token_sales (Token销售)
    ├── token_balances (Token余额)
    └── external_integrations (外部集成)

token_packages (套餐配置) ──→ token_sales
system_settings (系统设置)
```

### 主应用系统

```
product_categories (分类)
    └── products (产品)
            ├── brands (品牌)
            ├── inventory_transactions (库存交易)
            ├── purchase_order_items (采购明细)
            └── sales_order_items (销售明细)

suppliers (供应商)
    └── purchase_orders (采购订单)
            └── purchase_order_items

customers (客户)
    └── sales_orders (销售订单)
            └── sales_order_items

accounts (会计科目)
    └── financial_transactions (财务交易)
```

## 📋 详细表结构

### 1. 用户与认证 (Marketing Site)

#### `profiles` - 用户资料
```sql
id (UUID, PK)           ← auth.users.id
username (TEXT, UNIQUE)
full_name (TEXT)
avatar_url (TEXT)
role (TEXT)             -- 'user' | 'admin'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### `api_keys` - API密钥管理
```sql
id (UUID, PK)
user_id (UUID, FK → profiles)
provider (TEXT)         -- 'openai' | 'anthropic' | 'azure' | ...
key_name (TEXT)
encrypted_key (TEXT)
base_url (TEXT)
model_list (TEXT[])
is_active (BOOLEAN)
usage_limit (INTEGER)
used_count (INTEGER)
expires_at (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### `token_sales` - Token销售记录
```sql
id (UUID, PK)
user_id (UUID, FK → profiles)
amount (INTEGER)        -- Token数量
price (DECIMAL)
currency (TEXT)         -- 默认 'CNY'
status (TEXT)           -- 'pending' | 'completed' | 'refunded' | 'failed'
payment_method (TEXT)   -- 'alipay' | 'wechat' | 'stripe' | 'paypal'
transaction_id (TEXT, UNIQUE)
metadata (JSONB)
created_at (TIMESTAMP)
completed_at (TIMESTAMP)
refunded_at (TIMESTAMP)
```

#### `token_balances` - Token余额
```sql
user_id (UUID, PK, FK → profiles)
balance (INTEGER)
total_purchased (INTEGER)
total_used (INTEGER)
updated_at (TIMESTAMP)
```

### 2. 产品管理 (Main App)

#### `product_categories` - 产品分类
```sql
id (TEXT, PK)
name (TEXT)
description (TEXT)
parent_id (TEXT, FK → product_categories)  -- 支持层级分类
sort_order (INTEGER)
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)      -- 'pending' | 'synced' | 'conflict'
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)  -- 软删除
```

#### `brands` - 品牌
```sql
id (TEXT, PK)
name (TEXT, UNIQUE)
slug (TEXT, UNIQUE)
logo_url (TEXT)
website_url (TEXT)
description (TEXT)
sort_order (INTEGER)
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)
```

#### `products` - 产品
```sql
id (TEXT, PK)
sku (TEXT, UNIQUE)      -- 库存单位
name (TEXT)
description (TEXT)
category_id (TEXT, FK → product_categories)
brand_id (TEXT, FK → brands)
unit (TEXT)             -- 默认 '件'
cost_price (REAL)       -- 成本价
sell_price (REAL)       -- 销售价
min_stock (INTEGER)     -- 最小库存
max_stock (INTEGER)     -- 最大库存
current_stock (INTEGER) -- 当前库存
image_url (TEXT)
barcode (TEXT)
is_active (BOOLEAN)
metadata (TEXT)         -- JSON字符串
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)
```

### 3. 进销存管理

#### `inventory_transactions` - 库存交易
```sql
id (TEXT, PK)
product_id (TEXT, FK → products)
transaction_type (TEXT) -- 'inbound' | 'outbound' | 'adjustment' | 'transfer'
quantity (INTEGER)
reference_no (TEXT)     -- 参考单号
reason (TEXT)
performed_by (TEXT)
notes (TEXT)
created_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
```

#### `suppliers` - 供应商
```sql
id (TEXT, PK)
name (TEXT)
code (TEXT, UNIQUE)     -- 供应商编码
contact_person (TEXT)
phone (TEXT)
email (TEXT)
address (TEXT)
website (TEXT)
payment_terms (TEXT)    -- 付款条件
tax_number (TEXT)       -- 税号
notes (TEXT)
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)
```

#### `purchase_orders` - 采购订单
```sql
id (TEXT, PK)
po_number (TEXT, UNIQUE) -- 采购单号 (PO-2024-001)
supplier_id (TEXT, FK → suppliers)
order_date (DATE)
expected_delivery_date (DATE)
status (TEXT)           -- 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled'
total_amount (REAL)
paid_amount (REAL)
payment_status (TEXT)   -- 'unpaid' | 'partial' | 'paid'
notes (TEXT)
created_by (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)
```

#### `purchase_order_items` - 采购明细
```sql
id (TEXT, PK)
purchase_order_id (TEXT, FK → purchase_orders)
product_id (TEXT, FK → products)
quantity (INTEGER)
unit_price (REAL)       -- 单价
total_price (REAL)      -- 总价
received_quantity (INTEGER)
notes (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### `customers` - 客户
```sql
id (TEXT, PK)
name (TEXT)
code (TEXT, UNIQUE)     -- 客户编码
contact_person (TEXT)
phone (TEXT)
email (TEXT)
address (TEXT)
website (TEXT)
customer_type (TEXT)    -- 'individual' | 'company'
tax_number (TEXT)
credit_limit (REAL)     -- 信用额度
notes (TEXT)
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)
```

#### `sales_orders` - 销售订单
```sql
id (TEXT, PK)
so_number (TEXT, UNIQUE) -- 销售单号 (SO-2024-001)
customer_id (TEXT, FK → customers)
order_date (DATE)
expected_delivery_date (DATE)
status (TEXT)           -- 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
total_amount (REAL)
paid_amount (REAL)
payment_status (TEXT)   -- 'unpaid' | 'partial' | 'paid'
shipping_address (TEXT)
notes (TEXT)
created_by (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)
```

#### `sales_order_items` - 销售明细
```sql
id (TEXT, PK)
sales_order_id (TEXT, FK → sales_orders)
product_id (TEXT, FK → products)
quantity (INTEGER)
unit_price (REAL)
total_price (REAL)
shipped_quantity (INTEGER)
notes (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### 4. 财务管理

#### `accounts` - 会计科目
```sql
id (TEXT, PK)
code (TEXT, UNIQUE)     -- 科目编码 (1001, 5001)
name (TEXT)             -- 科目名称
type (TEXT)             -- 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
parent_id (TEXT, FK → accounts)  -- 支持层级结构
balance (REAL)
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### `financial_transactions` - 财务交易
```sql
id (TEXT, PK)
transaction_date (DATE)
description (TEXT)
transaction_type (TEXT) -- 'income' | 'expense' | 'transfer'
amount (REAL)
account_id (TEXT, FK → accounts)
reference_type (TEXT)   -- 关联类型 ('sales_order', 'purchase_order')
reference_id (TEXT)     -- 关联ID
notes (TEXT)
created_by (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
sync_status (TEXT)
last_synced_at (TIMESTAMP)
deleted_at (TIMESTAMP)
```

## 🔐 安全策略 (RLS)

所有表都启用了 Row Level Security (RLS)：

### 营销网站系统
- **profiles**: 用户只能查看/更新自己的资料，管理员可查看所有
- **api_keys**: 用户只能管理自己的API密钥
- **token_sales**: 用户只能查看自己的购买记录
- **token_balances**: 用户只能查看自己的余额
- **external_integrations**: 用户只能管理自己的集成
- **api_usage_logs**: 用户只能查看自己的使用日志
- **token_packages**: 所有人可查看激活的套餐
- **system_settings**: 仅管理员可管理

### 主应用系统
- 所有认证用户都可以访问进销存数据
- 支持多租户隔离（通过 user_id 字段）

## ⚡ RPC 函数

### Token 管理
```sql
deduct_tokens(user_id, tokens)    -- 扣除Token
add_tokens(user_id, tokens)       -- 增加Token
get_user_stats(user_id)           -- 获取用户统计
get_platform_stats()              -- 获取平台统计 (Admin)
```

## 📈 索引优化

关键索引已创建以优化查询性能：
- 产品 SKU、分类、品牌
- 订单状态、日期
- 用户ID外键
- 同步状态
- API使用日志时间戳

## 🔄 同步机制

主应用系统的表包含同步相关字段：
- `sync_status`: 'pending' | 'synced' | 'conflict'
- `last_synced_at`: 最后同步时间
- `deleted_at`: 软删除标记

支持离线优先架构，本地 SQLite 与云端 Supabase 双向同步。

---

**版本**: 2.0.0  
**最后更新**: 2026-04-14  
**总表数**: 20 张  
**RPC函数**: 4 个  
**RLS策略**: 20+ 条
