$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host ""
Write-Host "=== 检查 cloud_stores ===" -ForegroundColor Cyan

$uri = "$SUPABASE_URL/rest/v1/cloud_stores"
$r = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing
Write-Host $r.Content

Write-Host ""
Write-Host "=== 检查 cloud_product_sync ===" -ForegroundColor Cyan

$uri2 = "$SUPABASE_URL/rest/v1/cloud_product_sync"
$r2 = Invoke-WebRequest -Uri $uri2 -Method Get -Headers $headers -UseBasicParsing
Write-Host $r2.Content

Write-Host ""
Write-Host "=== 检查 tenants ===" -ForegroundColor Cyan

$uri3 = "$SUPABASE_URL/rest/v1/tenants"
$r3 = Invoke-WebRequest -Uri $uri3 -Method Get -Headers $headers -UseBasicParsing
Write-Host $r3.Content
