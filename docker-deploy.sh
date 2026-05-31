#!/bin/bash
# 快速部署脚本

set -e

echo "======================================"
echo "Global Tech Radar - Docker 部署"
echo "======================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "警告: 端口 $port 已被占用"
        read -p "是否继续? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

check_port 80
check_port 5000

# 构建镜像
echo "开始构建 Docker 镜像..."
echo "这可能需要几分钟时间..."
docker-compose build

# 启动服务
echo "启动服务..."
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

# 显示日志
echo "======================================"
echo "部署完成！"
echo "======================================"
echo ""
echo "服务访问地址："
echo "- 前端: http://localhost"
echo "- Scrapling API: http://localhost:5000"
echo "- 健康检查: http://localhost:5000/api/health"
echo ""
echo "常用命令："
echo "- 查看日志: docker-compose logs -f"
echo "- 停止服务: docker-compose stop"
echo "- 重启服务: docker-compose restart"
echo "- 删除服务: docker-compose down"
echo ""
echo "测试部署："
echo "- 测试 API: curl http://localhost:5000/api/health"
echo "- 测试抓取: curl -X POST http://localhost:5000/api/scrape -H 'Content-Type: application/json' -d '{\"url\":\"https://example.com\",\"mode\":\"basic\",\"timeout\":30}'"
echo ""