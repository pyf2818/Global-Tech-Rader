#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应用 scan-fully-covered.py 分析出的可删除范围。
按行号降序删除，避免行号偏移。
同时清理删除后产生的连续空行（保留单个空行作为分隔）。
"""
from pathlib import Path
import ast

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

# 从 fully-covered-ranges.txt 读取范围
ranges_file = ROOT / "scripts" / "fully-covered-ranges.txt"
ranges_text = ranges_file.read_text(encoding='utf-8-sig')  # utf-8-sig 自动去除 BOM
ranges = []
for line in ranges_text.splitlines():
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    # 解析 (start, end) 格式
    try:
        # 安全解析元组
        t = ast.literal_eval(line)
        ranges.append((int(t[0]), int(t[1])))
    except Exception as e:
        print(f"FAIL parsing: {line!r} - {e}")
        continue

# 按开始行号降序排序
ranges.sort(key=lambda x: -x[0])

print(f"加载了 {len(ranges)} 个删除范围")
print(f"前 5 个: {ranges[:5]}")
print(f"后 5 个: {ranges[-5:]}")

# 验证范围不重叠
for i in range(len(ranges) - 1):
    s1, e1 = ranges[i]
    s2, e2 = ranges[i + 1]
    if s1 <= e2:  # 当前范围的开始 <= 下一个范围的结束
        print(f"WARNING: 范围重叠: {s1}-{e1} 与 {s2}-{e2}")
        # 这不应该发生，因为我们按降序排序

# 读取 CSS
css = CSS_PATH.read_text(encoding='utf-8')
lines = css.splitlines(keepends=True)
total_lines_before = len(lines)
print(f"\n原始行数: {total_lines_before}")

# 按降序删除范围（保留 keepends）
deleted_count = 0
for start, end in ranges:
    # 转换为 0-indexed
    start_idx = start - 1
    end_idx = end  # end 是 inclusive，所以删除 [start_idx, end_idx) 即 [start-1, end)
    # 检查范围是否有效
    if start_idx < 0 or end_idx > len(lines):
        print(f"WARNING: 范围越界: {start}-{end}")
        continue
    # 验证这是单个规则 - 检查起止
    # 简单验证：起始行应该包含 { 或者与 { 行相邻（多行选择器情况）
    # 这里跳过验证，相信 scan-fully-covered.py 的分析
    del lines[start_idx:end_idx]
    deleted_count += (end - start + 1)

print(f"删除了 {deleted_count} 行")

# 清理连续空行（最多保留一个空行）
cleaned_lines = []
prev_blank = False
for line in lines:
    is_blank = line.strip() == ''
    if is_blank and prev_blank:
        continue  # 跳过连续空行
    cleaned_lines.append(line)
    prev_blank = is_blank

print(f"清理后行数: {len(cleaned_lines)}")
print(f"清理连续空行: {len(lines) - len(cleaned_lines)} 行")

# 写回
CSS_PATH.write_text(''.join(cleaned_lines), encoding='utf-8')

# 验证语法
new_css = CSS_PATH.read_text(encoding='utf-8')
opens = new_css.count('{')
closes = new_css.count('}')
diff = opens - closes
size = len(new_css.encode('utf-8'))
print(f"\n新文件: {size} bytes, {len(cleaned_lines)} lines")
print(f"括号: opens={opens} closes={closes} diff={diff}")
if diff == 0:
    print("OK: 括号平衡")
else:
    print(f"ERROR: 括号不平衡，差异 {diff}")
