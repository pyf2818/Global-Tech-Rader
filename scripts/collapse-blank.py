#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""折叠连续空行：>2 个连续空行压缩为 1 个；行尾空格清理。"""
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

lines = CSS_PATH.read_text(encoding='utf-8').splitlines(keepends=True)
total = len(lines)
print(f"原始行数: {total}")

# 行尾空格
trail = 0
for i, line in enumerate(lines):
    stripped = line.rstrip()
    if stripped != line.rstrip('\n').rstrip('\r'):
        # 行尾有空格
        if line.endswith('\r\n'):
            lines[i] = stripped + '\r\n'
        elif line.endswith('\n'):
            lines[i] = stripped + '\n'
        else:
            lines[i] = stripped
        trail += 1
print(f"行尾空格: {trail}")

# 折叠连续空行
result = []
blank_run = 0
collapsed = 0
for line in lines:
    if line.strip() == '':
        blank_run += 1
        if blank_run <= 1:
            result.append(line)
        else:
            collapsed += 1
    else:
        blank_run = 0
        result.append(line)

print(f"折叠空行: {collapsed}")
CSS_PATH.write_text(''.join(result), encoding='utf-8')
print(f"最终行数: {len(result)} (减少 {total - len(result)})")
