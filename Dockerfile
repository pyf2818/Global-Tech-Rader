# 多阶段构建 - 前端
FROM node:20-alpine as frontend-builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 后端构建阶段
FROM python:3.11-slim as backend-builder

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY scrapling_server.py .
COPY test_scrapling.py .

# 安装 Scrapling 浏览器依赖
RUN scrapling install

# 生产镜像
FROM python:3.11-slim

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 从构建阶段复制依赖和代码
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /app/*.py .

# 复制前端构建文件
COPY --from=frontend-builder /app/dist /app/frontend

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 安装 nginx
RUN apt-get update && \
    apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /var/log/nginx /var/lib/nginx/tmp

# 暴露端口
EXPOSE 80 5000

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# 创建启动脚本
RUN echo '#!/bin/bash\n\
# 启动 Scrapling API\n\
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 scrapling_server:app &\n\
\n\
# 配置 nginx\n\
rm -rf /usr/share/nginx/html/*\n\
cp -r /app/frontend/* /usr/share/nginx/html/\n\
\n\
# 启动 nginx\n\
nginx -g "daemon off;"' > /app/start.sh && chmod +x /app/start.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# 启动命令
CMD ["/app/start.sh"]