var fs = require('fs');
var DQ = String.fromCharCode(34);
var q = DQ;

var lines = [];
function L(x) { lines.push(x); }

L('                {topMustRead.length > 0 && (');
L('                  <div className=' + q + 'hotspot-list' + q + '>');
