$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceDir = Join-Path $Root "examples\starter-modern\site"
$TargetDir = Join-Path $Root "workspace\site"

function Get-VisibleChildren {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return @() }
    return Get-ChildItem -LiteralPath $Path -Force | Where-Object { $_.Name -ne ".gitkeep" }
}

function Test-MeaningfulDirectory {
    param([string]$Path)
    return (Get-VisibleChildren -Path $Path).Count -gt 0
}

function Confirm-Overwrite {
    param([string]$Path)
    Write-Host ""
    Write-Host "Target already has content: $Path" -ForegroundColor Yellow
    for ($i = 1; $i -le 3; $i++) {
        $answer = (Read-Host "Overwrite workspace data? ($i/3) [y/N]").Trim().ToLower()
        if ($answer -ne "y" -and $answer -ne "yes") {
            return $false
        }
    }
    return $true
}

Write-Host ""
Write-Host "Static blog workspace initializer" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source : $(Resolve-Path $SourceDir)" -ForegroundColor DarkGray
Write-Host "Target : $TargetDir" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path $SourceDir)) {
    throw "Starter site not found: $SourceDir"
}

$startAnswer = (Read-Host "Initialize workspace/site from the modern starter? [Y/n]").Trim().ToLower()
if ($startAnswer -eq "n" -or $startAnswer -eq "no") {
    Write-Host ""
    Write-Host "Initialization cancelled." -ForegroundColor Yellow
    exit 0
}

if (Test-MeaningfulDirectory -Path $TargetDir) {
    if (-not (Confirm-Overwrite -Path $TargetDir)) {
        Write-Host ""
        Write-Host "Initialization cancelled." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item -LiteralPath $TargetDir -Recurse -Force
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "*") -Destination $TargetDir -Recurse -Force

Write-Host ""
Write-Host "Workspace initialized." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit workspace/site/config/blog.config.yml"
Write-Host "2. Add posts under workspace/site/content/posts/"
Write-Host "3. Run node build.js"
Write-Host "4. Run node serve.js"
Write-Host ""
