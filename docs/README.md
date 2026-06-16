# 📚 ProClaw 文档中心

欢迎使用 ProClaw 文档中心！这里包含了所有关于 ProClaw 项目的文档资源。

## 📋 目录

### 🏗️ 产品需求 (PRD)
- [PRD 总索引](prd/PRD_INDEX.md) - **43 份 PRD 的唯一入口**（覆盖 34 已实现 / 6 部分实现 / 1 草案 / 1 已替代 + 1 重复），含按主题/状态/版本号分类
- 每份 PRD 顶部均已添加「实施状态」区块（首次落地版本、关联发布、代码入口、覆盖率、差异与遗留）
- 主要 PRD 快查表：
  - [PRD v4.0 核心需求](prd/ProClaw_PRD_v4.0.md)（已替代 → 由 v11.0 / v12.0 承接）
  - [CEO Agent 主控官 (v6.2)](prd/需求文档：CEO%20Agent%20作为主控官%20-%20项目上下文协议与任务分派（PRD%20v6.2）.md)
  - [CEO Agent 决策确认 (v6.3)](prd/需求文档：CEO%20Agent%20决策确认机制与个性化学习（PRD%20v6.3）.md)
  - [AI Team 群聊 LLM (v6.4)](prd/需求文档：AI%20Team%20群聊%20LLM%20接入与演示账号%20Token（PRD%20v6.4）.md)
  - [手机独立版 (v11.0)](prd/产品需求文档：ProClaw%20手机独立版（PRD%20v11.0）.md)
  - [底部导航重构 (v11.1)](prd/产品需求文档：ProClaw%20手机端底部导航重构（v11.1）.md)
  - [消息链路对齐 (v11.2)](prd/需求文档：ProClaw%20手机端消息链路对齐补充需求（PRD%20v11.2）.md)
  - [云托管商城 (v5.0)](prd/需求文档：ProClaw%20云托管商城（AI%20生成独立站）PRD%20v5.0.md)
  - [Token 计费 (v8.0)](prd/需求文档：ProClaw%20云托管商城%20Token%20计费模式改造（PRD%20v8.0）.md)
  - [营销网站用户中心 (v7.1)](prd/需求文档：ProClaw%20营销网站用户中心（PRD%20v7.1）.md)
  - [营销网站优化升级 (v7.2)](prd/需求文档：ProClaw%20营销网站优化升级（PRD%20v7.2）.md)
  - [行业插件架构升级](prd/需求文档：ProClaw%20插件化行业版架构升级.md)
  - [行业插件功能实现 (餐饮/美业/宠物/Cloud)](prd/需求文档：行业插件功能实现（餐饮%20美业%20宠物%20Cloud）.md)
  - [桌面端 UI 全面升级 (v11.0)](prd/需求文档：ProClaw%20桌面端%20UI%20全面升级（PRD%20v11.0）.md)
  - [进销存增强 (P0/P1/P2)](prd/SUPPLY_CHAIN_ENHANCEMENT_PRD.md)
  - [架构分层优化方案](prd/%23%23%20产品需求文档：ProClaw架构分层优化方案（PRD%20v1.0）.md)

### 📘 用户指南 (Guides)
- [安装指南](guides/INSTALLATION_GUIDE.md) - 详细安装步骤
- [快速开始](guides/QUICKSTART.md) - 快速上手指南
- [部署用户指南](guides/DEPLOYMENT_USER_GUIDE.md) - 部署说明
- [Pro 版开通指南](guides/PRO_SETUP_GUIDE.md) - Pro 版配置
- [Supabase 设置](guides/SUPABASE_SETUP.md) - 配置 Supabase 后端
- [数据库快速开始](guides/DATABASE_QUICKSTART.md) - 数据库初始化
- [新数据库配置指南](guides/NEW_DATABASE_SETUP.md) - 全新数据库搭建
- [认证设置](guides/AUTH_SETUP.md) - 认证配置
- [测试指南](guides/TESTING_GUIDE.md) - 运行测试
- [测试快速开始](guides/TESTING_QUICKSTART.md) - 测试入门
- [Agent 开发指南](guides/AGENT_DEVELOPMENT.md) - Agent 开发

### 📗 技术架构 (Architecture)
- [技术方案](TECHNICAL_OVERVIEW.md) - 系统架构和技术栈
- [数据库架构](DATABASE_SCHEMA.md) - 数据模型参考
- [API 文档](API_DOCUMENTATION.md) - 接口文档
- [已知问题](KNOWN_ISSUES.md) - 当前限制和问题

### 📙 功能特性 (Features)
- [管理员后台总览](features/ADMIN_DASHBOARD_COMPLETE_OVERVIEW.md) - 完整功能概览
- [仪表盘改进](features/DASHBOARD_IMPROVEMENTS.md) - 仪表盘功能说明
- [仪表盘快速启动](features/DASHBOARD_QUICKSTART.md)
- [AI 聊天增强](features/AI_CHAT_WINDOW_ENHANCEMENTS.md) - AI Chat 窗口
- [AI 决策系统](features/AI_DECISION_SYSTEM.md) - 智能决策
- [AI 引导系统优化](features/AI_GUIDE_SYSTEM_OPTIMIZATION.md) - 智能引导
- [FAQ 自动收集](features/FAQ_AUTO_COLLECTION_SYSTEM.md) - 知识库系统
- [FAQ 快速开始](features/FAQ_QUICK_START.md) - FAQ 入门
- [电商商品库说明](features/ECOMMERCE_PRODUCT_LIBRARY_README.md) - SPU-SKU 电商模式
- [Rust 后端 SPU/SKU 指南](features/RUST_BACKEND_SPU_SKU_GUIDE.md) - 后端实现指南
- [商品编号自动生成](features/AUTO_GENERATE_PRODUCT_CODE.md) - 编码规则
- [自动编码实现](features/AUTO_GENERATE_CODE_IMPLEMENTATION.md) - 实现总结
- [采购销售订单自动编码](features/PURCHASE_SALES_ORDER_AUTO_CODE_FEATURE.md)
- [供应商客户自动编码](features/SUPPLIER_CUSTOMER_AUTO_CODE_FEATURE.md)
- [多图上传](features/MULTI_IMAGE_UPLOAD_FEATURE.md) - 图片管理
- [用户中心同步](features/USER_CENTER_SYNC.md)
- [头像跳转规则](features/avatar-navigation.md) - 聊天头像 → Agent/Team 详情页
- [**联系人→聊天→详情→设置 合并 UX 流程图**](features/contact-chat-profile-ux-flow.md) - 4 阶段完整交互链路 + 移动端 ChatDetailScreen + AI Team 群聊状态机 + Playwright e2e 测试矩阵（v1.1 / 2026-06-15）
  - [🌐 可分享 HTML 单页](features/contact-chat-profile-ux-flow.html) - 脱离 IDE 可读，浏览器打开即可

### 📕 发布文档 (Releases)
- [发布说明](releases/RELEASE_NOTES.md)
- [GitHub 发布说明](releases/GITHUB_RELEASE_NOTES.md)
- ~~Beta 发布相关文档~~ (已归档至 archive/)
- ~~测试交付检查清单~~ (已归档至 archive/)

### 📔 项目管理 (Project)
- [项目定位](PROJECT_POSITIONING.md) - 项目愿景与定位
- [实施计划](IMPLEMENTATION_PLAN.md) - 详细开发计划
- [超级管理员账户](features/SUPER_ADMIN_ACCOUNT.md) - 演示凭证

### 📦 归档文档 (Archive)
历史文档已归档至 [archive/](archive/) 目录:
- 旧版审计报告 (audit-report-plus-2026-r*.md)
- 旧版移动端审计报告 (mobile-audit-report-v*.md)
- Beta v0.1.0 发布相关文档 (BETA_RELEASE_READY.md等)
- 测试框架交付清单 (TEST_DELIVERY_CHECKLIST.md)
- Light版修复验证文档 (PRD v13.0相关)
- 仅保留最新版本: [mobile-audit-report-v14.md](mobile-audit-report-v14.md)
- **PRD 历史归档**: [prd/_archive/](prd/_archive/) — 测试报告 (test-reports/) 与已闭环开发计划 (dev-plans/)

### 🔗 根目录文档
- [README](../README.md) - 项目主页
- [变更日志](../CHANGELOG.md) - 版本变更记录
- [贡献指南](../CONTRIBUTING.md) - 如何贡献
- [v0.1.0 发布说明](../RELEASE_NOTES_v0.1.0.md) - 最新发布说明

## 🔍 快速查找

### 新手入门
1. [快速开始](guides/QUICKSTART.md)
2. [安装指南](guides/INSTALLATION_GUIDE.md)
3. [Supabase 设置](guides/SUPABASE_SETUP.md)

### 开发者入门
1. [技术方案](TECHNICAL_OVERVIEW.md)
2. [数据库架构](DATABASE_SCHEMA.md)
3. [贡献指南](../CONTRIBUTING.md)

### 功能开发
1. [PRD v4.0 核心需求](prd/ProClaw_PRD_v4.0.md)
2. [行业插件功能实现](prd/需求文档：行业插件功能实现（餐饮%20美业%20宠物%20Cloud）.md)
3. [AI 决策系统](features/AI_DECISION_SYSTEM.md)

### 当前版本重点
1. [CEO Agent 主控官 (v6.2)](prd/需求文档：CEO%20Agent%20作为主控官%20-%20项目上下文协议与任务分派（PRD%20v6.2）.md) - 项目上下文协议 / 任务分派
2. [行业插件架构升级](prd/需求文档：ProClaw%20插件化行业版架构升级.md) - 4 大行业 + 13 行业子目录 + AI Agent 模板
3. [桌面端 UI 全面升级 (v11.0)](prd/需求文档：ProClaw%20桌面端%20UI%20全面升级（PRD%20v11.0）.md) - AI-Native 设计语言
4. [进销存增强 (P0/P1/P2)](prd/SUPPLY_CHAIN_ENHANCEMENT_PRD.md) - 采购/销售/退货闭环
5. [云托管商城 (v5.0)](prd/需求文档：ProClaw%20云托管商城（AI%20生成独立站）PRD%20v5.0.md) + [Token 计费 (v8.0)](prd/需求文档：ProClaw%20云托管商城%20Token%20计费模式改造（PRD%20v8.0）.md)

## 📝 文档维护

本文档由项目团队维护。如果您发现文档中有错误或有改进建议，欢迎提交 Issue 或 Pull Request.

---

*最后更新: 2026-06-16 (全面整理 43 份 PRD 实施状态 + 新建 PRD_INDEX.md)*
