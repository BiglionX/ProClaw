/**
 * 检测是否在 Tauri 环境中运行
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * 安全地调用 Tauri 命令
 * 如果不在 Tauri 环境中，返回 null 或抛出友好的错误
 */
export async function safeInvoke<T>(command: string, args?: any): Promise<T | null> {
  if (!isTauri()) {
    console.warn(`Tauri command "${command}" called outside of Tauri environment`);
    return null;
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(command, args);
}
