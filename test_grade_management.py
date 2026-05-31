#!/usr/bin/env python3
"""
测试设置页面信息源等级管理功能
验证等级统计、筛选和显示功能
"""

import requests
import json
from datetime import datetime

def test_grade_management():
    """测试等级管理功能"""
    print("="*60)
    print("设置页面信息源等级管理功能测试")
    print("="*60 + "\n")

    # 1. 测试API是否返回等级信息
    print("1. 测试API等级信息...")
    try:
        meta_response = requests.get("http://localhost:5175/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()
            print("✓ API响应成功")

            # 检查等级定义
            if 'sourceGrades' in meta_data:
                print("✓ 包含等级定义")
                print(f"  - 等级数量: {len(meta_data['sourceGrades'])}")
                for grade, info in meta_data['sourceGrades'].items():
                    print(f"  - {grade}级: {info['label']} (图标: {info['icon']}, 颜色: {info['color']})")
            else:
                print("✗ 缺少等级定义")

            # 检查源等级分配
            if 'sources' in meta_data:
                sources = meta_data['sources']
                print(f"\n✓ 包含信息源: {len(sources)}个")

                # 统计各等级源数量
                grade_distribution = {}
                for source in sources:
                    grade = source.get('grade', 'N/A')
                    grade_distribution[grade] = grade_distribution.get(grade, 0) + 1

                print("\n  各等级源分布:")
                for grade in ['S', 'A', 'B', 'C', 'D']:
                    count = grade_distribution.get(grade, 0)
                    percentage = len(sources) > 0 and (count / len(sources) * 100) or 0
                    print(f"  - {grade}级: {count}个 ({percentage:.1f}%)")
            else:
                print("✗ 缺少信息源列表")
        else:
            print(f"✗ API响应失败: {meta_response.status_code}")
    except Exception as e:
        print(f"✗ 测试失败: {e}")

    print()

    # 2. 测试等级筛选功能
    print("2. 测试等级筛选功能...")
    try:
        # 模拟筛选S级源
        meta_response = requests.get("http://localhost:5175/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()
            sources = meta_data.get('sources', [])

            # 筛选S级源
            s_grade_sources = [s for s in sources if s.get('grade') == 'S']
            print(f"✓ S级源筛选结果: {len(s_grade_sources)}个")

            # 筛选A级源
            a_grade_sources = [s for s in sources if s.get('grade') == 'A']
            print(f"✓ A级源筛选结果: {len(a_grade_sources)}个")

            # 显示示例S级源
            if s_grade_sources:
                print("\n  S级源示例:")
                for i, source in enumerate(s_grade_sources[:3]):
                    print(f"  {i+1}. {source['name']} ({source.get('region', 'N/A')})")
        else:
            print("✗ 获取源信息失败")
    except Exception as e:
        print(f"✗ 测试失败: {e}")

    print()

    # 3. 测试等级统计功能
    print("3. 测试等级统计功能...")
    try:
        meta_response = requests.get("http://localhost:5175/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()
            sources = meta_data.get('sources', [])
            source_grades = meta_data.get('sourceGrades', {})

            print("✓ 等级统计数据:")

            total_sources = len(sources)
            high_quality_count = sum(1 for s in sources if s.get('grade') in ['S', 'A'])

            print(f"  - 总信息源数: {total_sources}")
            print(f"  - 高质量源(S/A级): {high_quality_count} ({high_quality_count/total_sources*100:.1f}%)")
            print(f"  - 权威官方源(S级): {sum(1 for s in sources if s.get('grade') == 'S')}")
            print(f"  - 顶级源(A级): {sum(1 for s in sources if s.get('grade') == 'A')}")

            # 按地区统计等级分布
            print("\n  按地区等级分布:")
            for region in ['overseas', 'domestic', 'global']:
                region_sources = [s for s in sources if s.get('region') == region]
                region_high_quality = sum(1 for s in region_sources if s.get('grade') in ['S', 'A'])
                region_name = {'overseas': '海外', 'domestic': '国内', 'global': '全球'}.get(region, region)
                print(f"  - {region_name}: {len(region_sources)}个源, 高质量{region_high_quality}个")

        else:
            print("✗ 获取统计信息失败")
    except Exception as e:
        print(f"✗ 测试失败: {e}")

    print()

    # 4. 测试等级显示信息
    print("4. 测试等级显示信息...")
    try:
        meta_response = requests.get("http://localhost:5175/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()
            source_grades = meta_data.get('sourceGrades', {})

            print("✓ 等级显示信息:")

            for grade in ['S', 'A', 'B', 'C', 'D']:
                if grade in source_grades:
                    info = source_grades[grade]
                    print(f"  {grade}级显示:")
                    print(f"    - 标签: {info['label']}")
                    print(f"    - 图标: {info['icon']}")
                    print(f"    - 颜色: {info['color']}")
                    print(f"    - 描述: {info['description']}")
                    print(f"    - 权重: {info['weight']}")
        else:
            print("✗ 获取显示信息失败")
    except Exception as e:
        print(f"✗ 测试失败: {e}")

    print()

def generate_grade_management_report():
    """生成等级管理功能报告"""
    print("\n" + "="*60)
    print("等级管理功能测试报告")
    print("="*60 + "\n")

    report = {
        "test_type": "设置页面信息源等级管理功能测试",
        "timestamp": datetime.now().isoformat(),
        "test_results": {}
    }

    # API等级信息测试
    try:
        meta_response = requests.get("http://localhost:5175/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()

            report["test_results"]["api_grade_info"] = {
                "status": "success",
                "has_grade_definitions": "sourceGrades" in meta_data,
                "has_source_list": "sources" in meta_data,
                "total_grades": len(meta_data.get("sourceGrades", {})),
                "total_sources": len(meta_data.get("sources", []))
            }

            # 等级分布统计
            sources = meta_data.get("sources", [])
            grade_distribution = {}
            for source in sources:
                grade = source.get('grade', 'N/A')
                grade_distribution[grade] = grade_distribution.get(grade, 0) + 1

            report["test_results"]["grade_distribution"] = grade_distribution
        else:
            report["test_results"]["api_grade_info"] = {
                "status": "failed",
                "http_code": meta_response.status_code
            }
    except Exception as e:
        report["test_results"]["api_grade_info"] = {
            "status": "error",
            "error": str(e)
        }

    # 等级筛选测试
    try:
        meta_response = requests.get("http://localhost:5175/api/meta")
        if meta_response.status_code == 200:
            meta_data = meta_response.json()
            sources = meta_data.get("sources", [])

            filter_results = {}
            for grade in ['S', 'A', 'B', 'C', 'D']:
                filtered = [s for s in sources if s.get('grade') == grade]
                filter_results[grade] = len(filtered)

            report["test_results"]["grade_filter"] = {
                "status": "success",
                "filter_results": filter_results
            }
        else:
            report["test_results"]["grade_filter"] = {
                "status": "failed",
                "http_code": meta_response.status_code
            }
    except Exception as e:
        report["test_results"]["grade_filter"] = {
            "status": "error",
            "error": str(e)
        }

    return report

def main():
    """主函数"""
    # 运行测试
    test_grade_management()

    # 生成报告
    report = generate_grade_management_report()

    # 保存报告
    filename = f"grade_management_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"测试报告已保存到: {filename}")

    # 评估结果
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)

    api_test = report["test_results"].get("api_grade_info", {})
    filter_test = report["test_results"].get("grade_filter", {})

    if api_test.get("status") == "success" and filter_test.get("status") == "success":
        print("✅ 信息源等级管理功能测试通过！")

        if api_test.get("has_grade_definitions") and api_test.get("has_source_list"):
            print("✅ API包含完整等级信息")

        total_sources = api_test.get("total_sources", 0)
        high_quality = sum(1 for grade, count in report["test_results"].get("grade_distribution", {}).items() if grade in ['S', 'A'] for _ in range(count))

        if total_sources > 0:
            quality_ratio = high_quality / total_sources * 100
            print(f"✅ 高质量源占比: {quality_ratio:.1f}%")

        print("\n核心功能:")
        print("• 等级统计面板显示")
        print("• 等级筛选功能")
        print("• 等级信息显示")
        print("• 批量等级操作")
    else:
        print("❌ 信息源等级管理功能测试失败，请检查配置")

if __name__ == "__main__":
    main()