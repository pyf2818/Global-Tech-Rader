"""Replace the hotspot block in App.jsx with list-style design."""
import base64
import sys

# The replacement content as base64
REPLACEMENT_B64 = "CiAgICAgICAgICAgICAgICAge3RvcE11c3RSZWFkLmxlbmd0aCA+IDAgJiYgKAogICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iaG90c3BvdC1saXN0Ij4KICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iaG90c3BvdC1oZWFkZXIiPgogICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJob3RzcG90LWZpcmUiPvCfj4k8L3NwYW4+CiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImhvdHBzcG90LXRpdGxlIj7nu7TorqTmlq3mlq08L3NwYW4+CiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImhvdHBzcG90LXN1YiI+5YWo6YOo5Ye75ri4IMK3IOmDqOWIhuWvuea4uO+8jOS6pOS6kuWKoOi9vTwvc3Bhbj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iaG90c3BvdC1yb3dzIj4KICAgICAgICAgICAgICAgICAgICAgIHt0b3BNdXN0UmVhZC5zbGljZSgwLCA1KS5tYXAoKGl0ZW0sIGkpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtpdGVtLmlkfSBjbGFzc05hbWU9ImhvdHBzcG90LXJvdyIgb25DbGljaz17KCkgPT4gcmVjb3JkUmVhZGluZyhpdGVtKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0iaG90c3BvdC1yYW5rIj57aSArIDF9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iaG90c3BvdC1jb250ZW50Ij5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iaG90c3BvdC10aXRsZSI+e2l0ZW0udGl0bGV9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJob3RzcG90LXJlYXNvbiI+e2l0ZW0ucmVjb21tZW5kYXRpb24gfCDnva4g5Yqg6L29PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIH0pKX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIH0pfQ=="

replacement = base64.b64decode(REPLACEMENT_B64).decode('utf-8')
rep_lines = replacement.split('\n')

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the hotspot block
start = None
end = None
for i, line in enumerate(lines):
    if 'must-read-hotspot' in line and start is None:
        # Go back to find the opening condition
        for j in range(i, max(0, i-3), -1):
            if 'topMustRead.length > 0' in lines[j]:
                start = j
                break
        if start is None:
            start = i - 1
    if start is not None and end is None:
        stripped = line.strip()
        if stripped == ')}' and i > start + 3:
            end = i
            break

if start is None or end is None:
    print(f"ERROR: Could not find hotspot block (start={start}, end={end})")
    sys.exit(1)

print(f"Replacing lines {start+1}-{end+1} ({end-start+1} lines)")

# Replace
new_lines = lines[:start] + [l + '\n' for l in rep_lines] + lines[end+1:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done!")
