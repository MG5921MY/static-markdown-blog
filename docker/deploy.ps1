param(
    [Parameter(Position = 0)]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$WorkspaceDir = Join-Path $ProjectDir "workspace\site"
$ImageName = "static-blog"
$ContainerName = "static-blog"
$Port = if ($env:PORT) { $env:PORT } else { "8080" }

function Write-Info($Message) { Write-Host "[INFO] $Message" -ForegroundColor Green }
function Write-Warn($Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Err($Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Build-Image {
    Write-Info "Building Docker image..."
    docker build -t $ImageName -f (Join-Path $ScriptDir "Dockerfile") $ProjectDir
}

function Initialize-Workspace {
    Write-Info "Initializing workspace/site from container seed..."
    New-Item -ItemType Directory -Path $WorkspaceDir -Force | Out-Null

    $existing = Get-ChildItem -LiteralPath $WorkspaceDir -Force | Where-Object { $_.Name -ne ".gitkeep" }
    if ($existing.Count -gt 0) {
        Write-Warn "workspace/site already has content. Skipping initialization."
        return
    }

    Build-Image
    docker create --name "${ContainerName}-init" $ImageName | Out-Null
    docker cp "${ContainerName}-init:/app/examples/docker-seed/site/." "$WorkspaceDir\"
    docker rm "${ContainerName}-init" | Out-Null
    Write-Info "workspace/site initialized."
}

function Start-Blog {
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        Write-Warn "Container is already running."
        return
    }

    if (-not (docker images -q $ImageName)) {
        Build-Image
    }

    New-Item -ItemType Directory -Path $WorkspaceDir -Force | Out-Null

    if (docker ps -aq -f "name=$ContainerName") {
        docker rm -f $ContainerName | Out-Null
    }

    Write-Info "Starting container on http://localhost:$Port"
    docker run -d `
        --name $ContainerName `
        --restart unless-stopped `
        -p "${Port}:8080" `
        -v "${WorkspaceDir}:/app/workspace/site" `
        --security-opt no-new-privileges:true `
        --tmpfs /tmp `
        --memory 128m `
        --cpus 0.5 `
        $ImageName | Out-Null
}

function Stop-Blog {
    if (docker ps -q -f "name=$ContainerName") {
        docker stop $ContainerName | Out-Null
        Write-Info "Container stopped."
    } else {
        Write-Warn "Container is not running."
    }
}

function Restart-Blog {
    Stop-Blog
    Start-Blog
}

function Rebuild-Site {
    if (-not (docker ps -q -f "name=$ContainerName")) {
        Write-Err "Container is not running."
        return
    }
    docker exec $ContainerName node build.js
}

function Show-Logs {
    docker logs -f $ContainerName
}

function Open-Shell {
    docker exec -it $ContainerName /bin/sh
}

function Clean-Docker {
    $confirm = (Read-Host "Remove the container and image? [y/N]").Trim().ToLower()
    if ($confirm -eq "y" -or $confirm -eq "yes") {
        docker rm -f $ContainerName 2>$null | Out-Null
        docker rmi $ImageName 2>$null | Out-Null
        Write-Info "Docker artifacts removed."
    }
}

function Show-Help {
    @"
Static blog Docker helper

Usage: .\deploy.ps1 [command]

Commands:
  init     Seed workspace/site from the bundled starter
  start    Start the container
  stop     Stop the container
  restart  Restart the container
  build    Rebuild the image
  rebuild  Run node build.js inside the container
  logs     Follow container logs
  shell    Open a shell in the container
  clean    Remove the container and image
"@ | Write-Host
}

switch ($Command) {
    "init" { Initialize-Workspace }
    "start" { Start-Blog }
    "stop" { Stop-Blog }
    "restart" { Restart-Blog }
    "build" { Build-Image }
    "rebuild" { Rebuild-Site }
    "logs" { Show-Logs }
    "shell" { Open-Shell }
    "clean" { Clean-Docker }
    default { Show-Help }
}
