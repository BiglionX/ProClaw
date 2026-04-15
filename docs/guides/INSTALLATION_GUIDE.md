# 📦 ProClaw Desktop 安装指南

> 适用于 v0.1.0-beta 版本

---

## 🖥️ 系统要求

### Windows

- **操作系统**: Windows 10/11 (64位)
- **内存**: 最低 2GB RAM，推荐 4GB+
- **存储**: 50MB 可用空间
- **.NET Framework**: 4.5+ (通常已预装)

### macOS

- **操作系统**: macOS 10.15 (Catalina) 或更高版本
- **芯片**: Intel 或 Apple Silicon (M1/M2/M3)
- **内存**: 最低 2GB RAM，推荐 4GB+
- **存储**: 50MB 可用空间

### Linux

- **发行版**: Ubuntu 18.04+, Debian 10+, Fedora 32+
- **架构**: x86_64 (amd64)
- **内存**: 最低 2GB RAM，推荐 4GB+
- **存储**: 50MB 可用空间
- **依赖**: libwebkit2gtk, libgtk-3, libayatana-appindicator

---

## 📥 下载步骤

### 方法 1: GitHub Releases (推荐)

1. 访问 [GitHub Releases 页面](https://github.com/your-org/proclaw-desktop/releases)
2. 找到 `v0.1.0-beta` 版本
3. 根据您的操作系统下载对应的安装包:
   - Windows: `ProClaw_0.1.0_x64_en-US.msi`
   - macOS: `ProClaw_0.1.0_x64.dmg`
   - Linux: `proclaw_0.1.0_amd64.deb`

### 方法 2: 官方网站

1. 访问 ProClaw 官方网站
2. 点击"下载桌面客户端"
3. 选择您的操作系统
4. 开始下载

---

## 🔧 安装步骤

### Windows 安装

#### 步骤 1: 运行安装程序

双击下载的 `.msi` 文件

#### 步骤 2: 安全警告

如果看到"Windows 已保护你的电脑"警告:

1. 点击"更多信息"
2. 点击"仍要运行"

> **注意**: 这是因为应用尚未进行 Microsoft 签名，Beta 版本正常现象。

#### 步骤 3: 安装向导

1. 阅读许可协议，勾选"我接受"
2. 选择安装位置（默认即可）
3. 点击"安装"
4. 等待安装完成

#### 步骤 4: 启动应用

- 勾选"运行 ProClaw Desktop"
- 点击"完成"

**或者**: 从开始菜单或桌面快捷方式启动

---

### macOS 安装

#### 步骤 1: 打开 DMG 文件

双击下载的 `.dmg` 文件

#### 步骤 2: 拖拽到应用程序文件夹

将 ProClaw 图标拖拽到 Applications 文件夹

#### 步骤 3: 首次启动

1. 打开"应用程序"文件夹
2. 双击 ProClaw 图标

#### 步骤 4: 绕过 Gatekeeper

如果看到"无法验证开发者"警告:

**方法 A**: 右键点击 → 打开 → 确认打开

**方法 B**:

1. 打开"系统偏好设置"
2. 进入"安全性与隐私"
3. 在"通用"标签页，点击"仍要打开"

---

### Linux 安装 (Debian/Ubuntu)

#### 步骤 1: 打开终端

导航到下载目录:

```bash
cd ~/Downloads
```

#### 步骤 2: 安装 DEB 包

```bash
sudo dpkg -i proclaw_0.1.0_amd64.deb
```

#### 步骤 3: 修复依赖（如果需要）

```bash
sudo apt-get install -f
```

#### 步骤 4: 启动应用

```bash
proclaw
```

**或者**: 从应用程序菜单中搜索 "ProClaw"

---

## 🎮 首次使用

### 第 1 步: 选择使用模式

启动应用后，您会看到设置页面，提供两种模式:

#### 🎮 演示模式（推荐新手）

- ✅ 无需任何配置
- ✅ 使用本地数据库
- ✅ 预置模拟账号
- ✅ 所有核心功能可用

**操作**: 点击"进入演示模式"按钮

#### ☁️ 云端模式（生产环境）

- ✅ 数据同步到云端
- ✅ 多设备访问
- ✅ 实时协作
- ⚠️ 需要配置 Supabase

**操作**:

1. 注册 [Supabase](https://supabase.com) 免费账号
2. 创建新项目
3. 获取 API URL 和 Anon Key
4. 在 ProClaw 设置页面配置

详细教程: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

### 第 2 步: 登录

#### 演示账号

```
用户名: boss
密码: IamBigBoss
```

或使用登录页面的"⚡ 一键体验"按钮

#### 自定义账号

如果您配置了 Supabase:

1. 点击"注册"创建新账号
2. 或直接使用邮箱登录

---

### 第 3 步: 探索功能

登录后，您可以:

1. **产品库管理**
   - 添加新产品
   - 上传产品图片
   - 分类和品牌管理
   - 导出 CSV

2. **进销存管理**
   - 查看库存概览
   - 创建入库/出库记录
   - 处理低库存预警

3. **AI 智能体**
   - 尝试自然语言指令
   - 使用快捷操作面板
   - 与智能体对话

---

## ❓ 常见问题

### Q1: Windows 显示"未知发布者"警告？

**A**: 这是正常的，因为 Beta 版本未进行代码签名。您可以放心安装，软件来自官方 GitHub。

**解决方法**: 点击"更多信息" → "仍要运行"

---

### Q2: macOS 提示"应用已损坏"？

**A**: 这是 Gatekeeper 的安全机制。

**解决方法**:

```bash
# 在终端执行
xattr -cr /Applications/ProClaw.app
```

---

### Q3: Linux 安装时缺少依赖？

**A**: 某些发行版可能需要额外依赖。

**解决方法**:

```bash
# Ubuntu/Debian
sudo apt-get install libwebkit2gtk-4.0-37 libgtk-3-0 libayatana-appindicator3-1

# Fedora
sudo dnf install webkit2gtk3 gtk3 libappindicator-gtk3
```

---

### Q4: 启动后白屏或无响应？

**A**: 可能是 WebView2 运行时问题（Windows）。

**解决方法**:

1. 下载并安装 [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
2. 重启 ProClaw

---

### Q5: 如何卸载？

**Windows**:

1. 设置 → 应用 → 安装的应用
2. 找到 ProClaw Desktop
3. 点击"卸载"

**macOS**:

1. 打开"应用程序"文件夹
2. 将 ProClaw.app 拖到废纸篓
3. 清空废纸篓

**Linux**:

```bash
sudo dpkg -r proclaw
```

---

### Q6: 数据保存在哪里？

**本地数据**:

- Windows: `%APPDATA%\com.proclaw.desktop\proclaw.db`
- macOS: `~/Library/Application Support/com.proclaw.desktop/proclaw.db`
- Linux: `~/.local/share/com.proclaw.desktop/proclaw.db`

**云端数据**: 如果使用 Supabase，数据存储在您的 Supabase 项目中

---

### Q7: 如何备份数据？

**手动备份**:

1. 关闭 ProClaw
2. 复制上述位置的 `proclaw.db` 文件
3. 保存到安全位置

**恢复数据**:

1. 关闭 ProClaw
2. 将备份的 `proclaw.db` 复制回原位置
3. 启动 ProClaw

---

## 🔐 安全提示

1. **数据加密**: 本地数据库使用 SQLCipher AES-256 加密
2. **网络安全**: 与 Supabase 通信使用 HTTPS/TLS 1.3
3. **权限控制**: 最小权限原则，仅请求必要的系统权限
4. **开源透明**: 完整源代码可在 GitHub 查看

---

## 🆘 获取帮助

如果遇到问题:

1. **查看日志**
   - Windows: `%APPDATA%\com.proclaw.desktop\logs\`
   - macOS: `~/Library/Logs/com.proclaw.desktop/`
   - Linux: `~/.local/share/com.proclaw.desktop/logs/`

2. **报告问题**
   - [GitHub Issues](https://github.com/your-org/proclaw-desktop/issues)
   - 附上日志文件和操作步骤

3. **社区支持**
   - [Discord](https://discord.gg/proclaw)
   - [官方论坛](https://forum.proclaw.ai)

---

## 📞 联系我们

- 📧 邮箱: support@proclaw.ai
- 🌐 网站: https://proclaw.ai
- 💬 Discord: https://discord.gg/proclaw

---

**祝您使用愉快！** 🎉
