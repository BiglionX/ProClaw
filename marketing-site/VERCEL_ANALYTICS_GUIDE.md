# Vercel Analytics 使用指南

## 📊 什么是Vercel Analytics？

Vercel Analytics 是一个免费的网站流量分析工具，提供：
- ✅ 实时访问量统计
- ✅ 页面浏览量（PV）
- ✅ 独立访客数（UV）
- ✅ 访问来源分析
- ✅ 设备类型统计
- ✅ 地理位置分布
- ✅ 完全免费，无数据限制

---

## 🚀 启用步骤

### 方式1: Dashboard自动启用（推荐）⭐

#### 步骤1: 登录Vercel

访问: https://vercel.com/dashboard

#### 步骤2: 选择项目

点击您的项目 `proclaw-marketing`

#### 步骤3: 启用Analytics

1. 左侧菜单点击 **"Analytics"**
2. 点击 **"Enable Analytics"** 按钮
3. 阅读条款并点击 **"Confirm"**

✅ **完成！** 系统会自动注入分析代码。

---

### 方式2: 手动安装（已完成）✅

我们已经在代码中添加了Analytics组件：

**修改的文件**:
- `marketing-site/src/main.tsx` - 添加 `<Analytics />` 组件
- `marketing-site/package.json` - 添加 `@vercel/analytics` 依赖

**代码示例**:
```tsx
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />  {/* Analytics组件 */}
  </React.StrictMode>,
);
```

---

## 📈 查看统计数据

### 访问Analytics Dashboard

1. 登录 Vercel: https://vercel.com/dashboard
2. 选择项目 `proclaw-marketing`
3. 点击左侧 **"Analytics"**

### 主要指标

#### 1. Overview（概览）
- **Visitors**: 独立访客数
- **Pageviews**: 页面浏览量
- **Views per Visitor**: 每访客浏览页数

#### 2. Realtime（实时）
- 当前在线用户数
- 实时页面浏览
- 最近访问的页面

#### 3. Pages（页面）
- 最热门的页面
- 每个页面的访问量
- 平均停留时间

#### 4. Sources（来源）
- 直接访问
- 搜索引擎
- 社交媒体
- 外部链接

#### 5. Devices（设备）
- 桌面端 vs 移动端
- 浏览器类型
- 操作系统

#### 6. Locations（地理位置）
- 国家分布
- 城市分布

---

## 🔧 高级用法

### 自定义事件追踪

如果您想追踪特定事件（如按钮点击、表单提交）：

```tsx
import { track } from '@vercel/analytics';

// 追踪按钮点击
<button onClick={() => track('Download Clicked')}>
  下载
</button>

// 追踪表单提交
<form onSubmit={() => track('Form Submitted', {
  formName: 'contact',
  fields: ['name', 'email']
})}>
  ...
</form>
```

### 页面视图追踪

Vercel Analytics 会自动追踪页面视图，无需额外配置。

如果您使用React Router，它会自动检测路由变化。

---

## 📊 数据隐私

### GDPR合规

Vercel Analytics 符合GDPR要求：
- ✅ 不收集个人身份信息（PII）
- ✅ 不使用Cookie
- ✅ 数据匿名化处理
- ✅ 用户可以选择不追踪

### 禁用追踪

用户可以通过以下方式禁用追踪：

**方法1: Do Not Track**
如果用户浏览器启用了 "Do Not Track"，Analytics会自动禁用。

**方法2: 手动禁用**
```tsx
import { Analytics } from '@vercel/analytics/react';

<Analytics disabled={userOptedOut} />
```

---

## 💡 最佳实践

### 1. 定期检查数据

建议每周查看一次Analytics：
- 了解流量趋势
- 发现热门内容
- 优化用户体验

### 2. 关注关键指标

**重要指标**:
- ** bounce rate**: 跳出率（越低越好）
- **avg. time on page**: 平均页面停留时间
- **top pages**: 热门页面
- **traffic sources**: 流量来源

### 3. A/B测试

使用Analytics数据指导A/B测试：
- 测试不同的页面布局
- 测试不同的CTA按钮
- 分析哪个版本效果更好

### 4. 优化性能

Analytics数据显示：
- 哪些页面加载慢
- 哪些设备访问多
- 针对性优化

---

## 🔗 集成其他工具

### Google Analytics（可选）

如果您还需要Google Analytics：

1. 在 `index.html` 中添加GA代码：

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

2. Vercel Analytics 和 GA 可以同时使用，互不影响。

---

## ❓ 常见问题

### Q1: Analytics数据多久更新？

**答**: 
- 实时数据：几乎即时（几秒内）
- 完整数据：最多延迟5分钟

### Q2: 数据保留多久？

**答**: 
- Vercel Analytics 免费计划：数据永久保留
- 无数据量限制

### Q3: 可以导出数据吗？

**答**: 
- 目前不支持直接导出
- 可以通过API获取数据（需要Vercel Pro计划）

### Q4: 会影响网站性能吗？

**答**: 
- 几乎无影响
- Analytics脚本异步加载
- 文件大小约2KB（gzip后）

### Q5: 如何验证Analytics是否工作？

**答**: 
1. 部署网站
2. 访问网站
3. 等待1-2分钟
4. 刷新Vercel Analytics Dashboard
5. 应该能看到访问记录

---

## 📱 移动端查看

Vercel Dashboard支持移动端访问：

1. 手机浏览器访问: https://vercel.com
2. 登录账号
3. 选择项目
4. 查看Analytics

或者使用Vercel移动App（如果可用）。

---

## 🎯 下一步

启用Analytics后：

1. ✅ 等待第一次访问数据
2. ✅ 设置定期查看提醒
3. ✅ 分析用户行为
4. ✅ 优化网站内容
5. ✅ 分享数据给团队

---

## 📞 支持

- **Vercel文档**: https://vercel.com/docs/analytics
- **Vercel社区**: https://github.com/vercel/analytics/discussions
- **ProClaw Issues**: https://github.com/BiglionX/ProClaw/issues

---

**祝您数据分析顺利！** 📊

*最后更新: 2026年4月15日*
