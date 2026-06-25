# ProClips 任务拆分清单

## 目标

将 `ProClaw` 手机端改造为 `ProClips` 产品分支，完成视频营销流程与后端 Skill 支持。

---

## 1. 分支与准备

- [ ] 创建 Git 分支 `feature/proclips-mobile`
- [ ] 确认手机端项目目录与运行方式
- [ ] 确认现有 Agent 对话与 Skill 调用机制
- [ ] 评估现有上传、录音、视频播放模块是否可复用
- [ ] 形成评估结论并提交评审

## 2. 品牌与基础改造

- [ ] 新增 `ProClips` 应用入口页面
- [ ] 替换/添加 App 名称、Logo、启动图、品牌配色
- [ ] 保持现有登录流程兼容
- [ ] 验证 App 启动、登录、主流程可用

## 3. 前端核心功能

### 3.1 Agent 业务流程

- [ ] 设计并梳理 `广告主助手` 用户流程
- [ ] 设计 `get_templates` 接口调用逻辑
- [ ] 设计 `select_template` 选择流程
- [ ] 设计 `generate_script` 文案生成与选择流程
- [ ] 设计 `record_voice_sample` 音色录制流程
- [ ] 设计 `submit_mix_task` 任务提交流程
- [ ] 设计 `get_task_status` 任务轮询与状态展示
- [ ] 设计 `set_video_public` 公开设置逻辑
- [ ] 设计 `get_merchant_videos` 视频库展示逻辑
- [ ] 设计 `get_share_info` 分享文案/海报生成逻辑

### 3.2 页面与交互

- [ ] 模板推荐与选择页面
- [ ] 分镜拍摄引导页面
- [ ] 素材上传与确认页面
- [ ] 商品信息收集表单
- [ ] 文案候选展示与编辑页面
- [ ] 音色录制与回放页面
- [ ] 混剪任务进度页
- [ ] 视频成品展示与下载/分享页面

### 3.3 状态管理与流程控制

- [ ] 设计前端状态机/流程模型
- [ ] 实现模板→素材→信息→文案→音色→混剪→成品状态流
- [ ] 添加错误/重试提示与未完成步骤提醒

## 4. 后端与 Skill API

- [ ] 新增数据库表：`video_templates`
- [ ] 新增数据库表：`video_raw_clips`
- [ ] 新增数据库表：`video_mix_tasks`
- [ ] 新增数据库表：`video_final_products`
- [ ] 新增数据库表：`video_merchant_profiles`
- [ ] 实现 `get_templates` Skill API
- [ ] 实现 `generate_upload_url` Skill API
- [ ] 实现 `confirm_scene_upload` Skill API
- [ ] 实现 `generate_script` Skill API
- [ ] 实现 `submit_mix_task` Skill API
- [ ] 实现 `get_task_status` Skill API
- [ ] 实现 `set_video_public` Skill API
- [ ] 实现 `get_merchant_videos` Skill API
- [ ] 实现 `get_video_download_url` Skill API
- [ ] 实现 `get_share_info` Skill API
- [ ] 实现 `record_voice_sample` Skill API
- [ ] 实现 `save_merchant_profile` Skill API
- [ ] 实现 `get_merchant_stats` Skill API
- [ ] 确保所有 Skill API 复用 JWT 认证与商家权限校验

## 5. 混剪服务与联调

- [ ] 设计混剪服务 HTTP 接口说明
- [ ] 实现 `POST /mix/submit`
- [ ] 实现 `GET /mix/status/{task_id}`
- [ ] 实现 FFmpeg 视频拼接与 TTS 合成原型
- [ ] 实现 logo 叠加与 BGM 添加流程
- [ ] 实现字幕生成与输出竖屏视频
- [ ] 实现成品视频上传 OSS 并回调主后端
- [ ] 联调前端提交 + 后端回调链路

## 6. 测试与验收

- [ ] 编写端到端测试用例
- [ ] 验证模板推荐与选择流程
- [ ] 验证素材上传与确认流程
- [ ] 验证文案生成与编辑流程
- [ ] 验证音色录制与回放流程
- [ ] 验证混剪任务提交与进度展示
- [ ] 验证成品视频下载/分享/公开流程
- [ ] 验证异常提示与重试
- [ ] 记录测试结果与问题清单

## 7. 交付与发布准备

- [ ] 完成 `PROCLIPS-IMPLEMENTATION-PLAN.md`
- [ ] 准备 Demo 演示脚本
- [ ] 编写分支说明与部署说明
- [ ] 评审并确认上线准备
- [ ] 合并分支或发布分支版本

---

## 任务优先级建议

1. `分支与评估` 先行，确认现有项目可复用范围
2. `核心功能` 与 `后端 Skill API` 并行开发
3. `混剪服务` 先做轻量原型，再做稳定实现
4. `测试` 与 `交付准备` 保持紧密反馈循环
