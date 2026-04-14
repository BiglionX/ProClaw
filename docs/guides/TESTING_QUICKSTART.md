# 🧪 ProClaw 测试快速开始

## 首次设置

### 1. 安装依赖
```bash
npm install
```

### 2. 安装 Playwright 浏览器（E2E 测试需要）
```bash
npx playwright install
```

## 运行测试

### 单元测试
```bash
# 监视模式（开发时推荐）
npm test

# 单次运行
npm run test:run

# 带 UI 界面
npm run test:ui

# 生成覆盖率报告
npm run test:coverage
```

### E2E 测试
```bash
# 运行所有 E2E 测试
npm run test:e2e

# 使用 UI 界面
npm run test:e2e:ui

# 显示浏览器窗口
npm run test:e2e:headed
```

### 运行所有测试
```bash
npm run test:all
```

## 查看测试结果

### 单元测试覆盖率报告
```bash
# Windows
start coverage/index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

### E2E 测试报告
```bash
# HTML 报告
start playwright-report/index.html
```

## 测试文件位置

- **单元测试**: `src/**/*.test.ts`
- **E2E 测试**: `e2e/*.spec.ts`
- **测试工具**: `src/test/utils.ts`
- **测试配置**: `vitest.config.ts`, `playwright.config.ts`

## 编写新测试

### 单元测试示例
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../lib/myModule';

describe('myFunction', () => {
  it('应该正确处理输入', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### E2E 测试示例
```typescript
import { test, expect } from '@playwright/test';

test('应该能够执行操作', async ({ page }) => {
  await page.goto('/');
  await page.click('button:text("操作")');
  await expect(page.locator('text=成功')).toBeVisible();
});
```

## 常见问题

**Q: 测试失败怎么办？**  
A: 检查错误信息，确保代码逻辑正确。使用 `npm run test:ui` 或 `npm run test:e2e:ui` 进行调试。

**Q: 如何跳过某个测试？**  
A: 使用 `it.skip()` 或 `test.skip()`。

**Q: 如何只运行一个测试？**  
A: 使用 `it.only()` 或 `test.only()`。

**Q: 测试超时怎么办？**  
A: 增加超时时间：`it('test', () => {...}, 10000);`

## 更多信息

详细文档请查看：
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 完整测试指南
- [TEST_COMPLETION_REPORT.md](./TEST_COMPLETION_REPORT.md) - 测试实施报告

---

祝测试愉快！🎉
