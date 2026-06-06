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

/** 防重复警告：已被警告过的 Tauri 命令（dev 模式下不刷屏） */
const warnOnce = new Set<string>();

/**
 * 安全地调用 Tauri 命令
 * 如果不在 Tauri 环境中，返回 null 或抛出友好的错误
 */
export async function safeInvoke<T>(command: string, args?: any): Promise<T | null> {
  if (!isTauri()) {
    if (!warnOnce.has(command)) {
      warnOnce.add(command);
      console.warn(`[ProClaw Dev] Tauri 命令 "${command}" 在纯浏览器中不可用，已跳过`);
    }
    return null;
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(command, args);
}
