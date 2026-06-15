/**
 * 前端系统托盘服务
 *
 * 封装对 Tauri 后端 `send_desktop_notification` / `update_tray_tooltip`
 * 命令的调用。浏览器环境（非 Tauri）回退到 Web Notifications API。
 *
 * 关键点：
 * - 所有调用均为「尽力而为」，错误被静默吞掉，不影响 UI 状态
 * - 通知权限：浏览器环境下需要用户授权（仅在用户交互中请求）
 * - 桌面端：Tauri 后端直接通过 Windows 通知中心发送
 */
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauri';

/** 浏览器 Notification API 权限状态（仅浏览器环境使用） */
let browserNotifPermissionRequested = false;

/** 请求浏览器通知权限（仅在用户交互中调用，避免被浏览器拦截） */
async function ensureBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  // 直接读取属性，避免 TS strict 模式下的窄化判断
  const current = Notification.permission;
  if (current === 'granted') return true;
  if (browserNotifPermissionRequested) return false;
  browserNotifPermissionRequested = true;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * 发送 OS 桌面通知
 *
 * - Tauri 桌面端：调用后端 `send_desktop_notification` 命令
 * - 浏览器环境：使用 Web Notifications API（首次会自动请求权限）
 *
 * @param title 通知标题
 * @param body 通知正文
 */
export async function sendDesktopNotification(
  title: string,
  body: string
): Promise<void> {
  try {
    if (isTauri()) {
      await invoke('send_desktop_notification', { title, body });
      return;
    }
    // 浏览器回退
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const granted = await ensureBrowserNotificationPermission();
    if (granted) {
      new Notification(title, { body });
    }
  } catch (err) {
    // 静默处理：通知失败不应影响业务逻辑
    console.warn('[trayService] sendDesktopNotification failed:', err);
  }
}

/**
 * 更新托盘图标的 tooltip 文字
 *
 * - Tauri 桌面端：调用后端 `update_tray_tooltip` 命令
 * - 浏览器环境：no-op（浏览器没有系统托盘）
 *
 * 典型用法：
 * - 收到新通知时：`updateTrayTooltip(\`ProClaw - ${unreadCount} 条未读\`)`
 * - 全部已读时：`updateTrayTooltip('ProClaw Desktop')`
 * - 清空时：`updateTrayTooltip('')`
 *
 * @param text 新的 tooltip 文字，空字符串表示清空
 */
export async function updateTrayTooltip(text: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke('update_tray_tooltip', { text });
  } catch (err) {
    // 静默处理：tooltip 更新失败不应影响业务逻辑
    console.warn('[trayService] updateTrayTooltip failed:', err);
  }
}

/**
 * 计算通知 tooltip 文字
 *
 * - 有未读：`ProClaw - N 条未读`
 * - 无未读：`ProClaw Desktop`
 */
export function buildTrayTooltip(unreadCount: number): string {
  if (unreadCount <= 0) return 'ProClaw Desktop';
  return `ProClaw - ${unreadCount} 条未读`;
}
