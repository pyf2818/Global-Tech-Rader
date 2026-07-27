#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 styles.css 中未使用的 @keyframes 和未使用的 CSS 变量。
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"
THEMES_PATH = ROOT / "src" / "themes.css"
SCAN_DIRS = [ROOT / "src", ROOT / "api", ROOT / "server", ROOT / "index.html"]
EXCLUDE_DIRS = {"node_modules", "dist", ".git", "coverage"}
EXCLUDE_FILE_PATTERNS = ["_pre_refactor", ".test.", "__tests__"]


def collect_source_text():
    chunks = []
    for scan_dir in SCAN_DIRS:
        if scan_dir.is_file():
            chunks.append(scan_dir.read_text(encoding='utf-8', errors='ignore'))
            continue
        for f in scan_dir.rglob('*'):
            if not f.is_file():
                continue
            if any(part in EXCLUDE_DIRS for part in f.parts):
                continue
            if any(pat in f.name for pat in EXCLUDE_FILE_PATTERNS):
                continue
            if f.suffix not in ('.jsx', '.js', '.ts', '.tsx', '.html', '.vue', '.mjs', '.cjs'):
                continue
            try:
                chunks.append(f.read_text(encoding='utf-8', errors='ignore'))
            except:
                continue
    return '\n'.join(chunks)


def collect_all_css_text():
    """收集 styles.css + themes.css 全部文本"""
    css = CSS_PATH.read_text(encoding='utf-8')
    if THEMES_PATH.exists():
        css += '\n' + THEMES_PATH.read_text(encoding='utf-8')
    return css


def find_keyframes_definitions(css_text):
    """查找所有 @keyframes 定义"""
    pattern = re.compile(r'@keyframes\s+([\w-]+)\s*\{', re.MULTILINE)
    return set(m.group(1) for m in pattern.finditer(css_text))


def find_keyframes_usages(css_text):
    """查找所有 animation 引用"""
    usages = set()
    # animation: name ...;
    # animation-name: name;
    for m in re.finditer(r'animation(?:-name)?\s*:\s*([\w-]+)', css_text):
        usages.add(m.group(1))
    # 简写形式可能多个动画，第一个 token 是 name
    for m in re.finditer(r'animation\s*:\s*([^;]+);', css_text):
        parts = m.group(1).split(',')
        for p in parts:
            tokens = p.strip().split()
            if tokens:
                # 第一个 token 通常就是 name
                first = tokens[0]
                if re.match(r'^[\w-]+$', first) and not re.match(r'^\d', first):
                    usages.add(first)
    return usages


def find_unused_css_vars(css_text, source_text):
    """查找未使用的 CSS 变量"""
    # 收集所有定义的变量
    defined = {}
    for m in re.finditer(r'--([\w-]+)\s*:', css_text):
        name = m.group(1)
        if name not in defined:
            defined[name] = 0

    # 统计使用次数
    for name in defined:
        # var(--name) 或 var(--name, fallback)
        pattern = re.compile(r'var\(\s*--' + re.escape(name) + r'\b')
        count = len(pattern.findall(css_text)) + len(pattern.findall(source_text))
        defined[name] = count

    unused = [name for name, count in defined.items() if count == 0]
    return defined, unused


def main():
    css_text = collect_all_css_text()
    source_text = collect_source_text()

    print(f"CSS 总大小: {len(css_text)} bytes")
    print(f"源码总大小: {len(source_text)} bytes")

    # 1. @keyframes
    print("\n=== @keyframes 扫描 ===")
    defined_kf = find_keyframes_definitions(css_text)
    used_kf = find_keyframes_usages(css_text)
    unused_kf = sorted(defined_kf - used_kf)
    print(f"定义 @keyframes: {len(defined_kf)}")
    print(f"被引用: {len(defined_kf & used_kf)}")
    print(f"未使用 @keyframes: {len(unused_kf)}")
    for name in unused_kf:
        print(f"  {name}")

    # 2. CSS 变量
    print("\n=== CSS 变量扫描 ===")
    all_defined, unused_vars = find_unused_css_vars(css_text, source_text)
    print(f"定义变量: {len(all_defined)}")
    print(f"未使用变量: {len(unused_vars)}")
    if unused_vars:
        # 按前缀分组
        from collections import defaultdict
        by_prefix = defaultdict(list)
        for v in unused_vars:
            prefix = v.split('-')[0]
            by_prefix[prefix].append(v)
        for prefix in sorted(by_prefix.keys()):
            print(f"\n  [{prefix}] ({len(by_prefix[prefix])}):")
            for v in sorted(by_prefix[prefix])[:30]:
                print(f"    --{v}")
            if len(by_prefix[prefix]) > 30:
                print(f"    ... 共 {len(by_prefix[prefix])} 个")


if __name__ == '__main__':
    main()
