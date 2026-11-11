// JWT 密钥管理
// 生成、存储、加载 JWT 签名密钥，替代硬编码 [0u8; 32]
// 审计修复 #1/#2/#22: 新增 derive_from_key 用于派生独立子密钥

use rand::RngCore;
use std::path::PathBuf;

/// JWT 密钥管理器
pub struct KeyManager {
    key: [u8; 32],
}

impl KeyManager {
    /// 审计修复 #1/#2/#22: 从主密钥派生独立子密钥（HMAC-SHA256）
    /// 不同用途使用不同 context/salt 确保密钥间无关联
    pub fn derive_from_key(manager: &Self, context: &[u8]) -> [u8; 32] {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        type HmacSha256 = Hmac<Sha256>;

        let mut mac =
            HmacSha256::new_from_slice(&manager.key).expect("HMAC-SHA256 can take key of any size");
        mac.update(context);
        let result = mac.finalize();
        let code_bytes = result.into_bytes();

        let mut derived = [0u8; 32];
        derived.copy_from_slice(&code_bytes[..32]);
        derived
    }

    /// 从指定路径加载密钥，如果不存在则生成新密钥。
    /// Windows 上落盘内容用 DPAPI 包装（魔数 `PCJW1`）；旧的 32 字节明文会在加载时迁移。
    pub fn load_or_generate(key_path: &std::path::Path) -> Self {
        let key = if key_path.exists() {
            match std::fs::read(key_path) {
                Ok(bytes) => match decode_stored_key(&bytes) {
                    Some(key) => {
                        if bytes.len() == 32 {
                            let protected = encode_stored_key(&key);
                            if protected.len() != bytes.len() {
                                if let Err(e) = std::fs::write(key_path, &protected) {
                                    eprintln!(
                                        "Warning: failed to migrate JWT key to DPAPI storage: {}",
                                        e
                                    );
                                } else {
                                    println!("JWT key migrated to DPAPI-protected storage");
                                }
                            }
                        }
                        println!("JWT key loaded from {:?}", key_path);
                        key
                    }
                    None => {
                        eprintln!(
                            "Warning: JWT key at {:?} is unreadable, generating a new one",
                            key_path
                        );
                        Self::generate_and_save(key_path)
                    }
                },
                Err(_) => Self::generate_and_save(key_path),
            }
        } else {
            Self::generate_and_save(key_path)
        };
        KeyManager { key }
    }

    /// 生成随机密钥并保存到文件（Windows 下经 DPAPI 保护）
    fn generate_and_save(key_path: &std::path::Path) -> [u8; 32] {
        let mut key = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut key);

        if let Some(parent) = key_path.parent() {
            if !parent.exists() {
                let _ = std::fs::create_dir_all(parent);
            }
        }

        let stored = encode_stored_key(&key);
        if let Err(e) = std::fs::write(key_path, &stored) {
            eprintln!("Warning: Failed to save JWT key to {:?}: {}", key_path, e);
        } else {
            println!("JWT key generated and saved to {:?}", key_path);
        }

        key
    }

    /// 获取密钥引用
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.key
    }

    /// 桌面端签名密钥。
    /// 优先 `PROCLAW_JWT_SECRET`（32 字节 base64），其次操作系统凭据库
    /// （Windows Credential Manager / macOS 钥匙串 / Linux Secret Service）。
    /// 不把明文密钥写进工作目录。旧的 `jwt_secret.key` 迁入凭据库后从磁盘删除。
    pub fn from_env_or_default() -> Self {
        if let Some(key) = key_from_env() {
            return KeyManager { key };
        }

        if let Ok(path) = std::env::var("PROCLAW_JWT_KEY_FILE") {
            let path = path.trim();
            if !path.is_empty() {
                return Self::load_or_generate(std::path::Path::new(path));
            }
        }

        match load_from_credential_store() {
            Ok(key) => KeyManager { key },
            Err(e) => {
                eprintln!(
                    "[Security] OS credential store unavailable ({e}); refusing to write a plaintext JWT key"
                );
                if let Some(path) = legacy_key_path() {
                    if let Some(key) = read_legacy_key_file(&path) {
                        protect_legacy_file_in_place(&path, &key);
                        return KeyManager { key };
                    }
                }
                let mut key = [0u8; 32];
                rand::rngs::OsRng.fill_bytes(&mut key);
                if let Some(path) = legacy_key_path() {
                    persist_protected_file(&path, &key);
                }
                KeyManager { key }
            }
        }
    }
}

const JWT_KEYRING_SERVICE: &str = "com.proclaw.desktop";
const JWT_KEYRING_ACCOUNT: &str = "jwt-signing-key";

fn key_from_env() -> Option<[u8; 32]> {
    let env_key = std::env::var("PROCLAW_JWT_SECRET").ok()?;
    decode_key_material(&env_key)
}

fn decode_key_material(stored: &str) -> Option<[u8; 32]> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(stored.trim())
        .ok()?;
    if bytes.len() != 32 {
        return None;
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes);
    Some(key)
}

fn keyring_entry(account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(JWT_KEYRING_SERVICE, account)
        .map_err(|e| format!("credential store entry: {e}"))
}

fn read_keyring_account(account: &str) -> Result<Option<[u8; 32]>, String> {
    let entry = keyring_entry(account)?;
    match entry.get_password() {
        Ok(stored) => decode_key_material(&stored)
            .map(Some)
            .ok_or_else(|| "credential store JWT key is not a 32-byte base64 value".to_string()),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("credential store read: {e}")),
    }
}

fn write_keyring_account(account: &str, key: &[u8; 32]) -> Result<(), String> {
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(key);
    let entry = keyring_entry(account)?;
    entry
        .set_password(&encoded)
        .map_err(|e| format!("credential store write: {e}"))
}

fn load_from_credential_store() -> Result<[u8; 32], String> {
    match read_keyring_account(JWT_KEYRING_ACCOUNT)? {
        Some(key) => {
            if let Some(path) = legacy_key_path() {
                discard_legacy_file(&path);
            }
            Ok(key)
        }
        None => {
            if let Some(path) = legacy_key_path() {
                if let Some(key) = read_legacy_key_file(&path) {
                    write_keyring_account(JWT_KEYRING_ACCOUNT, &key)?;
                    discard_legacy_file(&path);
                    println!(
                        "JWT signing key migrated from {:?} into the OS credential store",
                        path
                    );
                    return Ok(key);
                }
            }
            let mut key = [0u8; 32];
            rand::rngs::OsRng.fill_bytes(&mut key);
            write_keyring_account(JWT_KEYRING_ACCOUNT, &key)?;
            println!("JWT signing key generated and stored in the OS credential store");
            Ok(key)
        }
    }
}

fn read_legacy_key_file(path: &std::path::Path) -> Option<[u8; 32]> {
    let bytes = std::fs::read(path).ok()?;
    decode_stored_key(&bytes)
}

fn discard_legacy_file(path: &std::path::Path) {
    if !path.exists() {
        return;
    }
    if std::fs::remove_file(path).is_ok() {
        println!("Removed on-disk JWT key file {:?}", path);
        return;
    }
    if let Ok(bytes) = std::fs::read(path) {
        if bytes.len() == 32 {
            if let Some(key) = decode_stored_key(&bytes) {
                protect_legacy_file_in_place(path, &key);
            }
        }
    }
}

fn protect_legacy_file_in_place(path: &std::path::Path, key: &[u8; 32]) {
    let protected = encode_stored_key(key);
    if protected.len() == 32 {
        if std::fs::remove_file(path).is_err() {
            eprintln!(
                "[Security] could not remove plaintext JWT key at {:?}",
                path
            );
        }
        return;
    }
    if let Err(e) = std::fs::write(path, &protected) {
        eprintln!("[Security] failed to wrap JWT key file {:?}: {e}", path);
    }
}

fn persist_protected_file(path: &std::path::Path, key: &[u8; 32]) {
    let protected = encode_stored_key(key);
    if protected.len() == key.len() {
        eprintln!(
            "[Security] refusing to write a plaintext JWT key; key lives in this process only"
        );
        return;
    }
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Err(e) = std::fs::write(path, &protected) {
        eprintln!("[Security] failed to persist DPAPI JWT key: {e}");
    } else {
        println!(
            "JWT key stored with DPAPI at {:?} because the credential store was unavailable",
            path
        );
    }
}

const DPAPI_MAGIC: &[u8] = b"PCJW1";

/// 落盘格式：Windows 上为 `PCJW1` + CryptProtectData blob；其他平台为原始 32 字节。
fn encode_stored_key(key: &[u8; 32]) -> Vec<u8> {
    #[cfg(windows)]
    {
        match dpapi::protect(key) {
            Ok(blob) => {
                let mut out = Vec::with_capacity(DPAPI_MAGIC.len() + blob.len());
                out.extend_from_slice(DPAPI_MAGIC);
                out.extend_from_slice(&blob);
                return out;
            }
            Err(e) => {
                eprintln!(
                    "[Security] DPAPI protect failed ({e}); JWT key file stored without DPAPI"
                );
            }
        }
    }
    key.to_vec()
}

fn decode_stored_key(bytes: &[u8]) -> Option<[u8; 32]> {
    if bytes.len() == 32 {
        let mut key = [0u8; 32];
        key.copy_from_slice(bytes);
        return Some(key);
    }
    #[cfg(windows)]
    if bytes.starts_with(DPAPI_MAGIC) && bytes.len() > DPAPI_MAGIC.len() {
        if let Ok(plain) = dpapi::unprotect(&bytes[DPAPI_MAGIC.len()..]) {
            if plain.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&plain);
                return Some(key);
            }
        }
    }
    None
}

/// Windows DPAPI（CryptProtectData / CryptUnprotectData），当前用户范围，禁止弹 UI。
#[cfg(windows)]
mod dpapi {
    use std::ffi::c_void;
    use std::ptr;

    #[repr(C)]
    struct DataBlob {
        cb_data: u32,
        pb_data: *mut u8,
    }

    #[link(name = "crypt32")]
    extern "system" {
        fn CryptProtectData(
            p_data_in: *const DataBlob,
            sz_data_descr: *const u16,
            p_optional_entropy: *const DataBlob,
            pv_reserved: *mut c_void,
            p_prompt_struct: *mut c_void,
            dw_flags: u32,
            p_data_out: *mut DataBlob,
        ) -> i32;
        fn CryptUnprotectData(
            p_data_in: *const DataBlob,
            ppsz_data_descr: *mut *mut u16,
            p_optional_entropy: *const DataBlob,
            pv_reserved: *mut c_void,
            p_prompt_struct: *mut c_void,
            dw_flags: u32,
            p_data_out: *mut DataBlob,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn LocalFree(hmem: *mut c_void) -> *mut c_void;
    }

    const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

    pub fn protect(data: &[u8]) -> Result<Vec<u8>, String> {
        crypt(data, true)
    }

    pub fn unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
        crypt(data, false)
    }

    fn crypt(data: &[u8], protect_data: bool) -> Result<Vec<u8>, String> {
        if data.is_empty() || data.len() > u32::MAX as usize {
            return Err("invalid DPAPI input length".into());
        }
        let input = DataBlob {
            cb_data: data.len() as u32,
            pb_data: data.as_ptr() as *mut u8,
        };
        let mut output = DataBlob {
            cb_data: 0,
            pb_data: ptr::null_mut(),
        };
        let ok = unsafe {
            if protect_data {
                CryptProtectData(
                    &input,
                    ptr::null(),
                    ptr::null(),
                    ptr::null_mut(),
                    ptr::null_mut(),
                    CRYPTPROTECT_UI_FORBIDDEN,
                    &mut output,
                )
            } else {
                CryptUnprotectData(
                    &input,
                    ptr::null_mut(),
                    ptr::null(),
                    ptr::null_mut(),
                    ptr::null_mut(),
                    CRYPTPROTECT_UI_FORBIDDEN,
                    &mut output,
                )
            }
        };
        if ok == 0 || output.pb_data.is_null() || output.cb_data == 0 {
            return Err(if protect_data {
                "CryptProtectData failed".into()
            } else {
                "CryptUnprotectData failed".into()
            });
        }
        let result =
            unsafe { std::slice::from_raw_parts(output.pb_data, output.cb_data as usize).to_vec() };
        unsafe {
            LocalFree(output.pb_data as *mut c_void);
        }
        Ok(result)
    }
}

/// 旧版密钥文件。工作目录和空路径一律不用，避免明文落在进程 cwd。
fn legacy_key_path() -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("PROCLAW_DATA_DIR") {
        let dir = dir.trim();
        if dir.is_empty() || dir == "." {
            return None;
        }
        return Some(PathBuf::from(dir).join("jwt_secret.key"));
    }
    directories::UserDirs::new().map(|dir| dir.home_dir().join(".proclaw").join("jwt_secret.key"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_load_or_generate_creates_new_key() {
        let temp_dir = env::temp_dir().join("proclaw_test_keys");
        let _ = std::fs::create_dir_all(&temp_dir);
        let key_path = temp_dir.join("test_jwt.key");
        let _ = std::fs::remove_file(&key_path);

        let manager = KeyManager::load_or_generate(&key_path);
        assert!(key_path.exists());

        let bytes = std::fs::read(&key_path).unwrap();
        #[cfg(windows)]
        {
            assert!(
                bytes.starts_with(b"PCJW1") && bytes.len() > 32,
                "JWT key file should be DPAPI-wrapped"
            );
        }
        #[cfg(not(windows))]
        assert_eq!(bytes.len(), 32);

        let again = KeyManager::load_or_generate(&key_path);
        assert_eq!(again.as_bytes(), manager.as_bytes());

        // 清理
        let _ = std::fs::remove_file(&key_path);
        let _ = std::fs::remove_dir(&temp_dir);
    }

    #[test]
    fn test_load_or_generate_loads_existing_key() {
        let temp_dir = env::temp_dir().join("proclaw_test_keys2");
        let _ = std::fs::create_dir_all(&temp_dir);
        let key_path = temp_dir.join("test_jwt2.key");

        // 写入已知密钥
        let known_key = [42u8; 32];
        std::fs::write(&key_path, &known_key).unwrap();

        let manager = KeyManager::load_or_generate(&key_path);
        assert_eq!(manager.as_bytes(), &known_key);

        // 清理
        let _ = std::fs::remove_file(&key_path);
        let _ = std::fs::remove_dir(&temp_dir);
    }

    #[test]
    fn test_as_bytes() {
        let key = [1u8; 32];
        let manager = KeyManager { key };
        assert_eq!(manager.as_bytes(), &key);
    }

    #[test]
    fn test_from_env_or_default_with_env_var() {
        use base64::Engine;
        let test_key = [7u8; 32];
        let encoded = base64::engine::general_purpose::STANDARD.encode(&test_key);
        env::set_var("PROCLAW_JWT_SECRET", &encoded);

        let manager = KeyManager::from_env_or_default();
        assert_eq!(manager.as_bytes(), &test_key);

        env::remove_var("PROCLAW_JWT_SECRET");
    }

    #[test]
    fn test_from_env_or_default_with_invalid_env_var() {
        let temp_dir = env::temp_dir().join("proclaw_test_keys_invalid_env");
        let _ = std::fs::create_dir_all(&temp_dir);
        let key_path = temp_dir.join("fallback.key");
        let _ = std::fs::remove_file(&key_path);
        env::set_var("PROCLAW_JWT_SECRET", "not-base64!!");
        env::set_var(
            "PROCLAW_JWT_KEY_FILE",
            key_path.to_string_lossy().to_string(),
        );

        let manager = KeyManager::from_env_or_default();
        assert_eq!(manager.as_bytes().len(), 32);
        assert!(key_path.exists());
        let bytes = std::fs::read(&key_path).unwrap();
        #[cfg(windows)]
        assert!(
            bytes.starts_with(b"PCJW1") && bytes.len() > 32,
            "explicit key file must be DPAPI-wrapped, not raw bytes"
        );
        #[cfg(not(windows))]
        assert_eq!(bytes.len(), 32);

        env::remove_var("PROCLAW_JWT_SECRET");
        env::remove_var("PROCLAW_JWT_KEY_FILE");
        let _ = std::fs::remove_file(&key_path);
        let _ = std::fs::remove_dir(&temp_dir);
    }

    #[test]
    fn legacy_key_path_is_not_the_working_directory() {
        let prev = env::var("PROCLAW_DATA_DIR").ok();
        env::set_var("PROCLAW_DATA_DIR", ".");
        assert!(legacy_key_path().is_none());
        env::set_var("PROCLAW_DATA_DIR", "");
        assert!(legacy_key_path().is_none());
        match prev {
            Some(v) => env::set_var("PROCLAW_DATA_DIR", v),
            None => env::remove_var("PROCLAW_DATA_DIR"),
        }
    }

    #[test]
    fn credential_store_roundtrip_uses_a_test_account() {
        let account = "jwt-signing-key-test";
        let key = [9u8; 32];
        write_keyring_account(account, &key).expect("credential store write");
        let loaded = read_keyring_account(account)
            .expect("credential store read")
            .expect("entry");
        assert_eq!(loaded, key);
        let entry = keyring_entry(account).expect("entry");
        entry.delete_credential().expect("credential store delete");
        assert!(read_keyring_account(account).unwrap().is_none());
    }
}
