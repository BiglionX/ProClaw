# 仪表盘快速启动指南

## 🚀 5 分钟快速开始

### 步骤 1：安装依赖（如果还没有）

```bash
npm install
```

### 步骤 2：启动开发服务器

```bash
npm run dev
```

等待服务器启动完成，通常会显示类似：
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 步骤 3：访问仪表盘

在浏览器中打开显示的地址（通常是 `http://localhost:5173`）

### 步骤 4：登录系统

使用您的账号登录，或注册新账号。

### 步骤 5：查看仪表盘

登录后，您应该会自动进入仪表盘页面，或者点击侧边栏的"仪表盘"菜单项。

---

## 📊 如果数据显示为 0

这是正常的！因为数据库中可能还没有数据。您可以：

### 选项 A：使用测试数据生成脚本（推荐）

创建测试数据的 SQL 脚本将在未来提供。

### 选项 B：手动添加测试数据

#### 1. 添加产品

在"产品管理"页面添加几个产品，或通过 SQL：

```sql
-- 插入示例产品
INSERT INTO products (id, sku, name, cost_price, sell_price, current_stock, min_stock, unit)
VALUES 
  ('prod-001', 'SKU001', '测试产品A', 10.00, 20.00, 50, 10, '个'),
  ('prod-002', 'SKU002', '测试产品B', 15.00, 30.00, 5, 10, '个'),
  ('prod-003', 'SKU003', '测试产品C', 8.00, 16.00, 0, 5, '个');
```

#### 2. 添加库存交易

```sql
-- 插入最近的出库记录（用于销售趋势图）
INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, created_at)
VALUES 
  ('txn-001', 'prod-001', 'outbound', 10, datetime('now', '-6 days')),
  ('txn-002', 'prod-001', 'outbound', 15, datetime('now', '-5 days')),
  ('txn-003', 'prod-001', 'outbound', 12, datetime('now', '-4 days')),
  ('txn-004', 'prod-001', 'outbound', 18, datetime('now', '-3 days')),
  ('txn-005', 'prod-001', 'outbound', 20, datetime('now', '-2 days')),
  ('txn-006', 'prod-001', 'outbound', 25, datetime('now', '-1 days')),
  ('txn-007', 'prod-001', 'outbound', 22, datetime('now'));

-- 插入入库记录
INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, created_at)
VALUES 
  ('txn-008', 'prod-001', 'inbound', 50, datetime('now', '-7 days')),
  ('txn-009', 'prod-001', 'inbound', 30, datetime('now', '-3 days'));
```

#### 3. 添加销售订单

```sql
-- 插入本月的销售订单
INSERT INTO sales_orders (id, so_number, customer_id, order_date, total_amount, status, payment_status)
VALUES 
  ('so-001', 'SO-20240401', 'cust-001', date('now', '-10 days'), 5000.00, 'delivered', 'paid'),
  ('so-002', 'SO-20240402', 'cust-002', date('now', '-5 days'), 8000.00, 'delivered', 'paid'),
  ('so-003', 'SO-20240403', 'cust-001', date('now', '-2 days'), 12000.00, 'shipped', 'partial');
```

#### 4. 添加采购订单

```sql
-- 插入本月的采购订单
INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, total_amount, status, payment_status)
VALUES 
  ('po-001', 'PO-20240401', 'supp-001', date('now', '-15 days'), 3000.00, 'received', 'paid'),
  ('po-002', 'PO-20240402', 'supp-002', date('now', '-7 days'), 5000.00, 'received', 'unpaid');
```

### 选项 C：使用应用程序界面

1. **添加产品**：导航到"产品管理" → "添加产品"
2. **创建库存交易**：导航到"库存管理" → "入库/出库"
3. **创建销售订单**：导航到"销售管理" → "新建订单"
4. **创建采购订单**：导航到"采购管理" → "新建订单"

---

## 🔍 验证功能

添加数据后，刷新仪表盘页面，您应该能看到：

### ✅ 关键指标卡片
- **产品总数**：显示实际的产品数量
- **本月销售额**：显示本月销售总额
- **今日交易**：显示今天的交易次数
- **库存预警**：显示低库存和缺货产品数

### ✅ 财务概览
- **应收账款**：未完全支付的销售订单金额
- **应付账款**：未完全支付的采购订单金额
- **营运资金**：可用的流动资金

### ✅ 图表
- **销售趋势图**：最近 7 天的折线图
- **库存分布图**：饼图显示库存状态

### ✅ 列表
- **畅销产品 TOP 5**：按销量排名的产品
- **低库存预警**：需要补货的产品

---

## 🐛 故障排除

### 问题 1：页面空白或加载失败

**解决方案：**
1. 检查浏览器控制台是否有错误
2. 确认后端服务正在运行
3. 检查网络连接

### 问题 2：所有数据都是 0

**原因：** 数据库中没有数据  
**解决方案：** 按照上面的"手动添加测试数据"部分添加数据

### 问题 3：图表不显示

**原因：** 没有足够的数据点  
**解决方案：** 确保有至少 7 天的库存交易记录

### 问题 4：显示错误提示

**常见错误：**
- "Network Error" - 后端服务未启动
- "Database Error" - 数据库连接问题
- "Permission Denied" - 权限不足

**解决方案：**
1. 检查后端 Rust 服务是否运行
2. 验证数据库配置
3. 确认用户权限

### 问题 5：数据不更新

**解决方案：**
1. 点击"刷新数据"按钮
2. 清除浏览器缓存
3. 硬刷新（Ctrl+F5 或 Cmd+Shift+R）

---

## 💡 提示和技巧

### 1. 键盘快捷键
- **F5** 或 **Ctrl+R**：刷新页面
- **Ctrl+F5**：硬刷新（清除缓存）

### 2. 浏览器开发者工具
按 **F12** 打开开发者工具：
- **Console** 标签：查看错误信息
- **Network** 标签：监控 API 请求
- **Elements** 标签：检查 DOM 结构

### 3. 性能优化
- 首次加载较慢是正常的
- 后续访问会使用浏览器缓存
- 定期清理不再需要的测试数据

### 4. 数据解读
- **利润率** = (月收入 - 月支出) / 月收入 × 100%
- **库存周转率** = 总销量 / 平均库存
- **营运资金** = 应收 - 应付 + 库存价值

---

## 📚 相关文档

- [仪表盘功能详细说明](./DASHBOARD_IMPROVEMENTS.md)
- [仪表盘测试指南](./DASHBOARD_TESTING_GUIDE.md)
- [仪表盘完成总结](./DASHBOARD_COMPLETION_SUMMARY.md)

---

## 🎉 恭喜！

现在您已经成功设置并查看了 ProClaw 仪表盘！

接下来您可以：
1. 探索其他功能模块
2. 添加更多真实业务数据
3. 根据实际需求定制仪表盘
4. 查看数据分析报告

如有任何问题，请查阅相关文档或联系技术支持。

---

**最后更新**：2024-04-15  
**版本**：v1.0
