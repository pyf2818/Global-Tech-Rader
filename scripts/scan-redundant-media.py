#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描 @media 内部与外部重复的 selector，识别可合并或可删除的冗余"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

css = CSS_PATH.read_text(encoding='utf-8')
lines = css.splitlines()
total = len(lines)


def parse_rules():
    """返回 (start, end, selector, body, in_media)"""
    rules = []
    i = 0
    media_stack = []
    while i < total:
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith('/*') or stripped.startswith('*'):
            i += 1
            continue
        if stripped.startswith('@media'):
            # 进入 media
            media_stack.append(stripped.split('{')[0].strip())
            # 不算 rule，继续向下
            i += 1
            continue
        if stripped == '}':
            if media_stack:
                media_stack.pop()
            i += 1
            continue
        if '{' in line:
            brace_pos = line.index('{')
            selector_start = i
            while selector_start > 0:
                prev = lines[selector_start - 1].strip()
                if not prev or prev.endswith('}') or prev.endswith('{'):
                    break
                if prev.endswith(',') or re.search(r'[.#][a-zA-Z]', prev) or prev.startswith('@'):
                    selector_start -= 1
                else:
                    break
            brace = line.count('{') - line.count('}')
            j = i
            if brace > 0:
                j = i + 1
                while j < total and brace > 0:
                    brace += lines[j].count('{') - lines[j].count('}')
                    if brace <= 0:
                        break
                    j += 1
            rule_text = ''
            for k in range(selector_start, j + 1):
                rule_text += lines[k] + '\n'
            selector = rule_text.split('{', 1)[0].strip()
            selector_norm = re.sub(r'\s+', ' ', selector)
            body = rule_text.split('{', 1)[1] if '{' in rule_text else ''
            last_brace = body.rfind('}')
            if last_brace != -1:
                body = body[:last_brace]
            # 提取属性
            props = set()
            for m in re.finditer(r'([\w-]+)\s*:', body):
                props.add(m.group(1))
            in_media = ' @ '.join(media_stack) if media_stack else ''
            rules.append((selector_start + 1, j + 1, selector_norm, props, in_media))
            i = j + 1
            continue
        i += 1
    return rules


rules = parse_rules()
print(f"总规则数: {len(rules)}")

# 按 selector 分组
sel_groups = defaultdict(list)
for s, e, sel, props, in_media in rules:
    sel_groups[sel].append((s, e, props, in_media))

# 找 @media 内部规则，但外部已有相同 selector 且属性完全相同
redundant_in_media = []
for sel, locs in sel_groups.items():
    if len(locs) < 2:
        continue
    # 找外部定义
    outside = [l for l in locs if not l[3]]
    inside = [l for l in locs if l[3]]
    if not outside or not inside:
        continue
    # 检查 inside 中的规则是否被 outside 完全覆盖
    for ins in inside:
        s, e, props, media = ins
        for out in outside:
            os_, oe_, oprops, _ = out
            if props.issubset(oprops):
                redundant_in_media.append((s, e, sel, props, media, os_))
                break

print(f"\n@media 内部被外部完全覆盖: {len(redundant_in_media)}")
for s, e, sel, props, media, os_ in redundant_in_media[:20]:
    print(f"  L{s}-{e} ({media[:40]}): {sel[:50]} | 外部 L{os_}")
