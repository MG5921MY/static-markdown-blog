# ============================================
# 项目初始化脚本 (Windows PowerShell)
# 将 xxx-example 目录/文件复制到 xxx
# 
# 使用方法：.\init.ps1
# ============================================

$ErrorActionPreference = "Stop"

# 映射关系
$mappings = @(
    # 配置文件（从 conf-example 复制到 conf）
    @{ From = "conf-example\config.yml.example"; To = "conf\config.yml"; Type = "file" },
    @{ From = "conf-example\moments.yml.example"; To = "conf\moments.yml"; Type = "file" },
    @{ From = "conf-example\links.yml.example"; To = "conf\links.yml"; Type = "file" },
    @{ From = "conf-example\gallery.yml.example"; To = "conf\gallery.yml"; Type = "file" },
    # 内容目录
    @{ From = "posts-example"; To = "posts"; Type = "dir" },
    @{ From = "pages-example"; To = "pages"; Type = "dir" },
    @{ From = "assets-example"; To = "assets"; Type = "dir" }
)

function Write-ColorText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Confirm-Overwrite {
    param([string]$Path)
    
    Write-ColorText "`n⚠️  目标已存在: $Path" Yellow
    
    for ($i = 1; $i -le 3; $i++) {
        $answer = Read-Host "   确认覆盖？($i/3) [y/N]"
        if ($answer -ne "y" -and $answer -ne "Y") {
            Write-ColorText "   ❌ 取消覆盖" Red
            return $false
        }
        if ($i -lt 3) {
            Write-ColorText "   ⚠️  再次确认..." Yellow
        }
    }
    
    Write-ColorText "   ✅ 确认覆盖" Green
    return $true
}

function Test-TargetExists {
    param([string]$Path, [string]$Type)
    
    if (-not (Test-Path $Path)) { return $false }
    
    if ($Type -eq "dir") {
        return (Get-ChildItem $Path -Force | Measure-Object).Count -gt 0
    }
    return $true
}

# 主程序
Write-Host ""
Write-ColorText "╔════════════════════════════════════════╗" Cyan
Write-ColorText "║       静态博客 - 项目初始化脚本        ║" Cyan
Write-ColorText "╚════════════════════════════════════════╝" Cyan
Write-Host ""
Write-ColorText "此脚本将复制示例文件到工作目录：" Cyan
Write-Host ""

foreach ($m in $mappings) {
    Write-Host "   $($m.From) → $($m.To)"
}
Write-Host ""

$startAnswer = Read-Host "是否开始初始化？[Y/n]"
if ($startAnswer -eq "n" -or $startAnswer -eq "N") {
    Write-ColorText "`n已取消初始化" Yellow
    exit 0
}

Write-Host ""
$successCount = 0
$skipCount = 0

foreach ($mapping in $mappings) {
    $from = $mapping.From
    $to = $mapping.To
    $type = $mapping.Type
    
    Write-ColorText "📦 处理: $from → $to" Cyan
    
    # 检查源是否存在
    if (-not (Test-Path $from)) {
        Write-ColorText "   ⚠️  源不存在，跳过" Yellow
        $skipCount++
        continue
    }
    
    # 检查目标是否存在
    if (Test-TargetExists -Path $to -Type $type) {
        $confirmed = Confirm-Overwrite -Path $to
        if (-not $confirmed) {
            $skipCount++
            continue
        }
        
        # 删除旧目标
        Remove-Item $to -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # 执行复制
    try {
        if ($type -eq "dir") {
            Copy-Item $from $to -Recurse -Force
        } else {
            $destDir = Split-Path $to -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item $from $to -Force
        }
        Write-ColorText "   ✅ 完成" Green
        $successCount++
    } catch {
        Write-ColorText "   ❌ 失败: $_" Red
    }
}

Write-Host ""
Write-ColorText "════════════════════════════════════════" Cyan
Write-ColorText "初始化完成！成功: $successCount, 跳过: $skipCount" Green
Write-Host ""
Write-ColorText "下一步：" Cyan
Write-Host "   1. 编辑 conf/config.yml 配置站点信息"
Write-Host "   2. 在 posts/ 目录添加文章"
Write-Host "   3. 运行 node build.js 构建索引"
Write-Host "   4. 运行 node serve.js 启动本地预览"
Write-Host ""
