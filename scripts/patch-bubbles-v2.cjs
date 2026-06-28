var fs = require('fs');
var fp = 'src/App.jsx';
var lines = fs.readFileSync(fp, 'utf-8').split('\n');

var start = -1, end = -1;
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('interest-bubble-list') >= 0 && lines[i].indexOf('className') >= 0) start = i;
  if (start >= 0 && end < 0 && lines[i].indexOf('workbench-text-btn') >= 0) { end = i; break; }
}

if (start < 0) { console.error('Not found'); process.exit(1); }
console.log('Replacing lines ' + (start+1) + '-' + (end+1));

var nb = [];
nb.push('                  <ColorfulBubbles');
nb.push('                    interests={selectedInterests}');
nb.push('                    categories={CATEGORIES}');
nb.push('                    onBubbleClick={(catId) => setCategory(catId)}');
nb.push('                    onEmptyClick={() => setShowInterestModal(true)}');
nb.push('                  />');
nb.push('                  <button className="workbench-text-btn" onClick={() => setShowInterestModal(true)}>调整偏好</button>');

var before = lines.slice(0, start);
var after = lines.slice(end);
var result = before.concat(nb, after);
fs.writeFileSync(fp, result.join('\n'), 'utf-8');
console.log('Done! Replaced ' + (end - start + 1) + ' lines with ' + nb.length + ' new lines');
