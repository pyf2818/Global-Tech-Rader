// Patch hotspot list in App.jsx using base64-encoded replacement
var fs = require('fs');
var b64 = process.argv[2];
var replacement = Buffer.from(b64, 'base64').toString('utf-8');
var lines = fs.readFileSync('src/App.jsx', 'utf-8').split('\n');
var start = 6251, end = 6279;
var repLines = replacement.split('\n');
lines.splice.apply(lines, [start, end - start + 1].concat(repLines));
fs.writeFileSync('src/App.jsx', lines.join('\n'), 'utf-8');
console.log('Replaced lines ' + (start+1) + '-' + (end+1) + ' with ' + repLines.length + ' lines');
