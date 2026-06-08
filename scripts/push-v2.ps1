# File: skhpsv2/scripts/push-v2.ps1
# Purpose: Git-only push script for skhpsv2 frontend repo.
# Note: This script does NOT run clasp or Apps Script deploy.

param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

try {
  chcp 65001 | Out-Null
  [Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
  $OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch {
  # Ignore encoding setup errors.
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  Write-Host ""
  Write-Host "skhpsv2 GitHub frontend push" -ForegroundColor Cyan
  Write-Host "Repo root: $repoRoot" -ForegroundColor DarkGray
  Write-Host ""

  if (Test-Path ".clasp.json") {
    throw "Blocked: .clasp.json was found in repo root. skhpsv2 should not bind to Apps Script yet."
  }

  git status

  $changes = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host ""
    Write-Host "No changes to commit." -ForegroundColor Green
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = Read-Host "Commit message"
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    throw "Commit message is required."
  }

  git add .
  git commit -m $Message
  git push

  Write-Host ""
  Write-Host "skhpsv2 push completed." -ForegroundColor Green
}
finally {
  Pop-Location
}
