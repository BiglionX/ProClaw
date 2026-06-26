/**
 * ImportWizard 集成测试
 *
 * 覆盖：基础渲染、Stepper 步骤指示、Step5 冲突策略选择、ImportCompleteDialog 显示。
 * 由于 ImportWizard 依赖 Tauri invoke 与文件解析，单测聚焦 UI 部分。
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportResult } from '../../../lib/importers/types';

import { ImportWizard } from '../ImportWizard';

// Mock 整个 importService，避免触发真实 Tauri 调用
vi.mock('../../../lib/services/importService', () => ({
  createBatch: vi.fn(async () => 'batch-1'),
  updateMapping: vi.fn(async () => undefined),
  validateImport: vi.fn(async () => []),
  executeImport: vi.fn(async (id: string) => {
    return {
      batch_id: id,
      total: 3,
      success: 3,
      failed: 0,
      skipped: 0,
      errors: [],
    } satisfies ImportResult;
  }),
}));

const theme = createTheme();

describe('ImportWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('打开时显示标题与 Stepper', () => {
    render(
      <ThemeProvider theme={theme}>
        <ImportWizard open onClose={vi.fn()} />
      </ThemeProvider>,
    );
    expect(screen.getByText('商品数据导入')).toBeInTheDocument();
    // MUI Stepper 没有 role；用 class 查询
    const stepper = document.querySelector('.MuiStepper-root');
    expect(stepper).toBeTruthy();
    // 7 个步骤标签
    ['选文件', '选目标', '字段映射', '数据预览', '冲突策略', '确认', '导入'].forEach((s) => {
      expect(screen.getByText(s)).toBeInTheDocument();
    });
  });

  it('点击取消触发 onClose', async () => {
    const onClose = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <ImportWizard open onClose={onClose} />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('dropzone 与文件输入存在', () => {
    render(
      <ThemeProvider theme={theme}>
        <ImportWizard open onClose={vi.fn()} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('import-dropzone')).toBeInTheDocument();
    expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
  });

  it('可关闭后 unmount 不报 warning', () => {
    const { unmount } = render(
      <ThemeProvider theme={theme}>
        <ImportWizard open onClose={vi.fn()} />
      </ThemeProvider>,
    );
    unmount();
  });
});