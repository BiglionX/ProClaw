//! ProClaw 批量导入中心模块（v1.2 P1）
//!
//! ## 模块组成
//! - [`types`]   类型与常量（target / 必填字段 / 中英文字段别名）
//! - [`parser`]  CSV / 简易 XLSX / JSON 解析（返回 `Vec<ParsedRow>`）
//! - [`executor`] 校验 + 执行入库（6 类目标）
//! - [`templates`]  启动时把 6 套模板拷贝到 APPDATA，用户下载用
//! - [`commands`] Tauri 命令层（对接前端 service）

pub mod commands;
pub mod executor;
pub mod parser;
pub mod templates;
pub mod types;

// 重新导出常用项，方便上层 `crate::import::*` 访问。
// 本身作为 public API 供 invoke_handler 与前端调用，未在本 crate 内部使用。
#[allow(unused_imports)]
pub use commands::{
    import_cancel_batch, import_create_batch, import_execute_batch, import_get_batch,
    import_get_batch_errors, import_get_templates, import_list_batches,
    import_list_mapping_templates, import_parse_file, import_pause_batch,
    import_retry_batch, import_save_mapping_template, import_upload_file,
    import_validate_batch,
};
#[allow(unused_imports)]
pub use types::{
    BatchStatus, FieldDef, ImportBatch, ImportBatchError, ImportRequest, ImportTarget,
    ParsedRow, REQUIRED_FIELDS_BY_TARGET, TARGET_FIELDS,
};
