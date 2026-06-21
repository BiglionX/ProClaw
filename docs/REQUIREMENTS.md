# ProClaw 产品需求总览

> **最后更新**: 2026-06-21
> **当前基线版本**: v1.0.0（2026-06-08 正式版）
> **文档入口**: 本文档为需求体系的**唯一总览**；各模块详细 PRD 见 [prd/PRD_INDEX.md](prd/PRD_INDEX.md)

---

## 1. 产品定位

**ProClaw** 是开源的 AI 驱动商户经营操作系统（Open-Source AI-Powered Business OS），面向中小商户与虚拟公司经营者，提供本地优先、可扩展、AI 原生的经营管理能力。

| 维度 | 说明 |
|------|------|
| 产品形态 | Tauri 桌面端 + Expo 移动端 + Next.js 云商城 + Vite 营销站 |
| 部署模式 | 本地优先（免费）/ 云托管（可选订阅） |
| 核心差异 | CEO Agent 主控官 + 25+ Agent 生态 + 行业插件 + 全栈经营闭环 |
| 许可证 | GPL-3.0 |

详细定位见 [PROJECT_POSITIONING.md](PROJECT_POSITIONING.md)。

---

## 2. 产品矩阵

| 产品线 | 目标用户 | 核心能力 | 构建模式 |
|--------|----------|----------|----------|
| **ProClaw Plus** | 实体商户、连锁店 | 进销存、财务、供应链、行业插件 | 
pm run tauri dev |
| **ProClaw Light** | 服务行业、虚拟公司 | CEO Agent、Agent 生态、AI 知识库 | VITE_BUILD_MODE=virtual_company |
| **移动端** | 移动办公用户 | 联系人、消息、AI Team、设备配对 | mobile/ Expo |
| **CloudStore** | 电商商户 | AI 生成独立站、订单/商品/支付 | cloud-store/ Next.js |
| **营销网站** | 获客与转化 | 品牌展示、用户中心、运营后台 | marketing-site/ |

---

## 3. 需求域索引

完整分类表与链接见 [prd/PRD_INDEX.md](prd/PRD_INDEX.md)。按主题目录：

| 目录 | 主题 | PRD 数 |
|------|------|--------|
| [ceo-agent/](prd/ceo-agent/) | CEO Agent 与 AI 团队 | 3 |
| [mobile/](prd/mobile/) | 移动端 | 5 |
| [marketing/](prd/marketing/) | 营销网站与用户中心 | 9 |
| [plugins-supply-chain/](prd/plugins-supply-chain/) | 插件、供应链、桌面 UI | 12 |
| [cloud-store/](prd/cloud-store/) | 云商城与 Cloud 托管 | 6 |
| [architecture/](prd/architecture/) | 架构、双模式、集成 | 6 |
| [_deprecated/](prd/_deprecated/) | 已替代（历史基线） | 1 |

---

## 4. 实施状态汇总

| 状态 | 数量 | 说明 |
|------|------|------|
| ✅ 已实现 v1.0+ | 34 | v1.0.0 正式版已落地 |
| 🔵 部分实现 | 6 | 核心 ≥ 60%，有待补项 |
| 🟡 草案 | 1 | 插件系统 v10.0 |
| 🔴 已替代 | 1 | PRD v4.0 |

### v1.x 待补项

| 模块 | 进度 | 待补项 |
|------|------|--------|
| 音视频通话 v4.1 | ~20% | 野火 IM / LiveKit 选型与通话链路 |
| 网站运营 AI Team v7.0 | ~70% | 多区域调度自动化、日报推送 |
| 八大行业插件商店 | ~75% | 8 行业业务闭环、FlowHub 上架 |
| AI 网关 v9.0 | ~40% | ai.proclaw.cc 独立部署、统购分销 |
| 云商城 AI 客服 | ~60% | 人工坐席对接、自动学习闭环 |
| 客服接入方案 A | ~40% | 跨端会话同步、坐席状态机 |

---

## 5. 补充规范（非独立 PRD）

| 文档 | 说明 | 关联 PRD |
|------|------|----------|
| [demo-account-spec.md](features/demo-account-spec.md) | 演示账号数据包规范 | v6.4、v5.1、v7.1 |
| [contact-chat-profile-ux-flow.md](features/contact-chat-profile-ux-flow.md) | 联系人→聊天 UX 流程 | v11.x、v12.0 |
| [MULTI_PROJECT_INTEGRATION_SPEC.md](MULTI_PROJECT_INTEGRATION_SPEC.md) | 三项目集成架构 | v10.0、Nvwax API |
| [MOBILE_ROADMAP.md](MOBILE_ROADMAP.md) | 移动端技术演进 | v11.x 系列 |
| [MOBILE_MESSAGE_ALIGNMENT_PLAN.md](MOBILE_MESSAGE_ALIGNMENT_PLAN.md) | 消息链路对齐计划 | v11.2 |

---

## 6. 关联文档

| 类型 | 文档 |
|------|------|
| 发布说明 | [RELEASE_NOTES_v1.0.0.md](../RELEASE_NOTES_v1.0.0.md) |
| 变更日志 | [CHANGELOG.md](../CHANGELOG.md) |
| 技术架构 | [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) |
| 数据库 | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| API | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |
| 已知问题 | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) |
| 移动端审计 | [mobile-audit-report-v14.md](mobile-audit-report-v14.md) |

> **注意**: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) 为 2026-05 历史计划，大量条目已在 v1.0.0 完成；请以 PRD 实施状态与发布说明为准。

---

## 7. 文档维护规则

1. **新增 PRD**：在 docs/prd/<主题目录>/ 创建，顶部含 9 字段「实施状态」表，并在 PRD_INDEX 登记。
2. **状态变更**：在 PRD 顶部「状态变更日志」追加一行，同步更新 PRD_INDEX 与本文档。
3. **归档**：测试报告 / 已闭环开发计划 → prd/_archive/；被完全替代的 PRD → prd/_deprecated/。
4. **季度复核**：每季度首周校验实施状态与代码现状一致性。
5. **命名规范**：新 PRD 优先使用 DOMAIN_TOPIC_PRD_vX.Y.md 英文文件名。

---

*维护日期: 2026-06-21 · 下次复核: 2026-09-15*
