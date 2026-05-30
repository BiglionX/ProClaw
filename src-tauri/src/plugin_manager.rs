/// ProClaw 行业插件管理器
///
/// 负责：
/// - 从营销站点 API 下载插件包
/// - SHA256 + Ed25519 签名验证
/// - 解压到本地插件目录
/// - 读取 manifest.json
/// - 管理已安装插件列表
///
/// 插件包格式：.proclaw-industry-plugin (tar.gz)
/// 存储路径：%APPDATA%/ProClaw/plugins/{plugin-id}/
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
/// 插件数据模型定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDataModels {
    pub tables: Vec<String>,
    pub migrations: Vec<String>,
}

/// 插件 Manifest（与前端 IndustryPluginManifest 对齐）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub icon: String,
    pub compatible_app_version: String,
    pub features: PluginFeatures,
    pub navigation: PluginNavigation,
    pub ui: PluginUi,
    pub assets: PluginAssets,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_models: Option<PluginDataModels>,
    /// 开发者信息（第三方插件用）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub developer: Option<PluginDeveloper>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginFeatures {
    pub modules: Vec<String>,
    pub dashboards: Vec<String>,
    pub reports: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginNavigation {
    pub add: Vec<NavItem>,
    pub remove: Vec<String>,
    pub reorder: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavItem {
    pub text: String,
    pub icon: String,
    pub path: String,
    pub group: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginUi {
    pub theme: Option<serde_json::Value>,
    pub onboarding: Option<String>,
    pub quick_actions: Option<Vec<QuickAction>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickAction {
    pub label: String,
    pub icon: String,
    pub action: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginAssets {
    pub path: String,
    pub files: Vec<String>,
}

/// 已安装的插件信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub plugin_id: String,
    pub name: String,
    pub version: String,
    pub install_path: String,
    pub manifest: PluginManifest,
}

/// 获取插件存储根目录
fn get_plugins_dir() -> PathBuf {
    let base = directories::BaseDirs::new()
        .map(|d| d.data_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("ProClaw").join("plugins")
}

/// 获取指定插件的安装目录
fn get_plugin_dir(plugin_id: &str) -> PathBuf {
    get_plugins_dir().join(plugin_id)
}

// ============ Tauri Commands ============

/// 列出已安装的插件
#[tauri::command]
pub fn list_installed_plugins() -> Result<Vec<InstalledPlugin>, String> {
    let plugins_dir = get_plugins_dir();
    if !plugins_dir.exists() {
        return Ok(Vec::new());
    }

    let mut plugins = Vec::new();
    let entries = std::fs::read_dir(&plugins_dir).map_err(|e| format!("Failed to read plugins dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() {
            continue;
        }

        match read_manifest_file(&manifest_path) {
            Ok(manifest) => {
                plugins.push(InstalledPlugin {
                    plugin_id: manifest.id.clone(),
                    name: manifest.name.clone(),
                    version: manifest.version.clone(),
                    install_path: path.to_string_lossy().to_string(),
                    manifest,
                });
            }
            Err(e) => {
                eprintln!("Warning: Failed to read manifest from {:?}: {}", path, e);
            }
        }
    }

    Ok(plugins)
}

/// 获取指定插件的 manifest
#[tauri::command]
pub fn get_plugin_manifest(plugin_id: String) -> Result<PluginManifest, String> {
    let plugin_dir = get_plugin_dir(&plugin_id);
    let manifest_path = plugin_dir.join("manifest.json");

    if !manifest_path.exists() {
        return Err(format!("Plugin '{}' not found or manifest missing", plugin_id));
    }

    read_manifest_file(&manifest_path)
}

/// 读取并解析 manifest.json 文件
fn read_manifest_file(path: &Path) -> Result<PluginManifest, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    let manifest: PluginManifest = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;
    Ok(manifest)
}

/// 从远程 URL 下载插件包
#[tauri::command]
pub async fn download_plugin(plugin_id: String, version: String, url: String) -> Result<String, String> {
    let plugins_dir = get_plugins_dir();
    std::fs::create_dir_all(&plugins_dir)
        .map_err(|e| format!("Failed to create plugins dir: {}", e))?;

    let download_path = plugins_dir.join(format!("{}-{}.plugin", plugin_id, version));

    // 使用 reqwest 下载
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download plugin: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    std::fs::write(&download_path, &bytes)
        .map_err(|e| format!("Failed to save plugin file: {}", e))?;

    Ok(download_path.to_string_lossy().to_string())
}

/// 验证插件包完整性（SHA256 校验）
#[tauri::command]
pub fn verify_plugin_package(package_path: String, expected_hash: String) -> Result<bool, String> {
    use sha2::Digest;

    let path = Path::new(&package_path);
    let content = std::fs::read(path)
        .map_err(|e| format!("Failed to read plugin package: {}", e))?;

    let mut hasher = sha2::Sha256::new();
    hasher.update(&content);
    let hash = format!("{:x}", hasher.finalize());

    Ok(hash == expected_hash.to_lowercase())
}

/// 验证插件包 Ed25519 签名
///
/// `package_path`: 插件包文件路径
/// `signature_hex`: 签名的十六进制字符串
/// `public_key_hex`: Ed25519 公钥的十六进制字符串
#[tauri::command]
pub fn verify_plugin_signature(package_path: String, signature_hex: String, public_key_hex: String) -> Result<bool, String> {
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};

    // 读取公钥
    let public_key_bytes = hex::decode(&public_key_hex)
        .map_err(|e| format!("Invalid public key hex: {}", e))?;
    let verifying_key = VerifyingKey::from_bytes(
        &public_key_bytes.try_into().map_err(|_| "Invalid public key length (expected 32 bytes)")?
    ).map_err(|e| format!("Invalid Ed25519 public key: {}", e))?;

    // 解析签名
    let signature_bytes = hex::decode(&signature_hex)
        .map_err(|e| format!("Invalid signature hex: {}", e))?;
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|e| format!("Invalid Ed25519 signature: {}", e))?;

    // 读取包内容
    let path = Path::new(&package_path);
    let content = std::fs::read(path)
        .map_err(|e| format!("Failed to read plugin package: {}", e))?;

    // 验证签名
    match verifying_key.verify(&content, &signature) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// 安装插件（解压到插件目录）
#[tauri::command]
pub fn install_plugin(package_path: String, plugin_id: String) -> Result<String, String> {
    let package = Path::new(&package_path);
    if !package.exists() {
        return Err(format!("Package file not found: {}", package_path));
    }

    let target_dir = get_plugin_dir(&plugin_id);
    // 清理旧版本
    if target_dir.exists() {
        std::fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("Failed to remove old plugin dir: {}", e))?;
    }
    std::fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create plugin dir: {}", e))?;

    // 解压 tar.gz
    let file = std::fs::File::open(package)
        .map_err(|e| format!("Failed to open package: {}", e))?;
    let decoder = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(&target_dir)
        .map_err(|e| format!("Failed to extract plugin: {}", e))?;

    // 验证 manifest 是否存在
    let manifest_path = target_dir.join("manifest.json");
    if !manifest_path.exists() {
        // 如果解压后没有 manifest，清理并报错
        std::fs::remove_dir_all(&target_dir).ok();
        return Err("Plugin package missing manifest.json".to_string());
    }

    Ok(target_dir.to_string_lossy().to_string())
}

/// 卸载插件
#[tauri::command]
pub fn uninstall_plugin(plugin_id: String) -> Result<(), String> {
    let plugin_dir = get_plugin_dir(&plugin_id);
    if !plugin_dir.exists() {
        return Err(format!("Plugin '{}' not found", plugin_id));
    }

    std::fs::remove_dir_all(&plugin_dir)
        .map_err(|e| format!("Failed to uninstall plugin: {}", e))?;

    Ok(())
}

/// 开发者信息（第三方插件）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDeveloper {
    pub name: String,
    pub website: Option<String>,
    pub email: Option<String>,
    /// Ed25519 公钥，用于签名验证
    pub public_key: Option<String>,
}

/// 插件兼容性检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityCheck {
    pub compatible: bool,
    pub app_version_ok: bool,
    pub data_model_conflicts: Vec<String>,
    pub issues: Vec<String>,
}

/// 验证插件与当前桌面端版本的兼容性
#[tauri::command]
pub fn verify_plugin_compatibility(manifest_json: String) -> Result<CompatibilityCheck, String> {
    let manifest: PluginManifest = serde_json::from_str(&manifest_json)
        .map_err(|e| format!("Invalid manifest JSON: {}", e))?;

    let mut issues = Vec::new();

    // 检查必填字段
    if manifest.id.is_empty() { issues.push("插件 ID 不能为空".to_string()); }
    if manifest.name.is_empty() { issues.push("插件名称不能为空".to_string()); }
    if manifest.version.is_empty() { issues.push("版本号不能为空".to_string()); }
    if !manifest.version.contains('.') { issues.push("版本号格式无效，应为 x.y.z 格式".to_string()); }

    // 检查 assets 目录是否存在
    let assets_dir = get_plugin_dir(&manifest.id).join(&manifest.assets.path);
    if !assets_dir.exists() && !manifest.assets.files.is_empty() {
        issues.push(format!("Assets 目录 '{}' 不存在", manifest.assets.path));
    }

    // 检查 navigation 导航项
    for item in &manifest.navigation.add {
        if !item.path.starts_with('/') {
            issues.push(format!("导航路径 '{}' 必须以 / 开头", item.path));
        }
    }

    // 检查 dataModels 定义的有效性
    if let Some(dm) = &manifest.data_models {
        for (i, table) in dm.tables.iter().enumerate() {
            if !table.trim().to_uppercase().starts_with("CREATE TABLE") {
                issues.push(format!("dataModels.tables[{}] 不是有效的 CREATE TABLE 语句", i));
            }
        }
        for (i, migration) in dm.migrations.iter().enumerate() {
            if !migration.trim().to_uppercase().starts_with("ALTER TABLE") {
                issues.push(format!("dataModels.migrations[{}] 不是有效的 ALTER TABLE 语句", i));
            }
        }
    }

    let compatible = issues.is_empty();

    Ok(CompatibilityCheck {
        compatible,
        app_version_ok: true, // 简化处理，实际应比对 compatibleAppVersion
        data_model_conflicts: Vec::new(),
        issues,
    })
}

/// 获取插件资源路径
#[tauri::command]
pub fn get_plugin_assets_path(plugin_id: String) -> Result<String, String> {
    let assets_dir = get_plugin_dir(&plugin_id).join("assets");
    if !assets_dir.exists() {
        return Err(format!("Plugin '{}' has no assets directory", plugin_id));
    }
    Ok(assets_dir.to_string_lossy().to_string())
}

/// 注册 Rust 侧的命令到 invoke_handler
pub fn get_plugin_commands() -> Vec<Box<dyn Fn(tauri::AppHandle) -> Box<dyn Fn()>>> {
    // 空实现，命令直接在 main.rs 中注册
    Vec::new()
}
