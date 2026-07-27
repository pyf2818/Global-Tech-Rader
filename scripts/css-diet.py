#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
styles.css 精确删除脚本 v2
基于 class 名定位规则块，而非行号。自动解析 CSS 规则边界。
"""
import re
from pathlib import Path

CSS_PATH = Path(__file__).parent.parent / "src" / "styles.css"
JSX_DIR = Path(__file__).parent.parent / "src"

# 确认未使用的 class 名列表（仅在 _app_pre_refactor.jsx 中出现）
DEAD_CLASSES = [
    # workbench 死代码
    "workbench-shell", "workbench-ai", "workbench-overview", "workbench-feed-panel",
    "workbench-title", "workbench-subtitle", "workbench-preferences", "workbench-metrics",
    "workbench-text-btn", "workbench-toolbar", "workbench-toolbar-actions", "workbench-search",
    "workbench-refresh", "workbench-filter-row", "workbench-hero-copy",
    "workbench-profile-strip", "workbench-news-list", "workbench-news-card",
    "workbench-score-badge", "workbench-reason-strip", "workbench-bubble-area",
    "workbench-block-title",
    # agent 死代码
    "agent-ecosystem-card", "agent-status-list", "agent-status-item",
    "agent-profile-strip", "agent-memory-card", "agent-memory-row",
    # ai 死代码
    "ai-daily-insight", "ai-signal-grid", "ai-priority-list",
    "ai-command-card", "ai-prompt-list", "ai-mission-list",
    # 其他死代码
    "date-manager", "date-pill-row", "date-pill",
    "quality-card", "quality-grid", "quality-item",
    "next-actions-card", "interest-chip", "filter-pill",
    # intelligence 死代码
    "intelligence-side-stack", "intelligence-score-grid",
    "intelligence-entity-strip", "intelligence-opportunity-list",
    "intelligence-opportunity", "intelligence-weekly-sector",
    "intelligence-mini-list", "intelligence-mini-item",
]

def find_class_in_jsx(class_name):
    """检查 class 名是否在任何 jsx/js 文件中使用"""
    # 排除 _app_pre_refactor.jsx（重构前备份）
    for ext in ['*.jsx', '*.js']:
        for f in JSX_DIR.rglob(ext):
            if '_pre_refactor' in f.name:
                continue
            try:
                content = f.read_text(encoding='utf-8')
                # 搜索 className 中的使用
                if class_name in content:
                    return True
            except:
                continue
    return False

def parse_css_rules(lines):
    """解析 CSS 规则，返回 [(start_idx, end_idx, selector_text)] 列表"""
    rules = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        # 跳过注释、空行、@keyframes 等
        if not line or line.startswith('/*') or line.startswith('//'):
            i += 1
            continue
        # 查找规则开始（包含 { 的行）
        if '{' in lines[i]:
            brace_count = 0
            start = i
            for j in range(i, len(lines)):
                brace_count += lines[j].count('{') - lines[j].count('}')
                if brace_count == 0:
                    # 找到完整规则
                    selector = lines[start].split('{')[0].strip()
                    rules.append((start, j, selector))
                    i = j + 1
                    break
            else:
                i += 1
        else:
            i += 1
    return rules

def extract_class_names(selector):
    """从选择器中提取顶层 class 名"""
    # 移除后代选择器（空格后的部分）
    # 取第一个 class
    match = re.search(r'\.([\w-]+)', selector)
    if match:
        return match.group(1)
    return None

def main():
    content = CSS_PATH.read_text(encoding='utf-8')
    lines = content.splitlines(keepends=True)
    total = len(lines)
    print(f"原始行数: {total}")

    # 先验证所有死 class 确实未使用
    print("\n验证死 class...")
    truly_dead = []
    for cls in DEAD_CLASSES:
        if not find_class_in_jsx(cls):
            truly_dead.append(cls)
        else:
            print(f"  跳过 {cls} (在 jsx 中发现使用)")

    print(f"\n确认死 class: {len(truly_dead)}/{len(DEAD_CLASSES)}")

    # 解析 CSS 规则
    print("\n解析 CSS 规则...")
    rules = parse_css_rules(lines)
    print(f"找到 {len(rules)} 个规则")

    # 标记要删除的规则
    to_delete = [False] * total
    delete_rules = []
    for start, end, selector in rules:
        # 提取选择器中的所有 class 名
        classes_in_selector = re.findall(r'\.([\w-]+)', selector)
        # 如果选择器中的所有 class 都在死列表中，标记删除
        if classes_in_selector and all(c in truly_dead for c in classes_in_selector):
            for i in range(start, end + 1):
                to_delete[i] = True
            delete_rules.append((start + 1, end + 1, selector[:50]))

    print(f"\n将删除 {len(delete_rules)} 个规则:")
    for start, end, sel in delete_rules[:20]:
        print(f"  {start}-{end}: {sel}")
    if len(delete_rules) > 20:
        print(f"  ... 还有 {len(delete_rules) - 20} 个")

    delete_count = sum(1 for i in range(total) if to_delete[i])
    print(f"\n总删除行数: {delete_count}")

    new_lines = [lines[i] for i in range(total) if not to_delete[i]]
    CSS_PATH.write_text(''.join(new_lines), encoding='utf-8')
    print(f"新行数: {len(new_lines)} (减少 {total - len(new_lines)})")

if __name__ == '__main__':
    main()
