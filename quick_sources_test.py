#!/usr/bin/env python3
"""
快速验证优化后的信息源配置
"""

import requests
import json
from datetime import datetime

def test_financial_sources():
    """测试金融股市关键信息源"""
    print("测试优化后的金融股市信息源...")

    test_cases = [
        {"name": "华尔街日报", "url": "https://www.wsj.com/", "category": "顶级财经媒体"},
        {"name": "彭博社", "url": "https://www.bloomberg.com/", "category": "顶级财经媒体"},
        {"name": "路透社财经", "url": "https://www.reuters.com/business/finance/", "category": "权威财经媒体"},
        {"name": "CNBC", "url": "https://www.cnbc.com/", "category": "财经新闻频道"},
        {"name": "第一财经", "url": "https://www.yicai.com/", "category": "国内权威财经"},
        {"name": "财新网", "url": "https://www.caixin.com/", "category": "国内权威财经"},
    ]

    results = []

    for case in test_cases:
        try:
            response = requests.post(
                "http://localhost:5000/api/scrape",
                json={"url": case["url"], "mode": "basic", "timeout": 20},
                timeout=25
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 200:
                    print(f"✓ {case['name']}: 成功抓取")
                    results.append({
                        "name": case["name"],
                        "category": case["category"],
                        "status": "success",
                        "title": data.get("title", ""),
                        "description": data.get("description", ""),
                        "content_length": len(data.get("content", ""))
                    })
                else:
                    print(f"✗ {case['name']}: {data.get('error', '抓取失败')}")
                    results.append({
                        "name": case["name"],
                        "category": case["category"],
                        "status": "failed",
                        "error": data.get("error", "未知错误")
                    })
            else:
                print(f"✗ {case['name']}: HTTP错误 {response.status_code}")
                results.append({
                    "name": case["name"],
                    "category": case["category"],
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                })

        except Exception as e:
            print(f"✗ {case['name']}: {str(e)}")
            results.append({
                "name": case["name"],
                "category": case["category"],
                "status": "error",
                "error": str(e)
            })

    return results

def test_tech_sources():
    """测试科技领域关键信息源"""
    print("\n测试优化后的科技领域信息源...")

    test_cases = [
        {"name": "OpenAI Blog", "url": "https://openai.com/blog", "category": "AI官方博客"},
        {"name": "Google DeepMind", "url": "https://deepmind.google/", "category": "AI研究"},
        {"name": "MIT CSAIL", "url": "https://www.csail.mit.edu/", "category": "顶级研究机构"},
        {"name": "量子位", "url": "https://www.qbitai.com/", "category": "国内AI媒体"},
        {"name": "机器之心", "url": "https://www.jiqizhixin.com/", "category": "国内AI媒体"},
    ]

    results = []

    for case in test_cases:
        try:
            response = requests.post(
                "http://localhost:5000/api/scrape",
                json={"url": case["url"], "mode": "basic", "timeout": 20},
                timeout=25
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 200:
                    print(f"✓ {case['name']}: 成功抓取")
                    results.append({
                        "name": case["name"],
                        "category": case["category"],
                        "status": "success",
                        "title": data.get("title", ""),
                        "description": data.get("description", ""),
                        "content_length": len(data.get("content", ""))
                    })
                else:
                    print(f"✗ {case['name']}: {data.get('error', '抓取失败')}")
                    results.append({
                        "name": case["name"],
                        "category": case["category"],
                        "status": "failed",
                        "error": data.get("error", "未知错误")
                    })
            else:
                print(f"✗ {case['name']}: HTTP错误 {response.status_code}")
                results.append({
                    "name": case["name"],
                    "category": case["category"],
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                })

        except Exception as e:
            print(f"✗ {case['name']}: {str(e)}")
            results.append({
                "name": case["name"],
                "category": case["category"],
                "status": "error",
                "error": str(e)
            })

    return results

def main():
    """主函数"""
    print("="*60)
    print("信息源优化验证测试")
    print("="*60 + "\n")

    # 测试金融源
    financial_results = test_financial_sources()

    # 测试科技源
    tech_results = test_tech_sources()

    # 生成报告
    all_results = financial_results + tech_results

    total = len(all_results)
    successful = sum(1 for r in all_results if r['status'] == 'success')
    failed = total - successful

    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    print(f"总计测试: {total} 个信息源")
    print(f"成功: {successful} 个")
    print(f"失败: {failed} 个")
    print(f"成功率: {(successful/total*100):.1f}%")

    # 按类别统计
    financial_success = sum(1 for r in financial_results if r['status'] == 'success')
    tech_success = sum(1 for r in tech_results if r['status'] == 'success')

    print(f"\n金融股市: {financial_success}/{len(financial_results)} 成功")
    print(f"科技领域: {tech_success}/{len(tech_results)} 成功")

    # 生成JSON报告
    report = {
        "test_type": "信息源优化验证",
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_tests": total,
            "successful": successful,
            "failed": failed,
            "success_rate": round(successful/total*100, 1)
        },
        "category_results": {
            "financial": {
                "total": len(financial_results),
                "successful": financial_success,
                "sources": financial_results
            },
            "tech": {
                "total": len(tech_results),
                "successful": tech_success,
                "sources": tech_results
            }
        }
    }

    # 保存报告
    filename = f"sources_optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n详细报告已保存到: {filename}")

    # 评估结果
    if successful/total >= 0.8:
        print("✅ 信息源优化成功！大部分权威源可正常访问。")
    elif successful/total >= 0.5:
        print("⚠️ 信息源优化部分成功，部分源需要进一步调试。")
    else:
        print("❌ 信息源优化需要重新配置，大部分源无法正常访问。")

    print("\n核心优化成果:")
    print("• 新增华尔街日报、彭博社等顶级财经媒体")
    print("• 新增MIT、Stanford等顶级研究机构")
    print("• 新增OpenAI、DeepMind等AI官方博客")
    print("• 新增财新网、第一财经等国内权威财经媒体")
    print("• 优化权重配置，权威源优先展示")
    print("• 支持Scrapling抓取非RSS源")

if __name__ == "__main__":
    main()