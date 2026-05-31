#!/bin/bash
# 部署前检查脚本

set -e

echo "======================================"
echo "部署前检查"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 已安装"
        return 0
    else
        echo -e "${RED}✗${NC} $1 未安装"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 存在"
        return 0
    else
        echo -e "${RED}✗${NC} $1 不存在"
        return 1
    fi
}

check_port() {
    local port=$1
    if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✓${NC} 端口 $port 可用"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} 端口 $port 已被占用"
        return 1
    fi
}

# 开始检查
echo "检查系统要求..."
echo ""

# 检查必需命令
ERRORS=0
check_command python3 || ERRORS=$((ERRORS + 1))
check_command node || ERRORS=$((ERRORS + 1))
check_command npm || ERRORS=$((ERRORS + 1))

echo ""
echo "检查可选命令（Docker 部署需要）..."
check_command docker || echo -e "${YELLOW}⚠${NC} Docker 未安装（Docker 部署需要）"
check_command docker-compose || echo -e "${YELLOW}⚠${NC} Docker Compose 未安装（Docker 部署需要）"

echo ""
echo "检查文件..."
check_file "requirements.txt" || ERRORS=$((ERRORS + 1))
check_file "package.json" || ERRORS=$((ERRORS + 1))
check_file "scrapling_server.py" || ERRORS=$((ERRORS + 1))
check_file "vite.config.js" || ERRORS=$((ERRORS + 1))

echo ""
echo "检查端口..."
check_port 5000
check_port 80

echo ""
echo "检查版本信息..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    if python3 -c "import sys; exit(0 if sys.version_info >= (3, 10) else 1)"; then
        echo -e "${GREEN}✓${NC} Python 版本符合要求: $PYTHON_VERSION"
    else
        echo -e "${RED}✗${NC} Python 版本过低: $PYTHON_VERSION (需要 3.10+)"
        ERRORS=$((ERRORS + 1))
    fi
fi

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>&1)
    echo -e "${GREEN}✓${NC} Node.js 版本: $NODE_VERSION"
fi

echo ""
echo "检查磁盘空间..."
DISK_AVAILABLE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$DISK_AVAILABLE" -ge 5 ]; then
    echo -e "${GREEN}✓${NC} 磁盘空间充足: ${DISK_AVAILABLE}GB 可用"
else
    echo -e "${YELLOW}⚠${NC} 磁盘空间不足: ${DISK_AVAILABLE}GB 可用（推荐 5GB+）"
fi

echo ""
echo "检查内存..."
TOTAL_MEM=$(free -m | awk '/Mem:/ {print $2}')
if [ "$TOTAL_MEM" -ge 2048 ]; then
    echo -e "${GREEN}✓${NC} 内存充足: ${TOTAL_MEM}MB"
else
    echo -e "${YELLOW}⚠${NC} 内存较低: ${TOTAL_MEM}MB（推荐 2048MB+）"
fi

echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过，可以开始部署！${NC}"
    echo ""
    echo "选择部署方式："
    echo "1. Docker 部署（推荐）"
    echo "2. 手动安装"
    echo ""
    echo "运行以下命令开始部署："
    echo "  Docker 部署: ./docker-deploy.sh"
    echo "  手动安装: ./install_dependencies.sh"
else
    echo -e "${RED}✗ 发现 $ERRORS 个错误，请先解决这些问题${NC}"
    echo ""
    echo "必需检查项："
    echo "  - Python 3.10+ 已安装"
    echo "  - Node.js 18+ 已安装"
    echo "  - 所有必需文件存在"
fi
echo "======================================"

exit $ERRORS