/**
 * useHermesApi — React Hook 包装 HermesApi 单例
 *
 * 与 React 18 的 Suspense / concurrent mode 兼容。
 * HermesApi 必须是单例(在 main.tsx 中初始化),否则会抛错。
 */

import { HermesApi, getHermesApi } from '../../lib/hermes';

export function useHermesApi(): HermesApi {
  return getHermesApi();
}