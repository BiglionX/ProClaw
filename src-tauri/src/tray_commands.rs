//! 系统托盘与桌面通知命令
//!
//! 提供以下能力：
//! - `send_desktop_notification`: 触发 OS 桌面通知（Windows 通知中心）
//! - `update_tray_tooltip`: 更新托盘图标的 tooltip（用于显示未读消息数）
//!
//! 设计要点：
//! - 通知使用 `tauri::notification::Notification`，需启用 `tray-icon` feature
//! - 托盘 ID 固定为 `main-tray`，与 main.rs 中的 TrayIconBuilder::with_id("main-tray") 对应
//! - 所有错误使用 `let _ = ...` 静默处理，避免前端调用失败时影响 UI 状态

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// 从前端触发 OS 桌面通知
///
/// # 参数
/// - `app`: Tauri AppHandle（自动注入）
/// - `title`: 通知标题
/// - `body`: 通知正文
///
/// # 返回
/// 成功返回 `Ok(())`，失败返回错误信息（前端通常可忽略）
#[tauri::command]
pub fn send_desktop_notification(
    app: AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    let result = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();

    if let Err(e) = result {
        eprintln!("[Tray] send_desktop_notification failed: {}", e);
        return Err(format!("通知发送失败: {}", e));
    }
    Ok(())
}

/// 更新托盘图标的 tooltip 文字
///
/// # 参数
/// - `app`: Tauri AppHandle（自动注入）
/// - `text`: 新的 tooltip 文字，传 `None` 可清空（此处使用 String，空字符串视为清空）
///
/// # 返回
/// 成功返回 `Ok(())`，失败返回错误信息
#[tauri::command]
pub fn update_tray_tooltip(
    app: AppHandle,
    text: String,
) -> Result<(), String> {
    // 通过固定 ID 查找托盘图标
    let tray = match app.tray_by_id("main-tray") {
        Some(t) => t,
        None => {
            return Err("未找到 main-tray 托盘图标".to_string());
        }
    };

    let tooltip = if text.is_empty() { None } else { Some(text.as_str()) };
    if let Err(e) = tray.set_tooltip(tooltip) {
        eprintln!("[Tray] set_tooltip failed: {}", e);
        return Err(format!("更新 tooltip 失败: {}", e));
    }
    Ok(())
}
