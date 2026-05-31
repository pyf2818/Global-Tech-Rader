# 部署快速指南

## 🚀 快速开始

### 方式一：Docker 部署（最简单）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd <project-directory>

# 2. 运行部署脚本
chmod +x docker-deploy.sh
./docker-deploy.sh

# 3. 访问应用
# 前端: http://localhost
# API: http://localhost:5000
```

### 方式二：手动安装

```bash
# 1. 运行安装脚本
chmod +x install_dependencies.sh
./install_dependencies.sh

# 2. 启动服务
# 终端 1
python3 scrapling_server.py

# 终端 2
npm run dev
```

## 📋 系统要求

- Docker: 20.10+
- Docker Compose: 2.0+
- Python: 3.10+ (手动安装)
- Node.js: 18+ (手动安装)
- 内存: 2GB+ (推荐 4GB+)
- 磁盘: 5GB+ 可用空间

## 🔧 环境配置

### 复制环境变量模板

```bash
cp .env.example .env
```

### 编辑配置文件

```bash
nano .env  # 或使用你喜欢的编辑器
```

## 🌐 网络配置

### 开发环境

默认配置即可，无需额外设置。

### 生产环境

建议修改以下配置：

```env
# 修改 API 地址为你的域名
VITE_API_URL=https://yourdomain.com/api

# 设置安全密钥
API_KEY=your_secure_api_key

# 启用速率限制
RATE_LIMIT_ENABLED=true
```

## 🔒 安全建议

### 1. 使用 HTTPS

```nginx
# Nginx 配置示例
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... 其他配置
}
```

### 2. 设置 API 认证

```env
API_KEY=your_secure_api_key_here
```

### 3. 配置防火墙

```bash
# 仅允许必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📊 监控和维护

### 查看服务状态

```bash
# Docker 环境
docker-compose ps

# PM2 环境
pm2 status

# 手动运行
ps aux | grep scrapling
```

### 查看日志

```bash
# Docker 环境
docker-compose logs -f

# PM2 环境
pm2 logs scrapling-api

# 手动运行
tail -f /var/log/scrapling/access.log
```

### 重启服务

```bash
# Docker 环境
docker-compose restart

# PM2 环境
pm2 restart scrapling-api

# 手动运行
sudo systemctl restart scrapling
```

## 🛠 故障排查

### 服务无法启动

1. 检查端口是否被占用
2. 检查依赖是否安装完整
3. 查看错误日志
4. 检查系统资源

### 抓取失败

1. 检查网络连接
2. 验证 URL 格式
3. 尝试不同的抓取模式
4. 检查目标网站是否可访问

### 内存不足

1. 减少 Scrapling 工作进程数
2. 增加系统内存
3. 使用异步模式
4. 添加交换空间

## 📦 备份和恢复

### 备份配置

```bash
# 备份整个项目
tar -czf backup-$(date +%Y%m%d).tar.gz /path/to/project

# 仅备份配置
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
    .env \
    scrapling_server.py \
    vite.config.js
```

### 恢复配置

```bash
# 解压备份
tar -xzf backup-20260531.tar.gz -C /restore/path

# 恢复环境变量
cp config-backup-20260531/.env .
```

## 🔄 更新和维护

### 更新项目

```bash
# 拉取最新代码
git pull origin main

# 重新构建 Docker 镜像
docker-compose build

# 重启服务
docker-compose up -d

# 或更新依赖
./install_dependencies.sh
```

### 清理缓存

```bash
# Docker 环境
docker system prune -a

# 手动环境
npm cache clean --force
pip cache purge
```

## 📚 相关文档

- [完整部署指南](DEPLOYMENT.md)
- [Scrapling 集成说明](SCRAPLING_INTEGRATION.md)
- [项目架构文档](AGENTS.md)

## 🆘 获取帮助

如果遇到问题：

1. 查看 [常见问题](DEPLOYMENT.md#常见问题排查)
2. 检查 [日志文件](#📊-监控和维护)
3. 访问 [Scrapling 文档](https://scrapling.readthedocs.io)
4. 提交 [Issue](https://github.com/your-repo/issues)

## ✅ 部署检查清单

部署前确认：

- [ ] 系统要求满足
- [ ] 所有依赖已安装
- [ ] 环境变量已配置
- [ ] 防火墙规则已设置
- [ ] 数据库（如需要）已配置
- [ ] HTTPS 证书（生产环境）已配置
- [ ] 备份策略已制定
- [ ] 监控工具已配置

部署后确认：

- [ ] 服务正常运行
- [ ] 健康检查通过
- [ ] 日志正常输出
- [ ] API 响应正常
- [ ] 前端可正常访问
- [ ] 抓取功能正常
- [ ] 性能指标正常

## 🎯 性能优化

### 生产环境建议

1. **增加工作进程数**：
   ```bash
   gunicorn -w 8 scrapling_server:app
   ```

2. **使用负载均衡**：
   ```yaml
   # docker-compose.yml
   deploy:
     replicas: 3
   ```

3. **启用缓存**：
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

4. **使用 CDN**：
   - 静态资源
   - API 响应缓存

---

**部署完成后，记得测试所有功能！** 🎉