# ============================================
# 静态博客 Docker 部署脚本 (Windows PowerShell)
# 
# 使用方法：
#   .\deploy.ps1 [命令]
#
# 命令：
#   init     - 首次初始化（从容器复制文件）
#   start    - 启动服务
#   stop     - 停止服务
#   restart  - 重启服务
#   build    - 重新构建镜像
#   rebuild  - 仅重新构建索引
#   logs     - 查看日志
#   clean    - 清理容器和镜像
# ============================================

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# 配置
$ImageName = "static-blog"
$ContainerName = "static-blog"
$Port = if ($env:PORT) { $env:PORT } else { "8080" }

# 获取目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Set-Location $ScriptDir

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# 首次初始化
function Init {
    Write-Info "首次初始化..."
    
    if (Test-Path "$ProjectDir\conf\config.yml") {
        Write-Warn "检测到已有配置文件，跳过初始化"
        return
    }
    
    Write-Info "构建 Docker 镜像..."
    docker build -t $ImageName -f Dockerfile $ProjectDir
    
    Write-Info "创建临时容器..."
    docker create --name "${ContainerName}-init" $ImageName
    
    Write-Info "从容器复制初始文件..."
    docker cp "${ContainerName}-init:/app/conf" "$ProjectDir\"
    docker cp "${ContainerName}-init:/app/posts" "$ProjectDir\"
    docker cp "${ContainerName}-init:/app/pages" "$ProjectDir\"
    
    if (-not (Test-Path "$ProjectDir\usr")) {
        New-Item -ItemType Directory -Path "$ProjectDir\usr" | Out-Null
    }
    docker cp "${ContainerName}-init:/app/usr/themes" "$ProjectDir\usr\"
    docker cp "${ContainerName}-init:/app/assets" "$ProjectDir\"
    
    docker rm "${ContainerName}-init"
    
    Write-Info "初始化完成！"
    Write-Info "请编辑 $ProjectDir\conf\config.yml 配置站点信息"
}

# 构建镜像
function Build {
    Write-Info "构建 Docker 镜像..."
    docker build -t $ImageName -f Dockerfile $ProjectDir
    Write-Info "构建完成"
}

# 启动服务
function Start-Blog {
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        Write-Warn "容器已在运行"
        return
    }
    
    $exists = docker ps -aq -f "name=$ContainerName"
    if ($exists) {
        Write-Info "启动已存在的容器..."
        docker start $ContainerName
    } else {
        $imageExists = docker images -q $ImageName
        if (-not $imageExists) {
            Build
        }
        
        Write-Info "创建并启动容器..."
        docker run -d `
            --name $ContainerName `
            --restart unless-stopped `
            -p "${Port}:8080" `
            -v "${ProjectDir}\conf:/app/conf:ro" `
            -v "${ProjectDir}\posts:/app/posts:ro" `
            -v "${ProjectDir}\pages:/app/pages:ro" `
            -v "${ProjectDir}\usr\themes:/app/usr/themes:ro" `
            -v "${ProjectDir}\assets:/app/assets:ro" `
            --security-opt no-new-privileges:true `
            --read-only `
            --tmpfs /tmp `
            --memory 128m `
            --cpus 0.5 `
            $ImageName
    }
    
    Write-Info "服务已启动: http://localhost:${Port}"
}

# 停止服务
function Stop-Blog {
    $running = docker ps -q -f "name=$ContainerName"
    if ($running) {
        Write-Info "停止容器..."
        docker stop $ContainerName
        Write-Info "服务已停止"
    } else {
        Write-Warn "容器未运行"
    }
}

# 重启服务
function Restart-Blog {
    Stop-Blog
    $exists = docker ps -aq -f "name=$ContainerName"
    if ($exists) {
        docker rm $ContainerName
    }
    Start-Blog
}

# 重新构建索引
function Rebuild {
    $running = docker ps -q -f "name=$ContainerName"
    if (-not $running) {
        Write-Err "容器未运行，请先启动服务"
        return
    }
    
    Write-Info "重新构建索引..."
    docker exec $ContainerName node build.js
    Write-Info "索引构建完成"
}

# 查看日志
function Show-Logs {
    docker logs -f $ContainerName
}

# 清理
function Clean {
    $confirm = Read-Host "这将删除容器和镜像，确定吗？[y/N]"
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        Stop-Blog 2>$null
        docker rm $ContainerName 2>$null
        docker rmi $ImageName 2>$null
        Write-Info "清理完成"
    } else {
        Write-Info "已取消"
    }
}

# 显示帮助
function Show-Help {
    Write-Host @"
静态博客 Docker 部署脚本

使用方法: .\deploy.ps1 [命令]

命令:
  init     - 首次初始化（从容器复制文件到宿主机）
  start    - 启动服务
  stop     - 停止服务
  restart  - 重启服务（应用配置更改）
  build    - 重新构建镜像
  rebuild  - 仅重新构建索引
  logs     - 查看日志
  clean    - 清理容器和镜像

环境变量:
  `$env:PORT - 服务端口（默认: 8080）

示例:
  .\deploy.ps1 init           # 首次部署
  .\deploy.ps1 start          # 启动服务
  `$env:PORT=3000; .\deploy.ps1 start  # 指定端口启动
"@
}

# 主入口
switch ($Command) {
    "init"    { Init }
    "start"   { Start-Blog }
    "stop"    { Stop-Blog }
    "restart" { Restart-Blog }
    "build"   { Build }
    "rebuild" { Rebuild }
    "logs"    { Show-Logs }
    "clean"   { Clean }
    default   { Show-Help }
}
