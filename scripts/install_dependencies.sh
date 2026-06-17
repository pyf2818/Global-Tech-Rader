#!/bin/bash
# 安装 Scrapling 集成依赖

set -e

echo "======================================"
echo "安装 Scrapling 集成依赖"
echo "======================================"
echo ""

# 检查 Python 版本
if ! command -v python3 &> /dev/null; then
    echo "错误: Python 3 未安装"
    echo "请先安装 Python 3.10 或更高版本"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python 版本: $PYTHON_VERSION"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 10) else 1)"; then
    echo "错误: 需要 Python 3.10 或更高版本"
    exit 1
fi

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "警告: Node.js 未安装"
    echo "请先安装 Node.js 18 或更高版本"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Node.js 版本: $NODE_VERSION"
echo ""

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
else
    echo "虚拟环境已存在，跳过创建"
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 升级 pip
echo "升级 pip..."
pip install --upgrade pip

# 检查 requirements.txt 是否存在
if [ ! -f "requirements.txt" ]; then
    echo "错误: requirements.txt 文件不存在"
    exit 1
fi

# 安装 Python 依赖
echo "安装 Python 依赖..."
pip install -r requirements.txt

# 安装 Scrapling 浏览器依赖
echo "安装 Scrapling 浏览器依赖..."
echo "这可能需要几分钟时间..."
if scrapling install; then
    echo "✓ 浏览器依赖安装成功"
else
    echo "警告: 浏览器依赖安装可能失败，尝试强制重装..."
    scrapling install --force
fi

# 检查 package.json 是否存在
if [ -f "package.json" ]; then
    # 安装 Node.js 依赖
    echo "安装 Node.js 依赖..."
    if npm install; then
        echo "✓ Node.js 依赖安装成功"
    else
        echo "警告: Node.js 依赖安装可能失败"
    fi
else
    echo "警告: package.json 文件不存在，跳过 Node.js 依赖安装"
fi

echo ""
echo "======================================"
echo "依赖安装完成！"
echo "======================================"
echo ""
echo "启动服务："
echo "1. 启动 Scrapling API:"
echo "   source venv/bin/activate"
echo "   python3 scrapling_server.py"
echo ""
echo "2. 启动前端服务:"
echo "   npm run dev"
echo ""
echo "或使用 PM2 管理:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "测试安装:"
echo "   ./test_integration.sh"
echo ""