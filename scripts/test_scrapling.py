#!/usr/bin/env python3
"""测试 Scrapling 基本功能"""

from scrapling.fetchers import Fetcher, StealthyFetcher, DynamicFetcher

def test_basic_fetch():
    """测试基本的 HTTP 请求"""
    print("=== 测试基本 Fetch ===")
    try:
        page = Fetcher.get('https://quotes.toscrape.com/')
        print(f"状态码: {page.status}")
        print(f"URL: {page.url}")
        
        # 获取所有引言
        quotes = page.css('.quote .text::text').getall()
        print(f"找到 {len(quotes)} 条引言")
        
        # 获取第一个引言的作者
        author = page.css('.quote .author::text').get()
        print(f"第一个作者: {author}")
        
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_dynamic_fetch():
    """测试动态页面抓取"""
    print("\n=== 测试动态页面抓取 ===")
    try:
        page = DynamicFetcher.fetch('https://quotes.toscrape.com/js/', headless=True, network_idle=True)
        print(f"状态码: {page.status}")
        
        # 获取所有引言
        quotes = page.css('.quote .text::text').getall()
        print(f"找到 {len(quotes)} 条引言")
        
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_stealthy_fetch():
    """测试隐身模式（绕过 Cloudflare 等）"""
    print("\n=== 测试隐身模式 ===")
    try:
        # 测试一个需要 JavaScript 的页面
        page = StealthyFetcher.fetch(
            'https://quotes.toscrape.com/js-delayed/',
            headless=True,
            network_idle=True
        )
        print(f"状态码: {page.status}")
        
        # 等待页面加载后获取内容
        quotes = page.css('.quote .text::text').getall()
        print(f"找到 {len(quotes)} 条引言")
        
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

def extract_article_info(url):
    """从任意 URL 提取文章信息"""
    print(f"\n=== 从 {url} 提取信息 ===")
    try:
        page = Fetcher.get(url)
        
        # 尝试提取常见元素
        title = (
            page.css('h1::text').get() or
            page.css('title::text').get() or
            page.xpath('//h1/text()').get()
        )
        
        # 提取正文内容
        paragraphs = page.css('p::text').getall()
        summary = ' '.join(paragraphs[:3]) if paragraphs else ''
        
        # 提取元数据
        description = page.css('meta[name="description"]::attr(content)').get()
        
        result = {
            'url': url,
            'status': page.status,
            'title': title.strip() if title else '无标题',
            'summary': summary.strip(),
            'description': description,
            'paragraphs_count': len(paragraphs)
        }
        
        print(f"标题: {result['title']}")
        print(f"摘要: {result['summary'][:100]}...")
        print(f"段落数: {result['paragraphs_count']}")
        
        return result
    except Exception as e:
        print(f"错误: {e}")
        return None

if __name__ == "__main__":
    # 测试基本功能
    test_basic_fetch()
    test_dynamic_fetch()
    test_stealthy_fetch()
    
    # 测试从任意 URL 提取信息
    extract_article_info('https://example.com')
    extract_article_info('https://news.ycombinator.com/')