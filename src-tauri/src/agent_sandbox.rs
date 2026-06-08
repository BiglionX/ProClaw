use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

/// Agent 包格式错误
#[derive(Debug)]
pub enum AgentPackageError {
    InvalidManifest(String),
    MissingEntry(String),
    InvalidSignature(String),
    IoError(std::io::Error),
    InvalidAgentId(String),
}

impl std::fmt::Display for AgentPackageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentPackageError::InvalidManifest(msg) => write!(f, "Invalid manifest: {}", msg),
            AgentPackageError::MissingEntry(msg) => write!(f, "Missing entry: {}", msg),
            AgentPackageError::InvalidSignature(msg) => write!(f, "Invalid signature: {}", msg),
            AgentPackageError::IoError(e) => write!(f, "IO error: {}", e),
            AgentPackageError::InvalidAgentId(msg) => write!(f, "Invalid agent ID: {}", msg),
        }
    }
}

impl std::error::Error for AgentPackageError {}

impl From<std::io::Error> for AgentPackageError {
    fn from(e: std::io::Error) -> Self {
        AgentPackageError::IoError(e)
    }
}

/// Agent 包结构（ZIP 内文件列表）
#[derive(Debug, Serialize, Deserialize)]
pub struct AgentPackageManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub entry: String, // HTML 入口文件名
    pub permissions: Vec<String>,
    pub icon: Option<String>, // 图标文件名
    pub description: Option<String>,
    pub author: Option<String>,
    pub checksum: Option<String>, // 包完整性校验
}

/// Agent 沙箱 - 管理 Agent 的隔离目录和资源
pub struct AgentSandbox {
    base_data_dir: PathBuf,
}

impl AgentSandbox {
    /// 创建 Agent 沙箱管理器
    pub fn new(base_data_dir: PathBuf) -> Self {
        Self { base_data_dir }
    }

    /// 获取指定 Agent 的数据目录
    pub fn get_agent_dir(&self, agent_id: &str) -> Result<PathBuf, AgentPackageError> {
        let sanitized = crate::utils::path_safety::sanitize_path_component(agent_id);
        if sanitized.contains("..") || sanitized.starts_with('/') || sanitized.starts_with('\\') {
            return Err(AgentPackageError::InvalidAgentId(
                "Agent ID contains path traversal characters".to_string(),
            ));
        }
        Ok(self.base_data_dir.join("agents").join(&sanitized))
    }

    /// 获取 Agent 的 assets 目录（存放前端资源）
    pub fn get_agent_assets_dir(&self, agent_id: &str) -> PathBuf {
        self.get_agent_dir(agent_id).join("assets")
    }

    /// 获取 Agent 的数据存储目录（存放运行时数据）
    pub fn get_agent_data_dir(&self, agent_id: &str) -> PathBuf {
        self.get_agent_dir(agent_id).join("data")
    }

    /// 确保 Agent 目录存在
    pub fn ensure_agent_dirs(&self, agent_id: &str) -> Result<(), std::io::Error> {
        std::fs::create_dir_all(self.get_agent_assets_dir(agent_id))?;
        std::fs::create_dir_all(self.get_agent_data_dir(agent_id))?;
        Ok(())
    }

    /// 清理 Agent 的所有数据
    pub fn clean_agent_data(&self, agent_id: &str) -> Result<(), std::io::Error> {
        let agent_dir = self.get_agent_dir(agent_id);
        if agent_dir.exists() {
            std::fs::remove_dir_all(&agent_dir)?;
        }
        Ok(())
    }

    /// 验证 agent 包的基本结构
    pub fn validate_package(
        package_dir: &Path,
        manifest: &AgentPackageManifest,
    ) -> Result<(), AgentPackageError> {
        // 检查入口文件是否存在
        let entry_path = package_dir.join(&manifest.entry);
        if !entry_path.exists() {
            return Err(AgentPackageError::MissingEntry(format!(
                "Entry file '{}' not found in package",
                manifest.entry
            )));
        }

        // 检查 manifest 必填字段
        if manifest.id.is_empty() {
            return Err(AgentPackageError::InvalidManifest(
                "Agent ID is required".to_string(),
            ));
        }
        if manifest.name.is_empty() {
            return Err(AgentPackageError::InvalidManifest(
                "Agent name is required".to_string(),
            ));
        }
        if manifest.version.is_empty() {
            return Err(AgentPackageError::InvalidManifest(
                "Agent version is required".to_string(),
            ));
        }

        // 检查图标文件（如果声明了）
        if let Some(ref icon_path_str) = manifest.icon {
            let icon_path = package_dir.join(icon_path_str);
            if !icon_path.exists() {
                return Err(AgentPackageError::InvalidManifest(format!(
                    "Icon file '{}' not found in package",
                    icon_path_str
                )));
            }
        }

        Ok(())
    }

    /// 将 Agent 包解压到目标目录
    /// 自动检测 ZIP 文件或目录
    pub fn extract_package(
        &self,
        agent_id: &str,
        package_path: &Path,
    ) -> Result<(), AgentPackageError> {
        let target_dir = self.get_agent_assets_dir(agent_id);
        self.ensure_agent_dirs(agent_id)?;

        if package_path.is_dir() {
            // 目录模式（开发测试用）
            copy_dir_recursive(package_path, &target_dir)?;
        } else if package_path.extension().map_or(false, |ext| ext == "zip") {
            // ZIP 文件模式
            extract_zip_package(package_path, &target_dir)?;
        } else {
            return Err(AgentPackageError::InvalidManifest(format!(
                "Unsupported package format: {:?}",
                package_path
            )));
        }

        Ok(())
    }
}

/// 使用 zip crate 解压 ZIP 文件
pub fn extract_zip_package(zip_path: &Path, target_dir: &Path) -> Result<(), AgentPackageError> {
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| AgentPackageError::InvalidManifest(format!("Invalid ZIP file: {}", e)))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| {
            AgentPackageError::InvalidManifest(format!("Error reading ZIP entry: {}", e))
        })?;

        let entry_name = entry.name().to_string();

        // 跳过目录条目和 __MACOSX 系统文件
        if entry.is_dir() || entry_name.starts_with("__MACOSX/") {
            continue;
        }

        // 确保路径在目标目录内（防止路径穿越攻击）
        let entry_path = target_dir.join(&entry_name);
        if !entry_path.starts_with(target_dir) {
            return Err(AgentPackageError::InvalidManifest(format!(
                "Path traversal detected: {}",
                entry_name
            )));
        }

        // 创建父目录
        if let Some(parent) = entry_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // 写入文件
        let mut output = File::create(&entry_path)?;
        let mut buffer = Vec::new();
        entry.read_to_end(&mut buffer)?;
        output.write_all(&buffer)?;
    }

    Ok(())
}

/// 递归复制目录
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }

    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_agent_sandbox_dirs() {
        let temp_dir = env::temp_dir().join("proclaw_agent_test");
        let sandbox = AgentSandbox::new(temp_dir.clone());

        let agent_id = "test-agent-001";
        sandbox
            .ensure_agent_dirs(agent_id)
            .expect("Should create dirs");

        assert!(sandbox.get_agent_dir(agent_id).exists());
        assert!(sandbox.get_agent_assets_dir(agent_id).exists());
        assert!(sandbox.get_agent_data_dir(agent_id).exists());

        // 清理
        std::fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_validate_package() {
        let temp_dir = env::temp_dir().join("proclaw_validate_test");
        std::fs::create_dir_all(&temp_dir).ok();

        // 创建测试入口文件
        std::fs::write(temp_dir.join("index.html"), "<html></html>").ok();

        let valid_manifest = AgentPackageManifest {
            id: "test-agent".to_string(),
            name: "Test Agent".to_string(),
            version: "1.0.0".to_string(),
            entry: "index.html".to_string(),
            permissions: vec![],
            icon: None,
            description: Some("A test agent".to_string()),
            author: Some("Test Author".to_string()),
            checksum: None,
        };

        assert!(AgentSandbox::validate_package(&temp_dir, &valid_manifest).is_ok());

        // 测试缺少入口文件
        let bad_manifest = AgentPackageManifest {
            entry: "nonexistent.html".to_string(),
            ..valid_manifest
        };
        assert!(AgentSandbox::validate_package(&temp_dir, &bad_manifest).is_err());

        // 清理
        std::fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_extract_zip_package() {
        use std::io::Write;

        let temp_dir = env::temp_dir().join("proclaw_zip_test");
        let sandbox = AgentSandbox::new(temp_dir.clone());
        let agent_id = "zip-test-agent";

        // 创建测试 ZIP 文件
        let zip_path = temp_dir.join("test-agent.zip");
        std::fs::create_dir_all(temp_dir.join("agents").join(agent_id).join("assets")).ok();
        let zip_file = File::create(&zip_path).unwrap();
        let mut zip_writer = zip::ZipWriter::new(zip_file);

        // 添加入口文件
        let options =
            zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Stored);
        zip_writer.start_file("index.html", options).unwrap();
        zip_writer.write_all(b"<html>Test Agent</html>").unwrap();

        // 添加图标文件
        zip_writer.start_file("icon.png", options).unwrap();
        zip_writer.write_all(b"fake_png_data").unwrap();

        zip_writer.finish().unwrap();

        // 解压
        sandbox
            .extract_package(agent_id, &zip_path)
            .expect("Should extract zip");

        let assets_dir = sandbox.get_agent_assets_dir(agent_id);
        assert!(
            assets_dir.join("index.html").exists(),
            "Entry file should exist"
        );
        assert!(
            assets_dir.join("icon.png").exists(),
            "Icon file should exist"
        );

        // 验证内容
        let content = std::fs::read_to_string(assets_dir.join("index.html")).unwrap();
        assert_eq!(content, "<html>Test Agent</html>");

        // 清理
        std::fs::remove_dir_all(&temp_dir).ok();
    }
}
