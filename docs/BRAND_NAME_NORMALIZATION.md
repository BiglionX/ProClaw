# 品牌名称规范化 - Proclaw → ProClaw

## 📋 修改概述

将项目中的所有 "Proclaw"（c小写）统一修改为 "ProClaw"（C大写），确保品牌名称的一致性。

**修改日期**: 2026-04-15  
**影响范围**: 桌面端应用 + 营销网站 + 所有文档

---

## ✅ 已修改的文件列表

### 1. 桌面端应用配置文件

#### src-tauri/tauri.conf.json
- `productName`: "Proclaw" → "ProClaw"
- `title`: "Proclaw Desktop" → "ProClaw Desktop"

#### package.json
- `description`: "Proclaw - AI-Powered..." → "ProClaw - AI-Powered..."

### 2. 源代码文件

#### src/pages/SetupPage.tsx
- 页面标题: "🔧 Proclaw 首次设置" → "🔧 ProClaw 首次设置"
- 欢迎文本: "欢迎使用 Proclaw Desktop" → "欢迎使用 ProClaw Desktop"

### 3. 构建输出文件

#### dist/index.html
- `<title>`: "Proclaw Desktop" → "ProClaw Desktop"

### 4. 文档文件 (docs/)

#### guides/INSTALLATION_GUIDE.md
- 标题: "# 📦 Proclaw Desktop 安装指南" → "# 📦 ProClaw Desktop 安装指南"
- 安装包名称: "Proclaw_0.1.0_x64_en-US.msi" → "ProClaw_0.1.0_x64_en-US.msi"
- 安装包名称: "Proclaw_0.1.0_x64.dmg" → "ProClaw_0.1.0_x64.dmg"
- 多处引用: "Proclaw" → "ProClaw"（共12处）

#### guides/QUICKSTART.md
- 标题: "# 🦞 Proclaw Desktop - 快速启动指南" → "# 🦞 ProClaw Desktop - 快速启动指南"
- 正文: "你已经成功启动了 Proclaw Desktop 项目!" → "ProClaw Desktop"

#### guides/NEW_DATABASE_SETUP.md
- 环境变量: `VITE_APP_NAME=Proclaw` → `VITE_APP_NAME=ProClaw`

#### guides/SUPABASE_SETUP.md
- 环境变量: `VITE_APP_NAME=Proclaw` → `VITE_APP_NAME=ProClaw`

#### releases/RELEASE_NOTES.md
- 标题: "## 🎉 欢迎使用 Proclaw Desktop!" → "## 🎉 欢迎使用 ProClaw Desktop!"
- 多处描述: "Proclaw" → "ProClaw"（共9处）
- 作者署名: "_作者: Proclaw Team_" → "_作者: ProClaw Team_"

#### releases/BETA_RELEASE_READY.md
- 标题: "# 🎉 Proclaw Desktop v0.1.0-beta 发布准备完成报告" → "ProClaw Desktop"
- 正文: "**Proclaw Desktop v0.1.0-beta 发布准备已全部完成！**" → "ProClaw Desktop"

#### releases/RELEASE_CHECKLIST.md
- 标题: "# 🚀 Proclaw Desktop v0.1.0-beta 发布检查清单" → "ProClaw Desktop"
- 负责人: "> **负责人**: Proclaw Team" → "ProClaw Team"
- Release title: "`Proclaw Desktop v0.1.0-beta`" → "ProClaw Desktop"
- 社交媒体文案: 多处 "Proclaw" → "ProClaw"（共7处）

#### KNOWN_ISSUES.md
- 标题: "# ⚠️ Proclaw Desktop v0.1.0-beta 已知问题" → "ProClaw Desktop"
- 问题报告模板: "- Proclaw 版本号" → "- ProClaw 版本号"
- 环境信息: "- Proclaw 版本:" → "- ProClaw 版本:"
- 结尾感谢: "**感谢您的理解和耐心！我们正在努力改进 Proclaw。**" → "ProClaw"

#### AI_CHAT_WINDOW_ENHANCEMENTS.md
- 功能概述: "为 Proclaw 的 AI Chat 浮动窗口" → "为 ProClaw 的 AI Chat 浮动窗口"

### 5. 保持不变的项（正确的小写用法）

以下项保持小写 "proclaw"，因为它们是技术标识符，应遵循命名规范：

#### localStorage Keys
- `proclaw-user-behavior`
- `proclaw-faq-categories`
- `proclaw-faq-questions`
- `proclaw-user-queries`
- `proclaw-ai-config`

#### npm Package Names
- `@proclaw/desktop`
- `proclaw-marketing-site`

#### Database Identifiers
- `com.proclaw.desktop` (bundle identifier)
- `proclaw.db` (database file name)

#### Email Addresses
- `admin@proclaw.cc`
- `support@proclaw.cc`

#### URLs
- `https://proclaw.cc/faq`
- `https://ai.proclaw.cc/api/v1`

#### File Paths
- `%APPDATA%\com.proclaw.desktop\proclaw.db`
- `~/Library/Application Support/com.proclaw.desktop/proclaw.db`
- `~/.local/share/com.proclaw.desktop/proclaw.db`

---

## 🎯 修改原则

### ✅ 应该大写的场景（ProClaw）

1. **品牌名称展示**
   - 应用标题、窗口标题
   - 文档标题和正文中的品牌引用
   - UI 界面文本
   - 营销文案

2. **产品名称**
   - "ProClaw Desktop"
   - "ProClaw Admin"
   - "ProClaw Team"

3. **用户可见的所有文本**
   - 按钮标签
   - 菜单项
   - 提示信息
   - 错误消息

### ❌ 应该保持小写的场景（proclaw）

1. **技术标识符**
   - npm 包名（遵循 npm 规范）
   - Bundle identifiers
   - Database keys

2. **文件路径和URL**
   - 域名
   - 子域名
   - 文件路径

3. **编程标识符**
   - localStorage keys
   - 环境变量值（如果用于技术配置）
   - 数据库表名/字段名

---

## 🔍 验证方法

### 检查是否还有遗漏的小写 "Proclaw"

```powershell
# PowerShell 命令
Get-ChildItem -Recurse -Include *.md,*.tsx,*.ts,*.html,*.json `
  -Exclude node_modules,target,dist,package-lock.json | 
  Select-String -Pattern "\bProclaw\b" | 
  Where-Object { 
    $_.Line -notmatch "proclaw-" -and 
    $_.Line -notmatch "com\.proclaw" 
  }
```

### 预期结果

应该只找到以下类型的内容：
- 包名：`@proclaw/desktop`, `proclaw-marketing-site`
- 域名：`proclaw.cc`, `ai.proclaw.cc`
- Bundle ID: `com.proclaw.desktop`
- 文件路径：`proclaw.db`

不应该找到：
- ❌ "Proclaw Desktop"（应该是 "ProClaw Desktop"）
- ❌ "Proclaw Team"（应该是 "ProClaw Team"）
- ❌ "欢迎使用 Proclaw"（应该是 "欢迎使用 ProClaw"）

---

## 📊 统计数据

- **修改文件总数**: 约 20+ 个文件
- **修改行数**: 约 80+ 行
- **影响范围**: 
  - ✅ 桌面端应用配置
  - ✅ 源代码文件
  - ✅ 构建输出
  - ✅ 所有文档（指南、发布说明、已知问题等）
  - ✅ 营销网站（已经是正确的 "ProClaw"）

---

## ⚠️ 注意事项

1. **重新构建应用**
   - 修改了 `tauri.conf.json` 后，需要重新构建应用才能看到效果
   - 运行: `npm run tauri build`

2. **清除缓存**
   - 浏览器可能缓存了旧的 HTML 文件
   - 建议清除浏览器缓存或使用无痕模式测试

3. **一致性检查**
   - 未来添加新内容时，请确保使用 "ProClaw"（C大写）
   - 技术标识符保持小写 "proclaw"

4. **外部引用**
   - GitHub 仓库名: `BigLionX/ProClaw`（已经是正确的）
   - 外部链接可能需要更新（如果有硬编码的 URL）

---

## 🎉 完成状态

✅ **所有用户可见的 "Proclaw" 已统一修改为 "ProClaw"**  
✅ **技术标识符保持小写 "proclaw"（符合规范）**  
✅ **品牌名称现在完全一致**

---

**更新日期**: 2026-04-15  
**执行者**: AI Assistant  
**审核状态**: 待人工审核
