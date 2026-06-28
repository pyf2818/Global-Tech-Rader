// gen-bubble-content.js
var fs = require('fs');
var path = require('path');
var appPath = path.join(__dirname, '..', 'src', 'App.jsx');
var lines = fs.readFileSync(appPath, 'utf-8').split('\n');
var start = -1, end = -1;
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('interest-bubble-list') >= 0 && lines[i].indexOf('className') >= 0) start = i;
  if (start >= 0 && end < 0 && lines[i].indexOf('</div>') >= 0 && i > start) { end = i; break; }
}
if (start < 0) { console.error('Not found'); process.exit(1); }
console.log('Block at lines ' + (start+1) + '-' + (end+1));
