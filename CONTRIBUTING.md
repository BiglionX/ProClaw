# 贡献指南

感谢你对 ProClaw Desktop 的兴趣!

## 开发环境设置

1. 安装 Rust: https://www.rust-lang.org/tools/install
2. 安装 Node.js 18+: https://nodejs.org/
3. 克隆仓库并安装依赖

```bash
git clone https://github.com/BiglionX/ProClaw.git
cd ProClaw
npm install
```

## 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 规则
- 组件使用函数式写法 + Hooks
- 提交信息遵循 Conventional Commits

## 提交流程

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 编写代码和测试
4. 确保所有测试通过
5. 提交 PR 并描述变更

## 报告 Bug

使用 GitHub Issues,包含:
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息(OS、Node 版本等)

## 请求新功能

先在 Issues 中讨论,确认后再实现。

## 文档改进

欢迎改进文档!包括:
- README 更新
- 代码注释
- 教程和示例
- API 文档

## 许可证

通过贡献代码,你同意你的贡献将在 GPL-3.0 许可证下发布。

## 🧩 开发虚拟公司插件（v1.3.2+）

ProClaw v1.3.2 起支持 [NvWaX](https://nvwax.proclaw.cc) 虚拟公司闭环。
第三方插件作者可以让插件调用 NvWaX API 创建 / 导入 / 同步虚拟公司。

### 插件最小骨架

```bash
src/plugins/my-vc-plugin/
├── manifest.json          # 插件元数据（含 permissions）
└── frontend/
    └── index.js           # IIFE 入口，注册路由 / 菜单 / 调用 NvWaX
```

### manifest.json 关键字段

```json
{
  "id": "my-vc-plugin",
  "name": "我的虚拟公司插件",
  "version": "1.0.0",
  "category": "official",
  "entryPoints": { "frontend": "frontend/index.js" },
  "permissions": [
    "nvwax:invoke:nvwax_search_vc_templates",
    "nvwax:invoke:nvwax_import_virtual_company_from_url",
    "nvwax:invoke:nvwax_push_virtual_company_state",
    "nvwax:invoke:nvwax_fetch_local_state"
  ]
}
```

### frontend/index.js 调用示例

```javascript
// 在插件入口 IIFE 中调用任意 NvWaX Tauri 命令
async function importMyVc(downloadUrl) {
  const resp = await ProClawPlugin.invoke(
    'nvwax_import_virtual_company_from_url',
    { downloadUrl }
  );
  // resp: { success: true, data: { package_id, team_id, agents_imported, ... } }
}

// 监听 CEO Agent 跳转到你的页面
window.addEventListener('plugin:virtual-company:open-wizard', () => {
  // 用户在 CEO Agent 触发了"创建虚拟公司"意图
  // 这里可以预填表单、显示推荐模板等
});
```

### 必读文档

1. **跨包数据契约**：[`docs/integration/virtual-company-package.schema.json`](docs/integration/virtual-company-package.schema.json)
2. **完整 API 参考**：[`docs/integration/NVWAX_INTEGRATION.md`](docs/integration/NVWAX_INTEGRATION.md)
3. **架构规范**：[`docs/MULTI_PROJECT_INTEGRATION_SPEC.md` 第 11 节](docs/MULTI_PROJECT_INTEGRATION_SPEC.md#11-虚拟公司闭环sprint-213215-已交付-)
4. **官方参考实现**：[`src/plugins/virtual-company/`](src/plugins/virtual-company/)（含 manifest.json + frontend/index.js + 4 个 React 路由完整源码）

### 8 个可用 Tauri 命令（Sprint 2.13–2.15）

| 命令 | 引入 | 用途 |
|------|------|------|
| `nvwax_search_vc_templates` | 2.13 | 浏览模板 |
| `nvwax_import_virtual_company_from_url` | 2.13 | 导入 `.nvwax-vc.json` |
| `bootstrap_virtual_company_tables` | 2.13 | 建表（幂等） |
| `open_virtual_company_page` | 2.14 | 跳转到 `/vc/{wizard,import,companies}` |
| `nvwax_push_virtual_company_state` | 2.14 | 回写本地状态 |
| `nvwax_stream_session` | 2.14 | SSE 流式创建 |
| `nvwax_fetch_local_state` | 2.15 | 拉取最新 local_state |
| `nvwax_list_sessions_with_state` | 2.15 | 列出会话（含 local_state） |

完整参数 / 返回值 / 计费点 / 错误处理见 [`NVWAX_INTEGRATION.md` 第 4 节](docs/integration/NVWAX_INTEGRATION.md#4-完整-nvwax-命令清单)。

### Plugin Frontend 自动加载机制

`src/lib/pluginFrontend.ts` 使用 `import.meta.glob('../plugins/*/frontend/index.js', { eager: true })` 在 build 时把所有插件 frontend 打包进主 bundle。运行时无需手动加载；只需把插件 manifest 注册到 `src/lib/manifestRegistry.ts` 的 `BUILTIN_MANIFESTS` 数组（内置插件）或通过插件市场下载（第三方插件）。
