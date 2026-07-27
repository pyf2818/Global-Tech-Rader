#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精确分析同 selector 重复定义，找出完全被最后定义覆盖的（可安全删除）。
比较每个属性的覆盖情况。
正确处理单行规则（{ 和 } 在同一行）和跨行规则。
"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

css = CSS_PATH.read_text(encoding='utf-8')
lines = css.splitlines()
total = len(lines)


def parse_all_rules():
    rules = []
    i = 0
    while i < total:
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith('/*') or stripped.startswith('*'):
            i += 1
            continue
        if '{' in line:
            brace_pos = line.index('{')
            selector_start = i
            while selector_start > 0:
                prev = lines[selector_start - 1].strip()
                if not prev or prev.endswith('}') or prev.endswith('{'):
                    break
                if prev.endswith(',') or re.search(r'[.#][a-zA-Z]', prev) or prev.startswith('@'):
                    selector_start -= 1
                else:
                    break
            brace = line.count('{') - line.count('}')
            j = i
            if brace > 0:
                j = i + 1
                while j < total and brace > 0:
                    brace += lines[j].count('{') - lines[j].count('}')
                    if brace <= 0:
                        break
                    j += 1
            # 提取完整 rule 文本（包含 selector、{、body、}）
            rule_text = ''
            for k in range(selector_start, j + 1):
                rule_text += lines[k] + '\n'
            selector = rule_text.split('{', 1)[0].strip()
            selector_norm = re.sub(r'\s+', ' ', selector)
            # 提取 body：第一个 { 到最后一个匹配的 } 之间
            body = rule_text.split('{', 1)[1] if '{' in rule_text else ''
            # 找最后一个 }（如果有），截掉它
            last_brace = body.rfind('}')
            if last_brace != -1:
                body = body[:last_brace]
            # 解析 body 中的属性名
            props = set()
            for prop_match in re.finditer(r'([\w-]+)\s*:', body):
                # 排除伪选择器中的冒号，如 a:hover
                # 实际属性冒号前面没有特殊字符，这里粗略过滤
                pname = prop_match.group(1)
                # 排除 --var (CSS 变量定义算属性 --foo)
                # 实际上 --foo 也是属性名
                props.add(pname)
            rules.append((selector_start + 1, j + 1, selector, selector_norm, props, body.strip()))
            i = j + 1
            continue
        i += 1
    return rules


all_rules = parse_all_rules()
print(f"总规则数: {len(all_rules)}")

# 按 selector 分组
sel_groups = defaultdict(list)
for s, e, sel, sel_norm, props, body in all_rules:
    sel_groups[sel_norm].append((s, e, sel, props, body))

# 找重复
dups = {k: v for k, v in sel_groups.items() if len(v) > 1}
print(f"同 selector 重复定义: {len(dups)} 个\n")

# 找完全被最后定义覆盖的（前面定义的所有属性都在最后定义中）
fully_covered = []
partially_covered = []

for sel, locs in dups.items():
    if len(locs) < 2:
        continue
    # 最后一个定义
    last_props = locs[-1][3]
    # 前面的定义
    for idx in range(len(locs) - 1):
        s, e, _, props, body = locs[idx]
        # 检查这个定义的所有属性是否都在最后定义中
        if props.issubset(last_props):
            fully_covered.append((s, e, sel, props, locs[-1][0], locs[-1][1]))
        else:
            missing = props - last_props
            partially_covered.append((s, e, sel, missing, locs[-1][0], locs[-1][1]))

print(f"=== 完全被覆盖（可安全删除）: {len(fully_covered)} ===")
# 按行号排序
fully_covered.sort(key=lambda x: x[0])
total_lines_to_delete = sum(e - s + 1 for s, e, _, _, _, _ in fully_covered)
print(f"总行数: {total_lines_to_delete}")
for s, e, sel, _, _, _ in fully_covered[:30]:
    print(f"  L{s}-{e}: {sel[:70]}")

print(f"\n=== 部分覆盖（有独有属性，需保留）: {len(partially_covered)} ===")
for s, e, sel, missing, _, _ in partially_covered[:15]:
    print(f"  L{s}-{e}: {sel[:60]} | 独有: {missing}")

# 输出可删除范围（Python 列表格式，按行号降序）
print(f"\n=== 可删除范围（按行号降序）===")
ranges = sorted([(s, e) for s, e, _, _, _, _ in fully_covered], key=lambda x: -x[0])
for s, e in ranges:
    print(f"    ({s}, {e}),")

print(f"\n汇总: 可删除 {len(fully_covered)} 个规则, {total_lines_to_delete} 行")
