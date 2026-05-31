#!/usr/bin/env python3
"""
测试优化后的信息源配置
验证金融股市和科技领域的高质量信息源
"""

import requests
import json
from datetime import datetime
import time

class OptimizedSourcesTester:
    """优化后信息源测试器"""

    def __init__(self, api_url="http://localhost:5000/api/scrape"):
        self.api_url = api_url
        self.results = []

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

    def test_financial_sources(self):
        """测试金融股市信息源"""
        print("\n" + "="*60)
        print("测试金融股市权威信息源")
        print("="*60 + "\n")

        financial_sources = [
            {"name": "华尔街日报", "url": "https://www.wsj.com/", "mode": "stealth"},
            {"name": "彭博社", "url": "https://www.bloomberg.com/", "mode": "stealth"},
            {"name": "路透社财经", "url": "https://www.reuters.com/business/finance/", "mode": "basic"},
            {"name": "CNBC", "url": "https://www.cnbc.com/", "mode": "dynamic"},
            {"name": "金融时报", "url": "https://www.ft.com/", "mode": "stealth"},
            {"name": "财新网", "url": "https://www.caixin.com/", "mode": "dynamic"},
            {"name": "第一财经", "url": "https://www.yicai.com/", "mode": "dynamic"},
        ]

        for source in financial_sources:
            print(f"测试: {source['name']} ({source['url']})")
            print(f"模式: {source['mode']}, 超时: 30s")

            data = self.scrape_website(source['url'], source['mode'], 30)

            if data.get("status") == 200:
                print("✓ 成功")
                result = {
                    "name": source['name'],
                    "url": source['url'],
                    "status": "success",
                    "title": data.get("title", ""),
                    "description": data.get("description", ""),
                    "keywords": data.get("keywords", ""),
                    "links_count": len(data.get("links", [])),
                    "images_count": len(data.get("images", [])),
                    "content_length": len(data.get("content", "")),
                    "mode": source['mode']
                }
            else:
                print(f"✗ 失败: {data.get('error', 'Unknown error')}")
                result = {
                    "name": source['name'],
                    "url": source['url'],
                    "status": "failed",
                    "error": data.get("error", "Unknown error"),
                    "mode": source['mode']
                }

            self.results.append(result)
            print(f"  - 标题: {result.get('title', 'N/A')[:80]}...")
            print(f"  - 描述: {result.get('description', 'N/A')[:80]}...")
            print(f"  - 链接数: {result.get('links_count', 0)}, 图片数: {result.get('images_count', 0)}")
            print()

            time.sleep(2)  # 避免请求过于频繁

    def test_tech_sources(self):
        """测试科技领域权威信息源"""
        print("\n" + "="*60)
        print("测试科技领域权威信息源")
        print("="*60 + "\n")

        tech_sources = [
            {"name": "MIT CSAIL", "url": "https://www.csail.mit.edu/", "mode": "basic"},
            {"name": "Stanford AI", "url": "https://ai.stanford.edu/", "mode": "basic"},
            {"name": "Google DeepMind", "url": "https://deepmind.google/", "mode": "dynamic"},
            {"name": "OpenAI", "url": "https://openai.com/", "mode": "basic"},
            {"name": "Anthropic", "url": "https://www.anthropic.com/", "mode": "basic"},
            {"name": "量子位", "url": "https://www.qbitai.com/", "mode": "dynamic"},
            {"name": "机器之心", "url": "https://www.jiqizhixin.com/", "mode": "dynamic"},
        ]

        for source in tech_sources:
            print(f"测试: {source['name']} ({source['url']})")
            print(f"模式: {source['mode']}, 超时: 30s")

            data = self.scrape_website(source['url'], source['mode'], 30)

            if data.get("status") == 200:
                print("✓ 成功")
                result = {
                    "name": source['name'],
                    "url": source['url'],
                    "status": "success",
                    "title": data.get("title", ""),
                    "description": data.get("description", ""),
                    "keywords": data.get("keywords", ""),
                    "links_count": len(data.get("links", [])),
                    "images_count": len(data.get("images", [])),
                    "content_length": len(data.get("content", "")),
                    "mode": source['mode']
                }
            else:
                print(f"✗ 失败: {data.get('error', 'Unknown error')}")
                result = {
                    "name": source['name'],
                    "url": source['url'],
                    "status": "failed",
                    "error": data.get("error", "Unknown error"),
                    "mode": source['mode']
                }

            self.results.append(result)
            print(f"  - 标题: {result.get('title', 'N/A')[:80]}...")
            print(f"  - 描述: {result.get('description', 'N/A')[:80]}...")
            print(f"  - 链接数: {result.get('links_count', 0)}, 图片数: {result.get('images_count', 0)}")
            print()

            time.sleep(2)  # 避免请求过于频繁

    def test_academic_sources(self):
        """测试学术权威信息源"""
        print("\n" + "="*60)
        print("测试学术权威信息源")
        print("="*60 + "\n")

        academic_sources = [
            {"name": "Nature", "url": "https://www.nature.com/", "mode": "basic"},
            {"name": "Science Magazine", "url": "https://www.science.org/", "mode": "basic"},
            {"name": "ArXiv", "url": "https://arxiv.org/", "mode": "basic"},
            {"name": "MIT Technology Review", "url": "https://www.technologyreview.com/", "mode": "dynamic"},
        ]

        for source in academic_sources:
            print(f"测试: {source['name']} ({source['url']})")
            print(f"模式: {source['mode']}, 超时: 30s")

            data = self.scrape_website(source['url'], source['mode'], 30)

            if data.get("status") == 200:
                print("✓ 成功")
                result = {
                    "name": source['name'],
                    "url": source['url'],
                    "status": "success",
                    "title": data.get("title", ""),
                    "description": data.get("description", ""),
                    "keywords": data.get("keywords", ""),
                    "links_count": len(data.get("links", [])),
                    "images_count": len(data.get("images", [])),
                    "content_length": len(data.get("content", "")),
                    "mode": source['mode']
                }
            else:
                print(f"✗ 失败: {data.get('error', 'Unknown error')}")
                result = {
                    "name": source['name'],
                    "url": source['url'],
                    "status": "failed",
                    "error": data.get("error", "Unknown error"),
                    "mode": source['mode']
                }

            self.results.append(result)
            print(f"  - 标题: {result.get('title', 'N/A')[:80]}...")
            print(f"  - 描述: {result.get('description', 'N/A')[:80]}...")
            print(f"  - 链接数: {result.get('links_count', 0)}, 图片数: {result.get('images_count', 0)}")
            print()

            time.sleep(2)  # 避免请求过于频繁

    def generate_report(self):
        """生成测试报告"""
        print("\n" + "="*60)
        print("优化信息源测试报告")
        print("="*60 + "\n")

        # 统计结果
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results if r['status'] == 'success')
        failed_tests = total_tests - successful_tests

        print(f"总测试数: {total_tests}")
        print(f"成功: {successful_tests}")
        print(f"失败: {failed_tests}")
        print(f"成功率: {(successful_tests/total_tests*100):.1f}%")
        print()

        # 按类别统计
        financial_results = [r for r in self.results if 'wsj.com' in r['url'] or 'bloomberg.com' in r['url'] or 'reuters.com' in r['url'] or 'cnbc.com' in r['url'] or 'caixin.com' in r['url'] or 'yicai.com' in r['url']]
        tech_results = [r for r in self.results if 'mit.edu' in r['url'] or 'stanford.edu' in r['url'] or 'deepmind.google' in r['url'] or 'openai.com' in r['url'] or 'qbitai.com' in r['url'] or 'jiqizhixin.com' in r['url']]
        academic_results = [r for r in self.results if 'nature.com' in r['url'] or 'science.org' in r['url'] or 'arxiv.org' in r['url'] or 'technologyreview.com' in r['url']]

        print("按类别统计:")
        print(f"金融股市: {len([r for r in financial_results if r['status'] == 'success'])}/{len(financial_results)} 成功")
        print(f"科技领域: {len([r for r in tech_results if r['status'] == 'success'])}/{len(tech_results)} 成功")
        print(f"学术权威: {len([r for r in academic_results if r['status'] == 'success'])}/{len(academic_results)} 成功")
        print()

        # 生成JSON报告
        report = {
            "report_type": "优化信息源测试报告",
            "generation_time": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate": round(successful_tests/total_tests*100, 1)
            },
            "category_stats": {
                "financial": {
                    "total": len(financial_results),
                    "successful": len([r for r in financial_results if r['status'] == 'success']),
                    "sources": financial_results
                },
                "tech": {
                    "total": len(tech_results),
                    "successful": len([r for r in tech_results if r['status'] == 'success']),
                    "sources": tech_results
                },
                "academic": {
                    "total": len(academic_results),
                    "successful": len([r for r in academic_results if r['status'] == 'success']),
                    "sources": academic_results
                }
            },
            "detailed_results": self.results
        }

        return report

def main():
    """主函数"""
    tester = OptimizedSourcesTester()

    try:
        # 测试金融股市源
        tester.test_financial_sources()

        # 测试科技源
        tester.test_tech_sources()

        # 测试学术源
        tester.test_academic_sources()

        # 生成报告
        report = tester.generate_report()

        # 保存报告
        filename = f"optimized_sources_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"测试报告已保存到: {filename}")

        # 显示简化的摘要
        print("\n" + "="*60)
        print("测试摘要")
        print("="*60)
        print(f"总测试: {report['summary']['total_tests']} 个信息源")
        print(f"成功: {report['summary']['successful_tests']} 个")
        print(f"失败: {report['summary']['failed_tests']} 个")
        print(f"成功率: {report['summary']['success_rate']}%")
        print()

        if report['summary']['success_rate'] >= 80:
            print("✅ 信息源优化成功！大部分权威源可正常访问。")
        elif report['summary']['success_rate'] >= 60:
            print("⚠️ 信息源优化部分成功，部分源需要进一步调试。")
        else:
            print("❌ 信息源优化需要重新配置，大部分源无法正常访问。")

    except KeyboardInterrupt:
        print("\n\n用户中断测试")
    except Exception as e:
        print(f"\n\n测试过程出错: {e}")

if __name__ == "__main__":
    main()