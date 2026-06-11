$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "=== 查询所有用户 ===" -ForegroundColor Cyan

$uri = "$SUPABASE_URL/rest/v1/profiles?select=*&limit=10"
$r = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing
Write-Host $r.Content
