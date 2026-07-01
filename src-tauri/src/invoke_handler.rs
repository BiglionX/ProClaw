//! Tauri IPC command registration (extracted from main.rs)

#[cfg(feature = "virtual_company")]
use crate::agent_commands::*;
use crate::agent_profile_commands::*;
use crate::approval_commands::*;
use crate::auto_parts_commands::*;
use crate::beauty_commands::*;
use crate::call_commands::*;
use crate::catering_commands::*;
use crate::ceo_commands::*;
use crate::cloud_backup_commands::*;
use crate::common_commands::*;
use crate::community_group_buy_commands::*;
use crate::convenience_commands::*;
use crate::decoration_material_commands::*;
#[cfg(feature = "virtual_company")]
use crate::finance_agent_commands::*;
#[cfg(feature = "inventory")]
use crate::finance_commands::*;
use crate::fresh_food_commands::*;
use crate::hardware_commands::*;
#[cfg(feature = "inventory")]
use crate::inventory_aging_commands::*;
#[cfg(feature = "inventory")]
use crate::inventory_calibration_commands::*;
#[cfg(feature = "inventory")]
use crate::inventory_commands::*;
use crate::import::commands::*; // v1.2 P1: 批量导入中心
use crate::invitation_commands::*;
use crate::liquor_commands::*;
#[cfg(feature = "virtual_company")]
use crate::market_commands::*;
use crate::message_commands::*;
#[cfg(feature = "inventory")]
use crate::payment_commands::*;
use crate::pet_commands::*;
use crate::phone_accessories_commands::*;
use crate::plugin_loader::*;
use crate::plugin_manager::*;
#[cfg(any(feature = "light", feature = "inventory"))]
use crate::product_commands::*;
#[cfg(feature = "inventory")]
use crate::purchase_commands::*;
#[cfg(feature = "inventory")]
use crate::purchase_return_commands::*;
#[cfg(feature = "inventory")]
use crate::reconciliation_commands::*;
#[cfg(feature = "inventory")]
use crate::sales_commands::*;
#[cfg(feature = "inventory")]
use crate::sales_return_commands::*;
use crate::secretary_commands::*;
use crate::services::nvwax_commands::*;
use crate::setup_commands::*;
#[cfg(any(feature = "light", feature = "inventory"))]
use crate::store_commands::*;
use crate::subscription_commands::*;
use crate::sync_engine::*;
use crate::team_commands::*;
use crate::tray_commands::*;
use crate::user_commands::*;

/// Register all Tauri invoke handlers on the builder.
pub fn apply(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.invoke_handler(tauri::generate_handler![
        create_product,
        get_products,
        filter_products,
        get_product_by_id,
        update_product,
        delete_product,
        // 中等优先级 TODO #1：产品多图
        set_product_gallery,
        // SPU-SKU 电商架构
        create_product_spu,
        get_product_spus,
        get_product_spu_by_id,
        update_product_spu,
        delete_product_spu,
        // 商品库模式迁移
        get_library_mode,
        migrate_to_ecommerce_mode,
        downgrade_to_simple_mode,
        // 演示数据 Seed（ProClaw 1.0.0）
        seed_demo_products,
        set_spu_main_image,
        mark_store_as_demo,
        // 品牌管理
        create_brand,
        get_brands,
        // 分类管理
        create_category,
        get_categories,
        // 库存管理 (进销存版)
        #[cfg(feature = "inventory")]
        create_inventory_transaction,
        #[cfg(feature = "inventory")]
        get_inventory_transactions,
        #[cfg(feature = "inventory")]
        get_inventory_stats,
        // 灵活库存 PRD v12.0：微盘点/置信度/冲销
        #[cfg(feature = "inventory")]
        calibrate_stock,
        #[cfg(feature = "inventory")]
        get_stock_confidence,
        #[cfg(feature = "inventory")]
        get_stock_confidence_batch,
        #[cfg(feature = "inventory")]
        get_calibration_history,
        #[cfg(feature = "inventory")]
        force_clear_negative,
        #[cfg(feature = "inventory")]
        supplement_inbound,
        #[cfg(feature = "inventory")]
        set_allow_negative_stock,
        // 灵活库存 PRD v12.0：老化监控 + AI 提醒
        #[cfg(feature = "inventory")]
        check_negative_aging,
        #[cfg(feature = "inventory")]
        get_pending_aging_tasks,
        #[cfg(feature = "inventory")]
        compute_reminders,
        #[cfg(feature = "inventory")]
        mark_reminder_dismissed,
        #[cfg(feature = "inventory")]
        reset_reminder_suppression,
        #[cfg(feature = "inventory")]
        get_low_confidence_products_cmd,
        // 销售提交后微盘点建议触发
        #[cfg(feature = "inventory")]
        should_trigger_post_sales_calibration_cmd,
        // 进货完成后微盘点建议触发
        #[cfg(feature = "inventory")]
        should_trigger_post_purchase_calibration_cmd,
        // 数据分析 (进销存版)
        #[cfg(feature = "inventory")]
        get_sales_trend,
        #[cfg(feature = "inventory")]
        get_product_analytics,
        // 采购管理 (进销存版)
        #[cfg(feature = "inventory")]
        create_supplier,
        #[cfg(feature = "inventory")]
        get_suppliers,
        #[cfg(feature = "inventory")]
        create_purchase_order,
        #[cfg(feature = "inventory")]
        get_purchase_orders,
        #[cfg(feature = "inventory")]
        get_purchase_order_detail,
        // 销售管理 (进销存版)
        #[cfg(feature = "inventory")]
        create_customer,
        #[cfg(feature = "inventory")]
        get_customers,
        #[cfg(feature = "inventory")]
        create_sales_order,
        #[cfg(feature = "inventory")]
        get_sales_orders,
        // 财务报表 (进销存版)
        #[cfg(feature = "inventory")]
        get_profit_loss_report,
        #[cfg(feature = "inventory")]
        get_cash_flow_report,
        #[cfg(feature = "inventory")]
        get_financial_summary,
        // 文件上传
        upload_image,
        // 命令统计
        get_command_stats,
        reset_command_stats,
        track_foreign_logistics,
        list_customs_declarations,
        search_hs_code,
        list_foreign_translations,
        get_devices_cmd,
        revoke_device_cmd,
        get_operations_overview_cmd,
        get_operations_usage_cmd,
        get_operations_content_queue_cmd,
        update_operations_content_status_cmd,
        get_operations_seo_cmd,
        get_operations_social_accounts_cmd,
        get_operations_alerts_cmd,
        get_operations_teams_cmd,
        get_pairing_code_cmd,
        // 数据库和同步
        get_database_stats,
        get_pending_sync_records,
        mark_as_synced,
        start_sync,
        get_sync_status,
        // v1.2 P1: 批量导入中心
        import_create_batch,
        import_parse_file,
        import_upload_file,
        import_validate_batch,
        import_execute_batch,
        import_pause_batch,
        import_cancel_batch,
        import_retry_batch,
        import_get_batch,
        import_list_batches,
        import_get_batch_errors,
        import_get_templates,
        import_list_mapping_templates,
        import_save_mapping_template,
        // AI 团队管理
        create_team,
        get_teams,
        get_team_by_id,
        update_team,
        delete_team,
        import_team,
        // 用户与权限管理 (Phase 6)
        create_user_cmd,
        get_users_cmd,
        get_user_by_id_cmd,
        update_user_cmd,
        delete_user_cmd,
        assign_user_role_cmd,
        change_user_password_cmd,
        get_roles_cmd,
        get_current_user_cmd,
        get_ws_session_cmd,
        // 审批工作流 (Phase 6)
        create_approval_cmd,
        get_approvals_cmd,
        approve_request_cmd,
        reject_request_cmd,
        // 付款记录与AR/AP台账 (进销存版)
        #[cfg(feature = "inventory")]
        record_payment_cmd,
        #[cfg(feature = "inventory")]
        record_receipt_cmd,
        #[cfg(feature = "inventory")]
        get_payments_cmd,
        #[cfg(feature = "inventory")]
        get_ar_ap_summary_cmd,
        #[cfg(feature = "inventory")]
        get_ar_ap_detail_cmd,
        // 对账管理 (进销存版)
        #[cfg(feature = "inventory")]
        generate_statement,
        #[cfg(feature = "inventory")]
        send_statement_email,
        #[cfg(feature = "inventory")]
        create_reconciliation_rule,
        #[cfg(feature = "inventory")]
        update_reconciliation_rule,
        #[cfg(feature = "inventory")]
        delete_reconciliation_rule,
        #[cfg(feature = "inventory")]
        get_reconciliation_rules,
        #[cfg(feature = "inventory")]
        set_smtp_config,
        #[cfg(feature = "inventory")]
        get_smtp_config,
        #[cfg(feature = "inventory")]
        check_reconciliation_rules,
        // 补充的采购/销售命令 (进销存版)
        #[cfg(feature = "inventory")]
        update_purchase_order_cmd,
        #[cfg(feature = "inventory")]
        delete_purchase_order_cmd,
        #[cfg(feature = "inventory")]
        receive_purchase_order_cmd,
        #[cfg(feature = "inventory")]
        confirm_purchase_order_cmd,
        #[cfg(feature = "inventory")]
        cancel_purchase_order_cmd,
        #[cfg(feature = "inventory")]
        update_sales_order_cmd,
        #[cfg(feature = "inventory")]
        delete_sales_order_cmd,
        #[cfg(feature = "inventory")]
        submit_sales_order_cmd,
        #[cfg(feature = "inventory")]
        cancel_sales_order_cmd,
        #[cfg(feature = "inventory")]
        mark_sales_shipped_cmd,
        #[cfg(feature = "inventory")]
        mark_sales_delivered_cmd,
        // 采购退货 (进销存版)
        #[cfg(feature = "inventory")]
        create_purchase_return,
        #[cfg(feature = "inventory")]
        get_purchase_returns,
        #[cfg(feature = "inventory")]
        get_purchase_return_detail,
        #[cfg(feature = "inventory")]
        confirm_purchase_return,
        #[cfg(feature = "inventory")]
        cancel_purchase_return,
        #[cfg(feature = "inventory")]
        update_purchase_return,
        // 销售退货 (进销存版)
        #[cfg(feature = "inventory")]
        create_sales_return,
        #[cfg(feature = "inventory")]
        get_sales_returns,
        #[cfg(feature = "inventory")]
        get_sales_return_detail,
        #[cfg(feature = "inventory")]
        confirm_sales_return,
        #[cfg(feature = "inventory")]
        cancel_sales_return,
        // 订阅与计费 (Phase 7)
        get_plans_cmd,
        get_my_subscription_cmd,
        subscribe_plan_cmd,
        cancel_subscription_cmd,
        get_token_summary_cmd,
        get_token_usage_cmd,
        get_invoices_cmd,
        record_token_cmd,
        // Token 定价系统 (PRD v8.0)
        get_token_pricing_cmd,
        get_token_balance_cmd,
        estimate_token_cost_cmd,
        // 联系人与消息
        get_contacts,
        get_messages,
        send_message,
        mark_message_read,
        mark_conversation_read,
        get_recent_contacts,
        add_contact,
        get_unread_count,
        // 通话记录 (v4.1)
        get_call_records_cmd,
        create_call_record_cmd,
        update_call_record_cmd,
        check_user_online_cmd,
        // 外部伙伴邀请 (PRD v4.2)
        create_invitation_cmd,
        accept_invitation_cmd,
        revoke_invitation_cmd,
        get_invitations_cmd,
        create_employee_invitation_cmd,
        accept_employee_invitation_cmd,
        // 云托管商城 (PRD v5.0)
        get_cloud_store,
        create_cloud_store,
        update_cloud_store,
        upgrade_store_plan,
        reset_store_api_key,
        get_syncable_products,
        sync_all_products_to_cloud,
        sync_incremental_products,
        toggle_product_cloud_visible,
        batch_toggle_products_visible,
        get_cloud_sync_logs,
        get_store_theme,
        update_store_theme,
        generate_store_theme_ai,
        get_store_orders,
        get_store_order,
        mark_store_order_shipped,
        get_store_stats,
        // 商品评价系统 (Phase 5)
        create_product_review,
        get_product_reviews,
        reply_product_review,
        delete_product_review,
        // 优惠券系统 (Phase 5)
        create_coupon,
        get_coupons,
        update_coupon_status,
        delete_coupon,
        use_coupon,
        // Agent 管理 (PRD v6.0)
        #[cfg(feature = "virtual_company")]
        install_agent,
        #[cfg(feature = "virtual_company")]
        uninstall_agent,
        #[cfg(feature = "virtual_company")]
        enable_agent,
        #[cfg(feature = "virtual_company")]
        disable_agent,
        #[cfg(feature = "virtual_company")]
        get_installed_agents,
        #[cfg(feature = "virtual_company")]
        get_agent_detail,
        #[cfg(feature = "virtual_company")]
        update_agent,
        #[cfg(feature = "virtual_company")]
        get_agent_data_dir,
        #[cfg(feature = "virtual_company")]
        get_available_permissions,
        #[cfg(feature = "virtual_company")]
        agent_db_query,
        #[cfg(feature = "virtual_company")]
        agent_db_execute,
        // 财务管理 Agent (PRD v6.0)
        #[cfg(feature = "virtual_company")]
        create_fa_account,
        #[cfg(feature = "virtual_company")]
        get_fa_accounts,
        #[cfg(feature = "virtual_company")]
        update_fa_account_balance,
        #[cfg(feature = "virtual_company")]
        create_fa_transaction,
        #[cfg(feature = "virtual_company")]
        get_fa_transactions,
        #[cfg(feature = "virtual_company")]
        delete_fa_transaction,
        #[cfg(feature = "virtual_company")]
        create_fa_budget,
        #[cfg(feature = "virtual_company")]
        get_fa_budgets,
        #[cfg(feature = "virtual_company")]
        check_fa_budget_alerts,
        #[cfg(feature = "virtual_company")]
        get_fa_category_summary,
        #[cfg(feature = "virtual_company")]
        get_fa_profit_loss,
        #[cfg(feature = "virtual_company")]
        get_fa_monthly_trend,
        #[cfg(feature = "virtual_company")]
        create_fa_invoice,
        #[cfg(feature = "virtual_company")]
        get_fa_invoices,
        #[cfg(feature = "virtual_company")]
        update_fa_invoice_status,
        // Agent 市场 (PRD v6.0)
        #[cfg(feature = "virtual_company")]
        get_market_agents,
        #[cfg(feature = "virtual_company")]
        get_market_agent_detail,
        #[cfg(feature = "virtual_company")]
        get_market_categories,
        #[cfg(feature = "virtual_company")]
        download_market_agent_package,
        // CEO Agent 主控官 (PRD v6.2)
        pcp_add_entry,
        pcp_update_entry,
        pcp_query_entries,
        pcp_delete_entry,
        ceo_create_task,
        ceo_get_tasks,
        ceo_update_task_status,
        ceo_get_task_stats,
        // CEO Agent 决策确认与个性化学习 (PRD v6.3)
        ceo_add_decision_log,
        ceo_query_decision_logs,
        ceo_get_decision_stats,
        ceo_update_decision_log,
        ceo_get_learning_preferences,
        ceo_update_preference,
        ceo_export_company_config,
        ceo_import_company_config,
        // 安装向导 (PRD v6.1)
        check_installation_status,
        check_disk_space,
        save_setup_config,
        test_ollama_connection,
        test_llamacpp_connection,
        get_default_data_path,
        complete_setup_and_switch,
        // 行业插件管理
        list_installed_plugins,
        get_plugin_manifest,
        download_plugin,
        verify_plugin_package,
        verify_plugin_compatibility,
        install_plugin,
        uninstall_plugin,
        get_plugin_assets_path,
        // 插件数据库迁移 (PRD v10.0)
        execute_plugin_migration,
        get_plugin_migration_history,
        // 插件后端动态加载 (PRD v10.0)
        load_plugin_backend,
        unload_plugin_backend,
        get_loaded_backend_plugins,
        // 插件数据库查询/写入 (PRD v10.0)
        plugin_db_query,
        plugin_db_execute,
        // 插件权限 (PRD v10.0)
        get_plugin_permissions,
        verify_plugin_permission,
        // 插件启用/禁用持久化
        enable_plugin,
        disable_plugin,
        get_plugin_enabled_status,
        get_all_plugin_enabled_statuses,
        // 插件签名验证 (PRD v10.0)
        verify_plugin_signature,
        // 插件更新机制 (PRD v10.0)
        check_plugin_update,
        apply_plugin_update,
        // 商务秘书 Agent BAP (PRD v8.5)
        bap_get_all,
        bap_upsert,
        bap_delete_by_type,
        bap_reset_learning,
        // Agent 个性化配置（昵称/头像）
        get_agent_profile_override,
        list_agent_profile_overrides,
        upsert_agent_profile_override,
        delete_agent_profile_override,
        upload_custom_avatar,
        read_custom_avatar,
        // 云备份命令（Cloud 版）
        get_backup_history_cmd,
        get_backup_status_cmd,
        get_backup_config_cmd,
        trigger_cloud_backup_cmd,
        set_auto_backup_schedule_cmd,
        restore_from_backup_cmd,
        // 餐饮行业插件命令
        catering_create_pos_order,
        catering_get_pos_orders,
        catering_settle_pos_order,
        catering_get_daily_summary,
        catering_get_kds_orders,
        catering_mark_kds_item_done,
        catering_get_menu_items,
        catering_get_tables,
        catering_update_table_status,
        // 美业行业插件命令
        beauty_create_appointment,
        beauty_get_appointments,
        beauty_update_appointment_status,
        beauty_get_employees,
        beauty_create_employee,
        beauty_get_service_categories,
        beauty_get_services,
        beauty_create_service,
        beauty_update_service,
        beauty_delete_service,
        // 宠物行业插件命令
        pet_create_profile,
        pet_get_profiles,
        pet_create_boarding,
        pet_get_boarding_records,
        pet_check_out_boarding,
        pet_get_boarding_rooms,
        pet_get_grooming_records,
        pet_create_grooming_record,
        pet_update_grooming_status,
        pet_get_grooming_services,
        // 便利店行业插件命令
        cv_get_expiry_alerts,
        cv_get_daily_settlement,
        cv_get_restock_suggestions,
        cv_create_pos_order,
        cv_add_expiry_tracking,
        cv_get_expiry_tracking,
        // 酒水批发行业插件命令
        lw_get_credit_accounts,
        lw_get_credit_transactions,
        lw_create_credit_transaction,
        lw_get_batches,
        lw_create_batch,
        lw_get_price_tiers,
        lw_set_price_tier,
        // 手机配件批发行业插件命令
        pa_get_device_models,
        pa_add_device_model,
        pa_get_quotations,
        pa_create_quotation,
        pa_get_price_history,
        // 食材配送行业插件命令
        ff_get_delivery_routes,
        ff_create_delivery_route,
        ff_get_recurring_templates,
        ff_get_freshness_alerts,
        // 汽车配件行业插件命令
        ap_search_by_oe,
        ap_get_vehicle_models,
        ap_add_vehicle_model,
        ap_get_part_categories,
        ap_add_oe_number,
        // 五金行业插件命令
        hw_get_spec_templates,
        hw_set_spec_template,
        hw_calculate_cutting,
        hw_get_credit_accounts,
        hw_get_unit_conversions,
        hw_add_unit_conversion,
        // 装修材料行业插件命令
        dm_get_projects,
        dm_create_project,
        dm_get_bom_templates,
        dm_create_bom_template,
        dm_get_project_materials,
        // 社区团购行业插件命令
        gb_get_groups,
        gb_create_group,
        gb_get_orders,
        gb_parse_jielong_text,
        gb_verify_pickup,
        // NvwaX API 集成命令
        nvwax_search_agents,
        nvwax_get_agent_detail,
        nvwax_get_categories,
        nvwax_search_aiteams,
        nvwax_get_aiteam_detail,
        nvwax_get_industries,
        nvwax_get_plugin_detail,
        nvwax_create_agent,
        nvwax_get_agents,
        nvwax_get_my_agent_detail,
        nvwax_update_agent,
        nvwax_delete_agent,
        nvwax_publish_agent,
        nvwax_unpublish_agent,
        nvwax_create_aiteam,
        nvwax_get_aiteams,
        nvwax_get_my_aiteam_detail,
        nvwax_update_aiteam,
        nvwax_delete_aiteam,
        nvwax_publish_aiteam,
        nvwax_unpublish_aiteam,
        nvwax_search_agents_global,
        nvwax_search_skills,
        nvwax_unified_search,
        nvwax_export_agent,
        nvwax_export_aiteam,
        nvwax_batch_export,
        nvwax_get_export_history,
        nvwax_get_usage_stats,
        nvwax_get_token_balance,
        nvwax_record_consumption,
        nvwax_sync_usage,
        // NvwaX API Key 管理
        get_nvwax_api_key,
        save_nvwax_api_key,
        clear_nvwax_api_key,
        test_nvwax_connection,
        // 系统托盘与桌面通知 (v1.1.0)
        send_desktop_notification,
        update_tray_tooltip,
    ])
}
