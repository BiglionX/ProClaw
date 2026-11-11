import { useEffect, useState } from 'react';
import { version } from '../../package.json';

/** package.json 里的版本。Tauri 运行时再用 getVersion() 覆盖。 */
export const APP_VERSION: string = version;

/** 侧栏和设置页显示的版本：桌面端读 Tauri，浏览器回退到 package.json。 */
export function useAppVersion(): string {
  const [current, setCurrent] = useState(APP_VERSION);

  useEffect(() => {
    let cancelled = false;
    import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then((runtimeVersion) => {
        if (!cancelled && runtimeVersion) setCurrent(runtimeVersion);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return current;
}
