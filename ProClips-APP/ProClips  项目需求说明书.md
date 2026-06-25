好的，这是一份完整的项目需求说明书（PRD），你可以直接发给 Proclaw 项目组进行评估和排期。

---

# ProClips · 拍可丽 —— 项目需求说明书

**版本**：V1.0  

**日期**：2025-01-27  

**状态**：待评审  

**项目组**：Proclaw 研发团队

## 一、项目背景

### 1.1 市场机会

短视频已成为中小商家获客的核心渠道，但绝大多数个体户（餐饮、美发、零售等）面临三大痛点：

1. **不会拍**：没有拍摄经验，不知道如何分镜、如何展示产品。

2. **不会写**：缺乏文案能力，生成的视频千篇一律，没有吸引力。

3. **没有IP**：无法形成个人品牌，视频缺乏辨识度。

与此同时，AIGC技术（文案生成、音色克隆、自动混剪）已趋于成熟，具备产品化的条件。

### 1.2 产品定位

**ProClips（拍可丽）** 是基于 Proclaw Agent 生态构建的 **AI 视频营销工具**。它通过两个 Agent（广告主助手 + 流量主助手）帮助中小商家零门槛生成带个人 IP 的营销视频。

- **第一阶段**（本期）：广告主助手 —— 帮商家生成视频

- **第二阶段**（未来）：流量主助手 —— 帮达人分发赚佣金

### 1.3 与 Proclaw 的关系

ProClips **不是** Proclaw 的独立分支或 Fork，而是 **Proclaw Agent 市场中的一个 Skill 扩展包**。

- **用户**：通过 Proclaw App 注册登录，在 Agent 市场雇佣"广告主助手"

- **交互**：全部在 Proclaw 的对话界面中完成

- **后端**：新增 Skill API 和混剪服务，与 Proclaw 主后端协同

- **数据**：使用 Proclaw 现有数据库，新增业务表（前缀 `video_`）

## 二、产品目标

### 2.1 核心指标

| 指标 | 目标值（3个月） |

|------|----------------|

| 种子商家数 | ≥ 30 家（来自现有资源） |

| 付费转化率 | ≥ 20%（免费转付费） |

| 人均生成视频数 | ≥ 5 条/月 |

| 视频下载/分享率 | ≥ 60%（生成后7天内） |

### 2.2 成功标准

- 商家能独立完成"选模板 → 拍摄 → 生成成品"的完整流程，无需人工协助。

- 商家愿意为 ProClips 付费（验证付费意愿）。

- 生成的视频被商家用于朋友圈/微信群等私域传播（验证实际价值）。

## 三、功能需求

### 3.1 整体流程（广告主助手）

```

用户雇佣 Agent

    ↓

Agent 询问行业/目标

    ↓

推荐并选择模板

    ↓

分段拍摄引导（逐镜头）

    ↓

收集商品信息

    ↓

AI 生成文案（展示确认）

    ↓

录制/选择音色

    ↓

提交混剪任务

    ↓

成品存入视频库

    ↓

下载 / 分享 / 设置公开

```

### 3.2 Skill 清单（第一阶段）

广告主助手需要以下 15 个 Skill，由后端开发实现：

| 序号 | Skill 名称 | 功能描述 |

|------|-----------|----------|

| 1 | `get_templates` | 获取行业模板列表（含分镜、时长、参考图） |

| 2 | `select_template` | 商家确认选择某个模板 |

| 3 | `generate_upload_url` | 生成 OSS 预签名上传 URL（供 App 直传） |

| 4 | `confirm_scene_upload` | 确认某段素材已上传完成 |

| 5 | `generate_script` | 调用 LLM 根据商品信息生成文案 |

| 6 | `submit_mix_task` | 提交混剪任务（含素材、文案、音色、Logo） |

| 7 | `get_task_status` | 查询混剪任务进度 |

| 8 | `set_video_public` | 设置成品是否公开到达人库 |

| 9 | `get_merchant_videos` | 获取商家的成品视频列表 |

| 10 | `get_video_download_url` | 生成成品视频的临时下载链接 |

| 11 | `get_share_info` | 生成分享文案 + 海报 + 链接 |

| 12 | `record_voice_sample` | 保存商家录制的音色样本 |

| 13 | `save_merchant_profile` | 保存商家信息（Logo、行业、店名） |

| 14 | `get_merchant_stats` | 获取商家数据（视频数、播放、分享） |

| 15 | `get_script_examples` | 获取文案示例（供商家参考） |

### 3.3 Agent 配置需求

在 Proclaw 后台创建"广告主助手"Agent，配置内容：

**3.3.1 基本信息**

| 字段 | 内容 |

|------|------|

| 名称 | 广告主助手 |

| 描述 | 帮你自动生成带个人 IP 的营销视频，包含拍摄引导、文案生成、音色克隆、混剪、私域分享。 |

| 图标 | ProClips 品牌图标（待设计） |

| 分类 | 营销推广 |

**3.3.2 System Prompt（核心）**

> 你是 ProClips 广告主助手，专门帮助中小商家制作短视频营销内容。你的工作流程严格按照以下顺序执行，每步完成后才能进入下一步：

>

> 1. **首次对话**：询问商家的店铺名称和行业，调用 `save_merchant_profile` 保存。如果用户已有记录，直接调用 `get_merchant_profile` 获取。

> 2. **模板推荐**：根据行业调用 `get_templates`，展示 3-5 个适合的模板，引导商家选择。

> 3. **拍摄引导**：根据模板的分镜列表，逐镜头指导拍摄。每段素材拍摄完成后：

>    - 调用 `generate_upload_url` 获取上传链接

>    - 提供清晰的上传指引（按钮或文字）

>    - 用户上传后调用 `confirm_scene_upload` 确认

>    - 所有镜头完成后自动进入下一步

> 4. **商品信息收集**：询问商品名称、核心卖点（1-2 个）、优惠信息（如有）。

> 5. **文案生成**：调用 `generate_script` 生成 3 个版本的文案，让用户选择或修改。

> 6. **音色处理**：

>    - 如果用户未录制音色，引导录制 20 秒标准文本，调用 `record_voice_sample`

>    - 如果已有音色，询问是否使用或重新录制

> 7. **触发混剪**：调用 `submit_mix_task` 提交任务，告知用户预计等待 3-5 分钟。

> 8. **任务跟踪**：主动轮询 `get_task_status`，完成后立即通知用户。

> 9. **视频库管理**：成品展示后，提供三个选项：

>    - 下载到本地（调用 `get_video_download_url`）

>    - 分享到朋友圈/微信群（调用 `get_share_info`）

>    - 公开到达人库（调用 `set_video_public`）

> 10. **数据汇报**：每周主动调用 `get_merchant_stats` 向用户汇报视频传播效果。

>

> **语气要求**：亲切、专业，像私人助理。每步操作给出清晰的指引。遇到错误时给出友好的重试建议。主动提醒用户未完成的步骤。

**3.3.3 绑定的 Skill**

上述 15 个 Skill 全部绑定到该 Agent。

### 3.4 数据模型（新增表）

所有表使用 `video_` 前缀，与 Proclaw 核心表隔离：

```sql

-- 模板表

video_templates (

    id, name, industry, 

    scenes JSON,          -- [{"duration":5, "action":"展示菜品", "ref_image":"url"}]

    script_structure JSON,-- 文案结构模板

    bgm_url, status, created_at

)

-- 原始素材表

video_raw_clips (

    id, merchant_id, task_id, scene_index, 

    file_key, upload_status, created_at

)

-- 混剪任务表

video_mix_tasks (

    id, merchant_id, template_id, 

    status,                -- pending/processing/completed/failed

    script_text, voice_id, logo_url,

    result_video_url, error_message,

    created_at, completed_at

)

-- 成品视频表

video_final_products (

    id, merchant_id, task_id, 

    video_url, cover_url, is_public,

    duration, size, share_count, view_count,

    created_at

)

-- 商家扩展信息表

video_merchant_profiles (

    merchant_id, store_name, industry, 

    logo_url, voice_sample_url, voice_id,

    updated_at

)

```

### 3.5 混剪服务需求

混剪服务是独立的微服务，与 Proclaw 主后端通过 HTTP 通信。

**3.5.1 输入参数**

```json

{

  "task_id": "task_001",

  "scene_files": ["url1", "url2", "url3"],

  "script": "欢迎来到张三火锅店...",

  "voice_id": "voice_001",

  "logo_url": "[https://oss.../logo.png](https://oss.../logo.png)",

  "bgm_id": "bgm_001",

  "template_id": "tpl_001"

}

```

**3.5.2 工作流（FFmpeg）**

1. 下载所有素材到本地临时目录

2. 按顺序拼接所有片段

3. 调用 TTS 服务（阿里云/微软）生成配音音频

4. 叠加配音到视频轨（降低原音音量至 20%）

5. 叠加 Logo 到右上角

6. 添加背景音乐

7. 根据 TTS 时间轴生成字幕（SRT 格式）

8. 输出 1080x1920 竖屏，H.264 编码，比特率 4M

9. 上传成品到 OSS

10. 回调 Proclaw 主后端更新任务状态

**3.5.3 性能要求**

- 单个任务处理时间 ≤ 5 分钟（含 TTS 调用）

- 支持至少 3 个 Worker 并发

- 任务超时时间：10 分钟

**3.5.4 接口定义**

```

POST /mix/submit

请求体: 任务参数

响应: { "task_id": "xxx", "status": "processing" }

GET /mix/status/{task_id}

响应: { "status": "completed", "video_url": "https://..." }

```

## 四、非功能需求

### 4.1 性能

- API 响应时间 ≤ 300ms（95% 请求）

- 支持 10 个商家同时拍摄上传

- 混剪任务队列不积压（超过 10 个任务告警）

### 4.2 可用性

- 混剪服务自动恢复（崩溃后重启）

- 任务失败重试 3 次（指数退避）

- 数据库每日自动备份

### 4.3 安全

- 复用 Proclaw 的 JWT 认证

- 所有 Skill 接口需验证用户身份

- 商家只能访问自己的数据

- OSS 预签名 URL 有效期 ≤ 1 小时

### 4.4 可扩展性

- 混剪 Worker 支持水平扩展

- 模板支持动态添加（无需重新发布）

- 文案生成支持切换不同 LLM 提供商

## 五、技术依赖

### 5.1 Proclaw 现有能力（复用）

| 能力 | 说明 |

|------|------|

| 用户注册/登录 | 手机号验证码登录 |

| JWT 认证中间件 | 所有 API 复用 |

| 数据库连接池 | 复用现有配置 |

| OSS SDK | 生成预签名 URL |

| Agent 市场 | 上架"广告主助手" |

| App 对话界面 | Agent 交互全部复用 |

| 文件上传组件 | 商家在对话中上传素材 |

### 5.2 需新增的第三方服务

| 服务 | 用途 | 成本预估 |

|------|------|----------|

| LLM API（通义千问/GPT-4） | 文案生成 | ¥0.01-0.05/条 |

| TTS API（阿里云/微软/AWS） | 语音合成 | ¥0.005-0.02/条 |

| FFmpeg | 视频处理 | 免费（开源） |

| Redis（如 Proclaw 已有则复用） | 任务队列 | 复用现有 |

## 六、开发计划与排期

### 6.1 团队配置建议

- 后端开发 1 人（Skill API + 数据库）

- 后端开发 1 人（混剪服务）

- Agent 配置 0.5 人（System Prompt + 测试）

- 测试 0.5 人

### 6.2 里程碑

| 阶段 | 周期 | 交付物 |

|------|------|--------|

| Phase 0：数据库与基座 | 第 1-2 天 | 数据库表、`generate_upload_url`、`confirm_scene_upload` |

| Phase 1：混剪服务原型 | 第 3-5 天 | 本地跑通 FFmpeg 拼接 + 配音 + 字幕 |

| Phase 2：核心 Skill 实现 | 第 6-8 天 | `get_templates`、`generate_script`、`submit_mix_task`、`get_task_status` |

| Phase 3：辅助 Skill 实现 | 第 9-10 天 | 视频库、下载、分享、音色录制 |

| Phase 4：Agent 配置 | 第 11-12 天 | System Prompt、绑定 Skill、端到端测试 |

| Phase 5：部署与上线 | 第 13-14 天 | 内测、Bug 修复、上线 |

**总计约 14 个工作日（约 3 周），适合 2-3 人并行开发。**

### 6.3 风险与应对

| 风险 | 概率 | 影响 | 应对措施 |

|------|------|------|----------|

| TTS 音色质量不达标 | 中 | 高 | 准备多个 TTS 供应商备选，允许商家切换 |

| 混剪服务性能不足 | 低 | 中 | 支持 Worker 水平扩展，任务队列监控 |

| LLM 文案生成不稳定 | 中 | 中 | 提供文案模板作为 Fallback，允许商家手动修改 |

| Proclaw 版本升级冲突 | 低 | 中 | Skill 代码与 Proclaw 核心隔离，仅通过 API 交互 |

## 七、营销官网需求

### 7.1 定位

独立落地页，用于介绍 ProClips 功能并引导用户下载 Proclaw App。

### 7.2 页面结构

1. **Hero 区**："AI 帮你拍视频，用你的声音讲故事" + CTA 按钮

2. **功能介绍**：三大能力（拍摄引导、AI 文案、音色克隆）

3. **使用流程**：三步（下载 Proclaw → 雇佣 Agent → 对话生成）

4. **案例展示**：3-5 个商家案例（带视频缩略图和数据）

5. **FAQ**：常见问题

6. **底部**：下载链接 + 联系方式

### 7.3 技术方案

- 静态站点（HTML + CSS + JS）

- 托管：Vercel / Netlify

- 域名：`proclips.cc` 或 `proclips.ai`

- 设计风格：与 Proclaw 官网统一

## 八、验收标准

### 8.1 功能验收

| 场景 | 验收条件 |

|------|----------|

| 商家完整流程 | 从雇佣 Agent 到生成成品，全程在对话中完成，无需跳转其他页面 |

| 模板选择 | 至少提供 5 个行业模板，每个模板 3-6 个分镜 |

| 文案生成 | 同一商家不同视频生成不同文案；不同商家同模板文案有差异 |

| 音色克隆 | 商家录制 20 秒音频后，后续视频配音使用该音色（或预设音色） |

| 混剪产出 | 成品视频 ≥ 15 秒，含配音、字幕、Logo、BGM |

| 视频库 | 商家可查看、下载、分享、公开所有成品 |

| 分享功能 | 生成分享文案 + 海报，可复制链接 |

### 8.2 性能验收

- 单次混剪任务 ≤ 5 分钟

- API 响应时间 ≤ 300ms（95% 请求）

- 3 个并发任务无排队超时

### 8.3 用户体验验收

- 5 个种子商家完成从零到成品的全流程，无需人工指导

- 所有错误提示清晰、有解决方案

## 九、后续规划（第二阶段）

流量主 Agent：

- 达人画像收集与完善

- 素材库浏览（按行业/佣金/热度筛选）

- 视频发布到抖音（URL Scheme 拉起）

- 数据追踪（播放、点赞、订单）

- 佣金结算与提现

## 十、附件

- 附件 A：Skill 接口详细定义（JSON Schema）

- 附件 B：Agent System Prompt 完整版（含对话示例）

- 附件 C：数据库表 DDL（PostgreSQL）

- 附件 D：混剪服务接口文档（OpenAPI）

---

**文档结束**

---

如果你需要我补充附件 A-D 的详细内容（接口定义、DDL、Prompt 完整版等），可以告诉我，我可以直接生成可以直接使用的版本。