# Hermes Skills — SQLCipher / SQLite 适配器指南

> **P3 阶段产出** · 让 Hermes 中间件接入 ProClaw 生产数据库。

---

## 1. 背景

`SkillStore` 抽象了 `DatabaseExecutor` 接口(`exec` / `run` / `all` / `get` 四方法),
不直接依赖 SQLite 客户端。本文档说明在生产 / 测试 / Storybook 各场景下如何注入合适的实现。

---

## 2. 三种场景适配器

### 2.1 TauriRpcExecutor(推荐 — Tauri 桌面生产)

**适用场景**:Tauri 桌面端正式环境。

**原理**:JS 端通过 `invoke('hermes_db_*')` 把 SQL 转发到 Rust 侧,
由 Rust 用主 `Mutex<Database>` 执行,完全复用现有的 AES-256-GCM 应用层加密、事务、备份策略。

**JS 端用法**(在 `src/main.tsx`):

```typescript
import { invoke } from '@tauri-apps/api/core';
import {
  makeTauriRpcExecutor,
  createHermesBundle,
  setHermesApi,
  HermesApi,
} from '@/lib/hermes';

// 1. 创建 Executor
const executor = makeTauriRpcExecutor(invoke);

// 2. 创建 bundle + 种子
const hermes = createHermesBundle(executor);
hermes.seedPresets();
hermes.bindLLMProvider(() => getLLMForTask('business_insight'));

// 3. 暴露给 UI
setHermesApi(new HermesApi(hermes));
```

**Rust 侧**:`src-tauri/src/hermes_commands.rs`(本目录已生成),注册到 `invoke_handler.rs`。

**特性**:

- ✅ 共享主 db 的加密 / 备份 / 迁移
- ✅ 事务一致性(Skill 写入与业务表 join 同一 db)
- ✅ Tauri 的 Mutex 保护并发安全
- ⚠️ 比纯本地 SQLite 慢一点(invoke IPC 开销 ≈ 1-3ms)
- ⚠️ Skill 表与业务表在同一 db,**未来需要清理时记得清理**

---

### 2.2 StandaloneSqliteExecutor(独立 db / SQLCipher 加密)

**适用场景**:

- 不依赖 Tauri 的纯浏览器环境
- Storybook / 演示站
- 需要 SQLCipher 数据库级加密(而不是应用层加密)的特殊场景

**原理**:JS 端用 `better-sqlite3`(或 `better-sqlite3-sqlcipher`)直接打开独立 db 文件。

**用法**(在 `src/main.tsx`,仅浏览器/Storybook):

```typescript
import Database from 'better-sqlite3';
import { makeStandaloneExecutor } from '@/lib/hermes/sqlCipherExecutor';

// 注意:在 Tauri 桌面不要用这个,会重复占用 SQLite 文件锁
const db = new Database('hermes.db');
const executor = makeStandaloneExecutor(db, {
  encryptionKey: '可选:SQLCipher key',
  cipherCompatibility: '4',
});

const hermes = createHermesBundle(executor);
hermes.seedPresets();
setHermesApi(new HermesApi(hermes));
```

**特性**:

- ✅ 零 Tauri 依赖,纯浏览器可跑
- ✅ 支持 SQLCipher `PRAGMA key`(初始化时自动执行)
- ⚠️ 不与主业务 db 共享,Skill 写入与业务事务隔离

---

### 2.3 InMemoryDatabase(开发 / Storybook / 单测)

**适用场景**:

- 单测
- Storybook 演示
- 开发模式快速调试

**用法**:

```typescript
import { createHermesBundle, InMemoryDatabase } from '@/lib/hermes';

const bundle = createHermesBundle(new InMemoryDatabase());
bundle.seedPresets();
```

**特性**:完全无副作用,无需任何数据库文件;所有数据在内存中。

---

## 3. 启动流程指引

### 3.1 首次启用(在 main.tsx / App.tsx)

```typescript
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  makeTauriRpcExecutor,
  createHermesBundle,
  setHermesApi,
  HermesApi,
} from '@/lib/hermes';
import { getLLMForTask } from '@/lib/llmProvider';

export function useHermesBootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Tauri 环境检测
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (!isTauri) {
        // Storybook / dev: 用内存 db
        const { createHermesBundle, InMemoryDatabase } = await import('@/lib/hermes');
        const bundle = createHermesBundle(new InMemoryDatabase());
        bundle.seedPresets();
        setHermesApi(new HermesApi(bundle));
        setReady(true);
        return;
      }

      // 生产:走 Tauri RPC
      const executor = makeTauriRpcExecutor(invoke);
      const bundle = createHermesBundle(executor);
      bundle.seedPresets();
      bundle.bindLLMProvider(() => getLLMForTask('business_insight'));
      setHermesApi(new HermesApi(bundle));
      setReady(true);
    })();
  }, []);

  return ready;
}
```

### 3.2 测试模式覆盖(可选)

如果想在生产也强制用内存 db 调试,在 `.env.local` 加:

```env
VITE_HERMES_FORCE_INMEMORY=true
```

然后在 bootstrap 里:

```typescript
const forceInMemory = import.meta.env.VITE_HERMES_FORCE_INMEMORY === 'true';
if (forceInMemory) { /* 用 InMemoryDatabase */ }
```

---

## 4. 错误处理与降级

### 4.1 invoke 失败

`TauriRpcExecutor` 会把错误透传出去,`SkillStore` 抛错。建议在调用方包一层:

```typescript
try {
  const skill = await api.getSkill(id);
} catch (e) {
  if (e instanceof Error && e.message.includes('hermes_db_')) {
    // Tauri 端 db 错误,通常是 db 锁或 schema 不兼容
    console.error('Hermes DB 错误:', e);
    // UI 层降级:本地缓存版 skill
  }
}
```

### 4.2 SQLCipher key 错误

```typescript
const executor = makeStandaloneExecutor(db, { encryptionKey: 'wrong' });
// 首次执行 SQL 时会抛 SQLITE_NOTADB,意味着 key 不对。
// 解决:从 ProClaw keyring 取 key,而不是 hardcode。
```

---

## 5. 性能与监控

### 5.1 性能基线

| 场景 | 延迟 | 备注 |
|---|---|---|
| TauriRpc 单条 INSERT | ~3-5ms | 含 IPC + Mutex lock |
| TauriRpc FTS5 检索 | ~10-30ms | 首次冷查询 |
| StandaloneSqlite 单条 INSERT | <1ms | 纯本地 |
| StandaloneSqlite FTS5 检索 | ~3-10ms | 取决于 DB 大小 |

### 5.2 监控建议

- `hermes_evolution_log` 表记录每次反思,UI 在 `SkillEvolveLog` Tab 显示
- 监控 `evolution_log.action='noop'` 占比:超过 30% 说明反思 prompt 需要优化
- 监控 `Skill.failureCount / Skill.usageCount`:超过 30% 应自动归档

---

## 6. 迁移路径

### 从 InMemoryDatabase → TauriRpcExecutor

```typescript
// 开发
const bundle = createHermesBundle(new InMemoryDatabase());

// 生产
const bundle = createHermesBundle(makeTauriRpcExecutor(invoke));
```

**零代码改动**,只需要换 Executor 实例。SkillStore / SkillEvolver / SelfHealingExecutor / MoAOrchestrator 完全不变。

### 从 StandaloneSqlite → TauriRpc(统一到主 db)

```typescript
// 旧:独立 db
const db = new Database('hermes.db');
const executor = makeStandaloneExecutor(db);

// 新:走主 db
const executor = makeTauriRpcExecutor(invoke);
```

**数据迁移**:可用 `hermes_db_get/all` 命令读旧 db 的 skill 数据,再用 `hermes_db_run` 写入主 db。

---

## 7. 常见问题

### Q:为什么不用真 SQLCipher?

ProClaw 主 db 已用 AES-256-GCM 应用层加密,数据库文件本身是明文 SQLite。
SQLCipher 是数据库级加密,与现有架构重叠。
如确需数据库级加密,`StandaloneSqliteExecutor` 已支持 PRAGMA key 模式。

### Q:invoke 频繁调用会不会有性能问题?

Skill 操作典型是「读多写少」:每次 Agent 调用只检索一次,
后台 SkillEvolver 每 30s 才 flush 一次。
invoke IPC 开销在整体延迟中占比 < 5%,可忽略。

### Q:如何备份 Skill 数据?

Skill 表(hermes_skills / hermes_evolution_log)与业务表在同一 db,
复用现有的备份策略即可。无需额外备份。

### Q:Schema 升级怎么办?

`SkillStore.init()` 读 `hermes_schema_meta.schema_version`,版本不匹配时打 warn。
P1 之后会加 migration 逻辑(每个版本一个迁移函数)。

---

## 8. 文件清单

| 文件 | 用途 |
|---|---|
| `src/lib/hermes/sqlCipherExecutor.ts` | TauriRpcExecutor + StandaloneSqliteExecutor + 工厂 |
| `src-tauri/src/hermes_commands.rs` | Rust 侧 `hermes_db_*` 命令实现 |
| `src-tauri/src/invoke_handler.rs`(已修改) | 注册 hermes_db_* 命令 |

---

## 9. 测试覆盖

- ✅ `StandaloneSqliteExecutor`:`better-sqlite3` 跑全 SkillStore / Retriever / Evolver 单测
- ✅ `TauriRpcExecutor`:用 mock invoke 跑 sqlCipherExecutor 单测
- ✅ InMemoryDatabase:所有现有单测默认走这条路径

---

**变更记录**

| 日期 | 版本 | 作者 | 变更 |
|---|---|---|---|
| 2026-07-06 | v1.0 | BigLionX | 初稿 |