//! ProClaw 批量导入中心模块（v1.2 P1 + v1.3 老系统迁移）
//!
//! ## 模块组成
//! - [`types`]   类型与常量（target / 必填字段 / 中英文字段别名 / AggregationRule / LegacyParseResult）
//! - [`parser`]  CSV / JSON 解析；xls/xlsx 通过 `parse_xls_xlsx` 转发到 parser_legacy
//! - [`parser_legacy`]  v1.3 新增：calamine 真解析 .xls / .xlsx + 聚合预览
//! - [`header_detect`]  v1.3 新增：两行表头 / 分段标题识别
//! - [`category_resolver`]  v1.3 新增：商品/供应商/客户类别自动建档
//! - [`aggregator`]  v1.3 新增：客户多联系人 / 商品 SPU-SKU 持久化聚合
//! - [`executor`] 校验 + 执行入库（6 类目标）
//! - [`templates`]  启动时把模板拷贝到 APPDATA，用户下载用
//! - [`commands`] Tauri 命令层（对接前端 service）

pub mod aggregator;
pub mod category_resolver;
pub mod commands;
pub mod executor;
pub mod header_detect;
pub mod parser;
pub mod parser_legacy;
pub mod templates;
pub mod types;

// 重新导出常用项，方便上层 `crate::import::*` 访问。
// 本身作为 public API 供 invoke_handler 与前端调用，未在本 crate 内部使用。
#[allow(unused_imports)]
pub use commands::{
    import_cancel_batch, import_create_batch, import_create_batch_inner, import_execute_batch,
    import_execute_legacy, import_execute_legacy_inner,
    import_get_batch, import_get_batch_errors, import_get_templates, import_list_batches,
    import_list_mapping_templates, import_parse_file, import_pause_batch,
    import_preview_legacy, import_retry_batch, import_rollback_batch, import_save_mapping_template,
    import_upload_file, import_validate_batch,
};
#[allow(unused_imports)]
pub use types::{
    AggregationRule, BatchStatus, CategoryCreateSummary, CustomerAggregate, CustomerContactRecord,
    FieldDef, ImportBatch, ImportBatchError, ImportRequest, ImportTarget,
    LegacyExecuteRequest, LegacyParseResult, ParsedRow, ProductAggregate, ProductSkuRecord,
    REQUIRED_FIELDS_BY_TARGET, TARGET_FIELDS,
};
