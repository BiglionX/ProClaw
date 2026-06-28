//! Tauri 本地密码 Keyring 命令（v13.1）
//!
//! 提供以下能力：
//! - `password_keyring_get`: 从 OS Keyring 取账号密码哈希（bcrypt 字符串）
//! - `password_keyring_set`: 存账号密码哈希到 OS Keyring
//! - `password_keyring_delete`: 从 OS Keyring 删账号密码哈希
//!
//! 设计要点：
//! - service 统一为 `"proclaw-desktop"`（跨账号共享 namespace）
//! - username 直接用前端传来的完整 key（含 `proclaw-pw:` 前缀），避免后端再做拼接
//! - keyring `Entry::new` / `set_password` / `get_password` / `delete_credential` 都是同步调用，无需 async
//! - keyring 错误统一转为字符串返回，前端不再吞错（PRD v13.1：去掉 fallback）
//!
//! 平台后端：
//! - macOS: Keychain (apple-native)
//! - Windows: Credential Manager (windows-native)
//! - Linux: Secret Service via DBus (sync-secret-service)

use keyring::Entry;

const KEYRING_SERVICE: &str = "proclaw-desktop";

/// 从 OS Keyring 取账号密码哈希
///
/// # 参数
/// - `key`: 完整 key（含 `proclaw-pw:` 前缀），例如 `proclaw-pw:local-1234567890-abc123`
///
/// # 返回
/// - `Ok(Some(hash))`：找到哈希
/// - `Ok(None)`：条目不存在（前端视为无密码）
/// - `Err(msg)`：OS Keyring 不可用（Linux 无 DBus / Keychain 拒绝访问等）
#[tauri::command]
pub fn password_keyring_get(key: String) -> Result<Option<String>, String> {
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| format!("Keyring 打开失败: {}", e))?;
    match entry.get_password() {
        Ok(hash) => Ok(Some(hash)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Keyring 读取失败: {}", e)),
    }
}

/// 存账号密码哈希到 OS Keyring
///
/// # 参数
/// - `key`: 完整 key
/// - `value`: bcrypt 哈希字符串（来自前端 hashPassword）
#[tauri::command]
pub fn password_keyring_set(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| format!("Keyring 打开失败: {}", e))?;
    entry
        .set_password(&value)
        .map_err(|e| format!("Keyring 写入失败: {}", e))?;
    Ok(())
}

/// 从 OS Keyring 删账号密码哈希
///
/// # 参数
/// - `key`: 完整 key
///
/// # 返回
/// - 成功（无论条目是否存在）返回 `Ok(())`
/// - 失败（权限/平台不支持）返回错误
#[tauri::command]
pub fn password_keyring_delete(key: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| format!("Keyring 打开失败: {}", e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // 不存在也视为成功
        Err(e) => Err(format!("Keyring 删除失败: {}", e)),
    }
}
