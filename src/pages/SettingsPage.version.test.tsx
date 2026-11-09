import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import { APP_VERSION } from '../lib/appVersion';
import { useAppModeStore } from '../config/appMode';

vi.mock('../components/Settings/AISettings', () => ({
  default: () => null,
}));
vi.mock('../components/Settings/DatabaseSettings', () => ({
  default: () => null,
}));

describe('SettingsPage 应用版本', () => {
  beforeEach(() => {
    useAppModeStore.setState({ mode: 'inventory' });
  });

  it('系统信息页显示 APP_VERSION', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('tab', { name: /系统信息/ }));
    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
  });
});
