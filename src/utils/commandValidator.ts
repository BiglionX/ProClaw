/**
 * 命令验证工具
 * 
 * 用于验证前端调用的命令是否在 Rust 后端注册
 */

import { invoke } from '@tauri-apps/api/core';

interface CommandInfo {
  name: string;
  module: string;
  description: string;
}

interface CommandStats {
  command: string;
  total_calls: number;
  avg_duration_ms: number;
  errors: number;
}

interface VerificationResult {
  valid: boolean;
  missingCommands: string[];
  orphanedCommands: string[];
}

/**
 * 从后端获取所有注册的 Tauri 命令
 */
export async function getRegisteredCommands(): Promise<CommandInfo[]> {
  try {
    const result = await invoke<{ data: CommandStats[] }>('get_command_stats', {
      options: { type: 'all', limit: 1000 }
    });
    
    // 从统计数据中提取命令名
    return result.data.map(stats => ({
      name: stats.command,
      module: 'unknown',
      description: ''
    }));
  } catch (error) {
    console.error('[CommandValidator] Failed to get registered commands:', error);
    return [];
  }
}

/**
 * 前端已知的命令列表（与 invoke_handler.rs 保持同步的子集）
 * 注意：get_command_stats 仅统计已调用过的命令，验证结果为参考性质
 */
export const FRONTEND_COMMANDS: string[] = [
  // 产品管理
  'create_product', 'get_products', 'filter_products', 'get_product_by_id', 'update_product', 'delete_product',
  'set_product_gallery',
  'create_product_spu', 'get_product_spus', 'get_product_spu_by_id', 'update_product_spu', 'delete_product_spu',
  'get_library_mode', 'migrate_to_ecommerce_mode', 'downgrade_to_simple_mode',
  'seed_demo_products', 'set_spu_main_image', 'mark_store_as_demo',
  'create_brand', 'get_brands', 'create_category', 'get_categories',

  // 库存与校准
  'create_inventory_transaction', 'get_inventory_transactions', 'get_inventory_stats',
  'calibrate_stock', 'get_stock_confidence', 'get_stock_confidence_batch', 'get_calibration_history',
  'force_clear_negative', 'supplement_inbound', 'set_allow_negative_stock',
  'check_negative_aging', 'get_pending_aging_tasks', 'compute_reminders',
  'mark_reminder_dismissed', 'reset_reminder_suppression', 'get_low_confidence_products_cmd',
  'should_trigger_post_sales_calibration_cmd', 'should_trigger_post_purchase_calibration_cmd',

  // 数据分析 / 采购 / 销售 / 退货 / 财务
  'get_sales_trend', 'get_product_analytics',
  'create_supplier', 'get_suppliers', 'create_purchase_order', 'get_purchase_orders', 'get_purchase_order_detail',
  'update_purchase_order_cmd', 'delete_purchase_order_cmd', 'receive_purchase_order_cmd',
  'confirm_purchase_order_cmd', 'cancel_purchase_order_cmd',
  'create_customer', 'get_customers', 'create_sales_order', 'get_sales_orders',
  'update_sales_order_cmd', 'delete_sales_order_cmd', 'submit_sales_order_cmd', 'cancel_sales_order_cmd',
  'mark_sales_shipped_cmd', 'mark_sales_delivered_cmd',
  'create_purchase_return', 'get_purchase_returns', 'get_purchase_return_detail',
  'confirm_purchase_return', 'cancel_purchase_return', 'update_purchase_return',
  'create_sales_return', 'get_sales_returns', 'get_sales_return_detail',
  'confirm_sales_return', 'cancel_sales_return',
  'record_payment_cmd', 'record_receipt_cmd', 'get_payments_cmd', 'get_ar_ap_summary_cmd', 'get_ar_ap_detail_cmd',
  'get_profit_loss_report', 'get_cash_flow_report', 'get_financial_summary',
  'generate_statement', 'send_statement_email', 'create_reconciliation_rule', 'update_reconciliation_rule',
  'delete_reconciliation_rule', 'get_reconciliation_rules', 'set_smtp_config', 'get_smtp_config',
  'check_reconciliation_rules',

  // 用户 / 团队 / 审批
  'create_user_cmd', 'get_users_cmd', 'get_user_by_id_cmd', 'update_user_cmd', 'delete_user_cmd',
  'assign_user_role_cmd', 'change_user_password_cmd', 'get_roles_cmd', 'get_current_user_cmd', 'get_ws_session_cmd',
  'create_approval_cmd', 'get_approvals_cmd', 'approve_request_cmd', 'reject_request_cmd',
  'create_team', 'get_teams', 'get_team_by_id', 'update_team', 'delete_team', 'import_team',

  // 订阅与 Token
  'get_plans_cmd', 'get_my_subscription_cmd', 'subscribe_plan_cmd', 'cancel_subscription_cmd',
  'get_token_summary_cmd', 'get_token_usage_cmd', 'get_invoices_cmd', 'record_token_cmd',
  'get_token_pricing_cmd', 'get_token_balance_cmd', 'estimate_token_cost_cmd',

  // 消息 / 通话 / 邀请
  'get_contacts', 'add_contact', 'get_messages', 'send_message', 'mark_message_read',
  'mark_conversation_read', 'get_recent_contacts', 'get_unread_count',
  'get_call_records_cmd', 'create_call_record_cmd', 'update_call_record_cmd', 'check_user_online_cmd',
  'create_invitation_cmd', 'accept_invitation_cmd', 'revoke_invitation_cmd', 'get_invitations_cmd',
  'create_employee_invitation_cmd', 'accept_employee_invitation_cmd',

  // 设备与用户中心
  'get_devices_cmd', 'revoke_device_cmd', 'get_pairing_code_cmd',

  // 运营中心（本地 SQLite）
  'get_operations_overview_cmd', 'get_operations_usage_cmd',
  'get_operations_content_queue_cmd', 'update_operations_content_status_cmd',
  'get_operations_seo_cmd', 'get_operations_social_accounts_cmd', 'get_operations_alerts_cmd',
  'get_operations_teams_cmd',

  // 外贸柜
  'track_foreign_logistics', 'list_customs_declarations', 'search_hs_code', 'list_foreign_translations',

  // 餐饮 / 美业 / 宠物
  'catering_create_pos_order', 'catering_get_pos_orders', 'catering_settle_pos_order',
  'catering_get_daily_summary', 'catering_get_kds_orders', 'catering_mark_kds_item_done',
  'catering_get_menu_items', 'catering_get_tables', 'catering_update_table_status',
  'beauty_create_appointment', 'beauty_get_appointments', 'beauty_update_appointment_status',
  'beauty_get_employees', 'beauty_create_employee',
  'beauty_get_service_categories', 'beauty_get_services',
  'beauty_create_service', 'beauty_update_service', 'beauty_delete_service',
  'pet_create_profile', 'pet_get_profiles', 'pet_create_boarding', 'pet_get_boarding_records', 'pet_check_out_boarding',
  'pet_get_boarding_rooms', 'pet_get_grooming_records', 'pet_create_grooming_record', 'pet_update_grooming_status',
  'pet_get_grooming_services',

  // 便利店
  'cv_get_expiry_alerts', 'cv_get_daily_settlement', 'cv_get_restock_suggestions',
  'cv_create_pos_order', 'cv_add_expiry_tracking', 'cv_get_expiry_tracking',

  // 酒水批发
  'lw_get_credit_accounts', 'lw_get_credit_transactions', 'lw_create_credit_transaction',
  'lw_get_batches', 'lw_create_batch', 'lw_get_price_tiers', 'lw_set_price_tier',

  // 手机配件
  'pa_get_device_models', 'pa_add_device_model', 'pa_get_quotations', 'pa_create_quotation', 'pa_get_price_history',

  // 食材配送
  'ff_get_delivery_routes', 'ff_create_delivery_route', 'ff_get_recurring_templates', 'ff_get_freshness_alerts',

  // 汽车配件
  'ap_search_by_oe', 'ap_get_vehicle_models', 'ap_add_vehicle_model', 'ap_get_part_categories', 'ap_add_oe_number',

  // 五金
  'hw_get_spec_templates', 'hw_set_spec_template', 'hw_calculate_cutting',
  'hw_get_credit_accounts', 'hw_get_unit_conversions', 'hw_add_unit_conversion',

  // 装修材料
  'dm_get_projects', 'dm_create_project', 'dm_get_bom_templates', 'dm_create_bom_template', 'dm_get_project_materials',

  // 社区团购
  'gb_get_groups', 'gb_create_group', 'gb_get_orders', 'gb_parse_jielong_text', 'gb_verify_pickup',

  // 销售 / 库存补充
  'get_sales_order_detail', 'get_stock_confidence_batch', 'set_allow_negative_stock', 'reset_reminder_suppression',

  // 插件管理
  'list_installed_plugins', 'get_plugin_manifest', 'download_plugin', 'verify_plugin_package', 'verify_plugin_signature',
  'install_plugin', 'uninstall_plugin', 'enable_plugin', 'disable_plugin',
  'get_plugin_enabled_status', 'get_all_plugin_enabled_statuses', 'check_plugin_update', 'apply_plugin_update',
  'verify_plugin_permission', 'plugin_db_query', 'plugin_db_execute',

  // 安装向导
  'check_installation_status', 'check_disk_space', 'save_setup_config', 'test_ollama_connection',
  'test_llamacpp_connection', 'get_default_data_path', 'complete_setup_and_switch',

  // NvwaX / 托盘 / Agent 配置
  'get_nvwax_api_key', 'save_nvwax_api_key', 'clear_nvwax_api_key', 'test_nvwax_connection',
  'send_desktop_notification', 'update_tray_tooltip',
  'delete_agent_profile_override', 'upload_custom_avatar', 'read_custom_avatar',

  // CEO / 商务秘书
  'ceo_update_task_status', 'update_preference', 'bap_get_all', 'bap_upsert', 'bap_delete_by_type', 'bap_reset_learning',

  // 云备份
  'get_backup_history_cmd', 'get_backup_status_cmd', 'get_backup_config_cmd',
  'trigger_cloud_backup_cmd', 'set_auto_backup_schedule_cmd', 'restore_from_backup_cmd',

  // 通用
  'upload_image', 'get_command_stats', 'reset_command_stats',
  'get_database_stats', 'get_pending_sync_records', 'mark_as_synced', 'start_sync', 'get_sync_status',
];

/**
 * 验证前端命令是否在注册表中
 */
export async function verifyCommands(): Promise<VerificationResult> {
  const registeredCommands = await getRegisteredCommands();
  const registeredSet = new Set(registeredCommands.map(c => c.name));
  
  const missingCommands: string[] = [];
  const orphanedCommands: string[] = [];
  
  // 检查前端命令是否在注册表中
  for (const cmd of FRONTEND_COMMANDS) {
    if (!registeredSet.has(cmd)) {
      missingCommands.push(cmd);
    }
  }
  
  // 检查注册表中的命令是否在 frontendCommands 中
  const frontendSet = new Set(FRONTEND_COMMANDS);
  for (const cmd of registeredCommands) {
    if (!frontendSet.has(cmd.name)) {
      orphanedCommands.push(cmd.name);
    }
  }
  
  return {
    valid: missingCommands.length === 0 && orphanedCommands.length === 0,
    missingCommands,
    orphanedCommands
  };
}

/**
 * 打印验证结果
 */
export function printVerificationResult(result: VerificationResult): void {
  console.log('='.repeat(60));
  console.log('命令验证结果');
  console.log('='.repeat(60));
  
  if (result.valid) {
    console.log('✅ 所有命令验证通过');
  } else {
    if (result.missingCommands.length > 0) {
      console.log('\n❌ 前端调用但后端未注册的命令:');
      for (const cmd of result.missingCommands) {
        console.log(`   - ${cmd}`);
      }
    }
    
    if (result.orphanedCommands.length > 0) {
      console.log('\n⚠️ 后端注册但前端未使用的命令:');
      for (const cmd of result.orphanedCommands) {
        console.log(`   - ${cmd}`);
      }
    }
  }
  
  console.log('='.repeat(60));
}

/**
 * 开发环境命令验证 Hook
 * 在开发模式下自动运行命令验证
 */
export function useCommandValidator(): void {
  if (import.meta.env.DEV) {
    // 延迟执行，避免阻塞应用启动
    setTimeout(async () => {
      try {
        const result = await verifyCommands();
        printVerificationResult(result);
      } catch (error) {
        console.error('[CommandValidator] Verification failed:', error);
      }
    }, 3000);
  }
}
