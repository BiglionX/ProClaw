# AI智能决策系统 - 开发指南

## 📋 概述

ProClaw AI智能决策系统是基于LangChain.js框架构建的企业级AI分析平台，提供销售预测、库存优化、异常检测、智能采购建议等深度业务洞察功能。

## ✨ 核心功能

### 已实现功能（Phase 1-2）

✅ **LLM提供商管理**
- 支持OpenAI、Anthropic Claude、Ollama本地模型
- 智能路由：根据任务类型自动选择最优模型
- 连接测试和错误处理

✅ **AI工具函数库**
- 业务数据格式化
- 洞察提取和验证
- 动态提示词生成
- Token优化策略

✅ **数据分析服务**
- 销售趋势分析与预测
- 库存优化建议
- 异常检测引擎
- 智能采购建议生成

✅ **缓存层**
- 内存缓存带TTL自动失效
- 命中率监控
- 缓存预热机制

### 演示页面

访问 `/ai-demo` 路径可以快速测试所有AI分析功能。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install @langchain/core @langchain/openai @langchain/anthropic @langchain/ollama langchain simple-statistics
```

### 2. 配置LLM提供商

在应用中进入"设置" -> "AI设置"，配置至少一个LLM提供商：

**选项A：OpenAI（推荐）**
- API端点: `https://api.openai.com/v1`
- 模型: `gpt-4` 或 `gpt-3.5-turbo`
- 需要API Key

**选项B：Anthropic Claude**
- 模型: `claude-3-sonnet-20240229`
- 需要API Key

**选项C：Ollama本地模型**
- 端点: `http://localhost:11434`
- 模型: `llama2`, `mistral` 等
- 无需API Key，但需本地安装Ollama

### 3. 运行应用

```bash
npm run dev
```

访问 `http://localhost:5173/ai-demo` 查看演示页面。

## 📁 项目结构

```
src/lib/
├── aiConfig.ts              # AI配置管理
├── llmProvider.ts           # LLM提供商管理器
├── aiTools.ts               # AI工具函数库
├── aiAnalyticsService.ts    # 数据分析服务
├── aiCache.ts               # 缓存层
└── agents/                  # AI Agent系统（待实现）
    ├── BaseAgent.ts
    ├── BusinessAnalystAgent.ts
    ├── InventoryOptimizer.ts
    ├── SalesForecaster.ts
    └── DecisionAdvisor.ts

src/pages/
└── AIDemoPage.tsx           # AI演示页面
```

## 🔧 使用示例

### 销售预测

```typescript
import { analyzeSalesTrend } from './lib/aiAnalyticsService';

const result = await analyzeSalesTrend('30d');
console.log(result.trend.direction); // 'upward' | 'downward' | 'stable'
console.log(result.insights.keyFindings); // 关键发现
console.log(result.insights.recommendations); // 行动建议
```

### 库存优化

```typescript
import { optimizeInventory } from './lib/aiAnalyticsService';

const result = await optimizeInventory();
console.log(result.recommendedActions); // 优化建议列表
console.log(result.estimatedSavings); // 预估节省成本
```

### 异常检测

```typescript
import { detectAnomalies } from './lib/aiAnalyticsService';

const result = await detectAnomalies();
console.log(result.anomalies); // 异常列表
console.log(result.summary.criticalCount); // 严重异常数量
```

### 采购建议

```typescript
import { generatePurchaseSuggestions } from './lib/aiAnalyticsService';

const suggestions = await generatePurchaseSuggestions();
suggestions.forEach(s => {
  console.log(`${s.productName}: 建议采购 ${s.suggestedQuantity} ${s.unit}`);
});
```

## 🎯 技术架构

### LLM提供商管理器

```typescript
import { getLLMProviderManager } from './lib/llmProvider';
import { getAIConfig } from './lib/aiConfig';

const config = await getAIConfig();
const manager = getLLMProviderManager();
await manager.initialize(config);

// 根据任务类型获取最优LLM
const llm = await manager.getProvider('sales_forecast');
```

### 缓存层

```typescript
import { getAICache, CacheKeyGenerator } from './lib/aiCache';

const cache = getAICache();

// 使用缓存
const result = await cache.getOrSet(
  CacheKeyGenerator.salesForecast('30d'),
  () => analyzeSalesTrend('30d'),
  300 // TTL: 5分钟
);
```

## 📊 性能指标

- **简单查询响应时间**: < 3秒
- **复杂分析响应时间**: < 15秒
- **缓存命中率**: 目标 > 60%
- **Token使用效率**: 通过压缩和采样优化30%+

## 🔍 调试技巧

### 查看LLM调用日志

在浏览器控制台可以看到详细的LLM调用信息：

```javascript
// 启用详细日志
localStorage.setItem('DEBUG', 'langchain:*');
```

### 检查缓存状态

```javascript
import { getAICache } from './lib/aiCache';
const cache = getAICache();
console.log(cache.getStats());
// { hits: 10, misses: 5, size: 8, hitRate: 0.67 }
```

### 测试LLM连接

在演示页面点击"检查状态"按钮，或在代码中：

```typescript
const manager = getLLMProviderManager();
const result = await manager.testConnection('openai');
console.log(result.success, result.message);
```

## ⚠️ 注意事项

### API费用

- OpenAI GPT-4: 约 $0.03/1K tokens
- Claude 3 Sonnet: 约 $0.015/1K tokens
- Ollama本地模型: 免费（需自备硬件）

建议：
- 开发阶段使用GPT-3.5-turbo或本地模型
- 生产环境根据需求选择合适的模型
- 启用缓存减少重复调用

### 数据隐私

- 云端LLM会发送业务数据到第三方
- 敏感数据建议使用本地Ollama模型
- 未来版本将支持数据脱敏

### 离线支持

当前版本需要网络连接（除非使用本地Ollama）。计划在未来版本中添加：
- 离线模式自动切换
- 请求队列和同步
- 降级到统计分析

## 🛣️ 开发路线图

### Phase 3: AI Agent系统（进行中）
- [ ] Agent基类框架
- [ ] 业务分析Agent
- [ ] 库存优化Agent
- [ ] 销售预测Agent
- [ ] 决策建议Agent

### Phase 4: UI交互层
- [ ] 专业AI分析页面
- [ ] 高级可视化组件
- [ ] 实时进度指示器
- [ ] 增强的AI聊天集成

### Phase 5: 高级功能
- [ ] 自动化工作流
- [ ] 知识库系统
- [ ] A/B测试框架
- [ ] 解释性AI

### Phase 6-7: 优化与部署
- [ ] 性能优化
- [ ] 单元测试
- [ ] 用户文档
- [ ] 开发者文档

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 提交Issue
- 描述清楚问题和复现步骤
- 附上相关日志和截图
- 标注优先级和影响范围

### 提交PR
1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 GPL-3.0 许可证。

## 📞 支持

如有问题，请：
1. 查阅本文档
2. 搜索现有Issues
3. 创建新Issue

---

**最后更新**: 2024年
**版本**: v0.1.0-alpha
