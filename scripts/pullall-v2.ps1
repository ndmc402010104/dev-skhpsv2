# 檔案位置：skhpsv2/scripts/pullall-v2.ps1
# 時間戳記：2026-06-08 00:00 UTC+8
# 用途：skhpsv2 前端專案專用 pull；只拉 GitHub origin/main，不執行 clasp，不連 Apps Script。

param(
  [ValidateSet('safe','force')]
  [string]$Mode = 'safe',

  [switch]$NoOpenCode
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

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') 失敗"
  }
}

function Get-CurrentBranchName {
  $branch = (git branch --show-current 2>$null).Trim()

  if ([string]::IsNullOrWhiteSpace($branch)) {
    return ""
  }

  return $branch
}

function Test-RemoteRefExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RefName
  )

  git rev-parse --verify $RefName 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

try {
  Write-Host ""
  Write-Host "skhpsv2 GitHub frontend pull" -ForegroundColor Cyan
  Write-Host "Repo root: $repoRoot" -ForegroundColor DarkGray
  Write-Host "Mode: $Mode" -ForegroundColor DarkGray
  Write-Host ""

  if (Test-Path ".clasp.json") {
    throw "偵測到 .clasp.json。skhpsv2 目前是純前端 repo，不應綁定 Apps Script。請先移除 .clasp.json。"
  }

  git status

  $changes = git status --porcelain
  if (-not [string]::IsNullOrWhiteSpace($changes)) {
    if ($Mode -eq "safe") {
      Write-Host ""
      Write-Host "偵測到本機有未提交變更，safe 模式停止 pull，避免覆蓋。" -ForegroundColor Yellow
      Write-Host "請先 commit / stash，或明確使用：" -ForegroundColor Yellow
      Write-Host ".\scripts\pullall-v2.ps1 -Mode force" -ForegroundColor Cyan
      exit 1
    }

    Write-Host ""
    Write-Host "force 模式：本機未提交變更將被覆蓋。" -ForegroundColor Yellow
  }

  Write-Host ""
  Write-Host "抓取 origin 最新版本..." -ForegroundColor Cyan
  Invoke-Git -Arguments @("fetch", "origin", "--prune")

  if (-not (Test-RemoteRefExists -RefName "origin/main")) {
    throw "找不到 origin/main。請確認 GitHub repo 預設分支是否為 main。"
  }

  $currentBranch = Get-CurrentBranchName

  if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    Write-Host "目前不是正常 branch，改 checkout main。" -ForegroundColor Yellow
    Invoke-Git -Arguments @("checkout", "-B", "main", "origin/main")
  }
  elseif ($currentBranch -ne "main") {
    Write-Host "目前 branch 是 $currentBranch，切回 main。" -ForegroundColor Yellow
    Invoke-Git -Arguments @("checkout", "main")
  }

  if ($Mode -eq "force") {
    Write-Host ""
    Write-Host "force reset 到 origin/main..." -ForegroundColor Yellow
    Invoke-Git -Arguments @("reset", "--hard", "origin/main")
    Invoke-Git -Arguments @("clean", "-fd")
  }
  else {
    Write-Host ""
    Write-Host "safe pull：只允許 fast-forward。" -ForegroundColor Cyan
    Invoke-Git -Arguments @("pull", "--ff-only", "origin", "main")
  }

  Write-Host ""
  Write-Host "Pull 完成。" -ForegroundColor Green
  Write-Host "目前 branch：$(Get-CurrentBranchName)" -ForegroundColor Cyan

  if (-not $NoOpenCode) {
    code .
  }
}
finally {
  Pop-Location
}