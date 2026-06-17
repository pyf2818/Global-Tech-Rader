#!/bin/bash
# 部署文件完整性检查

set -e

echo "======================================"
echo "部署文件完整性检查"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# 检查必需文件
echo "检查核心文件..."
FILES=(
    "requirements.txt"
    "package.json"
    "scrapling_server.py"
    "vite.config.js"
    "Dockerfile"
    "docker-compose.yml"
    "nginx.conf"
    ".dockerignore"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file 缺失"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "检查部署文档..."
DOCS=(
    "DEPLOYMENT.md"
    "DEPLOYMENT_QUICK.md"
    "DEPLOYMENT_SUMMARY.md"
    "SCRAPLING_INTEGRATION.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} $doc"
    else
        echo -e "${RED}✗${NC} $doc 缺失"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "检查部署脚本..."
SCRIPTS=(
    "install_dependencies.sh"
    "docker-deploy.sh"
    "check_deployment.sh"
    "test_integration.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}✓${NC} $script (可执行)"
        else
            echo -e "${YELLOW}⚠${NC} $script (不可执行)"
        fi
    else
        echo -e "${RED}✗${NC} $script 缺失"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "检查环境配置..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example"
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓${NC} .env (已配置)"
    else
        echo -e "${YELLOW}⚠${NC} .env (未配置，可以复制 .env.example)"
    fi
else
    echo -e "${RED}✗${NC} .env.example 缺失"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "检查核心功能代码..."
CORE_FILES=(
    "src/App.jsx"
    "src/styles.css"
)

for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        # 检查文件是否包含自定义抓取功能
        if grep -q "custom-url" "$file" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $file (包含自定义抓取功能)"
        else
            echo -e "${YELLOW}⚠${NC} $file (可能缺少自定义抓取功能)"
        fi
    else
        echo -e "${RED}✗${NC} $file 缺失"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有部署文件完整！${NC}"
    echo ""
    echo "下一步："
    echo "1. 运行环境检查: ./check_deployment.sh"
    echo "2. 配置环境变量: cp .env.example .env"
    echo "3. 选择部署方式:"
    echo "   - Docker 部署: ./docker-deploy.sh"
    echo "   - 手动安装: ./install_dependencies.sh"
    echo ""
    echo "查看文档:"
    echo "   - 快速指南: cat DEPLOYMENT_QUICK.md"
    echo "   - 完整文档: cat DEPLOYMENT.md"
    echo "   - 部署总结: cat DEPLOYMENT_SUMMARY.md"
else
    echo -e "${RED}✗ 发现 $ERRORS 个问题${NC}"
    echo ""
    echo "请检查缺失的文件或联系技术支持。"
fi
echo "======================================"

exit $ERRORS