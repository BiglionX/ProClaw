# Hermes Skills — Storybook 集成

> **P4 阶段产出** · 让设计师 / 产品在没有真实 LLM 与数据库的情况下,可视化预览所有 Hermes 组件。

---

## 1. 一次性安装(项目根目录执行)

由于安装脚本会修改 `package.json`、`pnpm-lock.yaml` 等共享文件,本仓库**没有**自动跑 `sb init`。你需要本地手动执行一次:

```bash
# 1. 安装 Storybook 7 + 必要 addon
pnpm dlx sb@latest init --skip-install
pnpm add -D @storybook/react-vite @storybook/addon-essentials \
  @storybook/addon-a11y @storybook/blocks react-docgen-typescript

# 2. 安装 peer 依赖
pnpm add -D vite @vitejs/plugin-react

# 3. 跑通
pnpm storybook
```

如果项目用 npm:

```bash
npx sb@latest init --skip-install
npm i -D @storybook/react-vite @storybook/addon-essentials @storybook/addon-a11y @storybook/blocks react-docgen-typescript
npx storybook dev
```

---

## 2. 已经准备好的文件

| 文件 | 用途 |
|---|---|
| `.storybook/main.ts` | Storybook 7 + Vite 框架配置 |
| `.storybook/preview.tsx` | 全局装饰器:MUI 主题 + HermesApi Mock Provider |
| `src/components/hermes/stories/HermesApiMockProvider.tsx` | Storybook Mock Provider,提供内存 HermesApi |
| `src/components/hermes/stories/fixtures.ts` | 预置数据:8 个 skill、12 条 evolution log 等 |
| `src/components/hermes/SkillTree.stories.tsx` | SkillTree 故事(4 个场景) |
| `src/components/hermes/SkillDetailDrawer.stories.tsx` | 详情抽屉故事(3 个场景) |
| `src/components/hermes/SkillEvolveLog.stories.tsx` | 进化日志故事(3 个场景) |
| `src/components/hermes/PendingReviewPanel.stories.tsx` | 待审核列表故事(3 个场景) |
| `src/components/hermes/MoAResultPanel.stories.tsx` | MoA 演示故事(2 个场景) |
| `src/components/hermes/HermesSkillsPage.stories.tsx` | 主页面故事(完整 + loading + error) |

---

## 3. Story 写法的关键约定

### 3.1 HermesApi Mock
所有 stories 自动通过 `HermesApiMockProvider` 注入内存版 HermesApi,Story 不需要关心后端:

```tsx
import { HermesApiMockProvider } from './stories/HermesApiMockProvider';

export default {
  title: 'Hermes/SkillTree',
  component: SkillTree,
  decorators: [
    (Story) => (
      <HermesApiMockProvider>
        <Story />
      </HermesApiMockProvider>
    ),
  ],
};
```

### 3.2 Story 命名约定

- 组件主故事:`Title.组件名`
- 子故事:`Title.组件名/子状态`(如 `SkillTree/Active`、`SkillTree/Pending`)

### 3.3 用 `args` 而非 props 直传

Storybook 7 推荐用 `args` + `argTypes`,这样控件面板可以编辑:

```tsx
export const Default = {
  args: {
    skills: FIXTURE_SKILLS,
    onSelectSkill: () => {},
  },
};
```

---

## 4. 常见场景

### 4.1 设计评审
打开 Storybook,所有组件渲染在浅灰背景上,设计可直接对照 Figma。

### 4.2 文档站
打开 Storybook,每个组件都有 `Docs` 标签页,展示 props + argTypes + 默认/边界 story。

### 4.3 组件单测替代
Storybook 的 `play` 函数支持用 `@storybook/test` 模拟交互:

```tsx
import { expect, fn, userEvent, within } from '@storybook/test';

export const ClickTest = {
  args: { onSelectSkill: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('查询低库存商品'));
    await expect(args.onSelectSkill).toHaveBeenCalled();
  },
};
```

---

## 5. 数据 fixtures

`src/components/hermes/stories/fixtures.ts` 提供:

- `FIXTURE_SKILLS`:8 个预设 + 3 个 AI 学习的 + 1 个 AI 优化的
- `FIXTURE_PENDING_SKILLS`:2 个待审核技能
- `FIXTURE_EVOLUTION_LOG`:12 条不同 action 的日志
- `FIXTURE_MOA_RESULT`:3 个 proposer + 评分

如需扩充,在该文件追加,所有 stories 自动可用。

---

## 6. 调试与扩展

### 6.1 重置 Mock 数据
切换 Story 时,Provider 会自动 re-mount,数据回到初始 fixtures。无需手动 reset。

### 6.2 自定义 Mock 行为
stories 可通过 `parameters.hermesOverride` 注入自定义 HermesApi:

```tsx
export const EmptyState = {
  parameters: {
    hermesOverride: { skills: [] }, // 空数据
  },
};
```

### 6.3 加入新的 Hermes 组件
1. 在 `src/components/hermes/` 创建 `*.tsx`
2. 在同一目录创建 `*.stories.tsx`
3. Storybook 自动发现,无需注册