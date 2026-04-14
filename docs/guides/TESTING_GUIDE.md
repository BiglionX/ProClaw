# 测试框架配置指南

## 📋 目录

- [概述](#概述)
- [已安装的测试工具](#已安装的测试工具)
- [单元测试 (Vitest)](#单元测试-vitest)
- [端到端测试 (Playwright)](#端到端测试-playwright)
- [运行测试](#运行测试)
- [测试覆盖率](#测试覆盖率)
- [测试文件结构](#测试文件结构)
- [编写测试](#编写测试)
- [最佳实践](#最佳实践)

## 概述

ProClaw 项目现已配置完整的测试框架，包括：
- **Vitest**: 用于单元测试和集成测试
- **Playwright**: 用于端到端 (E2E) 测试
- **Testing Library**: 用于 React 组件测试

## 已安装的测试工具

### 核心测试库
- `vitest` - 快速、现代的测试运行器
- `@vitest/ui` - Vitest 的 Web UI 界面
- `@vitest/coverage-v8` - 代码覆盖率工具
- `@playwright/test` - E2E 测试框架
- `jsdom` - DOM 环境模拟

### Testing Library
- `@testing-library/react` - React 组件测试工具
- `@testing-library/jest-dom` - 自定义 Jest 匹配器
- `@testing-library/user-event` - 用户交互模拟

## 单元测试 (Vitest)

### 配置文件
- `vitest.config.ts` - Vitest 主配置
- `src/test/setup.ts` - 测试环境设置

### 特性
- ✅ 自动 mock Tauri API
- ✅ 支持 TypeScript
- ✅ 热模块替换 (HMR)
- ✅ 并行测试执行
- ✅ 快照测试支持
- ✅ 代码覆盖率报告

### 示例测试文件
```typescript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../lib/commandParser';

describe('commandParser', () => {
  it('应该识别添加产品命令', () => {
    const result = parseCommand('添加产品 iPhone');
    expect(result.action).toBe('create_product');
  });
});
```

## 端到端测试 (Playwright)

### 配置文件
- `playwright.config.ts` - Playwright 主配置

### 特性
- ✅ 多浏览器测试 (Chrome, Firefox, Safari)
- ✅ 自动等待和重试
- ✅ 截图和视频录制
- ✅ 网络请求拦截
- ✅ 移动端视图测试
- ✅ 并行测试执行

### 示例 E2E 测试
```typescript
import { test, expect } from '@playwright/test';

test('应该能够登录', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=仪表板')).toBeVisible();
});
```

## 运行测试

### 单元测试

```bash
# 运行所有单元测试（监视模式）
npm test

# 运行所有单元测试（单次）
npm run test:run

# 使用 UI 界面运行测试
npm run test:ui

# 运行特定测试文件
npm test productService.test.ts

# 运行匹配的测试
npm test -- -t "应该识别添加产品命令"
```

### E2E 测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 使用 UI 界面运行 E2E 测试
npm run test:e2e:ui

# 在有头模式下运行（显示浏览器）
npm run test:e2e:headed

# 运行特定测试文件
npm run test:e2e -- login.spec.ts

# 在特定浏览器上运行
npm run test:e2e -- --project=chromium
```

### 运行所有测试

```bash
# 运行单元测试和 E2E 测试
npm run test:all
```

## 测试覆盖率

### 生成覆盖率报告

```bash
# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 覆盖率报告位置
- **HTML 报告**: `coverage/index.html`
- **JSON 报告**: `coverage/coverage-final.json`
- **LCOV 报告**: `coverage/lcov.info`

### 查看覆盖率报告

```bash
# 在浏览器中打开 HTML 报告
open coverage/index.html        # macOS
start coverage/index.html       # Windows
xdg-open coverage/index.html    # Linux
```

### 覆盖率阈值
当前配置的最低覆盖率要求：
- 分支覆盖率: 60%
- 函数覆盖率: 60%
- 行覆盖率: 60%
- 语句覆盖率: 60%

## 测试文件结构

```
ProClaw/
├── src/
│   ├── lib/
│   │   ├── commandParser.ts
│   │   ├── commandParser.test.ts      # 单元测试
│   │   ├── productService.ts
│   │   ├── productService.test.ts     # 单元测试
│   │   ├── salesService.test.ts       # 单元测试
│   │   └── inventoryService.test.ts   # 单元测试
│   └── test/
│       ├── setup.ts                    # 测试设置
│       └── utils.ts                    # 测试工具
├── e2e/
│   ├── login.spec.ts                   # E2E 测试
│   ├── dashboard.spec.ts               # E2E 测试
│   ├── products.spec.ts                # E2E 测试
│   └── sales.spec.ts                   # E2E 测试
├── vitest.config.ts                    # Vitest 配置
├── playwright.config.ts                # Playwright 配置
└── package.json
```

## 编写测试

### 单元测试最佳实践

1. **测试纯函数**
```typescript
it('应该正确计算总价', () => {
  const result = calculateTotal(10, 150);
  expect(result).toBe(1500);
});
```

2. **Mock 外部依赖**
```typescript
vi.mock('@tauri-apps/api/core');

it('应该调用 Tauri API', async () => {
  (invoke as any).mockResolvedValue(mockData);
  const result = await getServiceData();
  expect(invoke).toHaveBeenCalledWith('get_data');
});
```

3. **测试边界情况**
```typescript
it('应该处理空输入', () => {
  expect(parseCommand('')).toEqual({
    action: 'unknown',
    confidence: 0.3
  });
});
```

### E2E 测试最佳实践

1. **使用 data-testid**
```typescript
// 在组件中
<button data-testid="submit-btn">提交</button>

// 在测试中
await page.click('[data-testid="submit-btn"]');
```

2. **等待元素可见**
```typescript
await expect(page.locator('text=成功')).toBeVisible({ timeout: 5000 });
```

3. **使用 Page Object 模式**
```typescript
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

## 持续集成 (CI)

### GitHub Actions 示例

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:run
      - run: npm run test:coverage
      - run: npm run test:e2e
```

## 常见问题

### Q: 如何调试失败的测试？

**A:** 
- 单元测试：使用 `npm run test:ui` 打开 UI 界面
- E2E 测试：使用 `npm run test:e2e:headed` 在浏览器中查看

### Q: 如何跳过某个测试？

**A:**
```typescript
it.skip('这个测试暂时跳过', () => {
  // ...
});

test.skip('这个 E2E 测试暂时跳过', async ({ page }) => {
  // ...
});
```

### Q: 如何只运行一个测试？

**A:**
```typescript
it.only('只运行这个测试', () => {
  // ...
});
```

### Q: 测试超时怎么办？

**A:**
```typescript
// 增加超时时间
it('长时间运行的测试', () => {
  // ...
}, 10000); // 10 秒超时
```

## 资源链接

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [Vitest UI](https://vitest.dev/guide/ui.html)

## 维护者

如有问题或建议，请联系开发团队。

---

最后更新: 2024-01-15
