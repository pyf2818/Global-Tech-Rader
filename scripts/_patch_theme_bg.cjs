// Inject --bg-primary and --bg-secondary into each palette block in themes.css
var fs = require('fs');
var content = fs.readFileSync('src/themes.css', 'utf-8');

// Map palette id → background tokens
var tokens = {
  champagne: { dark: '#0E0F0D', dark2: '#151713', light: '#F7F5F0', light2: '#FFFDF8' },
  sakura:    { dark: '#110D0E', dark2: '#1A1215', light: '#FDF7F8', light2: '#FFF8FA' },
  forest:    { dark: '#0B100C', dark2: '#101913', light: '#F4F9F5', light2: '#F8FDF9' },
  neon:      { dark: '#0B0E12', dark2: '#11141C', light: '#F0F5FA', light2: '#F6FAFD' },
  cosmos:    { dark: '#0B0D11', dark2: '#10141C', light: '#F4F7FC', light2: '#F8FBFE' },
  terracotta:{ dark: '#100E0C', dark2: '#1A1410', light: '#FBF6F2', light2: '#FEF9F5' },
  arctic:    { dark: '#0D0E10', dark2: '#131518', light: '#F8F9FA', light2: '#FCFDFE' },
  aurora:    { dark: '#100B12', dark2: '#19101E', light: '#F8F4FC', light2: '#FCF8FE' },
  bamboo:    { dark: '#0A0F0D', dark2: '#0E1611', light: '#F2F8F4', light2: '#F6FCF8' },
  amber:     { dark: '#0E0E0A', dark2: '#17150E', light: '#F8F6F0', light2: '#FCFAF4' },
  twilight:  { dark: '#0B0D0F', dark2: '#101317', light: '#F4F6F8', light2: '#F8FAFC' },
  coral:     { dark: '#110C0B', dark2: '#1A120F', light: '#FDF5F2', light2: '#FFF8F5' },
};

// For each palette: inject --bg-primary after '--accent-rose' in dark, and after the first gradient in light
var result = content;
var paletteIds = Object.keys(tokens);

for (var id of paletteIds) {
  var t = tokens[id];
  // Dark block: insert after --accent-rose
  var darkMarker = `--accent-rose: ${t.dark === 'champagne' ? '#7A7A7A' : ''};`;
  var darkInject = `  --bg-primary: ${t.dark};\n  --bg-secondary: ${t.dark2};`;

  // Replace first --accent-rose line in the dark block
  var darkPattern = `:root[data-palette="${id}"] {\n  --accent-cyan:`;
  var darkBlockStart = result.indexOf(darkPattern);
  if (darkBlockStart >= 0) {
    var blockEnd = result.indexOf('}\n:root[data-mode="light"]', darkBlockStart);
    if (blockEnd < 0) blockEnd = result.indexOf('}\n\n/* ==========', darkBlockStart);
    var block = result.substring(darkBlockStart, blockEnd);
    var roseIdx = block.lastIndexOf('--accent-rose:');
    if (roseIdx >= 0) {
      var eol = block.indexOf('\n', roseIdx);
      var newBlock = block.substring(0, eol + 1) + darkInject + '\n' + block.substring(eol + 1);
      result = result.substring(0, darkBlockStart) + newBlock + result.substring(blockEnd);
    }
  }
}

// Light blocks: insert after the first property (--border-color:)
for (var id of paletteIds) {
  var t = tokens[id];
  var lightInject = `  --bg-primary: ${t.light};\n  --bg-secondary: ${t.light2};`;
  var lightPattern = `:root[data-mode="light"][data-palette="${id}"] {`;
  var lbStart = result.indexOf(lightPattern);
  if (lbStart >= 0) {
    var lbEnd = result.indexOf('}\n\n', lbStart);
    if (lbEnd < 0) lbEnd = result.indexOf('}\n\n/*', lbStart);
    var block = result.substring(lbStart, lbEnd);
    var braceEnd = block.indexOf('\n');
    var newBlock = block.substring(0, braceEnd + 1) + lightInject + '\n' + block.substring(braceEnd + 1);
    result = result.substring(0, lbStart) + newBlock + result.substring(lbEnd);
  }
}

fs.writeFileSync('src/themes.css', result, 'utf-8');
console.log('Patched themes.css with palette-distinct backgrounds!');