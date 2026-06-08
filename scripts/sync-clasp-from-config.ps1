$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  $configPath = ".\config.json"

  if (-not (Test-Path $configPath)) {
    throw "找不到 config.json"
  }

  $config = Get-Content $configPath -Raw | ConvertFrom-Json

  if (-not $config.appsScript -or -not $config.appsScript.scriptId) {
    throw "config.json 缺少 appsScript.scriptId"
  }

  $rootDir =
    if ($config.appsScript.rootDir) {
      [string]$config.appsScript.rootDir
    } else {
      "apps-script"
    }

  New-Item -ItemType Directory -Force -Path $rootDir | Out-Null

  $clasp = [ordered]@{
    scriptId = [string]$config.appsScript.scriptId
    rootDir = "."
  }

  $target = Join-Path $rootDir ".clasp.json"

  $clasp |
    ConvertTo-Json -Depth 5 |
    Set-Content -Path $target -Encoding UTF8

  Write-Host "已由 config.json 產生：$target" -ForegroundColor Green
}
finally {
  Pop-Location
}