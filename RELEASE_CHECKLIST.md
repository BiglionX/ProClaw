# 🚀 Proclaw Desktop v0.1.0-beta 发布检查清单

> **目标发布日期**: 2026-04-15
> **负责人**: Proclaw Team
> **状态**: 🟡 进行中

---

## ✅ 代码准备 (已完成)

- [x] 修复所有 P0 级别的 TODO 标记
- [x] 实现本地演示模式（DEMO_MODE）
- [x] 完善错误处理和用户提示
- [x] 更新版本号至 0.1.0-beta
- [x] 生成 CHANGELOG.md
- [x] 编写 RELEASE_NOTES.md
- [x] 编写 INSTALLATION_GUIDE.md
- [x] 编写 KNOWN_ISSUES.md
- [x] 添加 SetupPage 首次设置向导
- [x] 更新 QuickActions 快捷操作路由

---

## 🔨 打包测试 (待执行)

### Windows 平台

- [ ] 清理构建缓存

  ```bash
  cd proclaw-desktop
  rm -rf dist
  rm -rf src-tauri/target
  ```

- [ ] 安装依赖

  ```bash
  npm install
  ```

- [ ] 执行生产构建

  ```bash
  npm run tauri build
  ```

- [ ] 验证生成的文件
  - [ ] `src-tauri/target/release/bundle/msi/Proclaw_0.1.0_x64_en-US.msi` 存在
  - [ ] 文件大小约 15 MB
  - [ ] 文件名包含版本号

- [ ] 全新环境安装测试
  - [ ] 在干净的 Windows 10/11 VM 中测试
  - [ ] 安装过程无错误
  - [ ] 首次启动正常
  - [ ] 演示模式可用
  - [ ] 产品库 CRUD 功能正常
  - [ ] 进销存功能正常

- [ ] 卸载测试
  - [ ] 通过控制面板卸载
  - [ ] 确认数据文件保留或删除符合预期
  - [ ] 无残留进程

---

### macOS 平台 (可选，如有 Mac 设备)

- [ ] 构建 DMG 包

  ```bash
  npm run tauri build -- --target x86_64-apple-darwin
  ```

- [ ] 验证文件
  - [ ] `src-tauri/target/release/bundle/dmg/Proclaw_0.1.0_x64.dmg` 存在
  - [ ] 文件大小约 18 MB

- [ ] 安装测试
  - [ ] DMG 打开正常
  - [ ] 拖拽到 Applications 成功
  - [ ] Gatekeeper 警告处理流程顺畅

- [ ] Apple Silicon 支持 (M1/M2/M3)
  ```bash
  npm run tauri build -- --target aarch64-apple-darwin
  ```

---

### Linux 平台 (可选)

- [ ] 构建 DEB 包

  ```bash
  npm run tauri build -- --target x86_64-unknown-linux-gnu
  ```

- [ ] 验证文件
  - [ ] `src-tauri/target/release/bundle/deb/proclaw_0.1.0_amd64.deb` 存在
  - [ ] 文件大小约 16 MB

- [ ] 安装测试 (Ubuntu 22.04)
  ```bash
  sudo dpkg -i proclaw_0.1.0_amd64.deb
  ```

---

## 🧪 功能冒烟测试

### 核心流程测试

#### 1. 首次启动

- [ ] 应用启动时间 < 5 秒
- [ ] SetupPage 正确显示
- [ ] "进入演示模式"按钮可点击
- [ ] "查看配置教程"链接可打开

#### 2. 登录流程

- [ ] 演示账号登录成功 (boss / IamBigBoss)
- [ ] "一键体验"按钮工作正常
- [ ] 登录后跳转到 AgentPage
- [ ] 侧边栏导航显示正确

#### 3. 产品库功能

- [ ] 进入产品库页面
- [ ] 添加新产品（含图片上传）
- [ ] 编辑产品信息
- [ ] 删除产品
- [ ] 分类筛选工作正常
- [ ] 品牌筛选工作正常
- [ ] CSV 导出成功
- [ ] 导出的文件 Excel 可打开且中文正常

#### 4. 进销存功能

- [ ] 进入进销存页面
- [ ] 库存统计卡片显示正确
- [ ] 创建入库交易
- [ ] 创建出库交易
- [ ] 库存充足性验证生效
- [ ] 低库存预警显示
- [ ] 交易历史记录正确

#### 5. AI 智能体

- [ ] 浮动对话按钮可见
- [ ] 点击打开对话面板
- [ ] 发送消息并收到回复
- [ ] 快捷操作面板按钮可点击
- [ ] 快捷操作正确跳转页面

#### 6. 导航和路由

- [ ] 侧边栏所有菜单项可点击
- [ ] 路由切换无刷新
- [ ] 浏览器后退/前进正常工作
- [ ] 受保护路由未登录时重定向到登录页

#### 7. 数据持久化

- [ ] 关闭应用后重新打开
- [ ] 之前创建的产品仍然存在
- [ ] 之前的交易记录仍然存在
- [ ] 登录状态保持（如果选择记住我）

---

## 📸 截图和素材准备

### 应用截图

- [ ] SetupPage 首次设置页面
- [ ] LoginPage 登录页面（显示演示账号提示）
- [ ] AgentPage 经营智能体主界面
- [ ] ProductsPage 产品库列表
- [ ] ProductDialog 添加产品对话框（含图片上传）
- [ ] InventoryPage 进销存仪表板
- [ ] LowStockAlert 低库存预警
- [ ] FloatingAgentChat 浮动 AI 助手

**要求**:

- 分辨率: 1920x1080
- 格式: PNG
- 命名规范: `screenshot-{page-name}.png`
- 保存位置: `proclaw-desktop/assets/screenshots/`

### GIF 动图

- [ ] 快速添加产品流程 (5-10秒)
- [ ] 创建入库交易流程 (5-10秒)
- [ ] AI 智能体对话演示 (10-15秒)

**工具推荐**:

- Windows: ShareX
- macOS: LICEcap
- 在线: ScreenToGif

---

## 🌐 GitHub Release 准备

### 创建 Release

- [ ] 访问 GitHub Releases 页面
- [ ] 点击 "Draft a new release"
- [ ] Tag version: `v0.1.0-beta`
- [ ] Release title: `Proclaw Desktop v0.1.0-beta - 首个公开测试版`

### 填写发布说明

复制以下内容到 Release description:

```markdown
🎉 **Proclaw Desktop 首个公开测试版本！**

## 亮点功能

- ✅ 完整的产品库管理（CRUD + 图片 + 导出）
- ✅ 进销存管理（入库/出库/预警）
- ✅ AI 经营智能体（自然语言指令）
- ✅ 离线优先架构（SQLite 加密存储）
- ✅ 跨平台支持（Windows/macOS/Linux）

## 下载

- Windows: Proclaw_0.1.0_x64_en-US.msi (~15 MB)
- macOS: Proclaw_0.1.0_x64.dmg (~18 MB)
- Linux: proclaw_0.1.0_amd64.deb (~16 MB)

## 快速开始

1. 下载安装包
2. 运行安装程序
3. 点击"进入演示模式"
4. 使用演示账号: boss / IamBigBoss

## 文档

- 📖 [发布说明](RELEASE_NOTES.md)
- 🔧 [安装指南](INSTALLATION_GUIDE.md)
- ⚠️ [已知问题](KNOWN_ISSUES.md)
- 📝 [变更日志](CHANGELOG.md)

## 反馈

遇到问题？请提交 [GitHub Issue](https://github.com/your-org/proclaw-desktop/issues)

---

**注意**: 这是 Beta 测试版本，部分功能仍在开发中。不建议在生产环境中使用。
```

### 上传文件

- [ ] 上传 Windows MSI 安装包
- [ ] 上传 macOS DMG 安装包（如有）
- [ ] 上传 Linux DEB 安装包（如有）
- [ ] 勾选 "Set as the latest release"
- [ ] 勾选 "Create a discussion for this release"
- [ ] 点击 "Publish release"

---

## 📢 营销页面更新

### 官网下载区域

在进销存开源营销页面添加:

```html
<section id="desktop-download" class="py-16 bg-gray-50">
  <div class="container mx-auto px-4">
    <h2 class="text-3xl font-bold text-center mb-8">🖥️ 桌面客户端下载</h2>
    <p class="text-center text-gray-600 mb-12">
      离线优先 · 数据加密 · 跨平台支持
    </p>

    <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <!-- Windows -->
      <div class="bg-white rounded-lg shadow-md p-6 text-center">
        <div class="text-4xl mb-4">🪟</div>
        <h3 class="text-xl font-semibold mb-2">Windows</h3>
        <p class="text-sm text-gray-500 mb-4">v0.1.0-beta | 15 MB</p>
        <a
          href="https://github.com/.../Proclaw_0.1.0_x64_en-US.msi"
          class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          下载安装包
        </a>
        <p class="text-xs text-gray-400 mt-2">Windows 10/11 64位</p>
      </div>

      <!-- macOS -->
      <div class="bg-white rounded-lg shadow-md p-6 text-center">
        <div class="text-4xl mb-4">🍎</div>
        <h3 class="text-xl font-semibold mb-2">macOS</h3>
        <p class="text-sm text-gray-500 mb-4">v0.1.0-beta | 18 MB</p>
        <a
          href="https://github.com/.../Proclaw_0.1.0_x64.dmg"
          class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          下载安装包
        </a>
        <p class="text-xs text-gray-400 mt-2">
          macOS 10.15+ Intel/Apple Silicon
        </p>
      </div>

      <!-- Linux -->
      <div class="bg-white rounded-lg shadow-md p-6 text-center">
        <div class="text-4xl mb-4">🐧</div>
        <h3 class="text-xl font-semibold mb-2">Linux</h3>
        <p class="text-sm text-gray-500 mb-4">v0.1.0-beta | 16 MB</p>
        <a
          href="https://github.com/.../proclaw_0.1.0_amd64.deb"
          class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          下载 DEB 包
        </a>
        <p class="text-xs text-gray-400 mt-2">Ubuntu/Debian 64位</p>
      </div>
    </div>

    <!-- Beta 提示 -->
    <div
      class="mt-8 max-w-2xl mx-auto bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"
    >
      <p class="text-sm text-yellow-800">
        <strong>⚠️ Beta 版本说明:</strong>
        当前为技术预览版，AI 功能为简化版。推荐使用演示模式快速体验。
        <a href="/docs/desktop-beta-guide" class="underline"
          >查看详细使用说明 →</a
        >
      </p>
    </div>
  </div>
</section>
```

- [ ] 更新官网首页
- [ ] 添加下载统计数据跟踪
- [ ] 测试下载链接有效性

---

## 📱 社交媒体宣传

### 宣传文案准备

#### Twitter/X

```
🦞 Proclaw Desktop v0.1.0-beta 正式发布！

✨ 开源的 AI 驱动商业管理系统
✅ 产品库 + 进销存 + AI 智能体
✅ 离线优先 · 数据加密 · 跨平台

👇 立即下载体验
[下载链接]

#OpenSource #DesktopApp #InventoryManagement
```

#### LinkedIn

```
我们很高兴宣布 Proclaw Desktop 首个公开测试版发布！

🎯 为中小企业设计的一体化商业管理平台
🔧 基于 Tauri + React + Rust 构建
💾 SQLite 加密存储 + Supabase 云端同步

立即体验演示模式，无需任何配置：
[下载链接]

欢迎反馈和建议！
```

#### Reddit (r/opensource, r/SideProject)

标题: `[Showcase] Proclaw Desktop - Open-source AI-powered business management system built with Tauri + Rust`

内容: 详细介绍项目背景、技术栈、功能特性，附上截图和下载链接。

### 发布渠道

- [ ] Twitter/X
- [ ] LinkedIn
- [ ] Reddit
- [ ] Hacker News
- [ ] Product Hunt (计划中)
- [ ] 国内: V2EX、知乎、掘金

---

## 📊 反馈收集准备

### GitHub Issues 模板

- [ ] Bug Report 模板
- [ ] Feature Request 模板
- [ ] Question 模板

### 反馈表单

创建 Google Form 或 Typeform:

- [ ] 整体满意度评分 (1-5星)
- [ ] 最常用的功能
- [ ] 遇到的问题
- [ ] 最希望添加的功能
- [ ] 是否愿意继续使用
- [ ] 联系方式（可选）

### 邮件列表

- [ ] 设置 Mailchimp 或 Substack
- [ ] 创建订阅表单
- [ ] 准备欢迎邮件模板

---

## 🎯 成功指标

### 首月目标 (2026-04-12 ~ 2026-05-12)

- [ ] GitHub Stars: 100+
- [ ] 下载次数: 500+
- [ ] GitHub Issues: 20+ (有效反馈)
- [ ] 活跃用户: 50+ (每周至少使用一次)
- [ ] 社区成员: Discord 30+ 人

---

## 📅 时间表

| 日期       | 任务                | 负责人    | 状态      |
| ---------- | ------------------- | --------- | --------- |
| 2026-04-12 | 代码清理和文档编写  | Lingma    | ✅ 完成   |
| 2026-04-13 | Windows 打包测试    | Dev Team  | ⏳ 待执行 |
| 2026-04-13 | 功能冒烟测试        | QA Team   | ⏳ 待执行 |
| 2026-04-14 | 截图和素材准备      | Marketing | ⏳ 待执行 |
| 2026-04-14 | GitHub Release 创建 | Tech Lead | ⏳ 待执行 |
| 2026-04-15 | 官网更新和发布      | Marketing | ⏳ 待执行 |
| 2026-04-15 | 社交媒体宣传        | Marketing | ⏳ 待执行 |

---

## ⚠️ 风险和缓解

### 风险 1: 打包失败

**可能性**: 低
**影响**: 高
**缓解措施**:

- 提前在 CI/CD 中测试构建
- 准备 Docker 构建环境
- 联系 Tauri 社区支持

### 风险 2: 严重 Bug 发现

**可能性**: 中
**影响**: 高
**缓解措施**:

- 快速响应机制（24小时内）
- 准备 hotfix 分支
- 透明沟通（更新 KNOWN_ISSUES）

### 风险 3: 下载量低于预期

**可能性**: 中
**影响**: 中
**缓解措施**:

- 多渠道宣传
- KOL/ influencer 合作
- Product Hunt 发布

---

## ✅ 最终检查

在点击"发布"按钮前，确认:

- [ ] 所有 P0/P1 任务完成
- [ ] 安装包在至少一个真实环境测试通过
- [ ] 所有文档链接有效
- [ ] GitHub Release 草稿已准备好
- [ ] 营销页面已更新
- [ ] 社交媒体文案已准备
- [ ] 反馈收集渠道已设置
- [ ] 团队成员知晓发布时间

---

## 🎉 发布！

- [ ] 点击 "Publish release"
- [ ] 更新官网
- [ ] 发布社交媒体
- [ ] 监控下载数据
- [ ] 回应早期反馈
- [ ] 庆祝！🎊

---

**祝发布顺利！** 🚀
