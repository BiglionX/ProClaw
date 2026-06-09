$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host ""
Write-Host "=== Full Database Table Verification ===" -ForegroundColor Green
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
    # Product/Order tables
    "products", "orders", "inventory_transactions",
    # Customer Service tables
    "customer_service_chat_logs", "customer_service_settings", "customer_service_knowledge_base", 
    "customer_service_transfer_queue", "customer_service_subscribers", "customer_service_default_avatars"
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
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Found: $okCount" -ForegroundColor Green
Write-Host "Missing: $missCount" -ForegroundColor $(if ($missCount -gt 0) { "Red" } else { "Green" })
Write-Host ""
