# Hermes Skills — CI 配置说明

> **P5 阶段产出** · 让 Hermes 模块每次 PR 都有自动化测试 + 类型检查 + Rust 编译验证。

---

## 1. CI Job 总览

`.github/workflows/ci.yml` 现在包含 9 个并行 job:

| Job | 触发条件 | 用途 | 预计耗时 |
|---|---|---|---|
| **hermes-fast** ⭐ | 每次 PR | Hermes 模块的 vitest + tsc | ~2 min |
| **hermes-integration** | 每次 PR | Hermes API 端到端 smoke test | ~3 min |
| **storybook-build** | 每次 PR(可选) | Storybook 静态构建 | ~4 min |
| **frontend-lint** | 每次 PR | 全量 tsc + eslint | ~3 min |
| **frontend-test** | 每次 PR | 全量 vitest + coverage | ~5 min |
| **rust-fmt** | 每次 PR | cargo fmt --check | ~1 min |
| **rust-clippy** | 每次 PR | hermes_commands.rs 必须 0 警告 | ~8 min |
| **mobile-lint** | 每次 PR | mobile 模块 tsc | ~3 min |
| **mobile-test** | 每次 PR | mobile vitest | ~5 min |
| **ci-summary** | 所有 job 完成后 | 输出 PR 摘要 + 自动评论 | ~10 sec |

---

## 2. Hermes 专项 Job 详解

### 2.1 `hermes-fast`(P0 必跑)

**目标**:快速反馈 Hermes 模块的回归。

```yaml
- run: npx tsc --noEmit -p tsconfig.json
- run: npx vitest run --reporter=verbose src/lib/hermes
```

**覆盖范围**(对应 `src/lib/hermes/**.test.ts`):
- `hermes.test.ts` — SkillStore + SkillRetriever 单测(13 个)
- `evolver.test.ts` — SkillEvolver 闭环(25 个)
- `healing.test.ts` — SelfHealingExecutor + MoAOrchestrator(25 个)
- `hermesApi.test.ts` — HermesApi(14 个)
- `sqlCipherExecutor.test.ts` — 适配器(27 个)

合计 ~104 个测试用例。

**为什么放第一个**:任何 Hermes 代码改动,3 分钟内就能看到结果。

### 2.2 `storybook-build`

智能检测 Storybook 是否安装(项目根 `node_modules/@storybook`),安装了就构建,没装就跳过并 warn。这样:

- 现状:跳过 + warn(参考 STORYBOOK_SETUP.md)
- 未来装上:自动构建并上传 storybook-static 产物 7 天

### 2.3 `rust-clippy`(Hermes-aware)

```yaml
HERMES_WARNINGS=$(grep -c "warning" clippy.log)
if [ "$HERMES_WARNINGS" -gt "0" ]; then
  echo "::error::hermes_commands.rs 有 $HERMES_WARNINGS 个 clippy 警告"
  exit 1
fi
```

**为什么单独检查 Hermes**:因为 `hermes_commands.rs` 是新增代码,应该保持 0 警告;其他模块的旧警告不应该阻挡 Hermes 合并。

---

## 3. Hermes Release 流程

`.github/workflows/hermes-release.yml` 提供:

### 3.1 打 tag 自动生成 release notes
```bash
git tag v1.4.0
git push origin v1.4.0
```
触发后:
1. 自动提取含 `hermes` / `skill` / `evolve` / `moa` / `healing` 关键字的最近 30 天 commits
2. 生成 GitHub Release 草稿
3. PR 评论引导 reviewer

### 3.2 PR 评论自动提示
每次 PR 只要包含 Hermes 相关文件,自动评论:
```
🦞 Hermes 模块变更(N 个文件)
请确认:
- Skill 数据结构兼容现有 schema
- 没有破坏 attachHermes 契约
- 更新了对应 stories 与 fixtures
```

---

## 4. 本地模拟 CI

在本地完整跑一次 CI 的所有 Hermes 相关步骤:

```bash
# Hermes 快速反馈
npx tsc --noEmit -p tsconfig.json
npm run test:run -- src/lib/hermes

# Storybook(如果装了)
npx storybook build --output-dir storybook-static

# Rust 部分
cd src-tauri
cargo fmt --all --check
cargo check --tests
cargo clippy --all-targets -- -D warnings
```

---

## 5. 添加新的 Hermes 模块

如果你新增了 `src/lib/hermes/foo.ts`,请同步更新:

1. **单测**:`src/lib/hermes/foo.test.ts`
2. **types**:在 `index.ts` 加 `export type {...}`
3. **fixtures**:`src/components/hermes/stories/fixtures.ts`(若有 UI 依赖)
4. **stories**:`src/components/hermes/Foo.stories.tsx`(若有 UI)
5. **本文件**:在 §2.1 表里补充

CI 会自动覆盖到,因为 `src/lib/hermes/**/*.test.ts` 是 glob 匹配。

---

## 6. 故障排查

### 6.1 `hermes-fast` 失败

```bash
# 本地重跑:
npx vitest run src/lib/hermes

# 看具体哪个文件挂了
npx vitest run src/lib/hermes/evolver.test.ts
```

### 6.2 `rust-clippy` 报 Hermes 警告

```bash
cd src-tauri
cargo clippy --all-targets 2>&1 | grep hermes
```

常见修复:
- 用 `?` 替代 `.unwrap()`(更安全)
- 显式标注 `Result<_, String>` 而非 `Result<_, Box<dyn Error>>`
- `String` 错误信息加上下文,便于调试

### 6.3 Storybook 构建失败

```bash
# 检查 storybook 是否安装
ls node_modules/@storybook/

# 重装
rm -rf node_modules/@storybook
pnpm dlx sb@latest init --skip-install
```

---

## 7. 未来扩展

### 7.1 Hermes 性能基准
P5.1 可以加 `vitest bench`,跟踪 SkillEvolver / FTS5 检索的耗时趋势。

### 7.2 Hermes 视觉回归
P5.2 可以用 Playwright + Storybook 跑视觉回归测试,防止 UI 改动意外破样式。

### 7.3 Hermes 灰度发布
P5.3 给 `attachHermes` 加 feature flag,允许在 production 中关掉 Hermes,排查问题时回滚。

---

**变更记录**

| 日期 | 版本 | 作者 | 变更 |
|---|---|---|---|
| 2026-07-06 | v1.0 | BigLionX | 初稿 |