$SUPABASE_URL = "https://ourolpgrntjrtapgaztt.supabase.co"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cm9scGdybnRqcnRhcGdhenR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4Mzg2NjAwMCwiZXhwIjoxOTk5NDQyMDAwfQ.UJ9tUXeTz1U6gJrJ1bBwV-9A48Y5Kx1dJ1pWqLlvF6I"

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
}

Write-Host ""
Write-Host "=== cloud_stores ===" -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/cloud_stores" -Method Get -Headers $headers -UseBasicParsing
Write-Host $r.Content

Write-Host ""
Write-Host "=== tenants ===" -ForegroundColor Cyan
$r2 = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/tenants" -Method Get -Headers $headers -UseBasicParsing
Write-Host $r2.Content

Write-Host ""
Write-Host "=== cloud_product_sync ===" -ForegroundColor Cyan
$r3 = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/cloud_product_sync" -Method Get -Headers $headers -UseBasicParsing
Write-Host $r3.Content
