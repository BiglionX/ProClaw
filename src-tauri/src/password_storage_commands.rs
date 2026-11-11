//! Tauri commands for OS keyring password storage (v13.1.1)
//!
//! 为本地账号无登录模式提供密码托管：
//! - keyring_set: 写入/更新密码
//! - keyring_get: 读取密码
//! - keyring_delete: 删除密码
//! - keyring_exists: 检查是否存在（不返回内容）
//!
//! 所有命令都使用本地账号命名空间：`proclaw-local-account:{account_id}`
//! 凭据存储由 OS 原生机制保障（Windows Credential Manager / macOS Keychain / Linux Secret Service）。

use keyring::Entry;

/// Keyring service identifier（同一应用所有账号共享）
pub const KEYRING_SERVICE: &str = "com.proclaw.desktop";

/// 构造账号对应的 keyring Entry
pub fn entry_for(account_id: &str) -> Result<Entry, String> {
    let user = format!("local-account:{}", account_id);
    Entry::new(KEYRING_SERVICE, &user).map_err(|e| format!("Failed to create keyring entry: {}", e))
}

/// 内部使用：写入密码（供 user_commands 等其他模块调用以保证原子性）
pub fn set_keyring_password_internal(account_id: &str, password: &str) -> Result<(), String> {
    if account_id.is_empty() {
        return Err("account_id is required".to_string());
    }
    if password.is_empty() {
        return Err("password is required".to_string());
    }
    let entry = entry_for(account_id)?;
    entry
        .set_password(password)
        .map_err(|e| format!("Failed to save password to keyring: {}", e))
}

/// 内部使用：删除密码（供 user_commands 等其他模块调用）
pub fn delete_keyring_password_internal(account_id: &str) -> Result<(), String> {
    if account_id.is_empty() {
        return Ok(());
    }
    let entry = entry_for(account_id)?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete password from keyring: {}", e)),
    }
}

/// 写入或更新本地账号密码到 OS keyring
#[tauri::command]
pub fn keyring_set(account_id: String, password: String) -> Result<(), String> {
    set_keyring_password_internal(&account_id, &password)
}

/// 从 OS keyring 读取本地账号密码
/// 返回 Option：Some(pwd) / None（不存在） / Err(其他错误)
/// 用 Option 而非字符串"no entry"判断，提高跨平台健壮性
#[tauri::command]
pub fn keyring_get(account_id: String) -> Result<Option<String>, String> {
    if account_id.is_empty() {
        return Err("account_id is required".to_string());
    }
    let entry = entry_for(&account_id)?;
    match entry.get_password() {
        Ok(pwd) => Ok(Some(pwd)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read password from keyring: {}", e)),
    }
}

/// 删除本地账号密码（账号主动注销时调用）
#[tauri::command]
pub fn keyring_delete(account_id: String) -> Result<(), String> {
    delete_keyring_password_internal(&account_id)
}

/// 检查本地账号密码是否存在于 keyring（不返回内容）
#[tauri::command]
pub fn keyring_exists(account_id: String) -> Result<bool, String> {
    if account_id.is_empty() {
        return Err("account_id is required".to_string());
    }
    let entry = entry_for(&account_id)?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("Failed to check keyring: {}", e)),
    }
}
