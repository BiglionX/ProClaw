# FAQ 自动收集与管理系统 - 实施方案

## 📋 概述

本系统实现了从用户对话中自动识别常见问题，存储到数据库，经审核后同步到营销网站FAQ页面的完整流程。

---

## 🏗️ 系统架构

```
用户提问 (AI Chat)
    ↓
意图识别 & 问题提取
    ↓
记录到 user_queries 表
    ↓
高频问题检测 (≥3次)
    ↓
自动生成FAQ草稿 (pending_review)
    ↓
管理员审核
    ↓
发布 (published)
    ↓
同步到营销网站FAQ页面
```

---

## 📊 数据库设计

### 核心表结构

已在 `database/faq_schema.sql` 中定义：

1. **faq_categories** - FAQ分类
2. **faq_questions** - FAQ问题（含状态管理）
3. **faq_feedback** - 用户反馈（有帮助/无帮助）
4. **user_queries** - 用户查询记录（用于自动发现）

### 关键字段

```sql
-- FAQ问题状态流转
status: 'draft' → 'pending_review' → 'published' / 'archived'

-- 来源类型
source_type: 
  - 'manual': 手动创建
  - 'auto_collected': 自动收集
  - 'ai_suggested': AI建议

-- 优先级排序
priority: 数字越大越靠前
is_featured: 是否精选展示
```

---

## 🔧 实现步骤

### Step 1: 执行数据库迁移

```bash
# 在Supabase SQL Editor中执行
psql -f database/faq_schema.sql
```

### Step 2: 集成到AI Chat

修改 `src/lib/aiGuide.ts`，在用户提问时记录查询：

```typescript
import { recordUserQuery } from './faqService';

// 在 handleUserInput 函数中添加
export async function handleUserInput(userInput: string): Promise<...> {
  // ... 现有逻辑
  
  // 记录用户查询（异步，不阻塞响应）
  recordUserQuery(userInput, {
    queryType: 'chat',
    context: {
      currentPage: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
  }).catch(err => console.error('Failed to record query:', err));
  
  // ... 继续处理
}
```

### Step 3: 创建FAQ管理服务

文件：`src/lib/faqService.ts`

核心功能：
- ✅ 记录用户查询
- ✅ 检测高频问题
- ✅ 自动生成FAQ草稿
- ✅ 管理员审核
- ✅ 获取已发布FAQ
- ✅ 提交反馈
- ✅ 统计数据

### Step 4: 创建管理界面

文件：`src/pages/FAQManagementPage.tsx`

功能模块：
1. **待审核列表** - 显示所有 `pending_review` 的问题
2. **批量操作** - 通过/拒绝/编辑
3. **统计分析** - 热门问题、有用率等
4. **高频查询** - 从未回答的查询中发现新问题
5. **导出功能** - 导出为JSON供营销网站使用

### Step 5: 更新营销网站FAQ页面

文件：`marketing-site/src/pages/FAQPage.tsx`

改为从API动态加载：

```typescript
const FAQPage: React.FC = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      // 从主应用API获取已发布的FAQ
      const response = await fetch('http://localhost:3000/api/faqs/published');
      const data = await response.json();
      setFaqs(data);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">常见问题 (FAQ)</h1>
        
        {faqs.map(category => (
          <section key={category.slug} className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">{category.category.name}</h2>
            <div className="space-y-6">
              {category.questions.map((faq, idx) => (
                <div key={idx} className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                  
                  {/* 反馈按钮 */}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => submitFeedback(faq.id, true)}>
                      👍 有帮助
                    </button>
                    <button onClick={() => submitFeedback(faq.id, false)}>
                      👎 无帮助
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};
```

### Step 6: 创建API端点

在主应用中添加API路由（如果使用Express或类似框架）：

```typescript
// src/api/faq.ts
import express from 'express';
import { getPublishedFAQs, exportFAQsForMarketingSite } from '../lib/faqService';

const router = express.Router();

// 获取已发布的FAQ（公开）
router.get('/published', async (req, res) => {
  try {
    const faqs = await getPublishedFAQs();
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

// 导出FAQ供营销网站使用
router.get('/export', async (req, res) => {
  try {
    const data = await exportFAQsForMarketingSite();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export FAQs' });
  }
});

export default router;
```

---

## 🤖 自动化流程

### 1. 自动收集

```typescript
// 后台任务：每小时检查一次高频查询
async function checkAndGenerateFAQSuggestions() {
  const suggestions = await generateFAQSuggestions(10);
  
  for (const suggestion of suggestions) {
    // 检查是否已存在类似问题
    const existing = await searchFAQs(suggestion.query_text);
    
    if (existing.length === 0) {
      // 创建新的FAQ草稿
      await createFAQQuestion(
        suggestion.query_text,
        '待完善答案...', // 需要人工填写
        {
          sourceType: 'auto_collected',
          sourceQuery: suggestion.query_text,
          tags: [suggestion.suggested_category],
        }
      );
    }
  }
}

// 使用cron job定时执行
import cron from 'node-cron';
cron.schedule('0 * * * *', checkAndGenerateFAQSuggestions); // 每小时
```

### 2. 智能分类

基于关键词自动建议分类：

```typescript
function suggestCategory(queryText: string): string {
  const text = queryText.toLowerCase();
  
  const categoryMap = {
    'getting-started': ['安装', '配置', '开始', '入门'],
    'ai-features': ['ai', '模型', 'api', '大模型', 'token'],
    'data-management': ['产品', '库存', '销售', '订单'],
    'account-subscription': ['账户', '付费', '订阅', '价格'],
    'troubleshooting': ['错误', '失败', '问题', 'bug'],
    'developer': ['api', '开发', '集成', 'webhook'],
  };
  
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }
  
  return 'getting-started';
}
```

### 3. 通知管理员

当有新的待审核FAQ时：

```typescript
async function notifyAdmins(newFAQCount: number) {
  if (newFAQCount === 0) return;
  
  // 发送邮件通知
  await sendEmail({
    to: 'admin@proclaw.cc',
    subject: `📝 有 ${newFAQCount} 个FAQ等待审核`,
    body: `请登录管理后台查看并审核新收集的FAQ问题。`,
  });
  
  // 或在应用内显示通知
  await createNotification({
    type: 'faq_review_pending',
    message: `${newFAQCount} 个FAQ等待审核`,
    link: '/settings?tab=faq-management',
  });
}
```

---

## 📈 数据分析

### 关键指标

1. **问题覆盖率**
   - 已回答查询数 / 总查询数
   - 目标：> 80%

2. **FAQ有用率**
   - 有帮助投票数 / 总投票数
   - 目标：> 70%

3. **自动收集效率**
   - 自动生成的FAQ数 / 总FAQ数
   - 目标：> 50%

4. **审核响应时间**
   - 从收集到审核的平均时间
   - 目标：< 24小时

### 可视化仪表板

在管理界面展示：
- 📊 每日查询趋势图
- 🔥 Top 10 热门问题
- ⭐ 最有用的FAQ
- ❌ 需要改进的FAQ（低有用率）
- 🕒 待审核队列

---

## 🔐 权限控制

### RLS策略

```sql
-- 公开读取已发布的FAQ
CREATE POLICY "Anyone can view published FAQs"
  ON faq_questions FOR SELECT
  USING (status = 'published');

-- 仅管理员可管理FAQ
CREATE POLICY "Admins can manage FAQs"
  ON faq_questions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- 任何人都可以提交反馈
CREATE POLICY "Anyone can submit feedback"
  ON faq_feedback FOR INSERT
  WITH CHECK (true);
```

---

## 🚀 部署清单

- [ ] 执行数据库迁移脚本
- [ ] 部署FAQ管理服务
- [ ] 配置API端点
- [ ] 设置定时任务（高频问题检测）
- [ ] 集成到AI Chat
- [ ] 创建管理界面
- [ ] 更新营销网站FAQ页面
- [ ] 配置邮件通知
- [ ] 测试完整流程
- [ ] 监控和分析

---

## 💡 最佳实践

### 1. 质量控制
- ✅ 所有自动收集的FAQ必须经过人工审核
- ✅ 定期检查低有用率的FAQ并优化
- ✅ 保持答案简洁明了，提供具体步骤

### 2. 用户体验
- ✅ 在FAQ页面提供搜索功能
- ✅ 显示相关问题和推荐
- ✅ 允许用户快速反馈

### 3. 内容维护
- ✅ 每月审查一次归档的FAQ
- ✅ 根据产品更新及时修改答案
- ✅ 删除过时或重复的问题

### 4. 性能优化
- ✅ 缓存已发布的FAQ（Redis）
- ✅ 分页加载大量FAQ
- ✅ 使用CDN加速静态内容

---

## 📝 示例数据流

### 场景：用户询问"如何导入Excel"

1. **用户提问** (AI Chat)
   ```
   用户: "怎么批量导入产品？有Excel模板吗？"
   ```

2. **记录查询**
   ```sql
   INSERT INTO user_queries (query_text, query_type, context)
   VALUES ('怎么批量导入产品？有Excel模板吗？', 'chat', {...});
   ```

3. **检测到高频** (假设已有5个类似查询)
   ```sql
   SELECT query_text, COUNT(*) as count
   FROM user_queries
   WHERE is_answered = false
   GROUP BY query_text
   HAVING COUNT(*) >= 3;
   ```

4. **生成FAQ草稿**
   ```sql
   INSERT INTO faq_questions (
     question, answer, source_type, source_query, status, category_id
   ) VALUES (
     '如何批量导入产品数据？',
     '待完善...',
     'auto_collected',
     '怎么批量导入产品？有Excel模板吗？',
     'pending_review',
     (SELECT id FROM faq_categories WHERE slug = 'data-management')
   );
   ```

5. **管理员审核**
   - 登录管理后台
   - 查看待审核列表
   - 编辑完善答案
   - 点击"发布"

6. **同步到营销网站**
   ```bash
   curl http://localhost:3000/api/faqs/export > marketing-site/public/faqs.json
   ```

7. **用户看到答案**
   - 访问 https://proclaw.cc/faq
   - 在"数据管理"分类下找到该问题
   - 阅读详细的答案和步骤

---

## 🎯 预期效果

### 短期（1个月）
- 收集100+用户查询
- 生成20-30个FAQ草稿
- 发布15-20个高质量FAQ
- FAQ有用率达到70%+

### 中期（3个月）
- 建立完整的FAQ知识库
- 自动收集覆盖80%常见问题
- 减少客服咨询量50%+
- 提升用户满意度

### 长期（6个月）
- 形成自我优化的FAQ系统
- 支持多语言FAQ
- 集成AI自动回答
- 成为产品的重要价值点

---

## 🔗 相关文件

- 数据库Schema: `database/faq_schema.sql`
- FAQ服务: `src/lib/faqService.ts` (待创建)
- 管理页面: `src/pages/FAQManagementPage.tsx` (待创建)
- 营销网站FAQ: `marketing-site/src/pages/FAQPage.tsx` (待更新)
- API路由: `src/api/faq.ts` (待创建)

---

这个方案提供了一个完整的FAQ自动收集和管理体系，从用户对话中智能发现问题，经过审核后自动同步到营销网站，大大提升了FAQ的时效性和准确性。
