#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 styles.css 中同 selector 的重复定义。
后续定义会覆盖前面（除非有优先级差异），可合并去重。
"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

css = CSS_PATH.read_text(encoding='utf-8')
lines = css.splitlines()
total = len(lines)

# 解析所有规则
def parse_rules():
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
            selector = ''
            for k in range(selector_start, i + 1):
                selector += lines[k]
            selector = selector.split('{')[0].strip()
            body = '\n'.join(lines[i+1:j])
            rules.append((selector_start + 1, j + 1, selector, body))
            i = j + 1
            continue
        i += 1
    return rules

rules = parse_rules()
print(f"总规则数: {len(rules)}")

# 同 selector 出现多次
sel_groups = defaultdict(list)
for s, e, sel, body in rules:
    if not sel.startswith('@'):
        sel_groups[sel].append((s, e, body))

# 找重复的
dups = {k: v for k, v in sel_groups.items() if len(v) > 1}
print(f"\n同 selector 重复定义: {len(dups)} 个")

# 按重复次数排序
sorted_dups = sorted(dups.items(), key=lambda x: -len(x[1]))
print("\n=== Top 30 重复 selector ===")
for sel, locs in sorted_dups[:30]:
    print(f"\n  [{len(locs)}x] {sel[:80]}")
    for s, e, body in locs:
        # 简短显示 body
        b = re.sub(r'\s+', ' ', body.strip())[:60]
        print(f"    L{s}-{e}: {b}")
