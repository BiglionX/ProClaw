$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "=== 查询所有租户 ===" -ForegroundColor Cyan

$uri = "$SUPABASE_URL/rest/v1/tenants?select=*&limit=10"
$r = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing
Write-Host $r.Content

Write-Host ""
Write-Host "=== 查询 profiles (测试账号) ===" -ForegroundColor Cyan

$uri2 = "$SUPABASE_URL/rest/v1/profiles?select=*&limit=5"
$r2 = Invoke-WebRequest -Uri $uri2 -Method Get -Headers $headers -UseBasicParsing
Write-Host $r2.Content
