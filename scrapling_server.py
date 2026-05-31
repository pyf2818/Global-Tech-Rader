#!/usr/bin/env python3
"""
基于 Scrapling 的网页抓取服务
为 Global Tech Radar 项目提供任意网页信息获取能力
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from scrapling.fetchers import Fetcher, StealthyFetcher, DynamicFetcher
import logging
from typing import Optional, Dict, Any

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求


def extract_content(page, url: str) -> Dict[str, Any]:
    """
    从抓取的页面中提取内容

    Args:
        page: Scrapling Response 对象
        url: 原始 URL

    Returns:
        包含提取信息的字典
    """
    try:
        # 提取标题
        title = (
            page.css('h1::text').get() or
            page.css('title::text').get() or
            page.xpath('//h1/text()').get() or
            page.xpath('//title/text()').get() or
            '无标题'
        )

        # 提取正文段落
        paragraphs = page.css('p::text').getall()
        if not paragraphs:
            paragraphs = page.xpath('//p/text()').getall()

        # 生成摘要（前 3 段）
        summary = ' '.join(paragraphs[:3]) if paragraphs else ''

        # 提取元数据
        description = page.css('meta[name="description"]::attr(content)').get()
        keywords = page.css('meta[name="keywords"]::attr(content)').get()

        # 提取作者（如果有）
        author = (
            page.css('[rel="author"]::text').get() or
            page.css('.author::text').get() or
            page.css('meta[name="author"]::attr(content)').get()
        )

        # 提取发布时间（如果有）
        published_date = (
            page.css('time::attr(datetime)').get() or
            page.css('[property="article:published_time"]::attr(content)').get() or
            page.css('meta[name="date"]::attr(content)').get()
        )

        # 提取图片
        images = []
        for img in page.css('img')[:5]:  # 最多取 5 张图片
            src = img.attrib.get('src') or img.attrib.get('data-src')
            alt = img.attrib.get('alt', '')
            if src:
                # 处理相对路径
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    from urllib.parse import urljoin
                    src = urljoin(url, src)
                images.append({'src': src, 'alt': alt})

        # 提取链接
        links = []
        for link in page.css('a')[:10]:  # 最多取 10 个链接
            href = link.attrib.get('href')
            text = link.css('::text').get()
            if href and text:
                from urllib.parse import urljoin
                full_url = urljoin(url, href)
                links.append({'url': full_url, 'text': text.strip()})

        # 提取所有文本内容
        all_text = ' '.join([p.strip() for p in paragraphs if p.strip()])

        return {
            'url': url,
            'status': page.status,
            'title': title.strip(),
            'summary': summary.strip(),
            'description': description,
            'keywords': keywords,
            'author': author.strip() if author else None,
            'published_date': published_date,
            'images': images,
            'links': links,
            'paragraphs_count': len(paragraphs),
            'content_length': len(all_text),
            'html': page.text[:5000] if page.text else ''  # 限制返回的 HTML 长度
        }

    except Exception as e:
        logger.error(f"提取内容时出错: {e}")
        return {
            'url': url,
            'status': page.status if page else 0,
            'error': str(e),
            'title': '提取失败'
        }


@app.route('/api/scrape', methods=['GET', 'POST'])
def scrape():
    """
    抓取网页内容的 API 端点

    支持的参数:
    - url: 要抓取的 URL（必需）
    - mode: 抓取模式 - 'basic'（默认）、'dynamic'（浏览器）、'stealth'（隐身）
    - timeout: 超时时间（秒），默认 30

    返回:
    - JSON 格式的网页内容
    """
    try:
        # 获取参数
        if request.method == 'POST':
            data = request.get_json() or {}
            url = data.get('url')
            mode = data.get('mode', 'basic')
            timeout = data.get('timeout', 30)
        else:
            url = request.args.get('url')
            mode = request.args.get('mode', 'basic')
            timeout = int(request.args.get('timeout', 30))

        if not url:
            return jsonify({'error': 'URL 参数是必需的'}), 400

        logger.info(f"抓取请求: url={url}, mode={mode}")

        # 根据模式选择抓取方式
        if mode == 'dynamic':
            # 动态页面（使用浏览器）
            logger.info("使用 DynamicFetcher")
            page = DynamicFetcher.fetch(
                url,
                headless=True,
                network_idle=True,
                timeout=timeout * 1000  # 转换为毫秒
            )
        elif mode == 'stealth':
            # 隐身模式（绕过反爬）
            logger.info("使用 StealthyFetcher")
            page = StealthyFetcher.fetch(
                url,
                headless=True,
                network_idle=True,
                timeout=timeout * 1000
            )
        else:
            # 基本模式（HTTP 请求）
            logger.info("使用 Fetcher")
            page = Fetcher.get(url, timeout=timeout)

        # 提取内容
        result = extract_content(page, url)

        logger.info(f"成功抓取: {result['title']}")
        return jsonify(result)

    except Exception as e:
        logger.error(f"抓取失败: {e}")
        return jsonify({
            'error': str(e),
            'url': url if 'url' in locals() else None,
            'status': 'error'
        }), 500


@app.route('/api/health', methods=['GET'])
def health():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'Scrapling Web Scraper API',
        'version': '1.0.0'
    })


@app.route('/api/test', methods=['GET'])
def test():
    """测试端点"""
    try:
        page = Fetcher.get('https://example.com')
        return jsonify({
            'status': 'success',
            'url': page.url,
            'title': page.css('h1::text').get(),
            'status_code': page.status
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # 启动服务
    port = 5000
    logger.info(f"启动 Scrapling 服务，端口: {port}")
    app.run(host='0.0.0.0', port=port, debug=True)