/// 路径安全工具：防止路径遍历（Path Traversal）攻击
///
/// 用于净化来自用户/前端的路径参数，确保所有文件操作被限定在预期目录内。

use std::path::{Path, PathBuf};

/// 净化文件名/路径段，移除危险字符
///
/// 移除 `..`、`/`、`\`、`:` 等可能被用于路径遍历的字符。
/// 返回仅包含安全字符的路径组件（纯文件名）。
pub fn sanitize_path_component(input: &str) -> String {
    input
        .replace("..", "")
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_")
        .replace('\0', "")
        .trim_matches('.')
        .to_string()
}

/// 净化文件名，确保它是一个单级文件名（不含目录分隔符）
///
/// - 拒绝空字符串、`.`、`..`
/// - 移除所有路径分隔符
/// - 拒绝包含 `..` 的输入（返回错误）
pub fn sanitize_file_name(name: &str) -> Result<String, &'static str> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("文件名不能为空");
    }
    if trimmed == "." || trimmed == ".." || trimmed.contains("..") {
        return Err("文件名包含危险的路径遍历字符 ..");
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains('\0') {
        return Err("文件名包含非法字符");
    }
    Ok(trimmed.to_string())
}

/// 确保目标路径在指定的基础目录内（防 Zip Slip / 路径穿越）
///
/// 返回 `Err` 如果 `target` 路径尝试逃逸出 `base` 目录。
pub fn ensure_within_dir(base: &Path, target: &Path) -> Result<PathBuf, &'static str> {
    // 规范化 base 目录
    let canonical_base = base.canonicalize().unwrap_or_else(|_| base.to_path_buf());
    
    // 构造完整目标路径并规范化
    let full_target = base.join(target);
    let canonical_target = match full_target.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            // 如果路径尚不存在，用 PathBuf 拼接后手动检查
            let joined = base.join(target);
            // 手动消除 .. 和 .
            let normalized = normalize_path(&joined);
            let normalized_base = normalize_path(&canonical_base);
            if !normalized.starts_with(&normalized_base) {
                return Err("路径穿越攻击：目标路径逃逸出基础目录");
            }
            return Ok(joined);
        }
    };
    
    if !canonical_target.starts_with(&canonical_base) {
        return Err("路径穿越攻击：目标路径逃逸出基础目录");
    }
    
    Ok(canonical_target)
}

/// 简单路径规范化：解析 `..` 和 `.`，不依赖文件系统
fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                components.pop();
            }
            std::path::Component::CurDir => {}
            c => components.push(c),
        }
    }
    components.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_path_component() {
        assert_eq!(sanitize_path_component("normal_name"), "normal_name");
        assert_eq!(sanitize_path_component("../../../etc/passwd"), "___etc_passwd");
        assert_eq!(sanitize_path_component("foo\\..\\bar"), "foo__bar");
        assert_eq!(sanitize_path_component("test:file"), "test_file");
    }

    #[test]
    fn test_sanitize_file_name_rejects_traversal() {
        assert!(sanitize_file_name("..").is_err());
        assert!(sanitize_file_name("../etc").is_err());
        assert!(sanitize_file_name("foo/bar").is_err());
        assert!(sanitize_file_name("").is_err());
        assert!(sanitize_file_name("normal.txt").is_ok());
    }

    #[test]
    fn test_ensure_within_dir() {
        let base = Path::new("/tmp/safe");
        assert!(ensure_within_dir(base, Path::new("file.txt")).is_ok());
        assert!(ensure_within_dir(base, Path::new("subdir/file.txt")).is_ok());
    }
}
