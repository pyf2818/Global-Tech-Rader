#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
删除 styles.css 中 /* ====...==== */ 风格的分隔注释块。
策略：识别以 /* ===== 或 /* ----- 开头的连续注释行块，连同紧邻的空行一并删除。
按行号降序删除以避免偏移。
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

lines = CSS_PATH.read_text(encoding='utf-8').splitlines(keepends=True)
total = len(lines)
print(f"原始行数: {total}")

# 识别分隔注释块：以 /* ==== 或 /* ---- 开头，到 */ 结束
ranges = []
i = 0
while i < total:
    line = lines[i]
    stripped = line.lstrip()
    if stripped.startswith('/*') and ('====' in stripped or '----' in stripped):
        start = i
        # 向下扫描，直到行包含 */
        while i < total and '*/' not in lines[i]:
            i += 1
        # 包含 */ 这行
        end = i
        # 检查后续是否还有连续的注释行（如多行 ===）
        # 通常一个注释块只有一行 */ 结尾，下面是空行或新规则
        # 扩展：吞掉紧邻的空行（最多1个）
        if end + 1 < total and lines[end + 1].strip() == '':
            end += 1
        ranges.append((start, end))
        i = end + 1
        continue
    i += 1

print(f"识别分隔注释块: {len(ranges)} 个")
total_del = sum(e - s + 1 for s, e in ranges)
print(f"将删除: {total_del} 行")

for s, e in ranges[:5]:
    preview = ''.join(lines[s:e+1]).rstrip()
    print(f"  L{s+1}-{e+1}: {preview[:80]!r}")

# 降序删除
ranges.sort(key=lambda x: -x[0])
for s, e in ranges:
    del lines[s:e+1]

# 写回
CSS_PATH.write_text(''.join(lines), encoding='utf-8')
new_total = len(lines)
print(f"删除后行数: {new_total} (减少 {total - new_total})")
