#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
styles.css 未使用 class 扫描器
1. 提取 styles.css 中所有定义的 class 名
2. 在所有 jsx/js/html 文件中搜索使用情况
3. 输出未使用的 class 列表（仅定义但未使用）
"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"
THEMES_PATH = ROOT / "src" / "themes.css"
SCAN_DIRS = [ROOT / "src", ROOT / "api", ROOT / "server", ROOT / "index.html"]
EXCLUDE_DIRS = {"node_modules", "dist", ".git", "coverage"}
EXCLUDE_FILE_PATTERNS = ["_pre_refactor", ".test.", "__tests__"]

# Tailwind/utility classes 等可能动态拼接，不要扫
IGNORE_CLASSES = {
    # 通用容器/状态类，太常见容易被误判
    "active", "open", "show", "hide", "hidden", "visible", "loading", "error",
    "disabled", "checked", "selected", "expanded", "collapsed", "hover", "focus",
    # 布局/原子类（多为 Tailwind/动态）
    "container", "row", "col", "flex", "grid", "block", "inline", "none",
    # 主题相关
    "light", "dark", "theme-light", "theme-dark",
    # 第三方库 class（klinecharts 等）
    "klinecharts", "KlineChart",
}

def collect_source_text():
    """收集所有需要扫描的源码文本"""
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

def extract_css_classes(css_text):
    """从 CSS 中提取所有 .class 名（去重，保留首次出现位置）"""
    classes = {}
    # 匹配 .class-name 后跟非标识符字符
    for m in re.finditer(r'\.([a-zA-Z][\w-]+)', css_text):
        name = m.group(1)
        if name not in classes:
            classes[name] = m.start()
    return classes

def is_used(class_name, source_text):
    """检查 class 是否在源码中使用（className/clsx/class=等）"""
    # 排除明显未使用
    if class_name in IGNORE_CLASSES:
        return True
    # 直接搜索字符串出现（粗略）
    if class_name not in source_text:
        return False
    # 进一步：搜索字符串中是否出现在引号内或模板字符串内
    # 简化：只要出现在源码就认为可能使用（保守策略）
    return True

def main():
    css_text = CSS_PATH.read_text(encoding='utf-8')
    themes_text = THEMES_PATH.read_text(encoding='utf-8') if THEMES_PATH.exists() else ''
    
    print(f"styles.css: {len(css_text)} bytes")
    print(f"themes.css: {len(themes_text)} bytes")
    
    print("\n收集源码...")
    source_text = collect_source_text()
    print(f"源码总量: {len(source_text)} bytes")
    
    print("\n提取 CSS class...")
    css_classes = extract_css_classes(css_text)
    theme_classes = extract_css_classes(themes_text)
    print(f"styles.css 定义 class: {len(css_classes)}")
    print(f"themes.css 定义 class: {len(theme_classes)}")
    
    # 合并去重（themes.css 的 class 通常是 styles.css 的子集，但仍单独检查）
    all_classes = dict(css_classes)
    all_classes.update(theme_classes)
    
    # 检查 styles.css 中独有的 class（不在 themes.css 中）
    css_only = {k: v for k, v in css_classes.items() if k not in theme_classes}
    print(f"styles.css 独有 class: {len(css_only)}")
    
    print("\n扫描未使用 class...")
    unused = []
    for name in sorted(all_classes.keys()):
        if not is_used(name, source_text):
            unused.append(name)
    
    print(f"\n未使用 class 总数: {len(unused)}")
    
    # 按前缀分组输出
    by_prefix = defaultdict(list)
    for name in unused:
        # 取第一段作为前缀
        prefix = name.split('-')[0] if '-' in name else name
        by_prefix[prefix].append(name)
    
    print("\n=== 按前缀分组 ===")
    for prefix in sorted(by_prefix.keys(), key=lambda x: -len(by_prefix[x])):
        names = by_prefix[prefix]
        print(f"\n[{prefix}] ({len(names)}):")
        for n in sorted(names):
            print(f"  {n}")
    
    # 输出可直接使用的 Python 列表
    print("\n=== Python 列表（可直接复制到 css-diet.py DEAD_CLASSES）===")
    print("ADDITIONAL_DEAD_CLASSES = [")
    for name in sorted(unused):
        print(f'    "{name}",')
    print("]")
    
    # 输出文件供 css-diet.py 使用
    output_file = ROOT / "scripts" / "unused-classes.txt"
    output_file.write_text('\n'.join(sorted(unused)), encoding='utf-8')
    print(f"\n已写入: {output_file}")

if __name__ == '__main__':
    main()
