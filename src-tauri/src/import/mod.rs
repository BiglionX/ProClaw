//! 数据导入模块
//!
//! 实现 ProClaw 商品库批量导入 MVP（DATA_IMPORT_PRD_v1.0 §3.1）：
//! - 接收前端已解析的 ImportRequest（rows + mapping + conflict_strategy）
//! - 三级校验（L1 格式 / L2 业务 / L3 引用）
//! - 写入 product_spus / product_skus / product_images
//! - 关联辅助表：product_categories（按名查/建）、brands（按名查/建）
//! - 冲突策略：skip / overwrite / duplicate
//! - 失败按 batch_id 软删除回滚

pub mod commands;
pub mod executor;
pub mod mapper;
pub mod types;
pub mod validator;

pub use commands::*;
pub use types::{
    is_valid_target, required_fields_for, ConflictStrategy, FieldMapping, ImportBatch,
    ImportError, ImportRequest, ImportResult, ImportRow, TARGET_CUSTOMERS, TARGET_INVENTORY,
    TARGET_PRODUCTS, TARGET_PURCHASES, TARGET_SALES, TARGET_SUPPLIERS,
};
