/**
 * 检测是否在 Tauri 环境中运行
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && window !== null && '__TAURI_INTERNALS__' in window;
}

/**
 * 在系统默认浏览器中打开外部链接
 * Tauri v2 中 window.open 不生效，需要使用 shell 插件
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch (err) {
      console.error('[Tauri] 打开外部链接失败:', err);
      // 降级到 window.open
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

/**
 * 安全地调用 Tauri 命令
 * @deprecated 使用 ipcInvoke / ipcInvokeOrNull
 */
export async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  return ipcInvokeOrNull<T>(command, args);
}

const ipcWarnOnce = new Set<string>();

/** Tauri IPC；浏览器 dev 抛出友好错误 */
export async function ipcInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    if (import.meta.env.DEV && !ipcWarnOnce.has(command)) {
      ipcWarnOnce.add(command);
      console.warn(`[ProClaw Dev] IPC "${command}" requires Tauri runtime`);
    }
    throw new Error(`IPC command "${command}" requires Tauri runtime`);
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

/** 浏览器 dev 返回 null；Tauri 正常 invoke */
export async function ipcInvokeOrNull<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauri()) {
    if (import.meta.env.DEV && !ipcWarnOnce.has(command)) {
      ipcWarnOnce.add(command);
      console.warn(`[ProClaw Dev] IPC "${command}" skipped in browser`);
    }
    return null;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}
