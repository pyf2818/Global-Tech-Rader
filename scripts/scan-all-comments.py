#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描所有多行注释块（>=3 行），统计可瘦身空间"""
import re
from pathlib import Path

CSS = Path(__file__).parent.parent / "src" / "styles.css"
lines = CSS.read_text(encoding='utf-8').splitlines()
total = len(lines)

i = 0
blocks = []
while i < total:
    line = lines[i]
    stripped = line.strip()
    # 单行注释 /* ... */
    if stripped.startswith('/*') and stripped.endswith('*/') and len(stripped) > 3:
        # 单行注释
        i += 1
        continue
    # 多行注释
    if stripped.startswith('/*'):
        start = i
        while i < total and '*/' not in lines[i]:
            i += 1
        end = i
        size = end - start + 1
        if size >= 3:
            blocks.append((start + 1, end + 1, size))
        i += 1
        continue
    i += 1

print(f"多行注释块 (>=3 行): {len(blocks)} 个")
total_lines = sum(b[2] for b in blocks)
print(f"总行数: {total_lines}")
for s, e, n in blocks[:30]:
    first = lines[s-1].strip()[:50]
    print(f"  L{s}-{e} ({n} 行): {first}")
if len(blocks) > 30:
    print(f"  ... 还有 {len(blocks) - 30} 个")
