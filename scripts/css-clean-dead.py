#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
删除未使用的 @keyframes 和 CSS 变量。
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"
THEMES_PATH = ROOT / "src" / "themes.css"

UNUSED_KEYFRAMES = {
    "ai-elf-slide-in",
    "blink",
    "chatCursorBlink",
    "dropdownIn",
    "scaleIn",
}

UNUSED_VARS = {
    "accent-blue-soft",
    "accent-emerald-soft",
    "ease-instant",
    "ease-slow",
    "gradient-glow",
    "grid-color",
    "gtd-blue",
    "gtd-panel",
    "gtd-panel-soft",
    "screen-accent-2",
    "screen-panel",
    "screen-panel-strong",
    "signal-info",
    "signal-warning",
    "surface-workbench-muted",
}


def remove_unused_keyframes(css_text):
    """删除未使用的 @keyframes 块"""
    removed = 0
    for name in UNUSED_KEYFRAMES:
        # @keyframes name { ... } - 需要匹配嵌套大括号
        pattern = re.compile(
            r'@keyframes\s+' + re.escape(name) + r'\s*\{',
            re.MULTILINE
        )
        for m in pattern.finditer(css_text):
            # 找到匹配的右大括号
            start = m.start()
            brace_start = m.end() - 1  # 指向 {
            depth = 1
            i = m.end()
            while i < len(css_text) and depth > 0:
                if css_text[i] == '{':
                    depth += 1
                elif css_text[i] == '}':
                    depth -= 1
                i += 1
            # i 现在指向 } 后面
            # 包含后面的换行
            end = i
            # 也包含前面的注释行
            line_start = css_text.rfind('\n', 0, start)
            if line_start == -1:
                line_start = 0
            else:
                line_start += 1
            # 检查前面是否有注释
            prefix = css_text[line_start:start].strip()
            if prefix.startswith('/*') or prefix.startswith('//'):
                start = line_start
            # 扩展到末尾换行
            if end < len(css_text) and css_text[end] == '\n':
                end += 1
            removed += 1
            css_text = css_text[:start] + css_text[end:]
            break
    return css_text, removed


def remove_unused_vars(css_text):
    """删除未使用的 CSS 变量定义行"""
    removed = 0
    lines = css_text.splitlines(keepends=True)
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('--'):
            # 提取变量名
            m = re.match(r'--([\w-]+)\s*:', stripped)
            if m and m.group(1) in UNUSED_VARS:
                removed += 1
                continue
        new_lines.append(line)
    return ''.join(new_lines), removed


def main():
    css = CSS_PATH.read_text(encoding='utf-8')
    original_size = len(css)
    original_lines = len(css.splitlines())
    print(f"原始: {original_size} bytes, {original_lines} lines")

    # 删除未使用的 @keyframes
    css, kf_removed = remove_unused_keyframes(css)
    print(f"删除 @keyframes: {kf_removed}")

    # 删除未使用的 CSS 变量
    css, var_removed = remove_unused_vars(css)
    print(f"删除 CSS 变量: {var_removed}")

    new_size = len(css)
    new_lines = len(css.splitlines())
    print(f"新: {new_size} bytes, {new_lines} lines")
    print(f"减少: {original_size - new_size} bytes, {original_lines - new_lines} lines")

    CSS_PATH.write_text(css, encoding='utf-8')

    # 同步 themes.css (虽然 themes 通常独立，但检查一下)
    if THEMES_PATH.exists():
        themes = THEMES_PATH.read_text(encoding='utf-8')
        themes_before = len(themes)
        themes, t_var = remove_unused_vars(themes)
        themes, t_kf = remove_unused_keyframes(themes)
        if len(themes) != themes_before:
            THEMES_PATH.write_text(themes, encoding='utf-8')
            print(f"themes.css: 删除 {t_var} 变量, {t_kf} keyframes")


if __name__ == '__main__':
    main()
