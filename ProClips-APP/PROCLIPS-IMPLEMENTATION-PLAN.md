# ProClips 实施计划

## 1. 项目目标

基于 `ProClaw` 手机端现有代码基础，创建一个可运行、可评估的 `ProClips` 手机端分支项目。

目标内容：
- 复用 `ProClaw` 用户登录、JWT 认证、Agent 对话交互和上传能力
- 新增 `ProClips` 专属短视频营销功能
- 支持 `广告主助手` Agent 全流程：模板选择、拍摄引导、文案生成、音色录制、混剪任务、视频库、下载分享
- 以分支方式开发，保持与 `ProClaw` 主线代码最小冲突

## 2. 交付物

1. `feature/proclips-mobile` 分支
2. `ProClips` 手机端入口与品牌改造
3. `广告主助手` Agent 流程设计与实现
4. 后端 `video_*` Skill 接口与数据库支持
5. 混剪服务对接方案
6. 端到端测试与演示验证
7. 任务拆分与排期文档

## 3. 方案定位

`ProClips` 属于基于 `ProClaw` 手机端的产品衍生分支，核心思想为“在现有移动端框架上新增视频营销能力”，而不是完全重构。

- `ProClaw` 仍保留为基础平台
- `ProClips` 复用 `ProClaw` 账号/Agent/上传/对话接口
- 新增业务使用 `video_` 前缀数据表，避免与核心业务表冲突
- Agent 市场中以 `广告主助手` 的 Skill 形式接入

## 4. 实施阶段与任务拆分

### Phase 0：评估与分支准备（1 天）
- 确认移动端代码目录与运行方式
- 确认 `ProClaw` 手机端是否已有手机 App 分支、Navigator、上传/录音模块
- 分支创建：`feature/proclips-mobile`
- 输出：评估报告 + 分支创建完成

### Phase 1：项目基础与品牌改造（2 天）
- 在分支中完成 App 名称、图标、启动页、品牌色改造
- 新增 `ProClips` 入口页/功能入口
- 确保移动端能正常启动和登录
- 输出：可运行的 `ProClips` 基础版本

### Phase 2：核心 Agent 与业务流程开发（5 天）

#### 2.1 Agent 流程实现
- 设计 `广告主助手` Agent 的对话路径
- 开发 `get_templates`、`select_template`、`generate_script`、`submit_mix_task`、`get_task_status`
- 开发 `save_merchant_profile`、`record_voice_sample`、`set_video_public`

#### 2.2 UI 交互实现
- 模板推荐与选择页面
- 分镜拍摄引导页面
- 素材上传与确认逻辑
- 文案生成与选择页面
- 音色录制与管理页面
- 混剪任务提交与进度页

#### 2.3 业务状态管理
- 设计前端状态流：模板→素材→商品信息→文案→音色→混剪→成品
- 设计并实现前端对话/任务联动机制
- 输出：核心业务流程可运行

### Phase 3：后端 Skill API 与数据库支持（4 天，并行）
- 新增数据表：`video_templates`、`video_raw_clips`、`video_mix_tasks`、`video_final_products`、`video_merchant_profiles`
- 实现 Skill API：
  - `get_templates`
  - `generate_upload_url`
  - `confirm_scene_upload`
  - `generate_script`
  - `submit_mix_task`
  - `get_task_status`
  - `get_merchant_videos`
  - `get_video_download_url`
  - `get_share_info`
  - `record_voice_sample`
  - `save_merchant_profile`
  - `get_merchant_stats`
- 统一 JWT 校验与商家权限控制
- 输出：后端接口可调用

### Phase 4：混剪服务设计与联调（3 天，并行）
- 设计独立混剪服务接口
  - `POST /mix/submit`
  - `GET /mix/status/{task_id}`
- 确认输入参数与输出格式
- 本地实现混剪原型（FFmpeg + TTS + 字幕 + Logo + BGM）
- 联调前端提交与后端回调
- 输出：混剪任务链路可完成

### Phase 5：测试与优化（2 天）
- 执行端到端流程测试
- 覆盖以下场景：模板选择、素材上传、文案确认、音色录制、混剪状态、成品下载/分享
- 修复体验问题与异常提示
- 输出：测试报告 + 可演示版本

### Phase 6：交付与上线准备（1 天）
- 编写 `ProClips` 分支说明文档
- 附上部署要点与环境准备清单
- 准备 Demo 演示脚本
- 输出：交付文档

## 5. 迭代里程碑

| 序号 | 时间 | 目标 | 交付物 |
|------|------|------|--------|
| 1 | Day 1 | 分支与评估 | `feature/proclips-mobile`、技术评估报告 |
| 2 | Day 2-3 | 品牌与框架 | `ProClips` 手机端入口、基础运行版本 |
| 3 | Day 4-8 | 核心 Agent 流程 | Agent 功能、前端流程页面 |
| 4 | Day 4-9 | 后端 Skill 接口 | `video_*` 表、Skill API |
| 5 | Day 6-10 | 混剪联调 | 混剪服务原型、任务回调链路 |
| 6 | Day 11-12 | 测试优化 | 端到端验证、体验修正 |
| 7 | Day 13-14 | 交付准备 | 交付文档、Demo 准备 |

## 6. 人员建议

- 前端开发 1 人：负责 `ProClips` 分支、界面与流程实现
- 后端开发 1 人：负责 `video_*` 数据与 Skill API
- 混剪服务工程师 1 人：负责视频合成、TTS、FFmpeg 任务链
- 测试与产品 0.5 人：负责验收、流程测试、用户体验

## 7. 关键风险与应对

- 风险：`ProClaw` 现有移动端架构与 `ProClips` 需求不完全吻合
  - 对策：头天完成架构评估，必要时调整方案为“入口级分支 + 新页面实现”

- 风险：视频混剪服务性能和稳定性不足
  - 对策：先做小规模 FFmpeg + TTS 原型，确认 5 分钟内可执行

- 风险：Skill 接口与 Agent 对话流程对接不顺
  - 对策：先编写统一 Skill 方案文档，并做前后端联调测试

- 风险：商家数据隔离与权限不严密
  - 对策：所有 `video_*` API 强制绑定 `merchant_id`，并复用现有 JWT 中间件

## 8. 备注

- `ProClips` 最终目标是“基于 `ProClaw` 的视频营销业务分支”，而不是“独立打造一款新 App”。
- 若后续需要，我可以继续生成：
  - 附件 A：Skill 接口 JSON Schema
  - 附件 B：Agent System Prompt 完整版
  - 附件 C：数据库 DDL
  - 附件 D：混剪服务 OpenAPI 文档
