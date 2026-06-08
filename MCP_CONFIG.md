# MCP 配置说明

本文档说明 ProClaw 项目的 MCP (Model Context Protocol) 配置。

## 配置文件

- `mcp.json` - MCP 主配置文件

## 已配置的 MCP 服务器

| 服务器 | 功能 | 状态 |
|--------|------|------|
| filesystem | 文件读写操作 | 已启用 |
| git | Git 版本控制 | 已启用 |

## 安装依赖

已成功安装的包：

```powershell
npm install -g @modelcontextprotocol/server-filesystem
```

Git 服务器需要 uvx：

```powershell
pip install uvx
uvx mcp-server-git --repository .
```

## 使用限制

- **filesystem**: 仅允许访问 `d:/BigLionX/ProClaw` 目录
