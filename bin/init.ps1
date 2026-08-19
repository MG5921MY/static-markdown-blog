$ErrorActionPreference = "Stop"

# Navigate to project root (parent of bin/)
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "Static blog workspace initializer" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path (Join-Path $ProjectRoot "init.js"))) {
    Write-Host "Error: init.js not found in $ProjectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectRoot
& node init.js @args
