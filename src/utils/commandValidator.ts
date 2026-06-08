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
 * 前端已知的所有命令列表
 * 这个列表应该与后端 main.rs 中的 generate_handler! 保持同步
 */
export const FRONTEND_COMMANDS: string[] = [
  // 产品管理
  'create_product', 'get_products', 'get_product_by_id', 'update_product', 'delete_product',
  
  // SPU-SKU
  'create_product_spu', 'get_product_spus', 'get_product_spu_by_id', 'update_product_spu', 'delete_product_spu',
  
  // 品牌和分类
  'create_brand', 'get_brands', 'create_category', 'get_categories',
  
  // 库存管理
  'create_inventory_transaction', 'get_inventory_transactions', 'get_inventory_stats',
  
  // 数据分析
  'get_sales_trend', 'get_product_analytics',
  
  // 采购管理
  'create_supplier', 'get_suppliers', 'create_purchase_order', 'get_purchase_orders', 'get_purchase_order_detail',
  
  // 销售管理
  'create_customer', 'get_customers', 'create_sales_order', 'get_sales_orders', 'get_sales_order_detail',
  'mark_sales_order_shipped', 'mark_sales_order_delivered',
  
  // 退货管理
  'create_purchase_return', 'get_purchase_returns', 'create_sales_return', 'get_sales_returns',
  
  // 财务管理
  'record_payment', 'get_payments', 'record_receipt', 'get_receipts', 'get_ar_ap_summary',
  
  // 财务报表
  'get_profit_loss', 'get_cash_flow', 'get_financial_summary',
  
  // 对账
  'get_reconciliation_list', 'get_reconciliation_detail', 'create_reconciliation',
  'approve_reconciliation', 'reject_reconciliation', 'send_reconciliation_email',
  
  // 用户管理
  'get_current_user', 'update_user_profile', 'change_password',
  'create_user', 'get_users', 'update_user', 'delete_user', 'toggle_user_status',
  
  // 团队管理
  'create_team', 'get_teams', 'get_team_by_id', 'update_team', 'delete_team', 'import_team',
  
  // 审批
  'create_approval', 'get_approvals', 'get_pending_approvals', 'approve_item', 'reject_item',
  
  // 订阅
  'get_subscription', 'create_subscription', 'cancel_subscription', 'get_invoices',
  'get_token_balance', 'record_consumption', 'sync_usage',
  
  // 消息
  'get_contacts', 'create_contact', 'get_messages', 'send_message', 'mark_messages_read', 'get_unread_count',
  
  // 通话记录
  'get_call_records', 'create_call_record', 'delete_call_record',
  
  // 邀请
  'create_invitation', 'get_invitations', 'accept_invitation', 'reject_invitation',
  
  // 设置
  'check_installation_status', 'save_setup_config', 'get_setup_config',
  'check_disk_space', 'install_ollama', 'check_ollama_installed', 'download_llamacpp', 'get_ollama_models',
  
  // 云备份
  'backup_database', 'restore_database', 'get_backup_list', 'delete_backup', 'upload_backup', 'download_backup',
  
  // NvwaX
  'nvwax_search_agents', 'nvwax_get_agent_detail', 'nvwax_get_categories', 'nvwax_search_aiteams',
  'nvwax_get_aiteam_detail', 'nvwax_get_industries', 'nvwax_get_plugin_detail',
  'nvwax_create_agent', 'nvwax_get_agents', 'nvwax_get_my_agent_detail', 'nvwax_update_agent',
  'nvwax_delete_agent', 'nvwax_publish_agent', 'nvwax_unpublish_agent', 'nvwax_create_aiteam',
  'nvwax_get_aiteams', 'nvwax_get_my_aiteam_detail', 'nvwax_update_aiteam', 'nvwax_delete_aiteam',
  'nvwax_publish_aiteam', 'nvwax_unpublish_aiteam', 'nvwax_search_agents_global',
  'nvwax_search_skills', 'nvwax_unified_search', 'nvwax_export_agent', 'nvwax_export_aiteam',
  'nvwax_batch_export', 'nvwax_get_export_history', 'nvwax_get_usage_stats', 'nvwax_get_token_balance',
  'nvwax_record_consumption', 'nvwax_sync_usage', 'get_nvwax_api_key', 'save_nvwax_api_key',
  'clear_nvwax_api_key', 'test_nvwax_connection',
  
  // 插件
  'install_plugin', 'uninstall_plugin', 'enable_plugin', 'disable_plugin', 'get_installed_plugins',
  'get_available_plugins', 'update_plugin', 'get_plugin_config', 'save_plugin_config',
  
  // Agent
  'install_agent', 'uninstall_agent', 'enable_agent', 'disable_agent', 'get_installed_agents',
  'get_available_agents', 'update_agent', 'create_agent_skill', 'delete_agent_skill',
  'get_agent_config', 'save_agent_config',
  
  // 财务 Agent
  'fa_analyze_financial', 'fa_generate_report', 'fa_predict_cash_flow',
  
  // 市场
  'search_market_agents', 'get_market_categories', 'download_market_agent',
  
  // 行业插件
  'catering_get_categories', 'catering_create_menu', 'catering_get_menus',
  'beauty_get_categories', 'beauty_create_service', 'beauty_get_services',
  'pet_get_categories', 'pet_create_record', 'pet_get_records',
  'cv_get_categories', 'cv_create_vehicle', 'cv_get_vehicles',
  'lw_get_categories', 'lw_create_liquor', 'lw_get_liquors',
  'pa_get_categories', 'pa_create_accessory', 'pa_get_accessories',
  'ff_get_categories', 'ff_create_product', 'ff_get_products',
  'ap_get_categories', 'ap_create_part', 'ap_get_parts',
  'hw_get_categories', 'hw_create_tool', 'hw_get_tools',
  'dm_get_categories', 'dm_create_material', 'dm_get_materials',
  'gb_get_groups', 'gb_create_group', 'gb_get_orders', 'gb_parse_jielong_text', 'gb_verify_pickup',
  
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
