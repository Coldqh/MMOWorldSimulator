$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (!(Test-Path ".\node_modules")) {
  Write-Host "node_modules not found. Running npm install..." -ForegroundColor Yellow
  npm install
}
npm run build
