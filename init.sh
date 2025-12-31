#!/bin/bash
# ============================================
# 项目初始化脚本 (Linux/macOS)
# 将 xxx-example 目录/文件复制到 xxx
# 
# 使用方法：chmod +x init.sh && ./init.sh
# ============================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 映射关系
declare -a MAPPINGS=(
    # 配置文件（从 conf-example 复制到 conf）
    "conf-example/config.yml.example|conf/config.yml|file"
    "conf-example/moments.yml.example|conf/moments.yml|file"
    "conf-example/links.yml.example|conf/links.yml|file"
    "conf-example/gallery.yml.example|conf/gallery.yml|file"
    # 内容目录
    "posts-example|posts|dir"
    "pages-example|pages|dir"
    "assets-example|assets|dir"
)

confirm_overwrite() {
    local path="$1"
    
    echo -e "\n${YELLOW}⚠️  目标已存在: $path${NC}"
    
    for i in 1 2 3; do
        read -p "   确认覆盖？($i/3) [y/N]: " answer
        if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
            echo -e "   ${RED}❌ 取消覆盖${NC}"
            return 1
        fi
        if [[ $i -lt 3 ]]; then
            echo -e "   ${YELLOW}⚠️  再次确认...${NC}"
        fi
    done
    
    echo -e "   ${GREEN}✅ 确认覆盖${NC}"
    return 0
}

target_exists() {
    local path="$1"
    local type="$2"
    
    if [[ ! -e "$path" ]]; then
        return 1
    fi
    
    if [[ "$type" == "dir" ]]; then
        # 目录存在且非空
        if [[ -d "$path" && "$(ls -A "$path" 2>/dev/null)" ]]; then
            return 0
        fi
        return 1
    fi
    return 0
}

# 主程序
echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       静态博客 - 项目初始化脚本        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}此脚本将复制示例文件到工作目录：${NC}"
echo ""

for mapping in "${MAPPINGS[@]}"; do
    IFS='|' read -r from to type <<< "$mapping"
    echo "   $from → $to"
done
echo ""

read -p "是否开始初始化？[Y/n]: " start_answer
if [[ "$start_answer" == "n" || "$start_answer" == "N" ]]; then
    echo -e "\n${YELLOW}已取消初始化${NC}"
    exit 0
fi

echo ""
success_count=0
skip_count=0

for mapping in "${MAPPINGS[@]}"; do
    IFS='|' read -r from to type <<< "$mapping"
    
    echo -e "${CYAN}📦 处理: $from → $to${NC}"
    
    # 检查源是否存在
    if [[ ! -e "$from" ]]; then
        echo -e "   ${YELLOW}⚠️  源不存在，跳过${NC}"
        ((skip_count++))
        continue
    fi
    
    # 检查目标是否存在
    if target_exists "$to" "$type"; then
        if ! confirm_overwrite "$to"; then
            ((skip_count++))
            continue
        fi
        
        # 删除旧目标
        rm -rf "$to"
    fi
    
    # 执行复制
    if [[ "$type" == "dir" ]]; then
        cp -r "$from" "$to"
    else
        mkdir -p "$(dirname "$to")"
        cp "$from" "$to"
    fi
    
    echo -e "   ${GREEN}✅ 完成${NC}"
    ((success_count++))
done

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${GREEN}初始化完成！成功: $success_count, 跳过: $skip_count${NC}"
echo ""
echo -e "${CYAN}下一步：${NC}"
echo "   1. 编辑 conf/config.yml 配置站点信息"
echo "   2. 在 posts/ 目录添加文章"
echo "   3. 运行 node build.js 构建索引"
echo "   4. 运行 node serve.js 启动本地预览"
echo ""
