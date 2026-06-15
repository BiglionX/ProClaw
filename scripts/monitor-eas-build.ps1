# Poll EAS build status until finished or errored
# Usage: powershell -ExecutionPolicy Bypass -File scripts/monitor-eas-build.ps1 -BuildId <id>
param(
    [string]$BuildId = "1340c8b5-2da3-499f-99fc-078ccd2b82a3",
    [int]$MaxPolls = 60,
    [int]$IntervalSec = 30
)

$ErrorActionPreference = 'Continue'
Set-Location d:/BigLionX/ProClaw/mobile

Write-Host "=== Monitor EAS Build $BuildId ==="
Write-Host "Start polling at $((Get-Date).ToString('o'))"

for ($i = 1; $i -le $MaxPolls; $i++) {
    $out = npx eas build:view $BuildId --json 2>&1 | Out-String
    if ($out -match '"status":\s*"([^"]+)"') {
        $status = $matches[1]
    } else {
        $status = "UNKNOWN"
    }
    Write-Host "[poll $i/$MaxPolls] status=$status  ($((Get-Date).ToString('HH:mm:ss')))"
    if ($status -in @('FINISHED','ERRORED','CANCELED')) {
        Write-Host "=== Build reached terminal state ==="
        break
    }
    Start-Sleep -Seconds $IntervalSec
}

Write-Host "=== Final build JSON ==="
npx eas build:view $BuildId --json 2>&1 | Out-String