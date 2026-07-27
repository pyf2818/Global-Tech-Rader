#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描完全相同的规则（selector + body 都相同），删除前面定义保留最后一个"""
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
            rule_text = ''
            for k in range(selector_start, j + 1):
                rule_text += lines[k] + '\n'
            selector = rule_text.split('{', 1)[0].strip()
            selector_norm = re.sub(r'\s+', ' ', selector)
            body = rule_text.split('{', 1)[1] if '{' in rule_text else ''
            last_brace = body.rfind('}')
            if last_brace != -1:
                body = body[:last_brace]
            body_norm = re.sub(r'\s+', ' ', body.strip())
            rules.append((selector_start + 1, j + 1, selector_norm, body_norm))
            i = j + 1
            continue
        i += 1
    return rules


all_rules = parse_all_rules()
print(f"总规则数: {len(all_rules)}")

# 按 (selector, body) 分组
groups = defaultdict(list)
for s, e, sel, body in all_rules:
    groups[(sel, body)].append((s, e))

# 找重复的
exact_dups = {k: v for k, v in groups.items() if len(v) > 1}
print(f"\n完全相同规则（selector + body 重复）: {len(exact_dups)} 组")

# 收集可删除范围：保留每组最后一个，删除前面所有
to_delete = []
total_del = 0
for (sel, body), locs in exact_dups.items():
    # locs 已按出现顺序（行号升序）
    for s, e in locs[:-1]:
        to_delete.append((s, e, sel))
        total_del += e - s + 1

print(f"可删除范围: {len(to_delete)} 个, 共 {total_del} 行")
to_delete.sort(key=lambda x: -x[0])
print("\n=== 前 30 个 ===")
for s, e, sel in to_delete[:30]:
    print(f"  L{s}-{e}: {sel[:70]}")
