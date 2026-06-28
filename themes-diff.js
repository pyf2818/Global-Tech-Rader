// Generate palette-distinct background tokens for themes.css
// Each palette gets unique --bg-primary and --bg-secondary in dark and light
const palettes = [
  { id: 'champagne',   darkBg: '#0E0F0D', darkBg2: '#151713', lightBg: '#F7F5F0', lightBg2: '#FFFDF8' },
  { id: 'sakura',      darkBg: '#110D0E', darkBg2: '#1A1215', lightBg: '#FDF7F8', lightBg2: '#FFF8FA' },
  { id: 'forest',      darkBg: '#0B100C', darkBg2: '#101913', lightBg: '#F4F9F5', lightBg2: '#F8FDF9' },
  { id: 'neon',        darkBg: '#0B0E12', darkBg2: '#11141C', lightBg: '#F0F5FA', lightBg2: '#F6FAFD' },
  { id: 'cosmos',      darkBg: '#0B0D11', darkBg2: '#10141C', lightBg: '#F4F7FC', lightBg2: '#F8FBFE' },
  { id: 'terracotta',  darkBg: '#100E0C', darkBg2: '#1A1410', lightBg: '#FBF6F2', lightBg2: '#FEF9F5' },
  { id: 'arctic',      darkBg: '#0D0E10', darkBg2: '#131518', lightBg: '#F8F9FA', lightBg2: '#FCFDFE' },
  { id: 'aurora',      darkBg: '#100B12', darkBg2: '#19101E', lightBg: '#F8F4FC', lightBg2: '#FCF8FE' },
  { id: 'bamboo',      darkBg: '#0A0F0D', darkBg2: '#0E1611', lightBg: '#F2F8F4', lightBg2: '#F6FCF8' },
  { id: 'amber',       darkBg: '#0E0E0A', darkBg2: '#17150E', lightBg: '#F8F6F0', lightBg2: '#FCFAF4' },
  { id: 'twilight',    darkBg: '#0B0D0F', darkBg2: '#101317', lightBg: '#F4F6F8', lightBg2: '#F8FAFC' },
  { id: 'coral',       darkBg: '#110C0B', darkBg2: '#1A120F', lightBg: '#FDF5F2', lightBg2: '#FFF8F5' },
];

console.log('// --- Background overrides to add in each palette block ---');
for (const p of palettes) {
  console.log(`\n/* ${p.id} */`);
  console.log(`  --bg-primary: ${p.darkBg};`);
  console.log(`  --bg-secondary: ${p.darkBg2};`);
}
console.log('\n// --- Light mode ---');
for (const p of palettes) {
  console.log(`\n/* ${p.id} light */`);
  console.log(`  --bg-primary: ${p.lightBg};`);
  console.log(`  --bg-secondary: ${p.lightBg2};`);
}