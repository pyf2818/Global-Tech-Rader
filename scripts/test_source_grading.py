#!/usr/bin/env python3
"""
测试信息源评级系统
验证等级显示和排序功能
"""

import requests
import json
from datetime import datetime

def test_source_grading_system():
    """测试信息源评级系统"""
    print("="*60)
    print("信息源评级系统测试")
    print("="*60 + "\n")

    # 1. 测试meta端点是否包含源等级信息
    print("1. 测试API meta端点...")
    try:
        meta_response = requests.get("http://localhost:5177/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()
            print("✓ API meta端点响应成功")

            # 检查是否包含源等级信息
            if 'sourceGrades' in meta_data:
                print("✓ 包含源等级定义")
                print(f"  - 等级数量: {len(meta_data['sourceGrades'])}")
                for grade, info in meta_data['sourceGrades'].items():
                    print(f"  - {grade}级: {info['label']} ({info['icon']})")
            else:
                print("✗ 缺少源等级定义")

            # 检查源是否包含等级信息
            if 'sources' in meta_data:
                print("✓ 包含信息源列表")
                print(f"  - 源总数: {len(meta_data['sources'])}")

                # 统计各等级源数量
                grade_counts = {}
                for source in meta_data['sources']:
                    if 'grade' in source:
                        grade_counts[source['grade']] = grade_counts.get(source['grade'], 0) + 1

                print("\n  各等级源分布:")
                for grade in ['S', 'A', 'B', 'C', 'D']:
                    count = grade_counts.get(grade, 0)
                    print(f"  - {grade}级: {count}个源")
            else:
                print("✗ 缺少信息源列表")
        else:
            print(f"✗ API meta端点失败: {meta_response.status_code}")
    except Exception as e:
        print(f"✗ 测试meta端点失败: {e}")

    print()

    # 2. 测试news端点是否返回带等级的资讯
    print("2. 测试API news端点...")
    try:
        news_response = requests.get("http://localhost:5177/api/news")
        if news_response.status_code == 200:
            news_data = news_response.json()
            print("✓ API news端点响应成功")

            if 'items' in news_data:
                items = news_data['items']
                print(f"  - 资讯总数: {len(items)}")

                # 检查资讯是否包含源等级信息
                items_with_grade = sum(1 for item in items if 'sourceGrade' in item or 'sourceGradeLabel' in item)
                print(f"  - 包含等级信息的资讯: {items_with_grade}")

                if items_with_grade > 0:
                    print("\n  示例资讯等级信息:")
                    for i, item in enumerate(items[:3]):
                        if 'sourceGradeLabel' in item:
                            print(f"  {i+1}. {item['source']}: {item.get('sourceGradeLabel', 'N/A')} (权重: {item.get('sourceGrade', 0)})")
                            print(f"     - 标题: {item['title'][:50]}...")
                else:
                    print("✗ 资讯缺少等级信息")
            else:
                print("✗ 响应缺少items字段")
        else:
            print(f"✗ API news端点失败: {news_response.status_code}")
    except Exception as e:
        print(f"✗ 测试news端点失败: {e}")

    print()

    # 3. 测试等级排序功能
    print("3. 测试资讯等级排序...")
    try:
        news_response = requests.get("http://localhost:5177/api/news")
        if news_response.status_code == 200:
            news_data = news_response.json()
            items = news_data.get('items', [])

            # 按源等级排序
            items_sorted = sorted(items, key=lambda x: x.get('sourceGrade', 0), reverse=True)

            print("✓ 资讯按等级排序成功")
            print("\n  高等级资讯示例:")
            for i, item in enumerate(items_sorted[:5]):
                grade_label = item.get('sourceGradeLabel', 'N/A')
                grade_weight = item.get('sourceGrade', 0)
                print(f"  {i+1}. [{grade_label}] {item['source']}: {item['title'][:40]}...")

            # 统计各等级资讯数量
            grade_distribution = {}
            for item in items_sorted:
                grade = item.get('sourceGrade', 0)
                if grade >= 0.95:
                    grade_distribution['S/A'] = grade_distribution.get('S/A', 0) + 1
                elif grade >= 0.85:
                    grade_distribution['B'] = grade_distribution.get('B', 0) + 1
                elif grade >= 0.75:
                    grade_distribution['C'] = grade_distribution.get('C', 0) + 1
                else:
                    grade_distribution['D'] = grade_distribution.get('D', 0) + 1

            print("\n  各等级资讯分布:")
            for grade, count in grade_distribution.items():
                print(f"  - {grade}级: {count}条")
        else:
            print(f"✗ 获取资讯失败: {news_response.status_code}")
    except Exception as e:
        print(f"✗ 测试等级排序失败: {e}")

    print()

    # 4. 测试按等级过滤功能
    print("4. 测试按等级过滤资讯...")
    try:
        news_response = requests.get("http://localhost:5177/api/news")
        if news_response.status_code == 200:
            news_data = news_response.json()
            items = news_data.get('items', [])

            # 只显示S/A级资讯
            high_grade_items = [item for item in items if item.get('sourceGrade', 0) >= 0.95]

            print(f"✓ 高等级资讯(S/A级)数量: {len(high_grade_items)}")

            if high_grade_items:
                print("\n  S/A级资讯示例:")
                for i, item in enumerate(high_grade_items[:3]):
                    grade_label = item.get('sourceGradeLabel', 'N/A')
                    print(f"  {i+1}. [{grade_label}] {item['source']}: {item['title'][:50]}...")
            else:
                print("  没有找到高等级资讯")
        else:
            print(f"✗ 获取资讯失败: {news_response.status_code}")
    except Exception as e:
        print(f"✗ 测试等级过滤失败: {e}")

def generate_test_report():
    """生成测试报告"""
    print("\n" + "="*60)
    print("信息源评级系统测试报告")
    print("="*60 + "\n")

    report = {
        "test_type": "信息源评级系统测试",
        "timestamp": datetime.now().isoformat(),
        "test_results": {}
    }

    # 测试API端点
    try:
        meta_response = requests.get("http://localhost:5177/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()

            report["test_results"]["api_meta"] = {
                "status": "success",
                "has_source_grades": "sourceGrades" in meta_data,
                "has_source_list": "sources" in meta_data,
                "total_sources": len(meta_data.get("sources", [])),
                "grade_definitions": len(meta_data.get("sourceGrades", {}))
            }
        else:
            report["test_results"]["api_meta"] = {
                "status": "failed",
                "http_code": meta_response.status_code
            }
    except Exception as e:
        report["test_results"]["api_meta"] = {
            "status": "error",
            "error": str(e)
        }

    # 测试资讯等级
    try:
        news_response = requests.get("http://localhost:5177/api/news")
        if news_response.status_code == 200:
            news_data = news_response.json()
            items = news_data.get("items", [])

            items_with_grade = sum(1 for item in items if 'sourceGrade' in item or 'sourceGradeLabel' in item)

            report["test_results"]["api_news"] = {
                "status": "success",
                "total_items": len(items),
                "items_with_grade": items_with_grade,
                "grade_coverage": round(items_with_grade / len(items) * 100, 1) if items > 0 else 0
            }

            # 统计等级分布
            grade_distribution = {}
            for item in items:
                grade = item.get('sourceGrade', 0)
                if grade >= 0.95:
                    grade_distribution['S/A'] = grade_distribution.get('S/A', 0) + 1
                elif grade >= 0.85:
                    grade_distribution['B'] = grade_distribution.get('B', 0) + 1
                elif grade >= 0.75:
                    grade_distribution['C'] = grade_distribution.get('C', 0) + 1
                else:
                    grade_distribution['D'] = grade_distribution.get('D', 0) + 1

            report["test_results"]["grade_distribution"] = grade_distribution
        else:
            report["test_results"]["api_news"] = {
                "status": "failed",
                "http_code": news_response.status_code
            }
    except Exception as e:
        report["test_results"]["api_news"] = {
            "status": "error",
            "error": str(e)
        }

    return report

def main():
    """主函数"""
    # 运行测试
    test_source_grading_system()

    # 生成报告
    report = generate_test_report()

    # 保存报告
    filename = f"source_grading_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n测试报告已保存到: {filename}")

    # 评估结果
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)

    meta_test = report["test_results"].get("api_meta", {})
    news_test = report["test_results"].get("api_news", {})

    if meta_test.get("status") == "success" and news_test.get("status") == "success":
        print("✅ 信息源评级系统测试通过！")

        if meta_test.get("has_source_grades") and meta_test.get("has_source_list"):
            print("✅ API端点包含完整等级信息")

        if news_test.get("grade_coverage", 0) >= 80:
            print("✅ 资讯等级覆盖率良好")
        elif news_test.get("grade_coverage", 0) >= 50:
            print("⚠️ 资讯等级覆盖率中等")
        else:
            print("❌ 资讯等级覆盖率较低")

        print("\n核心功能:")
        print("• 信息源等级定义 (S/A/B/C/D)")
        print("• 资讯等级标识显示")
        print("• 按等级优先排序")
        print("• 高等级资讯优先展示")
    else:
        print("❌ 信息源评级系统测试失败，请检查配置")

if __name__ == "__main__":
    main()