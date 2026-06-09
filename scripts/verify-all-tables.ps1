$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host ""
Write-Host "=== 完整数据库表验证 ===" -ForegroundColor Green
Write-Host ""

$allTables = @(
    # Core tables
    "profiles", "api_keys", "api_usage_logs", "external_integrations",
    # Token tables
    "token_balances", "token_packages", "token_sales", "user_token_config", "token_transactions", "token_rules",
    # Plugin tables
    "industry_plugins", "plugin_versions", "plugin_installs", "plugin_reviews", "plugin_categories",
    # Tenant tables
    "tenants", "qr_login_sessions", "license_keys", "custom_domains",
    # Cloud Store tables (new)
    "cloud_stores", "cloud_store_themes", "cloud_sync_log", "cloud_orders", "cloud_product_sync",
    # Customer Service tables
    "customer_service_chat_logs", "customer_service_settings", "customer_service_knowledge_base", 
    "customer_service_transfer_queue", "customer_service_subscribers", "customer_service_default_avatars",
    # Other
    "inventory_transactions"
)

$okCount = 0
$missCount = 0

foreach ($t in $allTables) {
    $uri = "$SUPABASE_URL/rest/v1/$t" + "?select=count&limit=1"
    try {
        $r = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] $t" -ForegroundColor Green
        $okCount++
    } catch {
        Write-Host "[MISS] $t" -ForegroundColor Red
        $missCount++
    }
}

Write-Host ""
Write-Host "=== 统计 ===" -ForegroundColor Cyan
Write-Host "存在: $okCount" -ForegroundColor Green
Write-Host "缺失: $missCount" -ForegroundColor $(if ($missCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($missCount -eq 0) {
    Write-Host "所有表已创建完成！" -ForegroundColor Green
}
