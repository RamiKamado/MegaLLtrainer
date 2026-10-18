// OLL algorithm search in <R,U,F> on the Megaminx: from an LL state with F2L solved, find sequences that
// orient the whole last layer (any LL permutation) and keep F2L. IDA* with exact pruning tables:
//   - corner twist x edge flip of all R/U/F pieces (3^9 * 2^11)
//   - positions+twists of the 5 non-LL corners
//   - positions of the 7 non-LL edges, and positions+flips of two edge subsets
function makeOLL(M) {
  const N = M.N, SOL = M.solved(), UF = M.names.U;
  const MV = []; for (const f of ['R', 'U', 'F']) for (const s of ['', '2', "2'", "'"]) MV.push(f + s);
  const FACE = MV.map(t => 'RUF'.indexOf(t[0])); const W = MV.length;
  const LBL = Int16Array.from({ length: N }, (_, i) => i);
  const P = MV.map(t => M.apply(LBL, t));
  const moved = new Set(); P.forEach(p => { for (let i = 0; i < N; i++) if (p[i] !== i) moved.add(i); });
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const isC = i => (i % 11) >= 1 && (i % 11) <= 5;
  const nearestV = i => { let b = -1, bd = 1e9; M.V.forEach((v, k) => { const d = d2(v, M.pos[i]); if (d < bd) { bd = d; b = k; } }); return b; };
  const edgeKey = i => { const ds = M.V.map((v, k) => [k, d2(v, M.pos[i])]).sort((a, b) => a[1] - b[1]); return [ds[0][0], ds[1][0]].sort((a, b) => a - b).join('-'); };
  const cg = new Map(), eg = new Map();
  for (const i of moved) { if (i % 11 === 0) continue;
    if (isC(i)) { const v = nearestV(i); if (!cg.has(v)) cg.set(v, []); cg.get(v).push(i); }
    else { const k = edgeKey(i); if (!eg.has(k)) eg.set(k, []); eg.get(k).push(i); } }
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const rotFirst = (arr, pred) => { const k = arr.findIndex(pred); return k <= 0 ? arr : arr.slice(k).concat(arr.slice(0, k)); };
  // cyclic order around each corner; the U-face sticker first, so "oriented" = twist 0 on the last layer
  let corners = [...cg.entries()].map(([v, sl]) => { const c = M.V[v], n = Math.hypot(...c), ax = c.map(x => x / n);
    const r = sl.map(i => M.pos[i].map((x, k) => x - c[k])), e2 = cross(ax, r[0]);
    const ord = sl.map((i, k) => [i, Math.atan2(dot(r[k], e2), dot(r[k], r[0]))]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    return rotFirst(ord, i => M.home[i] === UF); });
  let edges = [...eg.values()].map(sl => { const s = sl.sort((a, b) => a - b); return M.home[s[1]] === UF ? [s[1], s[0]] : s; });
  const isLLc = c => c.some(i => M.home[i] === UF), isLLe = e => e.some(i => M.home[i] === UF);
  // LL positions first
  corners.sort((a, b) => isLLc(b) - isLLc(a)); edges.sort((a, b) => isLLe(b) - isLLe(a));
  const NC = corners.length, NE = edges.length; // 10, 12
  const NLLC = corners.filter(isLLc).length, NLLE = edges.filter(isLLe).length; // 5, 5
  const setKey = a => a.slice().sort((x, y) => x - y).join(',');
  const cHome = corners.map(c => c.map(i => SOL[i])), eHome = edges.map(e => e.map(i => SOL[i]));
  const cByCol = new Map(cHome.map((c, k) => [setKey(c), k])), eByCol = new Map(eHome.map((e, k) => [setKey(e), k]));
  function toCubie(st) {
    const cp = new Int8Array(NC), co = new Int8Array(NC), ep = new Int8Array(NE), eo = new Int8Array(NE);
    for (let p = 0; p < NC; p++) { const cols = corners[p].map(i => st[i]); const k = cByCol.get(setKey(cols)); if (k === undefined) return null; cp[p] = k; co[p] = cols.indexOf(cHome[k][0]); }
    for (let p = 0; p < NE; p++) { const cols = edges[p].map(i => st[i]); const k = eByCol.get(setKey(cols)); if (k === undefined) return null; ep[p] = k; eo[p] = cols.indexOf(eHome[k][0]); }
    return { cp, co, ep, eo };
  }
  const MC = MV.map(t => toCubie(M.apply(SOL, t)));
  // ---- coordinates ----
  const coIdx = co => { let v = 0; for (let i = 0; i < NC - 1; i++) v = v * 3 + co[i]; return v; };
  const eoIdx = eo => { let v = 0; for (let i = 0; i < NE - 1; i++) v = v * 2 + eo[i]; return v; };
  const coOf = v => { const a = new Int8Array(NC); let s = 0; for (let i = NC - 2; i >= 0; i--) { a[i] = v % 3; s += a[i]; v = Math.floor(v / 3); } a[NC - 1] = (3 - s % 3) % 3; return a; };
  const eoOf = v => { const a = new Int8Array(NE); let s = 0; for (let i = NE - 2; i >= 0; i--) { a[i] = v % 2; s += a[i]; v = Math.floor(v / 2); } a[NE - 1] = s % 2; return a; };
  const NCO = 3 ** (NC - 1), NEO = 2 ** (NE - 1);
  const coM = new Uint16Array(NCO * W), eoM = new Uint16Array(NEO * W);
  for (let x = 0; x < NCO; x++) { const o = coOf(x); for (let m = 0; m < W; m++) { const b = MC[m], r = new Int8Array(NC); for (let i = 0; i < NC; i++) r[i] = (o[b.cp[i]] + b.co[i]) % 3; coM[x * W + m] = coIdx(r); } }
  for (let x = 0; x < NEO; x++) { const o = eoOf(x); for (let m = 0; m < W; m++) { const b = MC[m], r = new Int8Array(NE); for (let i = 0; i < NE; i++) r[i] = (o[b.ep[i]] + b.eo[i]) % 2; eoM[x * W + m] = eoIdx(r); } }
  // single piece (pos*ori) move tables
  const cMove = MV.map((t, m) => { const out = new Int16Array(NC * 3), b = MC[m];
    for (let p = 0; p < NC; p++) for (let o = 0; o < 3; o++) for (let q = 0; q < NC; q++) if (b.cp[q] === p) out[p * 3 + o] = q * 3 + (o + b.co[q]) % 3; return out; });
  const eMove = MV.map((t, m) => { const out = new Int16Array(NE * 2), b = MC[m];
    for (let p = 0; p < NE; p++) for (let o = 0; o < 2; o++) for (let q = 0; q < NE; q++) if (b.ep[q] === p) out[p * 2 + o] = q * 2 + (o + b.eo[q]) % 2; return out; });
  function bfs(size, starts, step) { const d = new Uint8Array(size).fill(255); let fr = []; for (const s of starts) { d[s] = 0; fr.push(s); } let k = 0;
    while (fr.length) { const nx = []; for (const x of fr) for (let m = 0; m < W; m++) { const y = step(x, m); if (d[y] === 255) { d[y] = k + 1; nx.push(y); } } fr = nx; k++; } return d; }
  const prOR = bfs(NCO * NEO, [0], (x, m) => coM[Math.floor(x / NEO) * W + m] * NEO + eoM[(x % NEO) * W + m]);
  // non-LL corners (pieces NLLC..NC-1): their pos*ori, all 5 together (30^5)
  const nlc = []; for (let k = NLLC; k < NC; k++) nlc.push(k);
  const nle = []; for (let k = NLLE; k < NE; k++) nle.push(k);
  const SC = NC * 3, SE = NE * 2;
  const encC = arr => arr.reduce((v, x) => v * SC + x, 0);
  const prNC = bfs(SC ** nlc.length, [encC(nlc.map(k => k * 3))], (x, m) => { let v = 0, mul = 1; const out = [];
    for (let i = 0; i < nlc.length; i++) { out.unshift(cMove[m][x % SC]); x = Math.floor(x / SC); } return encC(out); });
  // non-LL edges: split into two groups with orientation (4 + 3)
  const ga = nle.slice(0, 4), gb = nle.slice(4);
  const encE = arr => arr.reduce((v, x) => v * SE + x, 0);
  const stepE = n => (x, m) => { const out = []; for (let i = 0; i < n; i++) { out.unshift(eMove[m][x % SE]); x = Math.floor(x / SE); } return encE(out); };
  const prEA = bfs(SE ** ga.length, [encE(ga.map(k => k * 2))], stepE(ga.length));
  const prEB = bfs(SE ** gb.length, [encE(gb.map(k => k * 2))], stepE(gb.length));
  const where = (c, kind, piece) => { if (kind === 'c') { for (let p = 0; p < NC; p++) if (c.cp[p] === piece) return p * 3 + c.co[p]; }
    else { for (let p = 0; p < NE; p++) if (c.ep[p] === piece) return p * 2 + c.eo[p]; } };
  // search: all solutions of length <= best+extra, from each of the given start states (tagged)
  function search(starts, opt) {
    opt = opt || {}; const extra = opt.extra ?? 1, want = opt.want || 40, ms = opt.ms || 60000, maxLen = opt.maxLen || 22;
    const t0 = Date.now(); const sols = []; let best = 99, stop = false;
    const roots = starts.map(st => { const c = toCubie(st);
      return { or: coIdx(c.co) * NEO + eoIdx(c.eo), nc: nlc.map(k => where(c, 'c', k)), ea: ga.map(k => where(c, 'e', k)), eb: gb.map(k => where(c, 'e', k)) }; });
    const seq = [];
    function h(or, nc, ea, eb) { return Math.max(prOR[or], prNC[encC(nc)], prEA[encE(ea)], prEB[encE(eb)]); }
    function dfs(ti, or, nc, ea, eb, g, lim, lastF) {
      const hv = h(or, nc, ea, eb);
      if (hv === 0) { if (g === lim) sols.push({ ti, moves: seq.slice() }); return; }
      if (g + hv > lim) return;
      if (Date.now() - t0 > ms) { stop = true; return; }
      for (let m = 0; m < W; m++) {
        if (FACE[m] === lastF) continue;
        seq.push(m);
        dfs(ti, coM[Math.floor(or / NEO) * W + m] * NEO + eoM[(or % NEO) * W + m], nc.map(x => cMove[m][x]), ea.map(x => eMove[m][x]), eb.map(x => eMove[m][x]), g + 1, lim, FACE[m]);
        seq.pop();
        if (stop || sols.length >= want) return;
      }
    }
    for (let lim = 1; lim <= maxLen && !stop; lim++) {
      if (lim > best + extra) break;
      roots.forEach((r, ti) => { if (!stop && sols.length < want) dfs(ti, r.or, r.nc, r.ea, r.eb, 0, lim, -1); });
      if (sols.length && best === 99) best = lim;
      if (sols.length >= want) break;
    }
    return sols.map(s => ({ ti: s.ti, moves: s.moves.map(m => MV[m]) }));
  }
  return { search, info: { NC, NE, NLLC, NLLE, maxOR: prOR.reduce((a, x) => x < 255 && x > a ? x : a, 0), maxNC: prNC.reduce((a, x) => x < 255 && x > a ? x : a, 0) } };
}
if (typeof module !== 'undefined') module.exports = makeOLL;
