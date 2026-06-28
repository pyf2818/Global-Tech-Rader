/* Patch light-mode palette blocks in themes.css (handles CRLF) */
const fs = require('fs');
const raw = fs.readFileSync('src/themes.css', 'utf-8');
const lines = raw.split(/\r?\n/);

const tokens = {
  champagne: ['#F7F5F0','#FFFDF8'],
  sakura:    ['#FDF7F8','#FFF8FA'],
  forest:    ['#F4F9F5','#F8FDF9'],
  neon:      ['#F0F5FA','#F6FAFD'],
  cosmos:    ['#F4F7FC','#F8FBFE'],
  terracotta:['#FBF6F2','#FEF9F5'],
  arctic:    ['#F8F9FA','#FCFDFE'],
  aurora:    ['#F8F4FC','#FCF8FE'],
  bamboo:    ['#F2F8F4','#F6FCF8'],
  amber:     ['#F8F6F0','#FCFAF4'],
  twilight:  ['#F4F6F8','#F8FAFC'],
  coral:     ['#FDF5F2','#FFF8F5'],
};

let out = [];
let injected = 0;

for (let i = 0; i < lines.length; i++) {
  out.push(lines[i]);

  const m = lines[i].match(/data-mode="light"\]\[data-palette="(\w+)"\]\s*\{/);
  if (m) {
    const id = m[1];
    const tk = tokens[id];
    if (tk) {
      if (i + 1 < lines.length && !lines[i + 1].includes('--bg-primary')) {
        out.push('  --bg-primary: ' + tk[0] + ';');
        out.push('  --bg-secondary: ' + tk[1] + ';');
        injected++;
      } else {
        console.log(id + ' already has bg tokens (skipping)');
      }
    }
  }
}

fs.writeFileSync('src/themes.css', out.join('\n'), 'utf-8');
console.log('Injected bg tokens into ' + injected + ' light blocks');
