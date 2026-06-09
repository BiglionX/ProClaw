$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "=== 检查云商城相关表 ===" -ForegroundColor Cyan

$tables = @(
    "cloud_stores",
    "store_themes",
    "store_orders",
    "store_products"
)

foreach ($t in $tables) {
    $uri = "$SUPABASE_URL/rest/v1/$t" + "?select=count&limit=1"
    try {
        $r = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] $t" -ForegroundColor Green
    } catch {
        Write-Host "[MISS] $t" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== 查询 cloud_stores 数据 ===" -ForegroundColor Cyan

$uri2 = "$SUPABASE_URL/rest/v1/cloud_stores?select=*&limit=5"
$r2 = Invoke-WebRequest -Uri $uri2 -Method Get -Headers $headers -UseBasicParsing
Write-Host $r2.Content
