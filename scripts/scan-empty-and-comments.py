#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 styles.css 中的空规则和大块注释，找出可瘦身的部分。
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

css = CSS_PATH.read_text(encoding='utf-8')
lines = css.splitlines()
total = len(lines)

# 1. 找空规则（{} 之间只有空白）
print("=== 空规则 ===")
empty_rules = []
i = 0
while i < total:
    line = lines[i]
    stripped = line.strip()
    if '{' in line and '}' in line:
        # 单行规则
        body_match = re.search(r'\{([^{}]*)\}', line)
        if body_match and body_match.group(1).strip() == '':
            empty_rules.append((i + 1, line.strip()[:80]))
        i += 1
        continue
    if '{' in line:
        # 多行规则 - 找匹配 }
        brace = line.count('{') - line.count('}')
        j = i + 1
        while j < total and brace > 0:
            brace += lines[j].count('{') - lines[j].count('}')
            if brace <= 0:
                break
            j += 1
        # 检查 body 是否为空
        body = '\n'.join(lines[i+1:j])
        if body.strip() == '':
            selector = line.split('{')[0].strip()
            empty_rules.append((i + 1, j + 1, selector[:80]))
        i = j + 1
        continue
    i += 1

print(f"找到 {len(empty_rules)} 个空规则")
for r in empty_rules[:20]:
    print(f"  {r}")

# 2. 找大块连续注释（>=3 行的 /* ... */ 块）
print("\n=== 大块连续注释 (>=3 行) ===")
big_comments = []
i = 0
while i < total:
    line = lines[i]
    s = line.strip()
    if s.startswith('/*') and not s.endswith('*/'):
        # 多行注释开始
        start = i + 1
        j = i + 1
        while j < total:
            if '*/' in lines[j]:
                break
            j += 1
        if j - i + 1 >= 3:
            big_comments.append((start, j + 1, j - i + 1, lines[i].strip()[:60]))
        i = j + 1
        continue
    i += 1

print(f"找到 {len(big_comments)} 个大块注释 (>=3 行)")
total_comment_lines = sum(c[2] for c in big_comments)
print(f"总行数: {total_comment_lines}")
for c in big_comments[:30]:
    print(f"  L{c[0]}-{c[1]} ({c[2]} 行): {c[3]}")

# 3. 找连续的纯注释行（包括单行 /* */）
print("\n=== 连续单行注释块 (>=5 行) ===")
comment_runs = []
i = 0
while i < total:
    line = lines[i]
    s = line.strip()
    if s.startswith('/*') and s.endswith('*/'):
        start = i + 1
        j = i + 1
        while j < total:
            s2 = lines[j].strip()
            if s2.startswith('/*') and s2.endswith('*/'):
                j += 1
                continue
            break
        if j - i >= 5:
            comment_runs.append((start, j, j - i, lines[i].strip()[:60]))
        i = j
        continue
    i += 1

print(f"找到 {len(comment_runs)} 个连续单行注释块 (>=5 行)")
total_run_lines = sum(c[2] for c in comment_runs)
print(f"总行数: {total_run_lines}")
for c in comment_runs[:30]:
    print(f"  L{c[0]}-{c[1]} ({c[2]} 行): {c[3]}")

# 4. 找长属性值（如 transform: translate3d(...) 等可能可以简化的）
print("\n=== 长属性值分析 ===")
long_props = []
for i, line in enumerate(lines, 1):
    s = line.strip()
    # 跳过注释
    if s.startswith('/*') or s.startswith('*'):
        continue
    if len(s) > 200 and ':' in s and not s.startswith('@'):
        long_props.append((i, len(s), s[:80]))

print(f"找到 {len(long_props)} 个超长属性行 (>200 chars)")
for p in long_props[:10]:
    print(f"  L{p[0]} ({p[1]} chars): {p[2]}")
