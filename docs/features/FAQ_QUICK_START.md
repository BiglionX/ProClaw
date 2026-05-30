# FAQ 自动收集系统 - 快速开始

## ✅ 已完成的功能

### 1. 核心服务
- ✅ `src/lib/faqService.ts` - FAQ管理服务（localStorage实现）
- ✅ 自动记录用户查询
- ✅ 高频问题检测（≥3次）
- ✅ 智能分类建议
- ✅ FAQ审核工作流
- ✅ 导出JSON功能

### 2. 集成点
- ✅ AI Chat自动记录查询（`aiGuide.ts`）
- ✅ FAQ管理页面（`FAQManagementPage.tsx`）
- ✅ 路由配置（`/faq-management`）
- ✅ 设置页面入口
- ✅ 营销网站FAQ页面动态加载

### 3. 数据库Schema
- ✅ `database/faq_schema.sql` - 完整的Supabase表结构（待执行）

---

## 🚀 立即使用

### 步骤1: 测试基本功能

1. **打开应用**
   ```bash
   npm run dev
   ```

2. **进入设置页面**
   - 点击左侧菜单"设置"
   - 选择"指令分析"标签
   - 你会看到新增的"FAQ 常见问题管理"卡片

3. **点击"管理FAQ"按钮**
   - 进入 `/faq-management` 页面
   - 查看统计信息
   - 查看待审核列表（初始为空）

### 步骤2: 生成测试数据

1. **在AI Chat中提问**
   - 打开右下角AI Chat
   - 输入以下问题（每个至少3次）：
     ```
     如何导入Excel？
     怎么批量添加产品？
     API密钥在哪里配置？
     库存预警怎么设置？
     ```

2. **返回FAQ管理页面**
   - 刷新页面
   - 点击"自动生成FAQ"按钮
   - 系统会从高频查询中创建FAQ草稿

3. **审核FAQ**
   - 在"待审核"区域查看新生成的FAQ
   - 点击展开查看详情
   - 编辑完善答案
   - 点击"通过"发布

### 步骤3: 导出并同步

1. **导出FAQ**
   - 在FAQ管理页面点击"导出JSON"
   - 下载的文件包含所有已发布的FAQ

2. **手动同步到营销网站**（当前版本）
   - 将导出的JSON复制到 `marketing-site/public/faqs.json`
   - 或者配置API端点自动同步

---

## 📊 功能演示

### 自动收集流程

```
用户在AI Chat提问
    ↓
recordUserQuery() 记录查询
    ↓
occurrence_count >= 3
    ↓
generateFAQSuggestions() 发现高频问题
    ↓
autoGenerateFAQFromQueries() 创建草稿
    ↓
状态: pending_review
    ↓
管理员审核并发布
    ↓
状态: published
    ↓
exportFAQsForMarketingSite() 导出
    ↓
同步到营销网站
```

### 管理界面功能

1. **统计卡片**
   - 总问题数
   - 已发布数量
   - 待审核数量
   - 自动收集数量
   - 平均有用率

2. **高频查询建议**
   - 显示出现≥3次的未回答问题
   - 智能分类标签
   - 一键生成FAQ

3. **待审核列表**
   - 展开查看详情
   - 编辑问题和答案
   - 通过/拒绝操作
   - 来源标记（自动/手动）

4. **已发布列表**
   - 搜索过滤
   - 查看统计数据（查看次数、有用投票）
   - 编辑和删除

---

## 🔧 高级配置

### 切换到Supabase（生产环境）

1. **执行数据库迁移**
   ```sql
   -- 在Supabase SQL Editor中运行
   -- 文件: database/faq_schema.sql
   ```

2. **更新faqService.ts**
   - 将localStorage调用替换为Supabase查询
   - 参考 `docs/FAQ_AUTO_COLLECTION_SYSTEM.md` 中的示例代码

3. **配置RLS策略**
   - 确保已设置正确的行级安全策略
   - 测试不同角色的访问权限

### 设置定时任务

```typescript
// 每小时自动检查高频问题
import cron from 'node-cron';

cron.schedule('0 * * * *', () => {
  const count = autoGenerateFAQFromQueries();
  if (count > 0) {
    console.log(`Auto-generated ${count} FAQ drafts`);
    // 发送通知给管理员
  }
});
```

### 配置API端点

```typescript
// src/api/faq.ts
import express from 'express';
import { exportFAQsForMarketingSite } from '../lib/faqService';

const router = express.Router();

router.get('/faqs/export', async (req, res) => {
  try {
    const data = exportFAQsForMarketingSite();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export FAQs' });
  }
});

export default router;
```

---

## 📝 使用技巧

### 提高FAQ质量

1. **及时审核**
   - 每天检查待审核队列
   - 确保答案准确完整
   - 添加相关标签

2. **优化答案**
   - 使用清晰的步骤说明
   - 添加截图或示例
   - 提供相关链接

3. **监控反馈**
   - 关注低有用率的FAQ
   - 根据用户反馈改进
   - 定期更新过时内容

### 数据分析

在FAQ管理页面查看：
- 🔥 热门问题（高查看次数）
- ⭐ 精选FAQ（is_featured）
- 👍 高有用率问题
- ❌ 需要改进的问题

---

## 🐛 故障排除

### 问题1: FAQ没有自动生成

**原因**: 查询次数未达到阈值（默认3次）

**解决**:
- 确保同一问题被询问至少3次
- 或在代码中降低阈值：
  ```typescript
  // faqService.ts line 238
  .filter(q => !q.is_answered && q.occurrence_count >= 2) // 改为2次
  ```

### 问题2: 导出数据为空

**原因**: 没有已发布的FAQ

**解决**:
- 先审核并发布一些FAQ
- 检查 `status === 'published'` 的问题是否存在

### 问题3: 营销网站无法加载FAQ

**原因**: API端点不可用

**解决**:
- 检查主应用是否运行在 `localhost:3000`
- 或手动复制JSON文件到 `marketing-site/public/faqs.json`
- 更新FAQPage.tsx中的API地址

---

## 📈 下一步优化

### 短期（1周）
- [ ] 添加邮件通知功能
- [ ] 实现批量审核
- [ ] 添加FAQ模板
- [ ] 支持图片上传

### 中期（1月）
- [ ] 迁移到Supabase
- [ ] 实现实时同步
- [ ] 添加多语言支持
- [ ] AI自动生成答案草稿

### 长期（3月+）
- [ ] 智能推荐相关问题
- [ ] 用户行为分析仪表板
- [ ] A/B测试不同答案
- [ ] 集成客服系统

---

## 🎯 关键指标

监控以下指标评估效果：

1. **覆盖率**: 已回答查询 / 总查询 > 80%
2. **有用率**: 有帮助投票 / 总投票 > 70%
3. **自动化率**: 自动收集FAQ / 总FAQ > 50%
4. **响应时间**: 从收集到发布 < 24小时

---

## 📞 获取帮助

如有问题，请：
1. 查看 `docs/FAQ_AUTO_COLLECTION_SYSTEM.md` 详细文档
2. 检查浏览器控制台错误信息
3. 提交GitHub Issue

---

**祝使用愉快！** 🎉
