# 需求文档：行业插件功能实现（餐饮 / 美业 / 宠物 / ProClaw Cloud）

> 版本：v1.0 · 基于插件化行业版架构升级（v1.3+）的 Phase 4 补充实现  
> 关联：`docs/需求文档：ProClaw 插件化行业版架构升级.md`

---

## 一、概述

已在 `src/plugins/` 下创建了 4 个新行业插件的 `manifest.json`（餐饮/美业/宠物/Cloud），定义了导航、功能模块、主题色、快速操作等元数据。  
本需求文档描述将这些 **manifest 蓝图** 落地为 **真正可用功能** 所需的前端页面、后端命令和数据库建表工作。

---

## 二、公共约束

### 2.1 共享页面复用
以下页面已存在，各行业插件通过 manifest 的 `navigation.remove` 控制可见性，无需新建：

| 页面 | 路径 | 组件 | 说明 |
|------|------|------|------|
| AI claw 首页 | `/` | `AgentPage` | 所有版本的基础 AI 对话首页 |
| AI 团队 | `/teams` / `/ai-teams` | `TeamsPage` | 全版本通用 |
| AI 知识库 | `/ai-knowledge` | `AIKnowledgePage` | 全版本通用 |
| 销售管理 | `/sales` | `SalesPage` | 有采购/零售订单的版本可用 |
| 库存管理 | `/inventory` | `InventoryPage` | 有库存的版本可用 |
| 数据看板 | `/analytics` | `DashboardPage` | 全版本通用数据分析 |
| 用户中心 | `/ucenter` | `UserCenterPage` | 系统设置相关 |

### 2.2 路由注册方式
所有插件路由统一在 `src/App.tsx` 中注册，**不随插件动态增减**（Phase 1 约束）。  
manifest 的 `navigation.add` / `navigation.remove` 仅控制侧边栏可见性。

### 2.3 数据库建表
每个行业插件需要独立的数据表。新插件表均在已有文件 `database/migrations/` 中新增迁移 SQL。

---

## 三、餐饮行业版（catering）

### 3.1 插件元数据
- **ID**: `catering` · 主题色 `#e74c3c` · 图标 🍽️
- **新增导航**：`/pos`（收银台）/ `/tables`（桌台管理）/ `/kitchen`（后厨显示）/ `/members`（会员管理）
- **隐藏导航**：`/datacenter` / `/contacts` / `/messages` / `/cloud-store` / `/ucenter`

### 3.2 新增页面

#### 3.2.1 收银台 POS（/pos）
| 功能 | 描述 |
|------|------|
| 点餐录入 | 选择桌台 → 浏览菜品/分类 → 加入订单 → 确认下单 |
| 扫码点餐 | 生成桌台二维码，顾客自助扫码点餐 |
| 支付收银 | 支持现金/微信/支付宝/团购券核销 |
| 订单查询 | 按桌台/时间/支付方式查询历史订单 |
| 交接班 | 收银员交接，统计当班营收 |

**组件结构**：`src/pages/pos/PosPage.tsx` + `PosSidebar` + `OrderPanel` + `MenuBrowser`  
**后端命令**：
- `create_pos_order(table_id, items, payment_method)` → 创建点餐订单
- `get_pos_orders(table_id?, status?, date)` → 查询 POS 订单
- `settle_pos_order(order_id, payment_method, amount)` → 结算订单
- `get_daily_pos_summary(date)` → 当日营收汇总
- `get_pos_menu_items(category_id?)` → 获取 POS 菜品列表

**数据表**：
```sql
CREATE TABLE pos_orders (
    id TEXT PRIMARY KEY, table_id TEXT, items JSONB, 
    total_amount REAL, payment_method TEXT, status TEXT DEFAULT 'pending',
    created_at TEXT, settled_at TEXT
);
CREATE TABLE pos_menu_items (
    id TEXT PRIMARY KEY, category_id TEXT, name TEXT, price REAL, 
    is_available BOOLEAN DEFAULT 1, sort_order INT DEFAULT 0
);
CREATE TABLE pos_tables (
    id TEXT PRIMARY KEY, area TEXT, name TEXT, capacity INT, 
    status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant','occupied','reserved','cleaning'))
);
```

#### 3.2.2 桌台管理（/tables）
| 功能 | 描述 |
|------|------|
| 桌台视图 | 可视化平面图展示桌台状态（空/占用/预订/清洁中） |
| 桌台操作 | 点击桌台 → 开台/转台/并台/清台 |
| 排队叫号 | 等待顾客排队管理，自动叫号 |

**数据表**：复用 `pos_tables`（含 `area` 区域分组）

#### 3.2.3 后厨显示 KDS（/kitchen）
| 功能 | 描述 |
|------|------|
| 订单看板 | 实时展示后厨待制作订单，按入单时间排序 |
| 出菜标记 | 厨师点击"完成"，订单进入传菜状态 |
| 催菜提醒 | 超时未制作自动标红闪烁 |
| 打印联动 | 新订单自动打印小票（可选） |

**组件结构**：`src/pages/kitchen/KitchenDisplayPage.tsx`  
**后端命令**：
- `get_kds_orders(status?)` → 获取 KDS 订单
- `mark_kds_item_done(order_item_id)` → 标记菜品完成
- `get_kds_stats()` → KDS 超时统计

**数据表**：复用 `pos_orders`，仅扩展 `KDS` 管理逻辑

#### 3.2.4 会员管理（/members）
复用现有会员模块，manifest 标记即可。若现有模块不足，再加：

**数据表**：
```sql
CREATE TABLE catering_members (
    id TEXT PRIMARY KEY, name TEXT, phone TEXT, 
    total_consumption REAL DEFAULT 0, points INT DEFAULT 0,
    visit_count INT DEFAULT 0, last_visit_at TEXT, created_at TEXT
);
CREATE TABLE catering_member_logs (
    id TEXT PRIMARY KEY, member_id TEXT, type TEXT, 
    amount REAL, points INT, description TEXT, created_at TEXT
);
```

### 3.3 数据库迁移
新建 `database/migrations/011_catering_plugin.sql`：
- pos_orders / pos_menu_items / pos_tables / catering_members / catering_member_logs

---

## 四、美业行业版（beauty）

### 4.1 插件元数据
- **ID**: `beauty` · 主题色 `#ec4899` · 图标 💇
- **新增导航**：`/appointments`（预约管理）/ `/members`（会员管理）/ `/services`（服务项目）/ `/employees`（员工管理）/ `/marketing`（营销活动）
- **隐藏导航**：`/datacenter` / `/supplychain` / `/products` / `/contacts` / `/messages` / `/cloud-store` / `/ucenter`

### 4.2 新增页面

#### 4.2.1 预约管理（/appointments）
| 功能 | 描述 |
|------|------|
| 日历视图 | 月/周/日三种切换，查看预约分布 |
| 新建预约 | 选择客户 → 选择项目 → 选择技师 → 选时间段 → 确认 |
| 预约操作 | 到店打卡 / 改约 / 取消 / 标记未到 |
| 排班管理 | 设置技师的每日可预约时段 |

**组件结构**：`src/pages/beauty/AppointmentsPage.tsx`  
**后端命令**：
- `create_appointment(customer_id, service_ids, employee_id, start_time, duration)` → 新建预约
- `get_appointments(date_range, employee_id?, status?)` → 查询预约
- `update_appointment_status(id, status)` → 到店/取消/完成
- `get_employee_schedule(employee_id, date)` → 获取排班
- `set_employee_schedule(employee_id, date, slots)` → 设置排班

**数据表**：
```sql
CREATE TABLE beauty_appointments (
    id TEXT PRIMARY KEY, customer_id TEXT, service_ids JSONB,
    employee_id TEXT, start_at TEXT, duration INT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','checked_in','in_progress','completed','cancelled','no_show')),
    notes TEXT, created_at TEXT, updated_at TEXT
);
CREATE TABLE beauty_employee_schedules (
    id TEXT PRIMARY KEY, employee_id TEXT, date TEXT,
    time_slots JSONB, -- [{start:"09:00",end:"18:00"}]
    is_available BOOLEAN DEFAULT 1, created_at TEXT
);
```

#### 4.2.2 员工管理（/employees）
| 功能 | 描述 |
|------|------|
| 员工档案 | 姓名/电话/入职日期/服务项目/提成比例 |
| 服务项目分配 | 勾选该员工可做的服务 |
| 提成管理 | 按项目/按比例设置提成规则 |
| 业绩统计 | 按月/按项目统计员工业绩和提成 |

**后端命令**：
- `create_beauty_employee(name, phone, service_ids, commission_rate)`
- `get_beauty_employees()`
- `update_employee_commission(employee_id, service_id, rate)`
- `get_employee_performance(employee_id, month)` → 业绩汇总

**数据表**：
```sql
CREATE TABLE beauty_employees (
    id TEXT PRIMARY KEY, name TEXT, phone TEXT,
    hire_date TEXT, service_ids JSONB, commission_rate REAL,
    is_active BOOLEAN DEFAULT 1, created_at TEXT
);
CREATE TABLE beauty_commission_rules (
    id TEXT PRIMARY KEY, employee_id TEXT, service_id TEXT,
    rate_type TEXT DEFAULT 'percentage' CHECK(rate_type IN ('percentage','fixed')),
    rate_value REAL, created_at TEXT
);
```

#### 4.2.3 服务项目管理（/services）
| 功能 | 描述 |
|------|------|
| 服务分类 | 按类型分（如：剪发/染发/美容/SPA） |
| 服务 CRUD | 名称/时长/价格/描述 |
| 价格管理 | 支持多级价格（普通价/会员价/新客价） |

**后端命令**：基本的 CRUD，复用现有产品管理思路  
**数据表**：
```sql
CREATE TABLE beauty_services (
    id TEXT PRIMARY KEY, category_id TEXT, name TEXT,
    duration INT, -- 分钟
    price REAL, member_price REAL, new_customer_price REAL,
    description TEXT, is_active BOOLEAN DEFAULT 1, sort_order INT
);
CREATE TABLE beauty_service_categories (
    id TEXT PRIMARY KEY, name TEXT, icon TEXT, sort_order INT
);
```

#### 4.2.4 营销活动（/marketing）
| 功能 | 描述 |
|------|------|
| 活动列表 | 查看进行中/已结束的营销活动 |
| 活动模板 | "沉睡唤醒"（30天未到店自动发短信）/ "生日礼" / "充值满赠" |
| 活动效果 | 查看活动参与人数、转化率、新增消费 |
| 微信模板消息 | 绑定公众号模板消息推送（可选） |

### 4.3 数据库迁移
新建 `database/migrations/012_beauty_plugin.sql`：
- beauty_appointments / beauty_employee_schedules / beauty_employees
- beauty_commission_rules / beauty_services / beauty_service_categories

---

## 五、宠物行业版（pet）

### 5.1 插件元数据
- **ID**: `pet` · 主题色 `#f59e0b` · 图标 🐾
- **新增导航**：`/pets`（宠物档案）/ `/boarding`（寄养管理）/ `/grooming`（洗护服务）/ `/members`（会员管理）
- **隐藏导航**：`/datacenter` / `/contacts` / `/messages` / `/cloud-store` / `/ucenter`

### 5.2 新增页面

#### 5.2.1 宠物档案（/pets）
| 功能 | 描述 |
|------|------|
| 宠物 CRUD | 名称/品种/性别/年龄/体重/毛色/芯片号 |
| 主人关联 | 关联到会员（可一个会员多只宠物） |
| 疫苗提醒 | 记录疫苗注射日期，到期自动提醒 |
| 病历简记 | 就诊/寄养/洗护历史记录 |

**组件结构**：`src/pages/pet/PetProfilesPage.tsx`  
**后端命令**：
- `create_pet_profile(owner_id, name, breed, gender, birth_date, chip_no)`
- `get_pet_profiles(owner_id?)` → 查询宠物（可按主人过滤）
- `update_pet_profile(id, fields)`
- `get_vaccine_reminders(days_ahead)` → 获取即将到期的疫苗提醒

**数据表**：
```sql
CREATE TABLE pet_profiles (
    id TEXT PRIMARY KEY, owner_id TEXT, name TEXT, 
    species TEXT, -- dog/cat/other
    breed TEXT, gender TEXT, birth_date TEXT, weight REAL,
    color TEXT, chip_no TEXT, is_neutered BOOLEAN,
    photo_url TEXT, notes TEXT, created_at TEXT, updated_at TEXT
);
CREATE TABLE pet_vaccine_records (
    id TEXT PRIMARY KEY, pet_id TEXT, vaccine_type TEXT,
    administered_at TEXT, next_due_at TEXT, vet_name TEXT,
    notes TEXT, created_at TEXT
);
CREATE TABLE pet_health_logs (
    id TEXT PRIMARY KEY, pet_id TEXT, log_type TEXT,
    description TEXT, created_at TEXT
);
```

#### 5.2.2 寄养管理（/boarding）
| 功能 | 描述 |
|------|------|
| 入住办理 | 选择宠物 → 选择房间 → 设置起止日期 → 费用计算 |
| 房间管理 | 笼位/房间可视化，状态（空/占用/清洁中） |
| 日常记录 | 每日喂养/遛狗/用药记录，可对主人共享 |
| 离店结算 | 结算寄养费用 + 附加服务费 |

**组件结构**：`src/pages/pet/BoardingPage.tsx`  
**后端命令**：
- `create_boarding_record(pet_id, check_in, check_out, room_id, daily_rate)`
- `get_boarding_records(status?, date?)` → 查询在住/历史
- `add_boarding_daily_log(boarding_id, log_type, content)`
- `check_out_boarding(boarding_id, final_amount)`
- `get_boarding_rooms(status?)` → 房间状态

**数据表**：
```sql
CREATE TABLE pet_boarding_records (
    id TEXT PRIMARY KEY, pet_id TEXT, room_id TEXT,
    check_in_at TEXT, check_out_at TEXT, 
    daily_rate REAL, total_amount REAL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','checked_out','cancelled')),
    notes TEXT, created_at TEXT
);
CREATE TABLE pet_boarding_rooms (
    id TEXT PRIMARY KEY, name TEXT, room_type TEXT,
    capacity INT, daily_rate REAL,
    status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant','occupied','cleaning','maintenance'))
);
CREATE TABLE pet_boarding_daily_logs (
    id TEXT PRIMARY KEY, boarding_id TEXT,
    log_date TEXT, log_type TEXT, -- feeding/walk/medication/note
    content TEXT, staff_name TEXT, created_at TEXT
);
```

#### 5.2.3 洗护服务（/grooming）
| 功能 | 描述 |
|------|------|
| 预约洗护 | 选择宠物/服务项目/时间/技师 |
| 服务记录 | 已完成的洗护历史，含宠物状态备注 |
| 价目管理 | 按体型/品种/服务类型定价 |

**组件结构**：可复用预约思路，或独立 `src/pages/pet/GroomingPage.tsx`  
**数据表**：
```sql
CREATE TABLE pet_grooming_records (
    id TEXT PRIMARY KEY, pet_id TEXT, service_items JSONB,
    employee_id TEXT, scheduled_at TEXT, completed_at TEXT,
    amount REAL, status TEXT DEFAULT 'scheduled',
    notes TEXT, created_at TEXT
);
```

### 5.3 数据库迁移
新建 `database/migrations/013_pet_plugin.sql`：
- pet_profiles / pet_vaccine_records / pet_health_logs
- pet_boarding_records / pet_boarding_rooms / pet_boarding_daily_logs
- pet_grooming_records

---

## 六、ProClaw Cloud 云服务版

### 6.1 插件元数据
- **ID**: `cloud-proclaw` · 主题色 `#0ea5e9` · 图标 ☁️
- **新增导航**：`/cloud-store`（云商城管理）/ `/token-billing`（Token 计费）/ `/cloud-backup`（云备份）
- **隐藏导航**：`/products` / `/supplychain` / `/purchase` / `/sales` / `/inventory` / `/contacts` / `/messages`

### 6.2 新增/改造页面

#### 6.2.1 Token 计费仪表盘（/token-billing）
Cloud 版专属，对现有 Token 功能做聚合仪表盘：

| 功能 | 描述 |
|------|------|
| 余额概览 | 总余额 / 今日消耗 / 预估可用天数 |
| 消耗趋势图 | 近 7/30 天 Token 消耗曲线（复用 recharts） |
| 套餐推荐 | 根据消耗量推荐合适套餐 |
| 消费明细 | 按时间/资源类型筛选的 Token 使用记录 |
| 预警设置 | 设置低余额阈值，触发通知 |

**组件**：`src/pages/cloud/TokenBillingPage.tsx`  
**后端**：复用现有 `get_token_summary_cmd` / `get_token_usage_cmd` / `get_token_balance_cmd`

#### 6.2.2 云备份管理（/cloud-backup）
| 功能 | 描述 |
|------|------|
| 备份概览 | 上次备份时间/数据大小/加密状态 |
| 手动备份 | 触发即时全量备份 |
| 自动备份 | 设置定时备份策略（每天/每周） |
| 恢复操作 | 选择备份时间点 → 预览 → 确认恢复 |
| 备份历史 | 查看备份记录列表 |

**组件**：`src/pages/cloud/CloudBackupPage.tsx`  
**后端命令**：
- `trigger_cloud_backup()` → 开始备份（复用现有 `CloudBackupService`）
- `get_backup_history(limit?)` → 获取备份历史
- `get_backup_status()` → 当前备份状态
- `restore_from_backup(backup_id, tables?)` → 恢复备份（可选指定表）
- `set_auto_backup_schedule(enabled, frequency, time)` → 设置自动备份策略

**数据表**（manifest 中已定义 `cloud_backup_jobs`）：
```sql
CREATE TABLE IF NOT EXISTS cloud_backup_jobs (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, 
    status TEXT DEFAULT 'pending', started_at TEXT, completed_at TEXT, 
    size_bytes INTEGER, table_count INTEGER, error_message TEXT
);
CREATE TABLE IF NOT EXISTS cloud_backup_config (
    id TEXT PRIMARY KEY DEFAULT 'default', user_id TEXT,
    auto_backup BOOLEAN DEFAULT 0, frequency TEXT DEFAULT 'daily',
    backup_time TEXT DEFAULT '02:00', encrypt_backup BOOLEAN DEFAULT 1,
    retention_days INT DEFAULT 30, updated_at TEXT
);
```

#### 6.2.3 云商城管理（/cloud-store）
复用现有 `CloudStorePage`，仅扩展运营统计仪表盘：
- 全平台商城总数 / 在线商城数
- 总商品数 / 总订单数 / 总营业额
- 商城创建趋势（折线图）

### 6.3 数据库迁移
新建 `database/migrations/014_cloud_plugin.sql`：
- cloud_backup_jobs / cloud_backup_config （`cloud_token_packages` 和 `cloud_store_sites` 已在较早迁移中）

---

## 七、公共基础设施

### 7.1 routing 注册（src/App.tsx）

为所有新页面注册统一路由路径，所有新路由统一在末尾追加：

```tsx
// ========== 行业插件路由（Phase 4 新插件） ==========

// 餐饮行业
<Route path="/pos" element={<ProtectedRoute><PosPage /></ProtectedRoute>} />
<Route path="/tables" element={<ProtectedRoute><TablesPage /></ProtectedRoute>} />
<Route path="/kitchen" element={<ProtectedRoute><KitchenDisplayPage /></ProtectedRoute>} />

// 美业行业
<Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
<Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
<Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
<Route path="/marketing" element={<ProtectedRoute><MarketingPage /></ProtectedRoute>} />

// 宠物行业
<Route path="/pets" element={<ProtectedRoute><PetProfilesPage /></ProtectedRoute>} />
<Route path="/boarding" element={<ProtectedRoute><BoardingPage /></ProtectedRoute>} />
<Route path="/grooming" element={<ProtectedRoute><GroomingPage /></ProtectedRoute>} />

// Cloud 版
<Route path="/token-billing" element={<ProtectedRoute><TokenBillingPage /></ProtectedRoute>} />
<Route path="/cloud-backup" element={<ProtectedRoute><CloudBackupPage /></ProtectedRoute>} />
```

### 7.2 Rust 后端命令注册（src-tauri/src/main.rs）

新增命令批量注册到 `invoke_handler` 中，按模块分组：

```rust
// 餐饮模块
catering_create_pos_order,
catering_get_pos_orders,
catering_settle_pos_order,
catering_get_daily_summary,
catering_get_kds_orders,
catering_mark_kds_item_done,
// 美业模块
beauty_create_appointment,
beauty_get_appointments,
beauty_update_appointment_status,
beauty_get_employees,
beauty_create_employee,
// 宠物模块
pet_create_profile,
pet_get_profiles,
pet_create_boarding,
pet_get_boarding_records,
pet_check_out_boarding,
// Cloud 模块
trigger_cloud_backup,
get_backup_history,
get_backup_status,
restore_from_backup,
set_auto_backup_schedule,
```

### 7.3 侧边栏导航注册（src/components/Layout/Sidebar.tsx）

现有 `Sidebar.tsx` 已通过 `useAppModeStore` 动态读取 manifest 的 `navigation.add` / `remove` 来控制显示。  
新页面注册路由后，manifest 中的导航项会自动生效，无需修改 Sidebar 组件。

### 7.4 新增文件清单

```
src/pages/pos/PosPage.tsx          ← 新建
src/pages/pos/PosSidebar.tsx
src/pages/pos/OrderPanel.tsx
src/pages/pos/MenuBrowser.tsx
src/pages/kitchen/KitchenDisplayPage.tsx  ← 新建
src/pages/beauty/AppointmentsPage.tsx     ← 新建
src/pages/beauty/EmployeesPage.tsx        ← 新建
src/pages/beauty/ServicesPage.tsx         ← 新建
src/pages/beauty/CommissionRulesPage.tsx  ← 新建
src/pages/pet/PetProfilesPage.tsx         ← 新建
src/pages/pet/BoardingPage.tsx            ← 新建
src/pages/pet/GroomingPage.tsx            ← 新建
src/pages/cloud/TokenBillingPage.tsx      ← 新建
src/pages/cloud/CloudBackupPage.tsx       ← 新建

src-tauri/src/catering_commands.rs        ← 新建（餐饮模块）
src-tauri/src/beauty_commands.rs          ← 新建（美业模块）
src-tauri/src/pet_commands.rs             ← 新建（宠物模块）
src-tauri/src/cloud_backup_commands.rs    ← 新建（云备份模块）

database/migrations/011_catering_plugin.sql  ← 新建
database/migrations/012_beauty_plugin.sql    ← 新建
database/migrations/013_pet_plugin.sql       ← 新建
database/migrations/014_cloud_plugin.sql     ← 新建
```

---

## 八、实施优先级

| 优先级 | 模块 | 预估工时 | 说明 |
|--------|------|----------|------|
| P0 | 数据库迁移 × 4 | 1d | 建表是一切的基础 |
| P0 | 路由注册 + Sidebar 联动验证 | 0.5d | 确保新页面可达 |
| P1 | Token 计费仪表盘（Cloud） | 2d | 复用现有 API，仅 UI |
| P1 | 云备份管理（Cloud） | 1.5d | 复用 CloudBackupService |
| P2 | 餐饮 POS + 桌台 + KDS | 5d | 页面多、交互复杂 |
| P3 | 宠物档案 + 寄养 + 洗护 | 4d | 三级页面联动 |
| P3 | 美业预约 + 员工 + 服务 | 3d | 预约时间轴复杂度高 |
| P4 | 美业营销活动 | 2d | 锦上添花功能 |
| P4 | 餐饮会员管理 | 1d | 复用现有会员模块 |

---

## 九、验收标准

1. 切换餐饮插件后，侧边栏显示：收银台/桌台管理/后厨/菜品管理/供应链/销售/库存/会员/AI团队/AI知识库/数据看板
2. 切换美业插件后，侧边栏显示：预约管理/会员/服务项目/员工/库存/销售/营销/AI团队/AI知识库/数据看板
3. 切换宠物插件后，侧边栏显示：宠物档案/寄养/洗护/商品/供应链/销售/库存/会员/AI团队/AI知识库/数据看板
4. Cloud 版切换后，侧边栏显示：AI claw/云商城/Token 计费/云备份/用户管理/数据分析/AI团队/运营后台
5. 各页面能正常打开，后端命令返回合理的模拟数据或空结果
6. 数据库迁移 SQL 在 Supabase 中可正常执行
