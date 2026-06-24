param(
  [Parameter(Mandatory=$true)]
  [string]$RepoUrl
)

$ErrorActionPreference = "Stop"

function Run-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

Write-Host "=== MMO World Simulator GitHub publish ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoUrl"

if (!(Test-Path "package.json")) {
  throw "Run this script from C:\MMOWorldSimulator\mmoworldsimulator"
}

if (Test-Path "package-lock.json") {
  Remove-Item "package-lock.json" -Force
  Write-Host "Removed package-lock.json." -ForegroundColor Yellow
}

if (Test-Path "node_modules") {
  Write-Host "node_modules will not be committed if .gitignore is correct." -ForegroundColor DarkGray
}

if (!(Test-Path ".git")) {
  Run-Git init
}

Run-Git branch -M main

$remoteExists = $false
try {
  & git remote get-url origin *> $null
  if ($LASTEXITCODE -eq 0) { $remoteExists = $true }
} catch {
  $remoteExists = $false
}

if ($remoteExists) {
  Run-Git remote set-url origin $RepoUrl
} else {
  Run-Git remote add origin $RepoUrl
}

Run-Git add -A
$status = & git status --porcelain
if ($status) {
  Run-Git commit -m "MMO World Simulator v0.4.2"
} else {
  Write-Host "No changes to commit." -ForegroundColor Yellow
}

# Remote may already contain workflow commits. For this solo project, local folder is the source of truth.
Run-Git fetch origin main
Run-Git push --force-with-lease origin main

Write-Host "Pushed successfully. Enable GitHub Pages: Settings -> Pages -> Source: GitHub Actions." -ForegroundColor Green
