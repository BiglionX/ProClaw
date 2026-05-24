// JWT 密钥管理
// 生成、存储、加载 JWT 签名密钥，替代硬编码 [0u8; 32]

use rand::RngCore;
use std::path::PathBuf;

/// JWT 密钥管理器
pub struct KeyManager {
    key: [u8; 32],
}

impl KeyManager {
    /// 从指定路径加载密钥，如果不存在则生成新密钥
    pub fn load_or_generate(key_path: &std::path::Path) -> Self {
        let key = if key_path.exists() {
            // 加载已有密钥
            match std::fs::read(key_path) {
                Ok(bytes) if bytes.len() == 32 => {
                    let mut key = [0u8; 32];
                    key.copy_from_slice(&bytes);
                    println!("JWT key loaded from {:?}", key_path);
                    key
                }
                _ => Self::generate_and_save(key_path),
            }
        } else {
            Self::generate_and_save(key_path)
        };
        KeyManager { key }
    }

    /// 生成随机密钥并保存到文件
    fn generate_and_save(key_path: &std::path::Path) -> [u8; 32] {
        let mut key = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut key);

        // 确保目录存在
        if let Some(parent) = key_path.parent() {
            if !parent.exists() {
                let _ = std::fs::create_dir_all(parent);
            }
        }

        if let Err(e) = std::fs::write(key_path, &key) {
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

    /// 获取用于环境的种子密钥（桌面端本地运行）
    pub fn from_env_or_default() -> Self {
        // 尝试从环境变量 JWT_SECRET 读取 base64 密钥
        if let Ok(env_key) = std::env::var("PROCLAW_JWT_SECRET") {
            use base64::Engine;
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(&env_key) {
                if bytes.len() == 32 {
                    let mut key = [0u8; 32];
                    key.copy_from_slice(&bytes);
                    return KeyManager { key };
                }
            }
        }

        // 默认密钥路径
        let key_dir = get_key_directory();
        let key_path = key_dir.join("jwt_secret.key");
        Self::load_or_generate(&key_path)
    }
}

/// 获取密钥存储目录
fn get_key_directory() -> PathBuf {
    if let Ok(dir) = std::env::var("PROCLAW_DATA_DIR") {
        PathBuf::from(dir)
    } else if let Some(dir) = directories::UserDirs::new() {
        let app_dir = dir.home_dir().join(".proclaw");
        app_dir
    } else {
        PathBuf::from(".")
    }
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

        let _manager = KeyManager::load_or_generate(&key_path);
        assert!(key_path.exists());

        let bytes = std::fs::read(&key_path).unwrap();
        assert_eq!(bytes.len(), 32);

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
        env::set_var("PROCLAW_JWT_SECRET", "not-base64!!");

        // 应该回退到默认路径
        let manager = KeyManager::from_env_or_default();
        assert_eq!(manager.as_bytes().len(), 32);

        env::remove_var("PROCLAW_JWT_SECRET");
    }
}
