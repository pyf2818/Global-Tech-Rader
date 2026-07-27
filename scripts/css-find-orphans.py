#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描 styles.css 中孤立的 selector 残骸（无 { } 的选择器行）"""
from pathlib import Path
import re

CSS = Path(__file__).parent.parent / "src" / "styles.css"
lines = CSS.read_text(encoding='utf-8').splitlines()

print(f"Total lines: {len(lines)}\n")

# 查找疑似孤儿选择器：
# - 包含 .class 或 #id 或 element + , 但没有 { 且后面行不是 { 开头
# - 通常表现为 .class div, 或 .class span, 后跟空行
orphans = []
for i, line in enumerate(lines):
    s = line.strip()
    if not s:
        continue
    # 跳过正常规则
    if '{' in s:
        continue
    # 跳过属性行（缩进+冒号+分号）
    if s.endswith(';') and ':' in s and not s.startswith('.'):
        continue
    # 跳过注释
    if s.startswith('/*') or s.startswith('//') or s.startswith('*'):
        continue
    # 跳过 @ 规则
    if s.startswith('@'):
        continue
    # 跳过变量定义
    if s.startswith('--'):
        continue
    # 选择器特征：包含 . 或 # 后跟字母，且以 , 结尾
    if (re.search(r'[.#][a-zA-Z]', s) or re.match(r'^[a-z]+[\s,]', s)) and (s.endswith(',') or s.endswith('>')):
        # 检查前后是否被孤立
        # 前一行不是 selector 也不是 {
        prev = lines[i-1].strip() if i > 0 else ''
        next_ = lines[i+1].strip() if i+1 < len(lines) else ''
        # 如果前后都没有 {，可能是孤儿
        if '{' not in prev and '{' not in next_ and '{' not in s:
            # 进一步：检查是否真的是孤儿（前后5行内没有 {）
            ctx_has_brace = False
            for k in range(max(0, i-3), min(len(lines), i+3)):
                if '{' in lines[k]:
                    ctx_has_brace = True
                    break
            if not ctx_has_brace:
                orphans.append((i+1, s))

print(f"找到 {len(orphans)} 个疑似孤儿选择器:")
for ln, s in orphans[:50]:
    print(f"  L{ln}: {s[:80]}")
if len(orphans) > 50:
    print(f"  ... 还有 {len(orphans) - 50} 个")
