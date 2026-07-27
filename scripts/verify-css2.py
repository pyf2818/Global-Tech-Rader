#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证 CSS 语法正确性 - styles.css + themes.css"""
from pathlib import Path
import re

ROOT = Path(__file__).parent.parent
for path in [ROOT / "src" / "styles.css", ROOT / "src" / "themes.css"]:
    if not path.exists():
        continue
    css = path.read_text(encoding='utf-8')
    opens = css.count('{')
    closes = css.count('}')
    diff = opens - closes
    size = path.stat().st_size
    lines = len(css.splitlines())
    print(f"{path.name}: {size} bytes, {lines} lines, opens={opens} closes={closes} diff={diff}")
    if diff == 0:
        print(f"  OK: braces balanced")
    else:
        print(f"  ERROR: braces unbalanced by {diff}")
