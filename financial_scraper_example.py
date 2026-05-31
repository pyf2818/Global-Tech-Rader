#!/usr/bin/env python3
"""
金融数据抓取示例
演示如何使用 Scrapling 获取股市走向数据和财经资讯
"""

import requests
import json
from datetime import datetime
import time

class FinancialDataScraper:
    """金融数据抓取器"""

    def __init__(self, api_url="http://localhost:5000/api/scrape"):
        self.api_url = api_url

    def scrape_website(self, url, mode="basic", timeout=30):
        """抓取指定网站的数据"""
        try:
            payload = {
                "url": url,
                "mode": mode,
                "timeout": timeout
            }
            response = requests.post(self.api_url, json=payload, timeout=timeout + 10)
            return response.json()
        except Exception as e:
            return {"error": str(e), "status": "error"}

    def get_sina_finance_news(self):
        """获取新浪财经资讯"""
        print("抓取新浪财经...")
        data = self.scrape_website("https://finance.sina.com.cn/", "basic", 30)

        return {
            "source": "新浪财经",
            "url": "https://finance.sina.com.cn/",
            "title": data.get("title"),
            "description": data.get("description"),
            "keywords": data.get("keywords"),
            "links_count": len(data.get("links", [])),
            "images_count": len(data.get("images", [])),
            "status": data.get("status"),
            "timestamp": datetime.now().isoformat()
        }

    def get_shanghai_securities_news(self):
        """获取上证报资讯"""
        print("抓取上证报...")
        data = self.scrape_website("https://www.cnstock.com/", "basic", 30)

        return {
            "source": "上海证券报",
            "url": "https://www.cnstock.com/",
            "title": data.get("title"),
            "description": data.get("description"),
            "links_count": len(data.get("links", [])),
            "status": data.get("status"),
            "timestamp": datetime.now().isoformat()
        }

    def get_nasdaq_data(self):
        """获取纳斯达克数据"""
        print("抓取纳斯达克...")
        data = self.scrape_website("https://www.nasdaq.com/", "basic", 30)

        return {
            "source": "纳斯达克",
            "url": "https://www.nasdaq.com/",
            "title": data.get("title"),
            "description": data.get("description"),
            "keywords": data.get("keywords"),
            "links_count": len(data.get("links", [])),
            "status": data.get("status"),
            "timestamp": datetime.now().isoformat()
        }

    def analyze_market_sentiment(self, data_list):
        """分析市场情绪"""
        total_links = 0
        total_keywords = 0
        sources = []

        for data in data_list:
            if data.get("status") == 200:
                total_links += data.get("links_count", 0)
                if data.get("keywords"):
                    keywords = data.get("keywords", "").split(",")
                    total_keywords += len(keywords)
                sources.append(data.get("source"))

        return {
            "sources_count": len(sources),
            "sources": sources,
            "total_links": total_links,
            "avg_keywords_per_source": total_keywords // len(sources) if sources else 0,
            "analysis_time": datetime.now().isoformat()
        }

    def generate_market_report(self):
        """生成市场报告"""
        print("\n" + "="*50)
        print("生成股市走向数据分析报告")
        print("="*50 + "\n")

        # 抓取多个数据源
        data_list = []

        # 新浪财经
        sina_data = self.get_sina_finance_news()
        data_list.append(sina_data)
        time.sleep(1)  # 避免请求过于频繁

        # 上证报
        sh_data = self.get_shanghai_securities_news()
        data_list.append(sh_data)
        time.sleep(1)

        # 纳斯达克
        nasdaq_data = self.get_nasdaq_data()
        data_list.append(nasdaq_data)

        # 分析市场情绪
        sentiment = self.analyze_market_sentiment(data_list)

        # 生成报告
        report = {
            "report_type": "股市走向数据分析",
            "generation_time": datetime.now().isoformat(),
            "data_sources": data_list,
            "market_sentiment": sentiment,
            "summary": self._generate_summary(data_list, sentiment)
        }

        return report

    def _generate_summary(self, data_list, sentiment):
        """生成摘要"""
        successful_sources = [d.get("source") for d in data_list if d.get("status") == 200]
        failed_sources = [d.get("url") for d in data_list if d.get("status") != 200]

        summary = f"成功抓取 {len(successful_sources)} 个财经数据源"

        if successful_sources:
            summary += f": {', '.join(successful_sources)}"

        if failed_sources:
            summary += f"\n失败的源: {', '.join(failed_sources)}"

        summary += f"\n\n市场情绪分析: 共获取 {sentiment['total_links']} 条财经资讯链接"
        summary += f"\n平均每个数据源提供 {sentiment['avg_keywords_per_source']} 个关键词"

        return summary


def main():
    """主函数"""
    scraper = FinancialDataScraper()

    try:
        # 生成市场报告
        report = scraper.generate_market_report()

        # 打印报告
        print(json.dumps(report, ensure_ascii=False, indent=2))

        # 保存报告到文件
        filename = f"market_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"\n报告已保存到: {filename}")

    except KeyboardInterrupt:
        print("\n\n用户中断操作")
    except Exception as e:
        print(f"\n\n发生错误: {e}")


if __name__ == "__main__":
    main()