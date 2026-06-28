# Build ProClaw Mobile release APK locally (Windows)
#
# Usage:
#   powershell -File scripts/build-apk.ps1

$ErrorActionPreference = 'Stop'
$MobileRoot = Split-Path $PSScriptRoot -Parent
Set-Location $MobileRoot

Write-Host '==> Build target: ProClaw Mobile (com.proclaw.mobile)'

if (-not $env:ANDROID_HOME) {
  $defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $defaultSdk) {
    $env:ANDROID_HOME = $defaultSdk
    $env:ANDROID_SDK_ROOT = $defaultSdk
  } else {
    throw 'ANDROID_HOME is not set and default SDK path was not found.'
  }
}

$jdk17 = 'D:\Java\jdk-17.0.19+10'
if (Test-Path (Join-Path $jdk17 'bin\java.exe')) {
  $env:JAVA_HOME = $jdk17
}

$gradleHome = 'D:\gradle'
New-Item -ItemType Directory -Force -Path $gradleHome | Out-Null
$env:GRADLE_USER_HOME = $gradleHome

Write-Host '==> expo prebuild (android)'
npx expo prebuild --platform android --no-install

$gradleProps = Join-Path $MobileRoot 'android\gradle.properties'
if (Test-Path $gradleProps) {
  $content = Get-Content $gradleProps -Raw
  $content = $content -replace 'org\.gradle\.java\.home=.*', "org.gradle.java.home=D:\\Java\\jdk-17.0.19+10"
  if ($content -notmatch 'org\.gradle\.java\.home=') {
    $content = "org.gradle.java.home=D:\\Java\\jdk-17.0.19+10`r`n" + $content
  }
  if ($content -notmatch 'org\.gradle\.java\.installations\.auto-download=') {
    $content = $content -replace '(org\.gradle\.jvmargs=.*)', "`$1`r`norg.gradle.java.installations.auto-download=false`r`norg.gradle.java.installations.paths=D:\\Java\\jdk-17.0.19+10"
  }
  Set-Content -Path $gradleProps -Value $content -NoNewline
}

Write-Host '==> gradle assembleRelease'
Set-Location (Join-Path $MobileRoot 'android')
.\gradlew.bat assembleRelease --no-daemon

$apk = Join-Path $MobileRoot 'android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apk)) {
  throw "APK not found at $apk"
}

$outDir = Join-Path $MobileRoot 'dist-apk'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$dest = Join-Path $outDir ("proclaw-mobile-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.apk')
Copy-Item $apk $dest -Force

Write-Host ''
Write-Host 'Build complete:'
Write-Host $dest
