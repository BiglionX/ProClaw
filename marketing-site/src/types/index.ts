// User & Profile Types
export interface User {
  id: string;
  email?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

// API Key Types
export interface ApiKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'google' | 'ollama' | 'custom';
  key_name: string;
  encrypted_key: string;
  base_url?: string;
  model_list?: string[];
  is_active: boolean;
  usage_limit?: number;
  used_count: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyFormData {
  provider: string;
  key_name: string;
  api_key: string;
  base_url?: string;
  model_list?: string[];
  usage_limit?: number;
}

// Token Types
export interface TokenBalance {
  user_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  updated_at: string;
}

export interface TokenSale {
  id: string;
  user_id: string;
  amount: number;
  price: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  payment_method?: 'alipay' | 'wechat' | 'stripe' | 'paypal';
  transaction_id?: string;
  metadata?: any;
  created_at: string;
  completed_at?: string;
  refunded_at?: string;
}

export interface TokenPackage {
  id: string;
  name: string;
  description?: string;
  token_amount: number;
  price: number;
  currency: string;
  discount_percentage: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// External Integration Types
export interface ExternalIntegration {
  id: string;
  user_id: string;
  name: string;
  type: 'webhook' | 'api_endpoint' | 'oauth';
  endpoint_url: string;
  auth_type?: 'bearer' | 'api_key' | 'oauth2' | 'none';
  credentials?: string;
  headers?: any;
  is_active: boolean;
  is_approved: boolean;
  last_tested_at?: string;
  test_status?: 'success' | 'failed' | 'pending' | 'never';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// API Usage Log Types
export interface ApiUsageLog {
  id: string;
  user_id: string;
  api_key_id?: string;
  endpoint?: string;
  model?: string;
  tokens_used: number;
  cost: number;
  response_time_ms?: number;
  status_code?: number;
  error_message?: string;
  ip_address?: string;
  created_at: string;
}

// Stats Types
export interface UserStats {
  total_api_calls: number;
  total_tokens_used: number;
  total_cost: number;
  active_api_keys: number;
  token_balance?: number;
}

export interface PlatformStats {
  total_users: number;
  total_admins: number;
  total_api_calls: number;
  total_tokens_sold: number;
  total_revenue: number;
  active_api_keys: number;
  today_new_users: number;
  today_api_calls: number;
}

// Session Type
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: User;
}

// ============================================================
// Token 计费系统类型 (PRD v8.0)
// ============================================================

/** Token 定价规则 */
export interface TokenPricingRule {
  id: string;
  resource_type: string;
  action_name: string;
  description: string | null;
  pt_cost: number;
  unit: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Token 余额摘要 */
export interface TokenBalanceSummary {
  balance: number;
  today_used: number;
  daily_avg_30d: number;
  estimated_days: number;
}

/** Token 消费明细结果 */
export interface TokenConsumptionResult {
  items: {
    id: string;
    resource_type: string;
    tokens_used: number;
    endpoint: string | null;
    created_at: string;
  }[];
  total: number;
  limit: number;
  offset: number;
}

/** 用户 Token 配置 */
export interface UserTokenConfig {
  user_id: string;
  low_balance_threshold: number;
  daily_limit: number;
  auto_recharge_package_id: string | null;
  auto_recharge_enabled: boolean;
  notification_email: boolean;
  notification_wechat: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// 行业插件系统类型 (PRD v6.0 - 插件化行业版)
// ============================================================

/** 行业插件状态 */
export type PluginStatus = 'draft' | 'review' | 'published' | 'deprecated';

/** 插件功能配置 */
export interface PluginFeatureConfig {
  modules: string[];
  dashboards: string[];
  reports: string[];
}

/** 插件导航项 */
export interface PluginNavItem {
  text: string;
  icon: string;
  path: string;
  group?: string;
}

/** 第三方插件开发者信息 */
export interface PluginDeveloper {
  name: string;
  website?: string;
  email?: string;
  publicKey?: string;
}

/** 工业插件 Manifest
 * PRD v10.0 规范扩展：所有新增字段均为可选以保持向后兼容。 */
export interface IndustryPluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  compatibleAppVersion: string;
  /** 最低 ProClaw 版本要求（PRD v10.0 新字段） */
  minProclawVersion?: string;
  /** 插件作者（PRD v10.0 新字段） */
  author?: string;
  features: PluginFeatureConfig;
  navigation: {
    add: PluginNavItem[];
    remove: string[];
    reorder?: string[];
  };
  dataModels?: {
    tables: string[];
    migrations: string[];
  };
  ui: {
    theme?: Record<string, string>;
    onboarding?: string;
    quickActions?: Array<{
      label: string;
      icon: string;
      action: string;
      color: string;
    }>;
  };
  assets: {
    path: string;
    files: string[];
  };
  /** 开发者信息（第三方插件用） */
  developer?: PluginDeveloper;
  /** 插件分类标签：内置 / 官方 / 第三方 */
  category?: 'builtin' | 'official' | 'third-party';
  /** 标签列表 */
  tags?: string[];
  /** 权限声明列表（PRD v10.0 新字段）
   * 示例：["database:create_table", "database:read:products", "printer:write"] */
  permissions?: string[];
  /** 入口点配置（PRD v10.0 新字段） */
  entryPoints?: {
    /** 前端入口文件 */
    frontend?: string;
    /** 后端动态库路径 */
    backend?: string;
    /** 数据库迁移脚本路径 */
    migrations?: string;
  };
  /** 插件配置界面 JSON Schema（PRD v10.0 新字段） */
  settingsSchema?: Record<string, any>;
}

/** 行业插件记录（对应 industry_plugins 表） */
export interface IndustryPlugin {
  id: string;
  name: string;
  version: string;
  status: PluginStatus;
  manifest_json: string;
  package_url: string | null;
  package_hash: string | null;
  package_size: number | null;
  min_app_version: string | null;
  icon: string | null;
  description: string | null;
  downloads: number;
  active_installs: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/** 插件版本记录（对应 plugin_versions 表） */
export interface PluginVersion {
  id: string;
  plugin_id: string;
  version: string;
  changelog: string | null;
  package_url: string;
  package_hash: string;
  package_size: number;
  min_app_version: string | null;
  is_force_update: boolean;
  rollout_percentage: number;
  created_at: string;
}

/** 插件安装记录（对应 plugin_installs 表） */
export interface PluginInstall {
  id: string;
  plugin_id: string;
  version: string | null;
  app_version: string | null;
  os: string | null;
  install_id: string | null;
  action: 'install' | 'update' | 'uninstall';
  created_at: string;
}

/** 插件评分/评价 */
export interface PluginReview {
  id: string;
  plugin_id: string;
  user_id: string;
  rating: number; // 1-5
  title: string | null;
  content: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  /** 联表查询用 */
  user_name?: string;
  user_avatar?: string;
}

/** 插件评分汇总 */
export interface PluginRatingSummary {
  plugin_id: string;
  average: number;
  count: number;
  distribution: { [star: number]: number }; // 1-5 ok
}

/** 插件统计数据 */
export interface PluginStats {
  plugin_id: string;
  total_downloads: number;
  active_installs: number;
  total_reviews: number;
  average_rating: number;
  recent_downloads_30d: number;
}
