// Parse algorithm notes from the sheet into token lists. Each note line = one alg.
// Returns {raw, lead:[rotations/AUF before the alg], body:'moves'}.
const fs = require('fs');
function parseLine(line) {
  let s = line.replace(/ /g, ' ').split('//')[0].trim();
  if (!s) return null;
  // (seq)x3 / (seq)*2 -> repeated
  s = s.replace(/\(([^()]*)\)\s*[x×*]\s*(\d)/g, (_, q, n) => Array(+n).fill(q).join(' '));
  // leading (y'), (U2) etc.
  const lead = [];
  let m;
  while ((m = /^\(\s*([xyzU][2]?'?)\s*\)\s*/.exec(s))) { lead.push(m[1]); s = s.slice(m[0].length); }
  const body = s.replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!body) return null;
  return { raw: line.trim(), lead, body };
}
function parseNote(note) { return note.split(/\n/).map(parseLine).filter(Boolean); }
module.exports = { parseNote, parseLine };
