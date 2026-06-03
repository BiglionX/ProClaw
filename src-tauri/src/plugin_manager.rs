/// ProClaw 行业插件管理器
///
/// 负责：
/// - 从营销站点 API 下载插件包
/// - SHA256 + Ed25519 签名验证
/// - 解压到本地插件目录
/// - 读取 manifest.json
/// - 管理已安装插件列表
///
/// 插件包格式：.proclaw-plugin (ZIP)
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
/// 遵循 PRD v10.0 规范，所有新增字段均为 Option 以保持向后兼容。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub icon: String,
    /// 兼容的最低应用版本（旧字段，保持向后兼容）
    pub compatible_app_version: String,
    /// 最低 ProClaw 版本要求（PRD v10.0 新字段，作为 compatible_app_version 的别名）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_proclaw_version: Option<String>,
    /// 插件作者（PRD v10.0 新字段）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    pub features: PluginFeatures,
    pub navigation: PluginNavigation,
    pub ui: PluginUi,
    pub assets: PluginAssets,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_models: Option<PluginDataModels>,
    /// 开发者信息（第三方插件用）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub developer: Option<PluginDeveloper>,
    /// 权限声明列表（PRD v10.0 新字段）
    /// 示例：["database:create_table", "database:read:products", "printer:write"]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<Vec<String>>,
    /// 入口点配置（PRD v10.0 新字段）
    /// frontend: 前端入口文件路径
    /// backend: 后端动态库路径（.dll/.so/.dylib）
    /// migrations: 数据库迁移脚本路径
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entry_points: Option<PluginEntryPoints>,
    /// 插件配置界面 JSON Schema（PRD v10.0 新字段）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings_schema: Option<serde_json::Value>,
}

/// 插件入口点配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginEntryPoints {
    /// 前端入口文件（如 "frontend/index.js"）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frontend: Option<String>,
    /// 后端动态库文件（如 "backend/plugin.dll"）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backend: Option<String>,
    /// 数据库迁移脚本（如 "migrations/up.sql"）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub migrations: Option<String>,
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

    // 解压 ZIP 包
    let file = std::fs::File::open(package)
        .map_err(|e| format!("Failed to open package: {}", e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP package: {}", e))?;
    
    // 解压到目标目录
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry {}: {}", i, e))?;
        
        // 安全检查：防止 zip slip 攻击
        let entry_path = entry.mangled_name();
        let target_path = target_dir.join(&entry_path);
        
        if entry.is_dir() {
            std::fs::create_dir_all(&target_path).ok();
        } else {
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent).ok();
            }
            let mut outfile = std::fs::File::create(&target_path)
                .map_err(|e| format!("Failed to create file {:?}: {}", target_path, e))?;
            std::io::copy(&mut entry, &mut outfile)
                .map_err(|e| format!("Failed to extract {:?}: {}", target_path, e))?;
        }
    }

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

// ============ 数据库迁移执行器 ============

/// 插件迁移记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationRecord {
    pub plugin_id: String,
    pub migration_name: String,
    pub applied_at: String,
    pub checksum: String,
    pub success: bool,
}

/// 执行插件数据库迁移
///
/// 从插件安装目录读取 `migrations/` 下的 SQL 文件并执行。
/// 使用 `plugin_migrations` 表跟踪已执行的迁移，确保幂等性。
///
/// # 参数
/// * `plugin_id` - 插件 ID
/// * `direction` - "up" 或 "down"
/// * `migration_file` - 迁移文件名（如 "up.sql" 或 "down.sql"）
/// * `db` - Tauri 管理的数据库状态
#[tauri::command]
pub fn execute_plugin_migration(
    plugin_id: String,
    direction: String,
    migration_file: String,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<serde_json::Value, String> {
    use std::io::Read;

    // 参数校验
    if direction != "up" && direction != "down" {
        return Err(format!("无效的迁移方向：{}（仅支持 up/down）", direction));
    }

    // 获取插件目录下的迁移文件
    let plugin_dir = get_plugin_dir(&plugin_id);
    let migration_path = plugin_dir.join("migrations").join(&migration_file);

    if !migration_path.exists() {
        return Ok(serde_json::json!({
            "applied": false,
            "reason": format!("迁移文件不存在：{}", migration_path.display()),
            "migrations": []
        }));
    }

    // 读取 SQL 内容
    let mut file = std::fs::File::open(&migration_path)
        .map_err(|e| format!("无法读取迁移文件：{}", e))?;
    let mut sql_content = String::new();
    file.read_to_string(&mut sql_content)
        .map_err(|e| format!("读取迁移文件失败：{}", e))?;

    if sql_content.trim().is_empty() {
        return Ok(serde_json::json!({
            "applied": false,
            "reason": "迁移文件内容为空",
            "migrations": []
        }));
    }

    // 计算 checksum 用于幂等性检查
    use md5::{Md5, Digest};
    let checksum = format!("{:x}", Md5::digest(sql_content.as_bytes()));
    let migration_name = format!("{}/{}", plugin_id, migration_file);

    // 锁定数据库并执行迁移
    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();

    // 确保迁移追踪表存在
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS plugin_migrations (\
         id INTEGER PRIMARY KEY AUTOINCREMENT,\
         plugin_id TEXT NOT NULL,\
         migration_name TEXT NOT NULL UNIQUE,\
         direction TEXT NOT NULL,\
         checksum TEXT NOT NULL,\
         applied_at TEXT NOT NULL DEFAULT (datetime('now')),\
         success INTEGER NOT NULL DEFAULT 1\
         );"
    ).map_err(|e| format!("创建迁移追踪表失败：{}", e))?;

    // 检查是否已执行过（幂等性检查）
    let already_applied: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM plugin_migrations \
             WHERE migration_name = ?1 AND direction = ?2 AND success = 1",
            rusqlite::params![migration_name, direction],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if already_applied {
        return Ok(serde_json::json!({
            "applied": false,
            "reason": "该迁移已执行过",
            "migration_name": migration_name,
            "direction": direction,
            "checksum": checksum
        }));
    }

    // 执行 SQL
    let exec_result = conn.execute_batch(&sql_content);

    match exec_result {
        Ok(_) => {
            // 记录迁移
            conn.execute(
                "INSERT INTO plugin_migrations (plugin_id, migration_name, direction, checksum, success) \
                 VALUES (?1, ?2, ?3, ?4, 1)",
                rusqlite::params![plugin_id, migration_name, direction, checksum],
            ).map_err(|e| format!("记录迁移失败：{}", e))?;

            Ok(serde_json::json!({
                "applied": true,
                "migration_name": migration_name,
                "direction": direction,
                "checksum": checksum,
                "sql_length": sql_content.len()
            }))
        }
        Err(e) => {
            // 记录失败的迁移
            conn.execute(
                "INSERT INTO plugin_migrations (plugin_id, migration_name, direction, checksum, success) \
                 VALUES (?1, ?2, ?3, ?4, 0)",
                rusqlite::params![plugin_id, migration_name, direction, checksum],
            ).ok();

            Err(format!("执行迁移失败：{} (SQL: {})", e, &sql_content[..sql_content.len().min(200)]))
        }
    }
}

/// 获取插件已执行的迁移历史
#[tauri::command]
pub fn get_plugin_migration_history(
    plugin_id: String,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<Vec<MigrationRecord>, String> {
    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();

    // 确保表存在
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS plugin_migrations (\
         id INTEGER PRIMARY KEY AUTOINCREMENT,\
         plugin_id TEXT NOT NULL,\
         migration_name TEXT NOT NULL UNIQUE,\
         direction TEXT NOT NULL,\
         checksum TEXT NOT NULL,\
         applied_at TEXT NOT NULL DEFAULT (datetime('now')),\
         success INTEGER NOT NULL DEFAULT 1\
         );"
    ).ok();

    let mut stmt = conn
        .prepare(
            "SELECT plugin_id, migration_name, applied_at, checksum, success \
             FROM plugin_migrations WHERE plugin_id = ?1 ORDER BY applied_at DESC",
        )
        .map_err(|e| format!("查询迁移历史失败：{}", e))?;

    let records = stmt
        .query_map(rusqlite::params![plugin_id], |row| {
            Ok(MigrationRecord {
                plugin_id: row.get(0)?,
                migration_name: row.get(1)?,
                applied_at: row.get(2)?,
                checksum: row.get(3)?,
                success: row.get::<_, i32>(4)? != 0,
            })
        })
        .map_err(|e| format!("读取迁移历史失败：{}", e))?;

    let mut result = Vec::new();
    for record in records.flatten() {
        result.push(record);
    }
    Ok(result)
}

// ============ 插件数据库查询/写入 API ============

/// 插件数据库只读查询（仅允许 SELECT）
#[tauri::command]
pub fn plugin_db_query(
    sql: String,
    params: Vec<String>,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    // 安全检查：仅允许 SELECT
    let trimmed = sql.trim().to_uppercase();
    if !trimmed.starts_with("SELECT") {
        return Err("插件数据库查询仅允许 SELECT 语句".to_string());
    }

    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("SQL 预处理失败：{}", e))?;

    // 将 String 参数转换为 rusqlite 兼容的 &dyn ToSql
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            let mut map = serde_json::Map::new();
            for i in 0..row.as_ref().column_count() {
                let col_name = row.as_ref().column_name(i).unwrap_or("");
                let value: String = match row.get::<_, rusqlite::types::Value>(i) {
                    Ok(rusqlite::types::Value::Text(s)) => s,
                    Ok(rusqlite::types::Value::Integer(n)) => n.to_string(),
                    Ok(rusqlite::types::Value::Real(f)) => f.to_string(),
                    Ok(rusqlite::types::Value::Null) => "".to_string(),
                    Ok(rusqlite::types::Value::Blob(_)) => "[BLOB]".to_string(),
                    Err(_) => "".to_string(),
                };
                map.insert(col_name.to_string(), serde_json::Value::String(value));
            }
            Ok(serde_json::Value::Object(map))
        })
        .map_err(|e| format!("SQL 查询失败：{}", e))?;

    let mut result = Vec::new();
    for row in rows.flatten() {
        result.push(row);
    }
    Ok(result)
}

/// 插件数据库写入操作（仅允许 INSERT/UPDATE/DELETE/CREATE TABLE IF NOT EXISTS）
#[tauri::command]
pub fn plugin_db_execute(
    sql: String,
    params: Vec<String>,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<u64, String> {
    // 安全检查：仅允许安全的写操作
    let trimmed = sql.trim().to_uppercase();
    let allowed = ["INSERT", "UPDATE", "DELETE", "CREATE TABLE IF NOT EXISTS"];
    if !allowed.iter().any(|p| trimmed.starts_with(p)) {
        return Err(format!(
            "插件数据库写入仅允许：{}",
            allowed.join(", ")
        ));
    }

    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

    let affected = conn
        .execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("SQL 执行失败：{}", e))?;

    Ok(affected as u64)
}

// ============ 权限系统 ============

/// 插件权限常量
pub const PLUGIN_PERMISSIONS: [(&str, &str); 9] = [
    ("database:create_table", "创建数据库表"),
    ("database:read:*", "读取所有数据"),
    ("database:write:*", "写入所有数据"),
    ("menu:add", "添加导航菜单"),
    ("printer:write", "打印"),
    ("notification:send", "发送通知"),
    ("filesystem:read", "读取文件系统"),
    ("filesystem:write", "写入文件系统"),
    ("network:http", "HTTP 网络请求"),
];

/// 检查插件是否拥有指定权限
/// 读取插件目录下的 `.permissions` 文件进行匹配
pub fn check_plugin_permission(plugin_id: &str, required_permission: &str) -> bool {
    let plugin_dir = get_plugin_dir(plugin_id);
    let manifest_path = plugin_dir.join("manifest.json");

    if !manifest_path.exists() {
        return false;
    }

    // 从 manifest 中读取 permissions
    match read_manifest_file(&manifest_path) {
        Ok(manifest) => {
            if let Some(permissions) = &manifest.permissions {
                // 精确匹配
                if permissions.iter().any(|p| p == required_permission) {
                    return true;
                }
                // 通配符匹配（如 "database:read:*" 匹配 "database:read:products"）
                if required_permission.contains(':') {
                    let parts: Vec<&str> = required_permission.splitn(3, ':').collect();
                    if parts.len() >= 2 {
                        let wildcard = format!("{}:*", parts[0]);
                        if parts.len() >= 3 {
                            let wildcard2 = format!("{}:{}:*", parts[0], parts[1]);
                            if permissions.iter().any(|p| p == &wildcard2) {
                                return true;
                            }
                        }
                        if permissions.iter().any(|p| p == &wildcard) {
                            return true;
                        }
                    }
                }
            }
            false
        }
        Err(_) => false,
    }
}

/// 获取插件的权限声明列表
#[tauri::command]
pub fn get_plugin_permissions(plugin_id: String) -> Result<Vec<String>, String> {
    let plugin_dir = get_plugin_dir(&plugin_id);
    let manifest_path = plugin_dir.join("manifest.json");

    if !manifest_path.exists() {
        return Err(format!("插件 '{}' 未安装", plugin_id));
    }

    let manifest = read_manifest_file(&manifest_path)?;
    Ok(manifest.permissions.unwrap_or_default())
}

/// 验证插件权限（供其他模块调用）
#[tauri::command]
pub fn verify_plugin_permission(
    plugin_id: String,
    required_permission: String,
) -> Result<bool, String> {
    Ok(check_plugin_permission(&plugin_id, &required_permission))
}

// ============ 插件启用/禁用持久化 ============

/// 插件启用状态记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginEnabledStatus {
    pub plugin_id: String,
    pub enabled: bool,
    pub updated_at: String,
}

/// 确保 plugin_enabled 表存在
fn ensure_plugin_enabled_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS plugin_enabled (\
         plugin_id TEXT PRIMARY KEY,\
         enabled INTEGER NOT NULL DEFAULT 1,\
         updated_at TEXT NOT NULL DEFAULT (datetime('now'))\
         );"
    ).map_err(|e| format!("创建 plugin_enabled 表失败：{}", e))
}

/// 启用插件
#[tauri::command]
pub fn enable_plugin(
    plugin_id: String,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();
    ensure_plugin_enabled_table(conn)?;
    
    conn.execute(
        "INSERT OR REPLACE INTO plugin_enabled (plugin_id, enabled, updated_at) \
         VALUES (?1, 1, datetime('now'))",
        rusqlite::params![plugin_id],
    ).map_err(|e| format!("启用插件失败：{}", e))?;
    
    Ok(())
}

/// 禁用插件
#[tauri::command]
pub fn disable_plugin(
    plugin_id: String,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();
    ensure_plugin_enabled_table(conn)?;
    
    conn.execute(
        "INSERT OR REPLACE INTO plugin_enabled (plugin_id, enabled, updated_at) \
         VALUES (?1, 0, datetime('now'))",
        rusqlite::params![plugin_id],
    ).map_err(|e| format!("禁用插件失败：{}", e))?;
    
    Ok(())
}

/// 获取插件启用状态（如无记录，默认为启用）
#[tauri::command]
pub fn get_plugin_enabled_status(
    plugin_id: String,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<PluginEnabledStatus, String> {
    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();
    ensure_plugin_enabled_table(conn)?;
    
    let result = conn.query_row(
        "SELECT plugin_id, enabled, updated_at FROM plugin_enabled WHERE plugin_id = ?1",
        rusqlite::params![plugin_id],
        |row| {
            Ok(PluginEnabledStatus {
                plugin_id: row.get(0)?,
                enabled: row.get::<_, i32>(1)? != 0,
                updated_at: row.get(2)?,
            })
        }
    );
    
    match result {
        Ok(status) => Ok(status),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // 无记录，默认启用
            Ok(PluginEnabledStatus {
                plugin_id: plugin_id.clone(),
                enabled: true,
                updated_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            })
        }
        Err(e) => Err(format!("查询插件状态失败：{}", e)),
    }
}

/// 获取所有插件的启用状态
#[tauri::command]
pub fn get_all_plugin_enabled_statuses(
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<Vec<PluginEnabledStatus>, String> {
    let db = db.lock().map_err(|e| format!("数据库锁定失败：{}", e))?;
    let conn = db.connection();
    ensure_plugin_enabled_table(conn)?;
    
    let mut stmt = conn.prepare(
        "SELECT plugin_id, enabled, updated_at FROM plugin_enabled ORDER BY plugin_id"
    ).map_err(|e| format!("查询插件状态失败：{}", e))?;
    
    let records = stmt.query_map([], |row| {
        Ok(PluginEnabledStatus {
            plugin_id: row.get(0)?,
            enabled: row.get::<_, i32>(1)? != 0,
            updated_at: row.get(2)?,
        })
    }).map_err(|e| format!("读取插件状态失败：{}", e))?;
    
    let mut result = Vec::new();
    for record in records.flatten() {
        result.push(record);
    }
    Ok(result)
}

// ============ 插件更新机制 ============

/// 插件更新检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginUpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: Option<String>,
    pub package_hash: Option<String>,
    pub changelog: Option<String>,
    pub is_force_update: bool,
}

/// 检查插件是否有可用更新
#[tauri::command]
pub async fn check_plugin_update(
    plugin_id: String,
    current_version: String,
    store_api_url: String,
) -> Result<PluginUpdateInfo, String> {
    let url = format!("{}/api/plugins/{}/latest", store_api_url.trim_end_matches('/'), plugin_id);
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("检查更新失败（无法连接商店）: {}", e))?;
    if !response.status().is_success() {
        return Ok(PluginUpdateInfo {
            has_update: false,
            current_version: current_version.clone(),
            latest_version: current_version.clone(),
            download_url: None,
            package_hash: None,
            changelog: None,
            is_force_update: false,
        });
    }
    let latest: serde_json::Value = response.json().await
        .map_err(|e| format!("解析更新信息失败: {}", e))?;
    let latest_version = latest.get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("").to_string();
    if latest_version.is_empty() || latest_version == current_version {
        return Ok(PluginUpdateInfo {
            has_update: false,
            current_version,
            latest_version,
            download_url: None,
            package_hash: None,
            changelog: None,
            is_force_update: false,
        });
    }
    Ok(PluginUpdateInfo {
        has_update: true,
        current_version,
        latest_version,
        download_url: latest.get("package_url").and_then(|u| u.as_str()).map(|s| s.to_string()),
        package_hash: latest.get("package_hash").and_then(|h| h.as_str()).map(|s| s.to_string()),
        changelog: latest.get("changelog").and_then(|c| c.as_str()).map(|s| s.to_string()),
        is_force_update: latest.get("is_force_update").and_then(|f| f.as_bool()).unwrap_or(false),
    })
}

/// 应用插件更新
#[tauri::command]
pub async fn apply_plugin_update(
    plugin_id: String,
    download_url: String,
    new_version: String,
    db: tauri::State<'_, std::sync::Mutex<crate::database::Database>>,
) -> Result<String, String> {
    let plugins_dir = get_plugins_dir();
    let plugin_dir = get_plugin_dir(&plugin_id);
    if !plugin_dir.exists() {
        return Err(format!("插件 '{}' 未安装，无法更新", plugin_id));
    }
    // 1. 下载新版本包
    let download_path = plugins_dir.join(format!("{}-{}.proclaw-plugin", plugin_id, new_version));
    let response = reqwest::get(&download_url).await.map_err(|e| format!("下载更新包失败: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("下载失败，HTTP {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| format!("读取下载内容失败: {}", e))?;
    std::fs::write(&download_path, &bytes).map_err(|e| format!("保存更新包失败: {}", e))?;
    // 2. 解压到临时目录
    let temp_dir = plugins_dir.join(format!("{}-{}-tmp", plugin_id, new_version));
    if temp_dir.exists() { std::fs::remove_dir_all(&temp_dir).ok(); }
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("创建临时目录失败: {}", e))?;
    let file = std::fs::File::open(&download_path).map_err(|e| format!("打开更新包失败: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("读取 ZIP 包失败: {}", e))?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("读取 ZIP 条目失败: {}", e))?;
        let entry_path = entry.mangled_name();
        let target_path = temp_dir.join(&entry_path);
        if entry.is_dir() { std::fs::create_dir_all(&target_path).ok(); }
        else {
            if let Some(parent) = target_path.parent() { std::fs::create_dir_all(parent).ok(); }
            let mut outfile = std::fs::File::create(&target_path).map_err(|e| format!("创建文件失败: {}", e))?;
            std::io::copy(&mut entry, &mut outfile).map_err(|e| format!("解压文件失败: {}", e))?;
        }
    }
    // 3. 执行增量迁移
    let old_migrations = plugin_dir.join("migrations");
    let new_migrations = temp_dir.join("migrations");
    if new_migrations.exists() {
        let mut files: Vec<String> = std::fs::read_dir(&new_migrations)
            .map_err(|e| format!("读取迁移目录失败: {}", e))?
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map(|ext| ext == "sql").unwrap_or(false))
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect();
        files.sort();
        for f in &files {
            if !old_migrations.join(f).exists() {
                let sql = std::fs::read_to_string(new_migrations.join(f))
                    .map_err(|e| format!("读取迁移文件 {} 失败: {}", f, e))?;
                if !sql.trim().is_empty() {
                    let db = db.lock().map_err(|e| format!("数据库锁定失败: {}", e))?;
                    db.connection().execute_batch(&sql)
                        .map_err(|e| format!("执行迁移 {} 失败: {}", f, e))?;
                }
            }
        }
    }
    // 4. 替换文件（保留 config 目录）
    for entry in std::fs::read_dir(&plugin_dir).map_err(|e| format!("读取插件目录失败: {}", e))? {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        if path.is_dir() && path.file_name().unwrap_or_default() == "config" { continue; }
        if path.is_file() { std::fs::remove_file(&path).ok(); }
        else { std::fs::remove_dir_all(&path).ok(); }
    }
    for entry in std::fs::read_dir(&temp_dir).map_err(|e| format!("读取临时目录失败: {}", e))? {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let target = plugin_dir.join(entry.file_name());
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            copy_dir_contents(&entry.path(), &target).map_err(|e| format!("复制目录失败: {}", e))?;
        } else {
            std::fs::copy(entry.path(), &target).map_err(|e| format!("复制文件失败: {}", e))?;
        }
    }
    // 清理
    std::fs::remove_dir_all(&temp_dir).ok();
    std::fs::remove_file(&download_path).ok();
    Ok(format!("插件 '{}' 已更新到 v{}", plugin_id, new_version))
}

/// 递归复制目录内容的辅助函数
fn copy_dir_contents(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() { std::fs::create_dir_all(dst)?; }
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let target = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_contents(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), &target)?;
        }
    }
    Ok(())
}
