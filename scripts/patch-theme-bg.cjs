/* Patch themes.css: add --bg-primary/--bg-secondary to each palette block */
const fs = require('fs');
const lines = fs.readFileSync('src/themes.css', 'utf-8').split('\n');

const tokens = {
  champagne: { d: ['#0E0F0D','#151713'], l: ['#F7F5F0','#FFFDF8'] },
  sakura:    { d: ['#110D0E','#1A1215'], l: ['#FDF7F8','#FFF8FA'] },
  forest:    { d: ['#0B100C','#101913'], l: ['#F4F9F5','#F8FDF9'] },
  neon:      { d: ['#0B0E12','#11141C'], l: ['#F0F5FA','#F6FAFD'] },
  cosmos:    { d: ['#0B0D11','#10141C'], l: ['#F4F7FC','#F8FBFE'] },
  terracotta:{ d: ['#100E0C','#1A1410'], l: ['#FBF6F2','#FEF9F5'] },
  arctic:    { d: ['#0D0E10','#131518'], l: ['#F8F9FA','#FCFDFE'] },
  aurora:    { d: ['#100B12','#19101E'], l: ['#F8F4FC','#FCF8FE'] },
  bamboo:    { d: ['#0A0F0D','#0E1611'], l: ['#F2F8F4','#F6FCF8'] },
  amber:     { d: ['#0E0E0A','#17150E'], l: ['#F8F6F0','#FCFAF4'] },
  twilight:  { d: ['#0B0D0F','#101317'], l: ['#F4F6F8','#F8FAFC'] },
  coral:     { d: ['#110C0B','#1A120F'], l: ['#FDF5F2','#FFF8F5'] },
};

let out = [];
let currentPalette = null;
let inLight = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineTrim = line.trim();

  // Track which palette block we're in
  const darkMatch = lineTrim.match(/^:root\[data-palette="(\w+)"\]\s*\{?$/);
  const lightMatch = lineTrim.match(/^:root\[data-mode="light"\]\[data-palette="(\w+)"\]\s*\{?$/);

  if (darkMatch) {
    currentPalette = darkMatch[1];
    inLight = false;
  } else if (lightMatch) {
    currentPalette = lightMatch[1];
    inLight = true;
  }

  out.push(line);

  // Detect end of :root block (closing brace at line start or after value)
  if (lineTrim === '}' || lineTrim.startsWith('}') || (currentPalette && lineTrim.startsWith(':'))) {
    currentPalette = null;
  }

  // Inject after --accent-rose line in dark blocks
  if (!inLight && currentPalette && tokens[currentPalette] && lineTrim.startsWith('--accent-rose:')) {
    const tk = tokens[currentPalette].d;
    out.push('  --bg-primary: ' + tk[0] + ';');
    out.push('  --bg-secondary: ' + tk[1] + ';');
  }

  // Inject after opening brace of light blocks
  if (inLight && currentPalette && tokens[currentPalette] && lineTrim.endsWith('{') && i > 0 && lines[i-1].trim().endsWith('{')) {
    // Already handled: we inject after the line with {
    continue;
  }
}

// Second pass: inject into light blocks after the first property
// Simpler approach: find opening brace then next property line
out = [];
let injectDone = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineTrim = line.trim();
  out.push(line);

  // Check if this is a light palette opening
  const lightMatch = lineTrim.match(/^:root\[data-mode="light"\]\[data-palette="(\w+)"\]\s*\{$/);
  if (lightMatch && !injectDone.has(lightMatch[1])) {
    const id = lightMatch[1];
    injectDone.add(id);
    if (tokens[id]) {
      const tk = tokens[id].l;
      out.push('  --bg-primary: ' + tk[0] + ';');
      out.push('  --bg-secondary: ' + tk[1] + ';');
    }
  }
}

// Third pass: inject into dark blocks (simpler: after --accent-rose)
out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  out.push(line);
  const lineTrim = line.trim();
  if (lineTrim.startsWith('--accent-rose:') && !lineTrim.includes('var(')) {
    // Find which palette we're in — scan backwards
    let id = null;
    for (let j = i; j >= 0; j--) {
      const m = lines[j].match(/^:root\[data-palette="(\w+)"\]/);
      if (m) { id = m[1]; break; }
    }
    if (id && tokens[id] && !lineTrim.includes('bg-primary')) {
      const tk = tokens[id].d;
      out.push('  --bg-primary: ' + tk[0] + ';');
      out.push('  --bg-secondary: ' + tk[1] + ';');
    }
  }
}

fs.writeFileSync('src/themes.css', out.join('\n'), 'utf-8');
console.log('Patched themes.css with palette-distinct backgrounds!');