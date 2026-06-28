// splice.js <replacement-file> <start-line> <end-line>
// Replaces lines start..end in src/App.jsx with content from replacement-file
var fs = require('fs');
var path = require('path');
var repFile = process.argv[2];
var start = parseInt(process.argv[3], 10);
var end = parseInt(process.argv[4], 10);

var appPath = path.join(__dirname, '..', 'src', 'App.jsx');
var lines = fs.readFileSync(appPath, 'utf-8').split('\n');
var replacement = fs.readFileSync(repFile, 'utf-8').split('\n');

// Remove trailing empty line if present
if (replacement[replacement.length - 1] === '') {
  replacement.pop();
}

console.log('Replacing lines ' + start + '-' + end + ' (' + (end - start + 1) + ' lines) with ' + replacement.length + ' new lines');
console.log('Old line ' + start + ': ' + lines[start - 1].substring(0, 60));
console.log('New line 1: ' + replacement[0].substring(0, 60));

var before = lines.slice(0, start - 1);
var after = lines.slice(end);
var newContent = before.concat(replacement, after).join('\n');
fs.writeFileSync(appPath, newContent, 'utf-8');
console.log('Done! File updated.');
