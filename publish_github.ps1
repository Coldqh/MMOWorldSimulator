param(
  [Parameter(Mandatory=$true)]
  [string]$RepoUrl
)

$ErrorActionPreference = "Stop"
Write-Host "=== MMO World Simulator GitHub publish ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoUrl"

if (!(Test-Path "package.json")) {
  throw "Run this script from C:\MMOWorldSimulator\mmoworldsimulator"
}

if (!(Test-Path ".git")) {
  git init
  git branch -M main
}

$existing = git remote 2>$null
if ($existing -notmatch "origin") {
  git remote add origin $RepoUrl
} else {
  git remote set-url origin $RepoUrl
}

git add .
$hasChanges = git status --porcelain
if ($hasChanges) {
  git commit -m "MMO World Simulator v0.4.0"
} else {
  Write-Host "No changes to commit." -ForegroundColor Yellow
}

git push -u origin main
Write-Host "Pushed. Now enable GitHub Pages: Settings -> Pages -> Source: GitHub Actions." -ForegroundColor Green
