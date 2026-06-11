$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host ""
Write-Host "=== 检查 cloud_stores 数据 ===" -ForegroundColor Cyan

$uri = "$SUPABASE_URL/rest/v1/cloud_stores"
$uri = $uri + "?select=subdomain,name,status,plan_type"
try {
    $r = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
    Write-Host $r.Content
} catch {
    Write-Host "[ERR] 请求失败" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "=== 检查 cloud_product_sync 数据 ===" -ForegroundColor Cyan

$uri2 = "$SUPABASE_URL/rest/v1/cloud_product_sync"
$uri2 = $uri2 + "?select=name,price,stock,category"
try {
    $r2 = Invoke-WebRequest -Uri $uri2 -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
    Write-Host $r2.Content
} catch {
    Write-Host "[ERR] 请求失败" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "=== 检查 tenants 数据 ===" -ForegroundColor Cyan

$uri3 = "$SUPABASE_URL/rest/v1/tenants"
$uri3 = $uri3 + "?select=subdomain,name,status,plan"
try {
    $r3 = Invoke-WebRequest -Uri $uri3 -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
    Write-Host $r3.Content
} catch {
    Write-Host "[ERR] 请求失败" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
