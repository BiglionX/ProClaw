# ProClips 每日迭代计划

## 目标

将 `ProClaw` 手机端改造为 `ProClips` 产品分支，按 14 个工作日拆解成每日迭代任务。

---

## Day 1：评估与分支准备

- 创建 Git 分支 `feature/proclips-mobile`
- 检查现有移动端代码仓库结构
- 确认 App 启动入口、路由框架、登录流程、Agent 调用方式
- 评估上传、录音、视频播放模块是否可复用
- 输出：评估结论、风险点、初步方案

## Day 2：品牌与入口改造

- 新增 `ProClips` 应用入口与导航项
- 更新 App 名称、图标、启动页、品牌配色
- 保持 `ProClaw` 登录流程兼容
- 验证移动端基础运行
- 输出：`ProClips` 基础入口可访问

## Day 3：Agent 流程设计与数据模型

- 梳理 `广告主助手` 用户流程
- 确定 15 个 Skill 的输入输出规范
- 设计前端状态流和流程节点
- 定义新增数据库表结构草案
- 输出：流程图、接口设计草案、DDL 清单

## Day 4：前端模板与素材流程开发

- 实现模板推荐页面
- 实现模板选择与详情展示
- 开发拍摄分镜引导页面
- 开发素材上传入口与上传状态管理
- 输出：模板选择与素材上传可交互版本

## Day 5：前端文案与音色录制模块

- 实现商品信息收集页面
- 实现文案生成候选展示与选择
- 实现音色录制与回放页面
- 实现音色上传/保存逻辑
- 输出：文案与音色模块可交付版本

## Day 6：后端 Skill API 与数据库搭建

- 新增数据库表：`video_templates`、`video_raw_clips`、`video_mix_tasks`
- 新增数据库表：`video_final_products`、`video_merchant_profiles`
- 实现 `get_templates`
- 实现 `generate_upload_url`
- 实现 `confirm_scene_upload`
- 输出：后端 Skill API 基础接口可调试

## Day 7：后端 Skill API 继续与权限校验

- 实现 `generate_script`
- 实现 `submit_mix_task`
- 实现 `get_task_status`
- 实现 `save_merchant_profile`
- 统一 JWT 认证与商家权限校验
- 输出：核心 Skill API 流程可联调

## Day 8：混剪服务原型与前端联动

- 设计混剪服务 HTTP 接口：`POST /mix/submit`、`GET /mix/status/{task_id}`
- 实现 FFmpeg + TTS 原型链路
- 实现任务状态存储与更新
- 前端调用 `submit_mix_task` 与 `get_task_status` 的联调
- 输出：混剪提交与状态反馈可演示原型

## Day 9：视频库与下载分享功能

- 实现 `get_merchant_videos` / `get_video_download_url`
- 实现 `get_share_info`
- 实现 `set_video_public`
- 开发视频库页面与成品展示模块
- 输出：视频库与分享功能初版

## Day 10：体验优化与异常处理

- 优化前端流程跳转与状态提示
- 补齐上传失败、任务失败、网络异常处理
- 添加未完成步骤提醒与重试提示
- 修正前端样式与交互细节
- 输出：可用度和提示体验优化完成

## Day 11：功能联调与端到端测试

- 执行从 `模板选择` 到 `混剪完成` 的完整流程测试
- 检查前后端接口一致性与异常路径
- 修复联调过程中发现的问题
- 输出：端到端测试记录与问题清单

## Day 12：性能与稳定性验证

- 验证 Skill API 响应延迟与任务状态轮询
- 验证混剪服务稳定性与原型处理时长
- 测试 2-3 个并发混剪任务是否能正常排队处理
- 输出：性能验证结果与优化建议

## Day 13：QA 验收与测试修正

- 邀请 QA 进行功能验收测试
- 补充测试覆盖项：视频下载、分享、公开、历史视频查询
- 记录 bug，并完成修复
- 输出：验收反馈与修复报告

## Day 14：交付准备与文档整理

- 整理 `PROCLIPS-IMPLEMENTATION-PLAN.md` 与 `PROCLIPS-TASK-LIST.md`
- 编写交付说明与环境部署说明
- 准备 Demo 演示脚本
- 评审并确认上线准备
- 输出：交付报告与分支发布准备

---

## 建议

- 前端和后端并行推进，Day 4-7 可同步开发
- 混剪服务优先做小规模原型，避免后期大规模重构
- 每日结束前记录今日完成与次日风险点
