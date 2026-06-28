var fs = require("fs");
var fp = "src/App.jsx";
var ls = fs.readFileSync(fp, "utf-8").split("
");
var s = -1, e = -1;
for (var i = 0; i < ls.length; i++) {
  if (ls[i].indexOf("interest-bubble-list") >= 0 && ls[i].indexOf("className") >= 0) s = i;
  if (s >= 0 && e < 0 && ls[i].indexOf("</div>") >= 0 && i > s) { e = i; break; }
}
if (s < 0) { console.error("Not found"); process.exit(1); }
console.log("Found lines " + (s+1) + "-" + (e+1));
var nb = [
  "                    {selectedInterests.length === 0 ? (",
