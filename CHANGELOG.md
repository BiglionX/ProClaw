# Changelog

所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/),
版本遵循 [Semantic Versioning](https://semver.org/)。

## [Unreleased]

### Added
- 完善的仪表盘页面功能
  - 实时数据集成（库存、销售、财务）
  - 关键指标卡片（产品总数、本月销售、今日交易、库存预警）
  - 财务概览卡片（应收账款、应付账款、营运资金）
  - 销售趋势折线图（最近7天）
  - 库存状态分布饼图
  - 畅销产品 TOP 5 列表
  - 低库存预警列表
  - 加载状态和错误处理
  - 手动刷新功能
  - 响应式设计
- 仪表盘单元测试
- 完整的仪表盘文档
  - 功能说明文档
  - 测试指南
  - 快速启动指南
  - 完成总结

### Changed
- 重构 DashboardPage 组件，从占位符升级为完整功能页面
- 优化数据加载性能（并行请求）

## [1.0.0-beta.1] - 2026-04-13

### Added
- 初始版本发布
- Tauri 2.0 + React 18 桌面应用框架
- 经营智能体主界面
- 产品库管理模块
- 进销存 AI 模块
- 技能商店基础架构
- SQLite 本地数据库 + Supabase 云端同步
- MUI + Tailwind CSS UI 系统
- 离线优先架构
- 数据加密(SQLCipher)

### Changed
- 从 ProCYC 单体项目中提取
- 独立为开源项目

### Technical
- 3,000+ 行 TypeScript 代码
- 完整的类型定义
- 模块化架构设计
