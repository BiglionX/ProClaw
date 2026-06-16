# 需求文档：ProClaw 云商城开通引导流程（PRD v6.0）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../RELEASE_NOTES_v1.0.0.md) §"云托管商城增强" / "测试用户数据包 - 云商城预置" |
| **覆盖率** | ~90%（桌面端引导流程已上线；营销网站引导 90% 完成） |
| **代码入口** | `src/pages/pages/InvitationManagementPage.tsx`（含云商城开通）、`cloud-store/src/app/onboarding/`、`src/pages/CloudStorePages/StoreSetupWizard.tsx` |
| **数据库依赖** | `database/complete_schema.sql`（merchants/store_config） |
| **测试覆盖** | `e2e/cloud-store-creation.spec.ts` |
| **差异与遗留** | 开通引导流程已落地；演示账号预置跳过完整流程；真实用户首次开通 ~5 步向导 |
| **后续动作** | 维持现状；按需打磨步骤细节 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，云商城开通引导上线 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

**版本**：v6.0  
**日期**：2026-06-09  
**状态**：待开发  
**优先级**：P0（核心流程）

---

## 1. 背景与目标

### 1.1 现状问题
当前云商城开通流程存在以下问题：
- 点击"创建云商城"后，仅在本地 SQLite 创建记录
- 没有自动在 Supabase 创建租户 schema 和商品表
- 没有引导用户完成商品同步
- 用户不知道如何将商品发布到云商城

### 1.2 目标
实现完整的云商城开通引导流程：
1. 自动检测并创建云端租户数据
2. 引导用户完成商品库初始化
3. 实时显示同步进度（科技感走马灯）
4. 提供清晰的下一步操作指引

---

## 2. 用户故事

**作为**商户老板，我在 ProClaw 桌面端点击"创建云商城"后，系统自动帮我：
1. 在云端创建我的租户数据库
2. 引导我将本地商品上传到云商城
3. 用科技感的动画显示上传进度
4. 上传完成后引导我预览商城

**我期望**整个过程可视化、有科技感，让我知道系统正在做什么。

---

## 3. 完整开通流程

### 3.1 流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           云商城开通引导流程                                  │
└─────────────────────────────────────────────────────────────────────────────┘

用户点击「创建云商城」
        │
        ▼
┌─────────────────┐
│  步骤 1：检测    │
│  云端租户状态    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  租户不存在      │ ──▶ │  自动创建租户    │
│  (新开通)        │     │  • tenants 表    │
└─────────────────┘     │  • schema 创建   │
         │              │  • RLS 策略      │
         │              └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│           步骤 2：创建云商品库 (Step Wizard)              │
│  ┌─────────────────────────────────────────────────┐    │
│  │         走马灯 + 步骤卡片 + 进度指示器            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  步骤 3：上传商品资料     │
│  • 选择商品              │
│  • 一键同步到云端         │
│  • 走马灯显示进度         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  步骤 4：上传成功         │
│  • 成功动画              │
│  • 下一步按钮             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  步骤 5：预览商城         │
│  • 预览按钮              │
│  • 完成引导              │
└─────────────────────────┘
```

### 3.2 详细步骤说明

#### 步骤 1：检测云端租户状态
| 项目 | 说明 |
|------|------|
| **触发时机** | 用户点击"创建云商城"按钮 |
| **执行操作** | 调用 Supabase API 查询 `tenants` 表，检查该 subdomain 是否存在 |
| **检测结果** | 存在 → 跳转步骤 3；不存在 → 执行创建 |
| **创建内容** | 1. `public.tenants` 表记录<br>2. `tenant_{subdomain}` schema<br>3. `products` 表<br>4. `orders` 表<br>5. RLS 策略 |

#### 步骤 2：创建云商品库
| 项目 | 说明 |
|------|------|
| **页面标题** | 创建你的云商品库 |
| **副标题** | 我们正在为您的商城准备云端存储空间... |
| **走马灯内容** | 科技感动态文案，逐条循环展示 |
| **操作按钮** | 跳过（直接进入下一步）|

#### 步骤 3：上传商品资料
| 项目 | 说明 |
|------|------|
| **页面标题** | 上传你的商品资料到云商城 |
| **商品选择** | 显示本地商品列表，支持勾选 |
| **同步按钮** | "一键同步到云端" |
| **走马灯内容** | 显示每个商品的同步状态 |
| **进度反馈** | 科技感进度条 + 动态文案 |

#### 步骤 4：上传成功
| 项目 | 说明 |
|------|------|
| **页面标题** | 上传成功！ |
| **成功动画** | 粒子爆炸 + 打勾动画 |
| **统计展示** | 已同步 N 个商品 |
| **下一步按钮** | "预览我的商城 →" |

#### 步骤 5：完成引导
| 项目 | 说明 |
|------|------|
| **页面内容** | 商城预览 + 管理入口 |
| **显示信息** | 商城 URL、预览按钮、管理后台链接 |

---

## 4. 科技感走马灯设计规范

### 4.1 设计原则
- **动态感**：内容持续流动，营造数据传输的视觉感
- **科技感**：使用代码风格、粒子效果、渐变色彩
- **清晰度**：确保用户能看清当前进度和状态

### 4.2 视觉风格

#### 配色方案
| 元素 | 颜色 | 用途 |
|------|------|------|
| 主色 | `#00D9FF` | 走马灯文字、高亮元素 |
| 辅助色 | `#7B2FFF` | 渐变、粒子效果 |
| 背景色 | `#0A0E27` | 深蓝黑底色 |
| 文字色 | `#FFFFFF` | 主标题 |
| 次要文字 | `#8892B0` | 副标题、说明文字 |
| 成功色 | `#00FF88` | 完成状态 |
| 进度条 | 渐变 `#00D9FF → #7B2FFF` | 同步进度条 |

#### 字体
- 主字体：`"JetBrains Mono", "Fira Code", monospace`（代码风格）
- 标题字体：`"Inter", "PingFang SC", sans-serif`
- 走马灯文字：等宽字体，模拟代码输出

### 4.3 走马灯内容文案

#### 场景 1：创建租户阶段
```
[系统] 正在连接云端服务器...
[连接] 已建立安全连接 ✓
[检测] 检查租户状态...
[创建] 初始化云端存储空间...
[完成] 云商品库创建成功！
```

#### 场景 2：上传商品阶段
```
[同步] 正在读取本地商品数据...
[处理] iPhone 15 Pro Max 电池 - 已就绪 ✓
[上传] iPhone 14 Pro 电池 - 上传中 ████░░░░ 60%
[队列] 等待上传: Samsung Galaxy S24 屏幕总成
[完成] 10/20 个商品已同步
[通知] 数据同步完成，正在生成商城页面...
```

#### 场景 3：成功阶段
```
[成功] 商品库初始化完成！
[统计] 共同步 20 个商品到云端
[生成] 商城页面已生成
[链接] https://your-store.proclaw.cc
```

### 4.4 动画效果规格

#### 走马灯动画
| 属性 | 规格 |
|------|------|
| **动画类型** | 垂直滚动 + 淡入淡出 |
| **滚动速度** | 每行 2 秒停留，淡入 0.3s，淡出 0.3s |
| **打字效果** | 每字符 50ms，打字完成后等待 1.5s |
| **循环方式** | 队列式循环，无缝衔接 |

#### 粒子效果（背景）
| 属性 | 规格 |
|------|------|
| **粒子数量** | 50-80 个 |
| **粒子颜色** | 主色 `#00D9FF` 20%，辅助色 `#7B2FFF` 30%，白色 50% |
| **运动轨迹** | 随机方向，速度 0.5-2px/帧 |
| **粒子大小** | 1-3px |
| **拖尾效果** | 渐隐透明度 0.3-0.8 |

#### 进度条动画
| 属性 | 规格 |
|------|------|
| **轨道颜色** | `#1a1f3a` |
| **填充渐变** | `linear-gradient(90deg, #00D9FF, #7B2FFF)` |
| **动画效果** | 流光效果（光点从左到右循环） |
| **高度** | 8px，圆角 4px |

#### 闪烁光标
| 属性 | 规格 |
|------|------|
| **符号** | `█` 或 `▊` |
| **颜色** | `#00D9FF` |
| **闪烁频率** | 500ms 亮 / 500ms 暗 |

### 4.5 组件结构

```tsx
// 科技感走马灯组件
interface TechMarqueeProps {
  messages: MarqueeItem[];
  theme?: 'cyan' | 'purple' | 'mixed';
  showCursor?: boolean;
  showParticles?: boolean;
}

interface MarqueeItem {
  prefix: string;      // [系统] / [连接] 等前缀
  content: string;     // 主要内容
  status?: 'pending' | 'processing' | 'success' | 'error';
  progress?: number;   // 0-100，进度百分比
}

// 视觉层级
┌─────────────────────────────────────────┐
│           深色渐变背景 + 粒子效果         │
│  ┌─────────────────────────────────┐    │
│  │      科技感走马灯区域             │    │
│  │  ┌───────────────────────────┐ │    │
│  │  │ [系统] 正在连接云端...      │ │    │
│  │  │ [完成] 连接成功 ✓          │ │    │
│  │  │ [同步] 上传中 ████░░ 60% ▊ │ │    │
│  │  └───────────────────────────┘ │    │
│  │                                 │    │
│  │      ═══════════════════        │    │
│  │      ▓▓▓▓▓▓▓▓▓░░░░░ 60%       │    │  ← 进度条
│  │      ═══════════════════        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 5. 组件清单

### 5.1 CloudStoreSetupWizard
云商城开通向导主组件
- **位置**：`src/pages/CloudStorePages/StoreSetupWizard.tsx`
- **状态**：未创建
- **属性**：
```typescript
interface CloudStoreSetupWizardProps {
  subdomain: string;
  onComplete: (store: CloudStore) => void;
  onCancel: () => void;
}
```

### 5.2 TechMarquee
科技感走马灯组件
- **位置**：`src/components/TechMarquee.tsx`
- **状态**：未创建
- **属性**：
```typescript
interface TechMarqueeProps {
  messages: MarqueeItem[];
  theme?: 'cyan' | 'purple' | 'mixed';
  showCursor?: boolean;
  showParticles?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}
```

### 5.3 TechProgressBar
科技感进度条组件
- **位置**：`src/components/TechProgressBar.tsx`
- **状态**：未创建
- **属性**：
```typescript
interface TechProgressBarProps {
  progress: number;        // 0-100
  label?: string;          // 进度标签
  showPercentage?: boolean;
  animated?: boolean;      // 是否显示流光动画
}
```

### 5.4 ParticleBackground
粒子背景组件
- **位置**：`src/components/ParticleBackground.tsx`
- **状态**：未创建
- **属性**：
```typescript
interface ParticleBackgroundProps {
  particleCount?: number;  // 默认 60
  colors?: string[];       // 默认 ['#00D9FF', '#7B2FFF', '#FFFFFF']
  speed?: number;          // 粒子速度
}
```

### 5.5 SyncStatusCard
同步状态卡片
- **位置**：`src/components/SyncStatusCard.tsx`
- **状态**：未创建
- **属性**：
```typescript
interface SyncStatusCardProps {
  product: ProductSPU;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
}
```

---

## 6. 数据流程

### 6.1 租户创建流程（Supabase）

```sql
-- 1. 插入 tenants 表记录
INSERT INTO public.tenants (id, subdomain, name, schema_name, status, plan)
VALUES (gen_random_uuid(), @subdomain, @storeName, @schemaName, 'active', 'trial')
ON CONFLICT (subdomain) DO NOTHING;

-- 2. 创建租户 schema（通过 Supabase Management API）
POST /v1/projects/{project_id}/schemas
Authorization: Bearer {service_role_key}
Body: { "name": "tenant_@subdomain" }

-- 3. 创建 products 表
CREATE TABLE tenant_@subdomain.products (...);

-- 4. 创建 orders 表
CREATE TABLE tenant_@subdomain.orders (...);

-- 5. 设置 RLS 策略
ALTER TABLE tenant_@subdomain.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON tenant_@subdomain.products FOR SELECT USING (true);
```

### 6.2 商品同步流程

```typescript
interface SyncProgress {
  total: number;          // 总数
  current: number;        // 当前进度
  currentProduct: string; // 当前商品名称
  status: 'pending' | 'uploading' | 'success' | 'error';
}

// 同步步骤
1. 获取本地商品列表（带分页）
2. 逐个上传到 Supabase
3. 更新走马灯状态
4. 完成所有上传后显示成功
```

---

## 7. API 设计

### 7.1 桌面端 → Supabase（直接调用）

| API | 方法 | 说明 |
|-----|------|------|
| `POST /rest/v1/tenants` | POST | 创建租户记录 |
| `GET /rest/v1/tenants?subdomain=eq.{subdomain}` | GET | 检查租户是否存在 |
| `POST /rest/v1/rpc/create_tenant_schema` | RPC | 批量创建 schema + 表 |

### 7.2 商品同步 API

```typescript
// 批量同步商品
async function syncProductsToCloud(subdomain: string, products: ProductSPU[]): Promise<SyncResult> {
  const results: SyncResult[] = [];
  
  for (const product of products) {
    await supabase
      .schema(`tenant_${subdomain}`)
      .from('products')
      .upsert({
        local_id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        images: product.images,
        is_on_sale: product.is_on_sale,
      });
    
    results.push({ productId: product.id, status: 'success' });
  }
  
  return { total: products.length, results };
}
```

---

## 8. 验收标准

### 8.1 功能验收
| 编号 | 验收项 | 标准 |
|------|--------|------|
| V1 | 首次开通自动创建租户 | Supabase `tenants` 表有记录 |
| V2 | 自动创建 schema | `tenant_{subdomain}` schema 存在 |
| V3 | 自动创建 products 表 | 表结构符合规范 |
| V4 | 商品同步功能 | 勾选商品后成功同步到 Supabase |
| V5 | 走马灯显示 | 每条消息正确显示 |
| V6 | 进度条动画 | 流畅无卡顿 |

### 8.2 视觉验收
| 编号 | 验收项 | 标准 |
|------|--------|------|
| S1 | 科技感配色 | 深色背景 + 青色/紫色渐变 |
| S2 | 走马灯效果 | 打字效果 + 淡入淡出 |
| S3 | 粒子背景 | 50+ 粒子持续运动 |
| S4 | 进度条 | 流光动画效果 |
| S5 | 闪烁光标 | 500ms 闪烁 |
| S6 | 整体风格 | 赛博朋克/科幻感 |

### 8.3 性能验收
| 编号 | 验收项 | 标准 |
|------|--------|------|
| P1 | 首屏加载 | < 2s |
| P2 | 动画帧率 | ≥ 30fps |
| P3 | 粒子性能 | 不影响主线程 |

---

## 9. 技术实现依赖

| 依赖项 | 说明 |
|--------|------|
| `framer-motion` | 动画库 |
| `@supabase/supabase-js` | Supabase 客户端 |
| `canvas-confetti` | 成功动画 |
| React Context | 状态管理 |

---

## 10. 开发任务分解

| 任务 | 组件 | 预估工时 |
|------|------|----------|
| T1 | 创建科技感组件库（TechMarquee, TechProgressBar, ParticleBackground） | 4h |
| T2 | 实现 CloudStoreSetupWizard 主流程 | 6h |
| T3 | 对接 Supabase 租户创建 API | 3h |
| T4 | 实现商品同步功能 | 4h |
| T5 | 走马灯文案和动画调优 | 2h |
| T6 | 测试与修复 | 3h |
| **总计** | | **22h** |

---

**文档版本**：v6.0  
**创建日期**：2026-06-09  
**作者**：AI Assistant  
**状态**：待开发评审
