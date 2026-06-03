<#
.SYNOPSIS
    ProClaw industry plugin manifest validation tool
.DESCRIPTION
    Validates plugin manifest.json, permissions, and package structure per PRD v10.0 spec
.PARAMETER PluginDir
    Plugin directory path, must contain manifest.json
.PARAMETER PackageFile
    Packaged .proclaw-plugin file path (optional)
.EXAMPLE
    .\validate-plugin.ps1 -PluginDir ../src/plugins/catering
    .\validate-plugin.ps1 -PackageFile ./dist/catering-1.0.0.proclaw-plugin
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$PluginDir,

    [Parameter(Mandatory = $false)]
    [string]$PackageFile
)

$errors = @()
$warnings = @()

function Write-ErrorMsg {
    param([string]$Msg)
    $errors += $Msg
    Write-Host "  [ERROR] $Msg" -ForegroundColor Red
}

function Write-WarningMsg {
    param([string]$Msg)
    $warnings += $Msg
    Write-Host "  [WARN] $Msg" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Msg)
    Write-Host "  [OK] $Msg" -ForegroundColor Green
}

# Validate plugin directory
if ($PluginDir) {
    Write-Host "`n[Validate] Plugin Dir: $PluginDir" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $manifestPath = Join-Path $PluginDir "manifest.json"
    if (-not (Test-Path $manifestPath)) {
        Write-ErrorMsg "manifest.json not found"
        exit 1
    }

    $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

    # 1. Required fields
    Write-Host "`n[1/6] Required Fields..." -ForegroundColor Yellow
    $requiredFields = @('id', 'name', 'version', 'description', 'icon')
    foreach ($field in $requiredFields) {
        if (-not $manifest.$field) {
            Write-ErrorMsg "Missing required field: $field"
        } else {
            Write-Success "Field $field = $($manifest.$field)"
        }
    }

    # 2. Version format check
    Write-Host "`n[2/6] Version Format..." -ForegroundColor Yellow
    if ($manifest.version -notmatch '^\d+\.\d+\.\d+$') {
        Write-WarningMsg "Version format should be x.y.z, current: $($manifest.version)"
    } else {
        Write-Success "Version format OK: $($manifest.version)"
    }
    if ($manifest.min_proclaw_version -and ($manifest.min_proclaw_version -notmatch '^\d+\.\d+\.\d+$')) {
        Write-WarningMsg "min_proclaw_version format should be x.y.z, current: $($manifest.min_proclaw_version)"
    }

    # 3. Permissions check
    Write-Host "`n[3/6] Permissions..." -ForegroundColor Yellow
    $validPermissions = @(
        'database:create_table', 'database:read:*', 'database:write:*',
        'menu:add', 'printer:write', 'notification:send',
        'filesystem:read', 'filesystem:write', 'network:http'
    )
    if ($manifest.permissions) {
        foreach ($perm in $manifest.permissions) {
            if ($validPermissions -contains $perm) {
                Write-Success "Permission: $perm"
            } else {
                Write-WarningMsg "Unregistered permission: $perm (will be treated as medium risk)"
            }
        }
    } else {
        Write-WarningMsg "No permissions declared (plugin runs in no-permission mode)"
    }

    # 4. Entry Points check
    Write-Host "`n[4/6] Entry Points..." -ForegroundColor Yellow
    if ($manifest.entry_points) {
        if ($manifest.entry_points.frontend) {
            $fePath = Join-Path $PluginDir $manifest.entry_points.frontend
            if (Test-Path $fePath) {
                Write-Success "Frontend entry: $($manifest.entry_points.frontend)"
            } else {
                Write-WarningMsg "Frontend entry not found: $($manifest.entry_points.frontend)"
            }
        }
        if ($manifest.entry_points.backend) {
            $bePath = Join-Path $PluginDir $manifest.entry_points.backend
            if (Test-Path $bePath) {
                Write-Success "Backend entry: $($manifest.entry_points.backend)"
            } else {
                Write-WarningMsg "Backend entry not found: $($manifest.entry_points.backend)"
            }
        }
        if ($manifest.entry_points.migrations) {
            $mgPath = Join-Path $PluginDir $manifest.entry_points.migrations
            if (Test-Path $mgPath) {
                Write-Success "Migration: $($manifest.entry_points.migrations)"
            } else {
                Write-WarningMsg "Migration not found: $($manifest.entry_points.migrations)"
            }
        }
    } else {
        Write-WarningMsg "No entry_points configured"
    }

    # 5. Settings Schema check
    Write-Host "`n[5/6] Settings Schema..." -ForegroundColor Yellow
    if ($manifest.settings_schema) {
        if ($manifest.settings_schema.type -eq 'object' -and $manifest.settings_schema.properties) {
            $propCount = ($manifest.settings_schema.properties | Get-Member -MemberType NoteProperty).Count
            Write-Success "Settings count: $propCount"
        } else {
            Write-WarningMsg "settings_schema should have type=object and properties"
        }
    } else {
        Write-Success "No settings UI (optional)"
    }

    # 6. Navigation check
    Write-Host "`n[6/6] Navigation Items..." -ForegroundColor Yellow
    if ($manifest.navigation -and $manifest.navigation.add) {
        foreach ($item in $manifest.navigation.add) {
            if ($item.path -notmatch '^/') {
                Write-WarningMsg "Nav path '$($item.path)' should start with /"
            } else {
                Write-Success "Nav: $($item.text) -> $($item.path)"
            }
        }
    }
}

# Validate packaged file
if ($PackageFile) {
    Write-Host "`n[Validate] Package: $PackageFile" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    if (-not (Test-Path $PackageFile)) {
        Write-ErrorMsg "Package file not found"
        exit 1
    }

    # Check extension
    if ($PackageFile -notmatch '\.proclaw-plugin$') {
        Write-WarningMsg "Extension should be .proclaw-plugin, current: $([System.IO.Path]::GetExtension($PackageFile))"
    }

    # Compute SHA256
    $stream = [System.IO.File]::OpenRead($PackageFile)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha256.ComputeHash($stream)
    $stream.Close()
    $hashHex = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
    $fileSize = (Get-Item $PackageFile).Length

    Write-Success "File size: $fileSize bytes"
    Write-Success "SHA256: $hashHex"

    # Check signature
    $sigFile = $PackageFile -replace '\.proclaw-plugin$', '.sig'
    if (Test-Path $sigFile) {
        $sigInfo = Get-Content $sigFile -Raw | ConvertFrom-Json
        Write-Success "Signature file: $sigFile"
        Write-Host "    Algorithm: $($sigInfo.algorithm)" -ForegroundColor Gray
        Write-Host "    Timestamp: $($sigInfo.timestamp)" -ForegroundColor Gray
    } else {
        Write-WarningMsg "No .sig signature file found (unsigned)"
    }

    # Read manifest inside package
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($PackageFile)
        $manifestEntry = $zip.Entries | Where-Object { $_.Name -eq 'manifest.json' } | Select-Object -First 1
        if ($manifestEntry) {
            $reader = New-Object System.IO.StreamReader($manifestEntry.Open())
            $manifestContent = $reader.ReadToEnd()
            $reader.Close()
            Write-Success "manifest.json readable inside package"
        } else {
            Write-ErrorMsg "manifest.json not found inside package"
        }
        $zip.Dispose()
    } catch {
        Write-ErrorMsg "Cannot read ZIP content: $_"
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "  [PASS] All checks passed" -ForegroundColor Green
} else {
    if ($errors.Count -gt 0) {
        Write-Host "  [ERRORS] $($errors.Count)" -ForegroundColor Red
        foreach ($e in $errors) { Write-Host "    - $e" -ForegroundColor Red }
    }
    if ($warnings.Count -gt 0) {
        Write-Host "  [WARNINGS] $($warnings.Count)" -ForegroundColor Yellow
        foreach ($w in $warnings) { Write-Host "    - $w" -ForegroundColor Yellow }
    }
}

if ($errors.Count -gt 0) {
    exit 1
}
