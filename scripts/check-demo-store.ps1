$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host ""
Write-Host "=== 查询 cloud_stores (demo) ===" -ForegroundColor Cyan
$uri = "$SUPABASE_URL/rest/v1/cloud_stores?subdomain=eq.demo"
$r = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing
Write-Host $r.Content

Write-Host ""
Write-Host "=== 查询 tenants (demo) ===" -ForegroundColor Cyan
$uri2 = "$SUPABASE_URL/rest/v1/tenants?subdomain=eq.demo"
$r2 = Invoke-WebRequest -Uri $uri2 -Method Get -Headers $headers -UseBasicParsing
Write-Host $r2.Content
