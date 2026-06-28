"""Patch App.jsx: replace interest-chip-list with interest-bubble-list"""

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the interest-chip-list block
start = None
end = None
for i, line in enumerate(lines):
    if 'interest-chip-list' in line and 'className' in line:
        start = i
    if start is not None and end is None:
        if '</div>' in line and i > start:
            end = i
            break

if start is None:
    print('ERROR: Could not find interest-chip-list block')
    exit(1)

print('Found chip list block at lines %d-%d' % (start + 1, end + 1))

# Build replacement using plain concatenation (no f-strings, no JSX brace issues)
indent = '                  '
sizes = "['size-lg', 'size-md', 'size-sm']"

new_block = (
    indent + '<div className="interest-bubble-list">\n'
    indent + '  {selectedInterests.length === 0 ? (\n'
    indent + '    <button className="interest-bubble empty" onClick={() => setShowInterestModal(true)}>设置关注领域</button>\n'
    indent + '  ) : selectedInterests.slice(0, 6).map((id, i) => {\n'
    indent + '    const cat = CATEGORIES.find(c => c.id === id);\n'
    indent + '    const sizes = ' + sizes + ';\n'
    indent + '    const dur = 3.5 + (i * 0.7);\n'
    indent + '    const delay = i * -0.4;\n'
    indent + '    return (\n'
    indent + '      <button key={id} className={`interest-bubble ${sizes[i % sizes.length]}`}\n'
    indent + '        style={{ "--bubble-dur": dur + "s", "--bubble-delay": delay + "s" }}\n'
    indent + '        onClick={() => setCategory(id)}>{cat?.label || id}</button>\n'
    indent + '    );\n'
    indent + '  })}\n'
    indent + '</div>'
)

lines[start:end + 1] = [new_block + '\n']

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Patched successfully!')
