#!/bin/bash
# Scrapling 集成功能测试

echo "======================================"
echo "Scrapling 集成功能测试"
echo "======================================"
echo ""

# 测试 1: 检查 Scrapling 服务器
echo "测试 1: 检查 Scrapling 服务器健康状态"
echo "--------------------------------------"
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
echo "响应: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
  echo "✓ Scrapling 服务器运行正常"
else
  echo "✗ Scrapling 服务器未运行"
  exit 1
fi
echo ""

# 测试 2: 测试基础抓取
echo "测试 2: 测试基础抓取功能"
echo "--------------------------------------"
echo "请求: POST http://localhost:5000/api/scrape"
SCRAPE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","mode":"basic","timeout":30}')
echo "响应:"
echo "$SCRAPE_RESPONSE" | python3 -m json.tool
echo ""

if echo "$SCRAPE_RESPONSE" | grep -q '"status": 200'; then
  echo "✓ 基础抓取功能正常"
else
  echo "✗ 基础抓取失败"
fi
echo ""

# 测试 3: 测试前端代理
echo "测试 3: 测试前端代理"
echo "--------------------------------------"
echo "请求: POST http://localhost:5175/api/scrape"
PROXY_RESPONSE=$(curl -s -X POST http://localhost:5175/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","mode":"basic","timeout":30}')
echo "响应:"
echo "$PROXY_RESPONSE" | python3 -m json.tool
echo ""

if echo "$PROXY_RESPONSE" | grep -q '"status": 200'; then
  echo "✓ 前端代理功能正常"
else
  echo "✗ 前端代理失败"
fi
echo ""

# 测试 4: 测试动态页面抓取
echo "测试 4: 测试动态页面抓取"
echo "--------------------------------------"
echo "请求: POST http://localhost:5000/api/scrape (dynamic mode)"
DYNAMIC_RESPONSE=$(curl -s -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://quotes.toscrape.com/js/","mode":"dynamic","timeout":30}')
echo "响应 (摘要):"
echo "$DYNAMIC_RESPONSE" | python3 -m json.tool | head -30
echo ""

if echo "$DYNAMIC_RESPONSE" | grep -q '"status": 200'; then
  echo "✓ 动态页面抓取功能正常"
else
  echo "✗ 动态页面抓取失败"
fi
echo ""

# 测试 5: 测试隐身模式抓取
echo "测试 5: 测试隐身模式抓取"
echo "--------------------------------------"
echo "请求: POST http://localhost:5000/api/scrape (stealth mode)"
STEALTH_RESPONSE=$(curl -s -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://quotes.toscrape.com/js-delayed/","mode":"stealth","timeout":30}')
echo "响应 (摘要):"
echo "$STEALTH_RESPONSE" | python3 -m json.tool | head -30
echo ""

if echo "$STEALTH_RESPONSE" | grep -q '"status": 200'; then
  echo "✓ 隐身模式抓取功能正常"
else
  echo "✗ 隐身模式抓取失败"
fi
echo ""

echo "======================================"
echo "测试完成"
echo "======================================"
echo ""
echo "功能访问:"
echo "- 前端界面: http://localhost:5175"
echo "- Scrapling API: http://localhost:5000"
echo "- API 文档: http://localhost:5000/api/health"
echo ""
echo "使用说明:"
echo "1. 打开前端界面 (http://localhost:5175)"
echo "2. 点击左侧导航菜单的'自定义抓取'"
echo "3. 输入任意网页 URL"
echo "4. 选择抓取模式 (基础/动态/隐身)"
echo "5. 点击'抓取'按钮"
echo "6. 查看抓取结果并保存到创作中心或素材库"
echo ""