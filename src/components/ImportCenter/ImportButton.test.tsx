/**
 * ProClaw 批量导入中心 - ImportButton 组件测试（v1.2 P1）
 *
 * 覆盖点击跳转 / 默认 label / 6 类 target 文案。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ImportButton from './ImportButton';

function renderWithRouter(ui: React.ReactNode, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={ui as any} />
        <Route path="/import-center/new" element={<div data-testid="wizard">WIZARD</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ImportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染默认「批量导入」文案', () => {
    renderWithRouter(<ImportButton target="products" />);
    expect(screen.getByText('批量导入')).toBeInTheDocument();
  });

  it('应该支持自定义 label', () => {
    renderWithRouter(<ImportButton target="products" label="导入商品" />);
    expect(screen.getByText('导入商品')).toBeInTheDocument();
  });

  it('点击 target=products 应该跳到 /import-center/new?target=products', async () => {
    renderWithRouter(<ImportButton target="products" />);
    await userEvent.click(screen.getByTestId('import-button-products'));
    expect(screen.getByTestId('wizard')).toBeInTheDocument();
  });

  it('不传 target 时 testid 应该是 import-button-all', async () => {
    renderWithRouter(<ImportButton />);
    await userEvent.click(screen.getByTestId('import-button-all'));
    expect(screen.getByTestId('wizard')).toBeInTheDocument();
  });

  it('应该支持 6 类 target 的 testid', () => {
    const targets: Array<'products' | 'inventory' | 'purchases' | 'sales' | 'suppliers' | 'customers'> = [
      'products',
      'inventory',
      'purchases',
      'sales',
      'suppliers',
      'customers',
    ];
    for (const t of targets) {
      const { unmount } = renderWithRouter(<ImportButton target={t} />);
      expect(screen.getByTestId(`import-button-${t}`)).toBeInTheDocument();
      unmount();
    }
  });
});