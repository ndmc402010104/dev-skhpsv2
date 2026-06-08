param(
  [string]$Message = "",
  [string]$DeploymentId = "AKfycbyzyZp2PSHLjl3Kjvuy8uhwmBZbfeWwBXA-UjYQvzh_-m1_aDxvaIvlsT_BXwkc3v1oWg"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  Write-Host ""
  Write-Host "skhpsv2 GitHub Pages push"
  Write-Host "Repo root: $repoRoot"
  Write-Host ""

  if (Test-Path ".clasp.json") {
    throw "Root .clasp.json detected. Keep Apps Script files under apps-script/, not repo root."
  }

  $versionScript = Join-Path $PSScriptRoot "Update-VersionJson.ps1"

  if (-not (Test-Path $versionScript)) {
    throw "Update-VersionJson.ps1 not found: $versionScript"
  }

  & $versionScript -EnvName "prod"

  git status

  $changes = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host ""
    Write-Host "No Git changes to commit."

    $deployOnly = Read-Host "Deploy Apps Script anyway? (y/N)"
    if ($deployOnly -ne "y" -and $deployOnly -ne "Y") {
      exit 0
    }
  } else {
    if ([string]::IsNullOrWhiteSpace($Message)) {
      $Message = Read-Host "Commit message"
    }

    if ([string]::IsNullOrWhiteSpace($Message)) {
      throw "Commit message is required."
    }

    git add .
    git commit -m $Message
    git push
  }

  Write-Host ""
  $deployChoice = Read-Host "Deploy Apps Script now? (y/N)"

  if ($deployChoice -eq "y" -or $deployChoice -eq "Y") {
    $appScriptDir = Join-Path $repoRoot "apps-script"

    if (-not (Test-Path $appScriptDir)) {
      throw "apps-script folder not found: $appScriptDir"
    }

    if (-not (Test-Path (Join-Path $appScriptDir ".clasp.json"))) {
      throw ".clasp.json not found under apps-script. Do not put it in repo root."
    }

    Push-Location $appScriptDir

    try {
      Write-Host ""
      Write-Host "Apps Script push + deploy"
      Write-Host "Apps Script dir: $appScriptDir"
      Write-Host "Deployment ID: $DeploymentId"
      Write-Host ""

      clasp status
      clasp push
      clasp deploy -i $DeploymentId -d $Message

      Write-Host ""
      Write-Host "Apps Script deploy completed."
    }
    finally {
      Pop-Location
    }
  } else {
    Write-Host "Skip Apps Script deploy."
  }

  Write-Host ""
  Write-Host "skhpsv2 push completed."
}
finally {
  Pop-Location
}