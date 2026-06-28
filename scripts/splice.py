"""splice.py <replacement-file> <start-pattern> <end-pattern>
Reads App.jsx, finds start-pattern and end-pattern lines, replaces everything between them (exclusive) with the content of replacement-file.
"""
import sys, re

replacement_file = sys.argv[1]
start_pattern = sys.argv[2]
end_pattern = sys.argv[3]

with open(replacement_file, 'r', encoding='utf-8') as f:
    replacement = f.read()

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if start_pattern in line and start_idx is None:
        start_idx = i
    if start_pattern in line and start_idx is not None:
        # continue searching for end after start
        pass
    if end_pattern in line and start_idx is not None and i > start_idx:
        end_idx = i
        break

if start_idx is None or end_idx is None:
    print(f"ERROR: start={start_idx} end={end_idx}")
    sys.exit(1)

print(f"Replacing lines {start_idx+1}-{end_idx+1} ({end_idx - start_idx + 1} lines)")

new_lines = lines[:start_idx] + [replacement + '\n'] + lines[end_idx+1:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done!")
