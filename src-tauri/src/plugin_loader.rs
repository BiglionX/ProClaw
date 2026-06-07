/// ProClaw 后端插件动态加载框架
///
/// 负责从行业插件的动态库（.dll/.so/.dylib）中加载 `plugin_init` 函数，
/// 注册插件提供的命令到 Tauri invoke_handler。
///
/// 使用方式：
///   1. 插件编译为动态库，导出 `plugin_init` 函数
///   2. ProClaw 启动时或安装插件时，调用 `PluginLoader::load_plugin_library`
///   3. 命令注册到全局命令表，由统一调度器调用

use libloading::{Library, Symbol};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

/// 插件命令的参数与返回值（JSON 格式互通）
pub type PluginCommandFn = fn(args: &str) -> Result<String, String>;

/// 插件初始化函数签名
pub type PluginInitFn = unsafe fn() -> *mut PluginCommandRegistry;

/// 插件命令注册表（由插件在 `plugin_init` 中构建返回）
#[derive(Debug, Serialize, Deserialize)]
pub struct PluginCommandRegistry {
    pub plugin_id: String,
    pub commands: Vec<PluginCommandDef>,
}

/// 插件命令定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCommandDef {
    /// 命令名称（如 "print_ticket"）
    pub name: String,
    /// 命令描述
    pub description: String,
    /// 参数 JSON Schema（可选）
    pub param_schema: Option<serde_json::Value>,
    /// 返回值 JSON Schema（可选）
    pub return_schema: Option<serde_json::Value>,
}

/// 已加载的插件库信息
#[derive(Debug)]
pub struct LoadedPlugin {
    pub plugin_id: String,
    pub library_path: String,
    pub commands: Vec<PluginCommandDef>,
    /// 保留库引用以防止被卸载
    _library: Library,
}

/// 插件加载器单例
pub struct PluginLoader {
    /// 已加载的插件（plugin_id -> LoadedPlugin）
    loaded_plugins: Mutex<HashMap<String, LoadedPlugin>>,
    /// 命令注册表（command_name -> (plugin_id, command_def)）
    command_index: Mutex<HashMap<String, (String, PluginCommandDef)>>,
}

impl PluginLoader {
    /// 创建新的插件加载器实例
    pub fn new() -> Self {
        Self {
            loaded_plugins: Mutex::new(HashMap::new()),
            command_index: Mutex::new(HashMap::new()),
        }
    }

    /// 获取全局单例
    pub fn global() -> &'static Self {
        static INSTANCE: std::sync::OnceLock<PluginLoader> = std::sync::OnceLock::new();
        INSTANCE.get_or_init(|| PluginLoader::new())
    }

    /// 加载插件动态库
    ///
    /// # 参数
    /// * `plugin_id` - 插件 ID
    /// * `library_path` - 动态库文件路径
    ///
    /// # 返回
    /// 成功返回已注册的命令列表，失败返回错误信息
    pub fn load_plugin_library(
        &self,
        plugin_id: &str,
        library_path: &Path,
    ) -> Result<Vec<PluginCommandDef>, String> {
        // 审计修复 #12: 合并检查和加载到单个持锁区域，消除 TOCTOU 竞态
        // 安全检查：验证文件存在
        if !library_path.exists() {
            return Err(format!("动态库文件不存在：{}", library_path.display()));
        }

        // 安全检查：验证文件扩展名
        let ext = library_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        match ext {
            "dll" | "so" | "dylib" => {} // 合法
            _ => {
                return Err(format!(
                    "不支持的文件类型：.{}, 仅支持 .dll/.so/.dylib",
                    ext
                ));
            }
        }

        {
            let loaded = self.loaded_plugins.lock().map_err(|e| e.to_string())?;
            if loaded.contains_key(plugin_id) {
                return Err(format!("插件 '{}' 已加载", plugin_id));
            }
        }

        // 加载动态库
        // 审计修复 #2: 加载动态库在宿主进程空间内执行任意代码，
        // 属于插件架构固有风险。生产环境应增加代码签名验证。
        let library = unsafe {
            Library::new(library_path)
                .map_err(|e| format!("加载动态库失败 ({}): {}", library_path.display(), e))?
        };

        // 查找 plugin_init 符号
        let init_fn: Symbol<PluginInitFn> = unsafe {
            library
                .get(b"plugin_init")
                .map_err(|e| format!("插件 '{}' 未导出 plugin_init 函数: {}", plugin_id, e))?
        };

        // 调用 plugin_init 获取命令注册表
        let registry_ptr = unsafe { init_fn() };

        if registry_ptr.is_null() {
            // 清理已加载的库（Library 会在 drop 时自动关闭）
            return Err(format!("插件 '{}' 的 plugin_init 返回空指针", plugin_id));
        }

        // 获取注册表（取回所有权并在使用后释放）
        let registry: Box<PluginCommandRegistry> = unsafe { Box::from_raw(registry_ptr) };

        if registry.plugin_id != plugin_id {
            let actual_id = registry.plugin_id.clone();
            return Err(format!(
                "插件 ID 不匹配：期望 '{}'，实际 '{}'",
                plugin_id, actual_id
            ));
        }

        let commands = registry.commands.clone();

        // 审计修复 #12: 在单个持锁区域内完成检查和插入，消除 TOCTOU
        // 注册到命令索引
        {
            let mut index = self.command_index.lock().map_err(|e| e.to_string())?;
            let mut loaded = self.loaded_plugins.lock().map_err(|e| e.to_string())?;
            
            // 双重检查：确保加载期间没有并发加载同一插件
            if loaded.contains_key(plugin_id) {
                // 并发加载已抢占，释放本加载（Library drop 自动关闭）
                return Err(format!("插件 '{}' 已在并发中加载（double-check）", plugin_id));
            }
            
            for cmd in &registry.commands {
                let key = format!("{}:{}", plugin_id, cmd.name);
                index.insert(key, (plugin_id.to_string(), cmd.clone()));
            }
            drop(index); // 先释放 command_index 锁

            // 存储加载的插件（保留 Library 引用防止卸载）
            loaded.insert(
                plugin_id.to_string(),
                LoadedPlugin {
                    plugin_id: plugin_id.to_string(),
                    library_path: library_path.to_string_lossy().to_string(),
                    commands: commands.clone(),
                    _library: library,
                },
            );
        }

        Ok(commands)
    }

    /// 卸载插件动态库
    pub fn unload_plugin(&self, plugin_id: &str) -> Result<(), String> {
        let mut loaded = self.loaded_plugins.lock().map_err(|e| e.to_string())?;

        if !loaded.contains_key(plugin_id) {
            return Err(format!("插件 '{}' 未加载", plugin_id));
        }

        // 从命令索引中移除
        {
            let mut index = self.command_index.lock().map_err(|e| e.to_string())?;
            index.retain(|_, (pid, _)| pid != plugin_id);
        }

        // 移除加载的插件（Library 自动 drop 关闭）
        loaded.remove(plugin_id);
        Ok(())
    }

    /// 获取已加载的插件列表
    pub fn get_loaded_plugins(&self) -> Result<Vec<LoadedPluginInfo>, String> {
        let loaded = self.loaded_plugins.lock().map_err(|e| e.to_string())?;
        Ok(loaded
            .values()
            .map(|p| LoadedPluginInfo {
                plugin_id: p.plugin_id.clone(),
                library_path: p.library_path.clone(),
                commands: p.commands.clone(),
            })
            .collect())
    }

    /// 检查插件是否已加载
    pub fn is_loaded(&self, plugin_id: &str) -> bool {
        self.loaded_plugins
            .lock()
            .map(|loaded| loaded.contains_key(plugin_id))
            .unwrap_or(false)
    }

    /// 获取插件的命令列表
    pub fn get_plugin_commands(&self, plugin_id: &str) -> Result<Vec<PluginCommandDef>, String> {
        let loaded = self.loaded_plugins.lock().map_err(|e| e.to_string())?;
        loaded
            .get(plugin_id)
            .map(|p| p.commands.clone())
            .ok_or_else(|| format!("插件 '{}' 未加载", plugin_id))
    }

    /// 获取所有已注册的命令索引
    pub fn get_command_index(&self) -> Result<HashMap<String, (String, PluginCommandDef)>, String> {
        self.command_index
            .lock()
            .map(|index| index.clone())
            .map_err(|e| e.to_string())
    }
}

/// 已加载插件的信息（序列化友好版）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadedPluginInfo {
    pub plugin_id: String,
    pub library_path: String,
    pub commands: Vec<PluginCommandDef>,
}

// ============ Tauri Commands ============

/// 加载插件后端动态库
#[tauri::command]
pub fn load_plugin_backend(
    plugin_id: String,
    library_path: String,
) -> Result<Vec<PluginCommandDef>, String> {
    let loader = PluginLoader::global();
    loader.load_plugin_library(&plugin_id, Path::new(&library_path))
}

/// 卸载插件后端动态库
#[tauri::command]
pub fn unload_plugin_backend(plugin_id: String) -> Result<(), String> {
    let loader = PluginLoader::global();
    loader.unload_plugin(&plugin_id)
}

/// 获取已加载的后端插件列表
#[tauri::command]
pub fn get_loaded_backend_plugins() -> Result<Vec<LoadedPluginInfo>, String> {
    let loader = PluginLoader::global();
    loader.get_loaded_plugins()
}

// ============ Plugin Side FFI Helper ============

/// 在插件端构建命令注册表（C FFI 辅助函数）
///
/// 插件端使用示例（plugin.rs）：
/// ```rust,ignore
/// use std::ffi::CStr;
///
/// #[no_mangle]
/// pub fn plugin_init() -> *mut PluginCommandRegistry {
///     let registry = PluginCommandRegistry {
///         plugin_id: "com.proclaw.plugin.restaurant".to_string(),
///         commands: vec![
///             PluginCommandDef {
///                 name: "print_ticket".to_string(),
///                 description: "打印小票".to_string(),
///                 param_schema: None,
///                 return_schema: None,
///             },
///         ],
///     };
///     Box::into_raw(Box::new(registry))
/// }
/// ```
///
/// 注意：插件端的 Cargo.toml 需要引用 proclaw-desktop 的 plugin_loader 模块，
/// 或独立定义相同结构的 PluginCommandRegistry 和 PluginCommandDef。

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_registry_serde() {
        let registry = PluginCommandRegistry {
            plugin_id: "test-plugin".to_string(),
            commands: vec![
                PluginCommandDef {
                    name: "print_ticket".to_string(),
                    description: "打印小票".to_string(),
                    param_schema: Some(serde_json::json!({
                        "type": "object",
                        "properties": {
                            "order_id": {"type": "string"}
                        }
                    })),
                    return_schema: None,
                },
            ],
        };

        let json = serde_json::to_string(&registry).unwrap();
        assert!(json.contains("test-plugin"));
        assert!(json.contains("print_ticket"));

        let deserialized: PluginCommandRegistry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.plugin_id, "test-plugin");
        assert_eq!(deserialized.commands.len(), 1);
        assert_eq!(deserialized.commands[0].name, "print_ticket");
    }

    #[test]
    fn test_plugin_loader_new() {
        let loader = PluginLoader::new();
        assert!(!loader.is_loaded("non-existent"));
        assert!(loader.get_loaded_plugins().unwrap().is_empty());
    }

    #[test]
    fn test_plugin_loader_index() {
        let loader = PluginLoader::new();
        let index = loader.get_command_index().unwrap();
        assert!(index.is_empty());
    }
}
