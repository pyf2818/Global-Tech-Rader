#!/bin/bash
# 金融数据网站抓取测试

set -e

echo "======================================"
echo "金融数据网站抓取能力测试"
echo "======================================"
echo ""

API_URL="http://localhost:5000/api/scrape"

# 测试网站列表
WEBSITES=(
    "新浪财经|https://finance.sina.com.cn/|basic|30"
    "上证报|https://www.cnstock.com/|basic|30"
    "东方财富网|https://www.eastmoney.com/|dynamic|45"
    "纳斯达克|https://www.nasdaq.com/|basic|30"
    "CoinMarketCap|https://www.coinmarketcap.com/|stealth|60"
    "雅虎财经|https://finance.yahoo.com/|stealth|45"
)

SUCCESS_COUNT=0
FAIL_COUNT=0

for site in "${WEBSITES[@]}"; do
    IFS='|' read -r name url mode timeout <<< "$site"

    echo "测试: $name ($url)"
    echo "模式: $mode, 超时: ${timeout}s"

    # 发送请求
    RESPONSE=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\",\"mode\":\"$mode\",\"timeout\":$timeout}" \
        --max-time $((timeout + 10)))

    # 解析响应
    STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'error'))" 2>/dev/null || echo "error")

    if [ "$STATUS" = "200" ]; then
        # 提取关键信息
        TITLE=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('title', 'N/A'))" 2>/dev/null || echo "N/A")
        DESCRIPTION=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('description', 'N/A')[:100] if d.get('description') else 'N/A')" 2>/dev/null || echo "N/A")
        LINKS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('links', [])))" 2>/dev/null || echo "0")
        IMAGES=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('images', [])))" 2>/dev/null || echo "0")

        echo "✓ 成功"
        echo "  标题: $TITLE"
        echo "  描述: ${DESCRIPTION}..."
        echo "  链接数: $LINKS"
        echo "  图片数: $IMAGES"

        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        ERROR=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown error'))" 2>/dev/null || echo "Unknown error")
        echo "✗ 失败: $ERROR"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi

    echo ""
    echo "---"
    echo ""
done

echo "======================================"
echo "测试总结"
echo "======================================"
echo "成功: $SUCCESS_COUNT"
echo "失败: $FAIL_COUNT"
echo "总计: $((SUCCESS_COUNT + FAIL_COUNT))"
echo ""

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "✓ Scrapling 抓取功能正常"
    echo ""
    echo "可用的数据源："
    for site in "${WEBSITES[@]}"; do
        IFS='|' read -r name url mode timeout <<< "$site"
        echo "- $name: $url"
    done
else
    echo "✗ 所有网站抓取失败，请检查网络连接或服务状态"
fi

echo ""
echo "提示："
echo "1. 部分网站可能有反爬虫保护"
echo "2. 可以尝试不同的抓取模式"
echo "3. 网络问题可能导致超时"
echo "4. 建议使用可访问的金融数据源"