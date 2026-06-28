var fs = require("fs");
var fp = "src/App.jsx";
var lines = fs.readFileSync(fp, "utf-8").split("
");
var sectionStart = -1, sectionEnd = -1;
for (var i = 0; i < lines.length; i++) {
  if (lines[i].includes("must-read-section") && sectionStart < 0) { sectionStart = i; break; }
}
if (sectionStart < 0) { console.error("not found"); process.exit(1); }
var depth = 0;
for (var i = sectionStart; i < lines.length; i++) {
  for (var ci = 0; ci < lines[i].length; ci++) {
    var ch = lines[i][ci];
    if (ch === "(" || ch === "{") depth++;
    if (ch === ")" || ch === "}") depth--;
  }
  if (depth <= 0) { sectionEnd = i; break; }
}
console.log("Block: " + (sectionStart+1) + "-" + (sectionEnd+1));
var before = lines.slice(0, sectionStart);
var after = lines.slice(sectionEnd + 1);
var rep = fs.readFileSync("scripts/news-list-replacement.txt", "utf-8").split("
");
var result = before.concat(rep, after);
fs.writeFileSync(fp, result.join("
"), "utf-8");
console.log("Done: replaced " + (sectionEnd - sectionStart + 1) + " lines with " + rep.length + " lines");