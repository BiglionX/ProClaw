# ProClaw - 检查 Supabase 数据库中所有表是否已创建
# Windows PowerShell 兼容版本

$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
    "Content-Type" = "application/json"
}

Write-Host "=== 逐个检查 Supabase 表是否存在 ===" -ForegroundColor Cyan
Write-Host ""

$expectedTables = @(
    "profiles", "api_keys", "api_usage_logs", "external_integrations",
    "token_balances", "token_packages", "token_sales", "user_token_config",
    "industry_plugins", "plugin_versions", "plugin_installs", "plugin_reviews", "plugin_categories",
    "inventory_transactions", "products", "orders"
)

$foundCount = 0
$missingCount = 0

foreach ($table in $expectedTables) {
    try {
        $uri = "$SUPABASE_URL/rest/v1/$($table)?select=count&limit=0"
        $response = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
        $statusCode = [int]$response.StatusCode
        if ($statusCode -eq 200) {
            Write-Host "  [OK] $table" -ForegroundColor Green
            $foundCount++
        } else {
            Write-Host "  [?] $table (HTTP $statusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        # Extract status code from exception
        if ($_.Exception -and $_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        } else {
            $statusCode = "?"
        }
        
        if ($statusCode -eq 404) {
            Write-Host "  [MISS] $table" -ForegroundColor Red
            $missingCount++
        } elseif ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host "  [LOCKED] $table (无访问权限)" -ForegroundColor Yellow
            $foundCount++
        } else {
            Write-Host "  [ERR] $table (HTTP $statusCode)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== 统计 ===" -ForegroundColor Cyan
Write-Host "  已存在: $foundCount" -ForegroundColor Green
if ($missingCount -gt 0) {
    Write-Host "  缺失: $missingCount" -ForegroundColor Red
}
Write-Host "==========================" -ForegroundColor Cyan
