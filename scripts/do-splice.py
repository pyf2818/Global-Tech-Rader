"""Replace the news list block in App.jsx with must-read + profile recommendations."""
import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the block: from {!loading && !error && topMustRead.length > 0
# to the closing </div> that ends the workbench-feed-panel
# Use regex to match the entire conditional block

pattern = re.compile(
    r'(\{!loading && !error && topMustRead\.length > 0 && \(\n'
    r'\s*<div className="must-read-section">)'
    r'[\s\S]*?'
    r'(\s*</div>\n\s*\)\})',
    re.MULTILINE
)

match = pattern.search(content)
if not match:
    print("Pattern not found, trying alternative...")
    # Try finding from topMustRead to the </section> before AiChatPanel
    pattern2 = re.compile(
        r'(!loading && !error && topMustRead\.length > 0)[\s\S]*?(</section>\n\s*<AiChatPanel)',
        re.MULTILINE
    )
    match2 = pattern2.search(content)
    if match2:
        print(f"Found alternative at positions {match2.start()}-{match2.end()}")
    else:
        print("ERROR: Could not find any matching block")
        import sys
        sys.exit(1)

# Read the replacement file
with open('scripts/news-replacement-clean.txt', 'r', encoding='utf-8') as f:
    replacement = f.read()

# Do the replacement
new_content = content[:match.start()] + replacement + content[match.end():]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Splice done!")
