$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$ANON_KEY = "sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "=== Verify Tables ===" -ForegroundColor Cyan

$tables = @(
    "tenants",
    "customer_service_chat_logs",
    "customer_service_settings",
    "customer_service_knowledge_base",
    "customer_service_transfer_queue"
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
Write-Host "Done." -ForegroundColor Green
