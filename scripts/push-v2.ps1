# 檔案位置：skhpsv2/scripts/push-v2.ps1
# 用途：skhpsv2 前端專案專用 Git push 腳本；只做 git add / commit / push，不執行 clasp 或 Apps Script deploy。

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
  # 忽略編碼設定錯誤
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  Write-Host ""
  Write-Host "skhpsv2 GitHub 前端專案 push" -ForegroundColor Cyan
  Write-Host "Repo root: $repoRoot" -ForegroundColor DarkGray
  Write-Host ""

  if (Test-Path ".clasp.json") {
    throw "偵測到 .clasp.json。skhpsv2 目前是純前端 repo，不應綁定 Apps Script。請先移除 .clasp.json。"
  }

  git status

  $changes = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host ""
    Write-Host "沒有需要 commit 的變更。" -ForegroundColor Green
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = Read-Host "請輸入 commit message"
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    throw "commit message 不可為空。"
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