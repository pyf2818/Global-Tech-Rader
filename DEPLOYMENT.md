# 部署指南 - Scrapling 集成

本指南提供在本地、其他电脑或生产服务器上部署 SiliconStream · 万般硅川 + Scrapling 的完整步骤。

## 系统要求

### 最低要求
- **操作系统**: Linux / macOS / Windows
- **Python**: 3.10 或更高版本
- **Node.js**: 18 或更高版本
- **内存**: 至少 2GB RAM（推荐 4GB+）
- **磁盘空间**: 至少 2GB 可用空间
- **网络**: 需要访问互联网（用于抓取）

### 生产环境推荐
- **操作系统**: Ubuntu 22.04 LTS / Debian 11+
- **Python**: 3.11+
- **Node.js**: 20+
- **内存**: 4GB+ RAM
- **CPU**: 2核心以上
- **磁盘空间**: 10GB+ 可用空间

## 部署方式

### 方式一：源码部署（推荐开发/测试）

#### 1. 克隆项目

```bash
git clone <your-repo-url>
cd <project-directory>
```

#### 2. 安装 Python 依赖

```bash
# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

#### 3. 安装 Scrapling 浏览器依赖

```bash
# 安装浏览器和系统依赖
scrapling install

# 如果遇到问题，尝试强制重装
scrapling install --force
```

#### 4. 安装 Node.js 依赖

```bash
npm install
```

#### 5. 启动服务

```bash
# 终端 1: 启动 Scrapling 服务器
python3 scrapling_server.py

# 终端 2: 启动前端开发服务器
npm run dev

# 或生产构建
npm run build
npm run preview
```

### 方式二：生产部署（推荐）

#### 1. 使用 WSGI 服务器部署后端

**安装 Gunicorn**：
```bash
pip install gunicorn
```

**创建启动脚本** (`start_scrapling.sh`)：
```bash
#!/bin/bash
cd /path/to/project
source venv/bin/activate
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 scrapling_server:app
```

**启动服务**：
```bash
chmod +x start_scrapling.sh
./start_scrapling.sh
```

#### 2. 使用 PM2 管理进程

**安装 PM2**：
```bash
npm install -g pm2
```

**创建 PM2 配置文件** (`ecosystem.config.js`)：
```javascript
module.exports = {
  apps: [
    {
      name: 'scrapling-api',
      script: '/path/to/venv/bin/gunicorn',
      args: '-w 4 -b 0.0.0.0:5000 --timeout 120 scrapling_server:app',
      cwd: '/path/to/project',
      autorestart: true,
      max_memory_restart: '1G'
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/path/to/project',
      env: {
        NODE_ENV: 'production'
      },
      autorestart: true
    }
  ]
};
```

**启动服务**：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 3. 使用 Nginx 反向代理

**Nginx 配置** (`/etc/nginx/sites-available/siliconstream`)：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Scrapling API
    location /api/scrape {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

**启用配置**：
```bash
sudo ln -s /etc/nginx/sites-available/siliconstream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 方式三：Docker 部署（推荐生产）

#### 1. 创建 Dockerfile

**后端 Dockerfile** (`Dockerfile.backend`)：
```dockerfile
FROM python:3.11-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY scrapling_server.py .
COPY test_scrapling.py .

# 安装浏览器依赖（预安装）
RUN pip install scrapling[fetchers] && \
    scrapling install

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# 启动命令
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "scrapling_server:app"]
```

**前端 Dockerfile** (`Dockerfile.frontend`)：
```dockerfile
FROM node:20-alpine as builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 生产镜像
FROM nginx:alpine

# 复制构建文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 2. 创建 Docker Compose 配置

**docker-compose.yml**：
```yaml
version: '3.8'

services:
  scrapling-api:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: scrapling-api
    ports:
      - "5000:5000"
    environment:
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - ./logs:/app/logs

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: siliconstream-frontend
    ports:
      - "80:80"
    depends_on:
      - scrapling-api
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf

  # 可选：数据库（如果需要持久化）
  # postgres:
  #   image: postgres:15
  #   container_name: siliconstream-db
  #   environment:
  #     POSTGRES_DB: tech_radar
  #     POSTGRES_USER: radar_user
  #     POSTGRES_PASSWORD: your_password
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   restart: unless-stopped

volumes:
  postgres_data:

networks:
  default:
    name: siliconstream-network
```

#### 3. 构建和启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式四：Kubernetes 部署（大规模生产）

#### 1. 创建部署配置

**scrapling-deployment.yaml**：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scrapling-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scrapling-api
  template:
    metadata:
      labels:
        app: scrapling-api
    spec:
      containers:
      - name: scrapling-api
        image: your-registry/scrapling-api:latest
        ports:
        - containerPort: 5000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: scrapling-api
spec:
  selector:
    app: scrapling-api
  ports:
  - port: 5000
    targetPort: 5000
  type: ClusterIP
```

**部署到集群**：
```bash
kubectl apply -f scrapling-deployment.yaml
```

## 依赖文件

### requirements.txt

创建 `requirements.txt` 文件：

```txt
# Scrapling 核心依赖
scrapling>=0.4.8

# Flask API 服务器
flask>=3.1.0
flask-cors>=6.0.0

# 生产服务器
gunicorn>=23.0.0

# 可选：监控和日志
# prometheus-flask-exporter>=0.23.0
# python-json-logger>=2.0.7
```

### 安装脚本

创建 `install_dependencies.sh`：

```bash
#!/bin/bash
set -e

echo "======================================"
echo "安装 Scrapling 集成依赖"
echo "======================================"

# 检查 Python 版本
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python 版本: $PYTHON_VERSION"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 10) else 1)"; then
    echo "错误: 需要 Python 3.10 或更高版本"
    exit 1
fi

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 升级 pip
echo "升级 pip..."
pip install --upgrade pip

# 安装 Python 依赖
echo "安装 Python 依赖..."
pip install -r requirements.txt

# 安装 Scrapling 浏览器依赖
echo "安装 Scrapling 浏览器依赖..."
scrapling install

# 安装 Node.js 依赖
echo "安装 Node.js 依赖..."
npm install

echo "======================================"
echo "依赖安装完成！"
echo "======================================"
echo ""
echo "启动服务："
echo "1. 启动 Scrapling API: python3 scrapling_server.py"
echo "2. 启动前端服务: npm run dev"
echo ""
```

## 跨平台兼容性

### Linux

```bash
# 安装系统依赖
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv nodejs npm

# 安装项目依赖
./install_dependencies.sh
```

### macOS

```bash
# 使用 Homebrew 安装依赖
brew install python3 node

# 安装项目依赖
./install_dependencies.sh
```

### Windows

```powershell
# 安装 Python 和 Node.js（从官网下载安装）

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
scrapling install

# 安装前端依赖
npm install
```

## 环境变量配置

创建 `.env` 文件：

```env
# Flask 配置
FLASK_ENV=production
FLASK_DEBUG=0

# Scrapling 配置
SCRAPLING_PORT=5000
SCRAPLING_TIMEOUT=120
SCRAPLING_MAX_WORKERS=4

# 前端配置
VITE_API_URL=http://localhost:5000
NODE_ENV=production
```

## 健康检查和监控

### 健康检查端点

```bash
# 检查 Scrapling API
curl http://localhost:5000/api/health

# 检查前端
curl http://localhost:80/
```

### 日志监控

```bash
# Scrapling API 日志
pm2 logs scrapling-api

# 前端日志
pm2 logs frontend

# Docker 日志
docker-compose logs -f scrapling-api
```

## 性能优化

### 生产环境配置

**Gunicorn 配置** (`gunicorn.conf.py`)：
```python
import multiprocessing

# 工作进程数（CPU 核心数 * 2 + 1）
workers = multiprocessing.cpu_count() * 2 + 1

# 工作模式（gevent 用于并发请求）
worker_class = 'gevent'

# 每个工作进程的线程数
threads = 2

# 超时时间
timeout = 120

# 最大请求数后重启工作进程
max_requests = 1000
max_requests_jitter = 50

# 日志配置
accesslog = '/var/log/scrapling/access.log'
errorlog = '/var/log/scrapling/error.log'
loglevel = 'info'
```

**启动命令**：
```bash
gunicorn -c gunicorn.conf.py scrapling_server:app
```

## 常见问题排查

### 1. 浏览器依赖安装失败

**问题**：`scrapling install` 失败

**解决方案**：
```bash
# 强制重装
pip uninstall scrapling -y
pip install "scrapling[fetchers]" --force-reinstall
scrapling install --force

# 或手动安装浏览器
playwright install chromium
```

### 2. 内存不足

**问题**：动态抓取时内存溢出

**解决方案**：
```bash
# 减少工作进程数
gunicorn -w 2 scrapling_server:app

# 或限制每个请求的浏览器数量
# 在 scrapling_server.py 中设置
StealthyFetcher.MAX_PAGES = 2
```

### 3. 网络超时

**问题**：抓取超时

**解决方案**：
```bash
# 增加超时时间
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"...","timeout":60}'
```

### 4. 权限问题

**问题**：无法安装系统依赖

**解决方案**：
```bash
# 使用虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate

# 或使用 --user 安装
pip install --user scrapling
```

## 安全建议

1. **API 认证**：生产环境添加 API Key 认证
2. **速率限制**：防止滥用，限制抓取频率
3. **输入验证**：验证 URL 格式和安全性
4. **HTTPS**：使用 SSL/TLS 加密通信
5. **防火墙**：限制外部访问端口
6. **日志审计**：记录所有抓取请求

## 备份和恢复

### 数据备份

```bash
# 备份配置文件
tar -czf backup-$(date +%Y%m%d).tar.gz \
  scrapling_server.py \
  requirements.txt \
  .env \
  vite.config.js
```

### 环境迁移

```bash
# 导出依赖列表
pip freeze > requirements-backup.txt

# 在新环境中安装
pip install -r requirements-backup.txt
```

## 总结

✅ **完全可以导出到其他环境使用！**

关键点：
1. 所有依赖都可通过 `requirements.txt` 和 `package.json` 自动安装
2. Scrapling 的浏览器依赖可通过 `scrapling install` 命令安装
3. 提供 Docker 方案，一键部署到任何支持 Docker 的环境
4. 支持从开发到生产的完整部署链路
5. 跨平台兼容（Linux/macOS/Windows）

选择适合你环境的部署方式即可！