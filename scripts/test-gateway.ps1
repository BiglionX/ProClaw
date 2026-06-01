$body = @{
  model = "proclaw-gpt-4"
  messages = @(
    @{ role = "user"; content = "回复OK即可" }
  )
  max_tokens = 10
} | ConvertTo-Json -Compress

try {
  $r = Invoke-RestMethod -Uri "https://ai.proclaw.cc/api/v1/chat/completions" `
    -Method POST -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer proclaw-demo" } `
    -Body $body -TimeoutSec 30

  Write-Host "=== 成功 ===" -ForegroundColor Green
  Write-Host "HTTP Status: 200"
  Write-Host "回复: $($r.choices[0].message.content)"
  Write-Host "模型: $($r.model)"
  Write-Host "路由模型: $($r.proclaw_meta.routed_model)"
  Write-Host "消耗PT: $($r.proclaw_meta.cost_pt)"
  Write-Host "延迟ms: $($r.proclaw_meta.latency_ms)"
} catch {
  Write-Host "=== 失败 ===" -ForegroundColor Red
  Write-Host "错误类型: $($_.Exception.GetType().FullName)"
  Write-Host "错误信息: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
    Write-Host "HTTP Status: $statusCode"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "响应: $($reader.ReadToEnd())"
  }
}
