import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock Tauri Event
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  emit: vi.fn(),
}));

// Mock isTauri to return true so service functions don't short-circuit in tests
vi.mock('../lib/tauri', () => ({
  isTauri: vi.fn(() => true),
  safeInvoke: vi.fn(),
}));

// Global test utilities
declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends jest.Matchers<void, T> {}
  }
}
