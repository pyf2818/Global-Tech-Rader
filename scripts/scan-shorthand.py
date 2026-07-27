#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描可简写的属性值模式"""
import re
from pathlib import Path

CSS = Path(__file__).parent.parent / "src" / "styles.css"
text = CSS.read_text(encoding='utf-8')

patterns = {
    # 0.X -> .X (但不能在数字里，需要边界)
    '0.X 小数': (r'(?<![\w.])0\.(\d)', r'.\1'),
    # 0px 0em 0% 0rem 0pt -> 0
    '0px 等': (r'(?<=\b)0(px|em|rem|%|pt|vh|vw|ex|ch)\b', r'0'),
    # #ffffff -> #fff
    '#ffffff 类': (r'#(ff)(ff)(ff)\b', r'#fff'),
    '#FFffFF 类': (r'#([Ff])([Ff])([Ff])([Ff])([Ff])([Ff])\b', r'#fff'),
    # rgba 中的 0.X 会被上面 0.X 模式捕获
    # 100% 0% 渐变中 redundant
    'transparent transparent 重复': (r'transparent,\s*transparent', r'transparent'),
}

for name, (pat, _) in patterns.items():
    matches = re.findall(pat, text)
    print(f"{name}: {len(matches)} 处")

# 0px 单独看，注意不要破坏 var() 等
matches = list(re.finditer(r'(?<![\w.-])0(px|em|rem|%|pt|vh|vw|ex|ch)\b', text))
print(f"\n0px 等带单位的位置示例（前30个）:")
for m in matches[:30]:
    line_num = text[:m.start()].count('\n') + 1
    context = text[max(0, m.start()-15):m.end()+5]
    print(f"  L{line_num}: ...{context}...")
