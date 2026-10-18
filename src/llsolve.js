// Single-scramble search for Megaminx last-layer states (F2L solved), two phases:
//   phase 1: <R,U,F> moves until the state is solvable with R and U only
//            (the 2 corners / 3 edges that only F moves are back home, and the R/U-piece coordinates are R/U-reachable)
//   phase 2: <R,U> meet-in-the-middle (exact tables, makeRU)
// The result S takes the target state to solved; the scramble is S^-1.
function makeLL(M, makeRU) {
  const RU = makeRU(M);
  const N = M.N, SOL = M.solved();
  const MV = []; for (const f of ['R', 'U', 'F']) for (const s of ['', '2', "2'", "'"]) MV.push(f + s);
  const FACE = MV.map(t => 'RUF'.indexOf(t[0]));
  const W = MV.length;
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
  // corners: stickers in cyclic order around the vertex
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const corners = [...cg.entries()].map(([v, sl]) => { const c = M.V[v], n = Math.hypot(...c), ax = c.map(x => x / n);
    const r = sl.map(i => M.pos[i].map((x, k) => x - c[k])), e2 = cross(ax, r[0]);
    return sl.map((i, k) => [i, Math.atan2(dot(r[k], e2), dot(r[k], r[0]))]).sort((a, b) => a[1] - b[1]).map(x => x[0]); });
  const edges = [...eg.values()].map(sl => sl.sort((a, b) => a - b));
  const NC = corners.length, NE = edges.length; // 10, 12
  const setKey = a => a.slice().sort((x, y) => x - y).join(',');
  const cHome = corners.map(c => c.map(i => SOL[i])), eHome = edges.map(e => e.map(i => SOL[i]));
  const cByCol = new Map(cHome.map((c, k) => [setKey(c), k])), eByCol = new Map(eHome.map((e, k) => [setKey(e), k]));
  function toCubie(st) {
    const cp = new Int8Array(NC), co = new Int8Array(NC), ep = new Int8Array(NE), eo = new Int8Array(NE);
    for (let p = 0; p < NC; p++) { const cols = corners[p].map(i => st[i]); const k = cByCol.get(setKey(cols)); if (k === undefined) return null; cp[p] = k; co[p] = cols.indexOf(cHome[k][0]); }
    for (let p = 0; p < NE; p++) { const cols = edges[p].map(i => st[i]); const k = eByCol.get(setKey(cols)); if (k === undefined) return null; ep[p] = k; eo[p] = cols.indexOf(eHome[k][0]); }
    return { cp, co, ep, eo };
  }
  function toStickers(c) { // place pieces back on a solved sticker state
    const st = Int8Array.from(SOL);
    for (let p = 0; p < NC; p++) { const h = cHome[c.cp[p]]; for (let j = 0; j < 3; j++) st[corners[p][(j + c.co[p]) % 3]] = h[j]; }
    for (let p = 0; p < NE; p++) { const h = eHome[c.ep[p]]; for (let j = 0; j < 2; j++) st[edges[p][(j + c.eo[p]) % 2]] = h[j]; }
    return st;
  }
  const MC = MV.map(t => toCubie(M.apply(SOL, t)));
  // pieces that only F moves (not R or U): they must be home after phase 1
  const ruMoved = new Set(); [0, 1, 2, 3, 4, 5, 6, 7].forEach(m => { for (let i = 0; i < N; i++) if (P[m][i] !== i) ruMoved.add(i); });
  const fOnlyC = corners.map((c, k) => k).filter(k => !corners[k].some(i => ruMoved.has(i)));
  const fOnlyE = edges.map((e, k) => k).filter(k => !edges[k].some(i => ruMoved.has(i)));
  // pruning tables for where the F-only pieces are (position*orientation of each)
  const cpos = (c, piece) => { for (let p = 0; p < NC; p++) if (c.cp[p] === piece) return p * 3 + c.co[p]; };
  const epos = (c, piece) => { for (let p = 0; p < NE; p++) if (c.ep[p] === piece) return p * 2 + c.eo[p]; };
  function mult(a, b) {
    const cp = new Int8Array(NC), co = new Int8Array(NC), ep = new Int8Array(NE), eo = new Int8Array(NE);
    for (let i = 0; i < NC; i++) { cp[i] = a.cp[b.cp[i]]; co[i] = (a.co[b.cp[i]] + b.co[i]) % 3; }
    for (let i = 0; i < NE; i++) { ep[i] = a.ep[b.ep[i]]; eo[i] = (a.eo[b.ep[i]] + b.eo[i]) % 2; }
    return { cp, co, ep, eo };
  }
  // single-piece move tables: (pos*ori) -> (pos*ori) after move m
  const cMove = MV.map((t, m) => { const out = new Int16Array(NC * 3); const b = MC[m];
    for (let p = 0; p < NC; p++) for (let o = 0; o < 3; o++) { // piece at p with ori o -> new position q where b.cp[q]===p
      for (let q = 0; q < NC; q++) if (b.cp[q] === p) out[p * 3 + o] = q * 3 + (o + b.co[q]) % 3; } return out; });
  const eMove = MV.map((t, m) => { const out = new Int16Array(NE * 2); const b = MC[m];
    for (let p = 0; p < NE; p++) for (let o = 0; o < 2; o++) for (let q = 0; q < NE; q++) if (b.ep[q] === p) out[p * 2 + o] = q * 2 + (o + b.eo[q]) % 2; return out; });
  const SC = NC * 3, SE = NE * 2;
  function bfs(size, start, step) { const d = new Uint8Array(size).fill(255); d[start] = 0; let fr = [start], k = 0;
    while (fr.length) { const nx = []; for (const x of fr) for (let m = 0; m < W; m++) { const y = step(x, m); if (d[y] === 255) { d[y] = k + 1; nx.push(y); } } fr = nx; k++; } return d; }
  const [c1, c2] = fOnlyC, [e1, e2, e3] = fOnlyE;
  const prC = bfs(SC * SC, (c1 * 3) * SC + c2 * 3, (x, m) => cMove[m][Math.floor(x / SC)] * SC + cMove[m][x % SC]);
  const prE = bfs(SE * SE * SE, ((e1 * 2) * SE + e2 * 2) * SE + e3 * 2, (x, m) => { const a = Math.floor(x / (SE * SE)), b = Math.floor(x / SE) % SE, c = x % SE;
    return (eMove[m][a] * SE + eMove[m][b]) * SE + eMove[m][c]; });
  const isF = m => FACE[m] === 2;
  // search: collect phase-1 candidates (ending with an F move, F-only pieces home, R/U-solvable),
  // then raise the total length T and try every candidate with phase 2 at exactly T - |phase 1|.
  function solve(st, opt) { const r = solveMulti([st], opt); return r && r.moves ? { moves: r.moves, ms: r.ms, stats: r.stats } : r; }
  function solveMulti(sts, opt) {
    opt = opt || {};
    const ms = opt.ms || 3000, maxP1 = opt.maxP1 || 7, maxT = opt.maxT || 26;
    const t0 = Date.now(); const stats = { cand: 0, p2: 0 };
    const cands = [];
    for (let ti = 0; ti < sts.length; ti++) {
    const c0 = toCubie(sts[ti]); if (!c0) continue;
    const seen = new Map();
    const add = (cub, p1) => { const s2 = toStickers(cub); const k = s2.join(','); const old = seen.get(k);
      if (old) { if (p1.length < old.p1.length) old.p1 = p1; return; }
      const co = RU.coordsOf(s2); if (!co) return; const h = RU.h2c(co); if (h >= 255) return; const c = { p1, s2, co, h, ti }; seen.set(k, c); cands.push(c); };
    if (prC[cpos(c0, c1) * SC + cpos(c0, c2)] === 0 && prE[(epos(c0, e1) * SE + epos(c0, e2)) * SE + epos(c0, e3)] === 0) add(c0, []);
    const seq = [];
    function dfs(cub, cA, cB, eA, eB, eC, g, lim, lastF) {
      const h = Math.max(prC[cA * SC + cB], prE[(eA * SE + eB) * SE + eC]);
      if (g === lim) { if (h === 0) add(cub, seq.slice()); return; }
      if (g + h > lim) return;
      for (let m = 0; m < W; m++) {
        if (FACE[m] === lastF) continue;
        if (g + 1 === lim && !isF(m)) continue;       // phase 1 ends with an F move (an R/U move there is phase 2's job)
        seq.push(m);
        dfs(mult(cub, MC[m]), cMove[m][cA], cMove[m][cB], eMove[m][eA], eMove[m][eB], eMove[m][eC], g + 1, lim, FACE[m]);
        seq.pop();
      }
    }
    const before = cands.length;
    for (let lim = 1; lim <= maxP1; lim++) dfs(c0, cpos(c0, c1), cpos(c0, c2), epos(c0, e1), epos(c0, e2), epos(c0, e3), 0, lim, -1);
    // few candidates (e.g. 4 flipped edges): let phase 1 go deeper
    for (let lim = maxP1 + 1; lim <= 8 && cands.length - before < (opt.minCand || 300); lim++) dfs(c0, cpos(c0, c1), cpos(c0, c2), epos(c0, e1), epos(c0, e2), epos(c0, e3), 0, lim, -1);
    }
    stats.cand = cands.length;
    cands.sort((a, b) => (a.p1.length + a.h) - (b.p1.length + b.h));
    const tMin = cands.length ? cands[0].p1.length + cands[0].h : 99;
    let best = null, bestTi = -1;
    for (let T = tMin; T <= maxT && !best; T++) {
      for (const c of cands) {
        const need = T - c.p1.length; if (need < c.h) continue;
        if (Date.now() - t0 > ms) { T = 999; break; }
        stats.p2++;
        const r = RU.solveMITM(null, { coords: c.co, exact: need, ms: Math.max(5, ms - (Date.now() - t0)) });
        if (r && r.moves) { best = reduce(c.p1.map(m => MV[m]).concat(r.moves)); bestTi = c.ti; break; }
      }
    }
    if (best) return { moves: best, ti: bestTi, ms: Date.now() - t0, stats };
    // not found in time: loosen the length limit — with more allowed moves there are far more solutions,
    // so a depth-first search finds one quickly (longer, but still a single sequence)
    if (opt.looseMs) {
      const t1 = Date.now();
      for (const T of [24, 26, 28, 30]) {
        for (const c of cands.slice(0, 400)) {
          const need = T - c.p1.length; if (need < c.h) continue;
          if (Date.now() - t1 > opt.looseMs) return opt.debug ? { fail: true, stats } : null;
          const r = RU.solveMITM(null, { coords: c.co, exact: need, ms: 40 });
          if (r && r.moves) { stats.loose = T; return { moves: reduce(c.p1.map(m => MV[m]).concat(r.moves)), ti: c.ti, ms: Date.now() - t0, stats }; }
        }
      }
    }
    return opt.debug ? { fail: true, stats } : null;
  }
  // fallback that always works: orient with one of the given OLL algorithms (from whichever AUF it fits),
  // then solve the remaining PLL with the shortest R/U sequence. Still one sequence, usually a bit longer.
  const nU = M.normals[M.names.U]; const LLS = []; for (let i = 0; i < N; i++) if (M.dot(M.pos[i], nU) > M.thr) LLS.push(i);
  const LLSET = new Set(LLS);
  const f2lOK = st => { for (let i = 0; i < N; i++) if (!LLSET.has(i) && st[i] !== SOL[i]) return false; return true; };
  const orientedLL = st => LLS.every(i => M.home[i] !== M.names.U || st[i] === M.names.U);
  const AUFS = ['', 'U', 'U2', "U2'", "U'"];
  function solveFallback(sts, ollSeqs, opt) {
    opt = opt || {}; let best = null, bestTi = -1; const t0 = Date.now();
    for (let ti = 0; ti < sts.length; ti++) for (const o of ollSeqs) for (const a of AUFS) {
      const pre = (a + ' ' + o).trim();
      let st2; try { st2 = M.apply(sts[ti], pre); } catch (e) { continue; }
      if (!f2lOK(st2) || !orientedLL(st2)) continue;
      const r = RU.solveMITM(st2, { maxLen: 24, ms: Math.max(50, (opt.ms || 3000) - (Date.now() - t0)) });
      if (r && r.moves) { const tot = reduce(pre.split(' ').filter(Boolean).concat(r.moves)); if (!best || tot.length < best.length) { best = tot; bestTi = ti; } }
    }
    return best ? { moves: best, ti: bestTi, fallback: true } : null;
  }
  const AMT = { '': 1, '2': 2, "2'": 3, "'": 4 }, AS = ['', '', '2', "2'", "'"];
  function reduce(toks) { const out = [];
    const sp = t => { const m = /^([A-Za-z]+?)(2'|2|')?$/.exec(t); return [m[1], m[2] || '']; };
    for (const t of toks) { const [f, am] = sp(t), a = AMT[am];
      if (/^[xyz]$/.test(f)) { out.push(t); continue; }
      if (out.length && sp(out[out.length - 1])[0] === f) { const n = (AMT[sp(out[out.length - 1])[1]] + a) % 5; out.pop(); if (n) out.push(f + AS[n]); }
      else out.push(t); }
    return out; }
  return { solve, solveMulti, solveFallback, RU, toCubie, toStickers, info: { NC, NE, fOnlyC, fOnlyE, prCmax: Math.max(...prC.filter(x => x < 255)), prEmax: Math.max(...prE.filter(x => x < 255)) } };
}
if (typeof module !== 'undefined') module.exports = makeLL;
