// Assemble index.html from src.html + minx.js + verified case data.
const fs = require('fs');
const path = require('path'); const ROOT = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/generated/pll.json')));
const N = D.meta.names;
const colors = {};
for (let f = 0; f < 12; f++) colors[f] = '#7a7a7a';
colors[N.U] = '#ecebe4';   // 上面
colors[N.F] = '#25b04a';   // 緑
colors[N.R] = '#e8352b';   // 赤
colors[N.BR] = '#2563d9';  // 青
colors[N.BL] = '#f5cf12';  // 黄
colors[N.L] = '#9a4fe0';   // 紫
const geo = { cells: D.geometry.cells.map(c => [c.p, c.t]), uc: D.geometry.uc };
const cases = D.cases.map(c => [c.name, c.group, c.algs, c.scr, c.col, c.arrows]);
const faces = { U: N.U, F: N.F, R: N.R, L: N.L, BR: N.BR, BL: N.BL };
// OLL: the sheet's 178 cases + the 81 one-edge cases (algorithms from our own search), ordered by set number
const oll = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/generated/oll.json'))).concat(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/generated/oll1.json'))))
  .map((c, i) => [c, i]).sort((a, b) => a[0][1] - b[0][1] || a[1] - b[1]).map(x => x[0]);
const data = JSON.stringify({ U: N.U, faces, geo, cases, oll });
let minx = fs.readFileSync(path.join(ROOT, 'src/minx.js'), 'utf8').replace(/^if \(typeof module.*$/m, '');
let html = fs.readFileSync(path.join(ROOT, 'src/page.html'), 'utf8');
const strip = f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').replace(/^if \(typeof module.*$/m, '');
const worker = minx.trim() + '\n' + strip('rusolve.js') + '\n' + strip('llsolve.js') + `
if (typeof importScripts === 'function') {
  let LLS = null;
  onmessage = e => { const { id, seqs, ms, looseMs, warm, falls } = e.data; let res = null;
    try { if (!LLS) { LLS = makeLL(MINX, makeRU); LLS.RU.buildForward(10); }
      if (warm) { postMessage({ id, res: null }); return; }
      const sts = seqs.map(q => MINX.apply(MINX.solved(), q));
      let r = LLS.solveMulti(sts, { ms, looseMs, maxP1: 6 });
      if ((!r || !r.moves) && falls && falls.length) r = LLS.solveFallback(sts, falls, { ms: 4000 });
      if (r && r.moves) res = { moves: r.moves, ti: r.ti, fallback: !!r.fallback }; } catch (err) { res = null; }
    postMessage({ id, res }); };
}`;
html = html.replace('/*@MINX@*/', () => minx.trim()).replace('/*@DIAG@*/', () => strip('diagram.js').trim()).replace('/*@DATA@*/', () => data).replace('/*@LLSRC@*/', () => JSON.stringify(worker));
const out = process.argv[2] || path.join(ROOT, 'index.html');
fs.mkdirSync(require('path').dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, html.length, 'bytes');
