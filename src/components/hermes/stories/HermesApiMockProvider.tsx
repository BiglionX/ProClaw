/**
 * Storybook Mock Provider — HermesApi
 *
 * 在 Storybook 环境下注入一个基于内存的 HermesApi 实例,
 * 让所有 Hermes 组件无需真实 LLM / 数据库就能跑起来。
 *
 * 设计:
 *  - 初始化时创建 HermesBundle(InMemoryDatabase)+ seed presets
 *  - 通过 useEffect 调用 setHermesApi() 让所有 useHermesApi() hook 拿到这个实例
 *  - 支持 parameters.hermesOverride 自定义 mock 行为(空数据、错误等)
 */

import { useEffect, useMemo } from 'react';
import {
  createHermesBundle,
  InMemoryDatabase,
  HermesApi,
  setHermesApi,
} from '../../../lib/hermes';
import { HermesStoryFixtures, defaultFixtures } from './fixtures';

interface HermesApiMockProviderProps {
  children: React.ReactNode;
  /** 是否启用(默认 true)。在嵌套 Provider 时可关掉,避免覆盖外层 */
  enabled?: boolean;
}

export function HermesApiMockProvider({
  children,
  enabled = true,
}: HermesApiMockProviderProps) {
  const api = useMemo(() => {
    if (!enabled) return null;
    const bundle = createHermesBundle(new InMemoryDatabase());
    // 内存库 seed 是微任务级延迟,不阻塞 Storybook 首屏
    void bundle.seedPresets();
    return new HermesApi(bundle);
  }, [enabled]);

  useEffect(() => {
    if (api) {
      setHermesApi(api);
      return () => {
        // 卸载时清理(避免影响下一个 story)
        setHermesApi(api); // 还是同一个实例,因为 memo 不变
      };
    }
    return undefined;
  }, [api]);

  return <>{children}</>;
}

/** 默认 fixtures 导出(便于 stories 直接 import) */
export { defaultFixtures } from './fixtures';
export type { HermesStoryFixtures } from './fixtures';