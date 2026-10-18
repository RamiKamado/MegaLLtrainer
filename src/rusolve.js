// IDA* solver in the <R,U> group of the Megaminx, on a cubie model derived from the sticker model.
// The R and U faces move 8 corners and 9 edges. Pruning tables: corner permutation, edge permutation,
// and corner twist x edge flip. Works on any state reachable with R/U (all LL states with F2L solved).
function makeRU(M) {
  const N = M.N, SOL = M.solved();
  const MV = []; for (const f of ['R', 'U']) for (const s of ['', '2', "2'", "'"]) MV.push(f + s);
  const FACE = MV.map(t => t[0] === 'R' ? 0 : 1);
  const LBL = Int16Array.from({ length: N }, (_, i) => i);
  const P = MV.map(t => M.apply(LBL, t));
  const moved = new Set(); P.forEach(p => { for (let i = 0; i < N; i++) if (p[i] !== i) moved.add(i); });
  // group moved stickers into pieces by nearest vertex / edge midpoint
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const corners = [], edges = [];
  const isCornerSlot = i => (i % 11) >= 1 && (i % 11) <= 5;
  const vOf = i => { let b = -1, bd = 1e9; M.V.forEach((v, k) => { const d = d2(v, M.pos[i]); if (d < bd) { bd = d; b = k; } }); return b; };
  const byV = new Map();
  for (const i of moved) if (isCornerSlot(i)) { const v = vOf(i); if (!byV.has(v)) byV.set(v, []); byV.get(v).push(i); }
  for (const [v, sl] of byV) { // cyclic order around the vertex (counter-clockwise seen from outside)
    const c = M.V[v], n = Math.hypot(...c), ax = c.map(x => x / n);
    const ref = sl.map(i => M.pos[i].map((x, k) => x - c[k]));
    const e1 = ref[0]; const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const e2 = cr(ax, e1);
    const ang = r => Math.atan2(dot(r, e2), dot(r, e1));
    const ord = sl.map((i, k) => [i, ang(ref[k])]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    corners.push(ord);
  }
  const edgeKey = i => { const ds = M.V.map((v, k) => [k, d2(v, M.pos[i])]).sort((a, b) => a[1] - b[1]); return [ds[0][0], ds[1][0]].sort((a, b) => a - b).join('-'); };
  const byE = new Map();
  for (const i of moved) if (!isCornerSlot(i) && i % 11 !== 0) { const k = edgeKey(i); if (!byE.has(k)) byE.set(k, []); byE.get(k).push(i); }
  for (const [, sl] of byE) edges.push(sl.sort((a, b) => a - b));
  if (corners.length !== 8 || edges.length !== 9 || corners.some(c => c.length !== 3) || edges.some(e => e.length !== 2)) throw new Error('piece grouping failed');
  const NC = 8, NE = 9;
  const cHome = corners.map(c => c.map(i => SOL[i]));
  const eHome = edges.map(e => e.map(i => SOL[i]));
  const setKey = a => a.slice().sort((x, y) => x - y).join(',');
  const cByCol = new Map(cHome.map((c, k) => [setKey(c), k]));
  const eByCol = new Map(eHome.map((e, k) => [setKey(e), k]));
  function toCubie(st) {
    const cp = new Int8Array(NC), co = new Int8Array(NC), ep = new Int8Array(NE), eo = new Int8Array(NE);
    for (let p = 0; p < NC; p++) { const cols = corners[p].map(i => st[i]); const k = cByCol.get(setKey(cols)); if (k === undefined) return null;
      cp[p] = k; co[p] = cols.indexOf(cHome[k][0]); }
    for (let p = 0; p < NE; p++) { const cols = edges[p].map(i => st[i]); const k = eByCol.get(setKey(cols)); if (k === undefined) return null;
      ep[p] = k; eo[p] = cols.indexOf(eHome[k][0]); }
    return { cp, co, ep, eo };
  }
  // check: positions of other stickers are untouched? (state must be in the RU group; caller verifies)
  const MC = MV.map(t => toCubie(M.apply(SOL, t)));
  function mult(a, b) { // apply a then move b
    const cp = new Int8Array(NC), co = new Int8Array(NC), ep = new Int8Array(NE), eo = new Int8Array(NE);
    for (let i = 0; i < NC; i++) { cp[i] = a.cp[b.cp[i]]; co[i] = (a.co[b.cp[i]] + b.co[i]) % 3; }
    for (let i = 0; i < NE; i++) { ep[i] = a.ep[b.ep[i]]; eo[i] = (a.eo[b.ep[i]] + b.eo[i]) % 2; }
    return { cp, co, ep, eo };
  }
  const FACT = [1]; for (let i = 1; i <= 9; i++) FACT[i] = FACT[i - 1] * i;
  function permIdx(a) { const n = a.length; let v = 0; const used = new Uint8Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < a[i]; j++) if (!used[j]) s++; used[a[i]] = 1; v += s * FACT[n - 1 - i]; } return v; }
  function permOf(idx, n) { const a = new Int8Array(n), used = new Uint8Array(n);
    for (let i = 0; i < n; i++) { let s = Math.floor(idx / FACT[n - 1 - i]); idx %= FACT[n - 1 - i];
      for (let j = 0; j < n; j++) if (!used[j]) { if (s === 0) { a[i] = j; used[j] = 1; break; } s--; } } return a; }
  const coIdx = co => { let v = 0; for (let i = 0; i < NC - 1; i++) v = v * 3 + co[i]; return v; };
  const eoIdx = eo => { let v = 0; for (let i = 0; i < NE - 1; i++) v = v * 2 + eo[i]; return v; };
  const coOf = v => { const a = new Int8Array(NC); let s = 0; for (let i = NC - 2; i >= 0; i--) { a[i] = v % 3; s += a[i]; v = Math.floor(v / 3); } a[NC - 1] = (3 - s % 3) % 3; return a; };
  const eoOf = v => { const a = new Int8Array(NE); let s = 0; for (let i = NE - 2; i >= 0; i--) { a[i] = v % 2; s += a[i]; v = Math.floor(v / 2); } a[NE - 1] = s % 2; return a; };
  const W = MV.length;
  // move tables
  const cpM = new Uint16Array(40320 * W), epM = new Uint32Array(362880 * W), coM = new Uint16Array(2187 * W), eoM = new Uint16Array(256 * W);
  for (let x = 0; x < 40320; x++) { const p = permOf(x, NC); for (let m = 0; m < W; m++) { const b = MC[m].cp, r = new Int8Array(NC); for (let i = 0; i < NC; i++) r[i] = p[b[i]]; cpM[x * W + m] = permIdx(r); } }
  for (let x = 0; x < 362880; x++) { const p = permOf(x, NE); for (let m = 0; m < W; m++) { const b = MC[m].ep, r = new Int8Array(NE); for (let i = 0; i < NE; i++) r[i] = p[b[i]]; epM[x * W + m] = permIdx(r); } }
  for (let x = 0; x < 2187; x++) { const o = coOf(x); for (let m = 0; m < W; m++) { const b = MC[m], r = new Int8Array(NC); for (let i = 0; i < NC; i++) r[i] = (o[b.cp[i]] + b.co[i]) % 3; coM[x * W + m] = coIdx(r); } }
  for (let x = 0; x < 256; x++) { const o = eoOf(x); for (let m = 0; m < W; m++) { const b = MC[m], r = new Int8Array(NE); for (let i = 0; i < NE; i++) r[i] = (o[b.ep[i]] + b.eo[i]) % 2; eoM[x * W + m] = eoIdx(r); } }
  function prune(n, tab) { const d = new Uint8Array(n).fill(255); d[0] = 0; let fr = [0], depth = 0;
    while (fr.length) { const nx = []; for (const x of fr) for (let m = 0; m < W; m++) { const y = tab(x, m); if (d[y] === 255) { d[y] = depth + 1; nx.push(y); } } fr = nx; depth++; } return d; }
  const prCP = prune(40320, (x, m) => cpM[x * W + m]);
  const prEP = prune(362880, (x, m) => epM[x * W + m]);
  const prOR = prune(2187 * 256, (x, m) => coM[Math.floor(x / 256) * W + m] * 256 + eoM[(x % 256) * W + m]);
  const USE_CE = true;   // corner permutation x edge flip table (10 MB) speeds up phase 2
  const prCE = USE_CE ? prune(40320 * 256, (x, m) => cpM[(x >> 8) * W + m] * 256 + eoM[(x & 255) * W + m]) : null;
  // solve: sequence (tokens) that takes state st to solved; null if not found within budget
  function solve(st, opt) {
    opt = opt || {}; const maxLen = opt.maxLen || 30, ms = opt.ms || 500;
    const c = toCubie(st); if (!c) return null;
    const cp0 = permIdx(c.cp), ep0 = permIdx(c.ep), or0 = coIdx(c.co) * 256 + eoIdx(c.eo);
    const t0 = Date.now(); let nodes = 0, stop = false;
    const seq = new Int8Array(64);
    function dfs(cp, ep, or, g, lim, lastF) {
      const h = Math.max(prCP[cp], prEP[ep], prOR[or]);
      if (h === 0) return cp === 0 && ep === 0 && or === 0 ? g : -1;
      if (g + h > lim) return -1;
      if ((++nodes & 4095) === 0 && Date.now() - t0 > ms) { stop = true; return -1; }
      for (let m = 0; m < W; m++) {
        if (FACE[m] === lastF) continue;
        seq[g] = m;
        const r = dfs(cpM[cp * W + m], epM[ep * W + m], coM[Math.floor(or / 256) * W + m] * 256 + eoM[(or % 256) * W + m], g + 1, lim, FACE[m]);
        if (r >= 0) return r;
        if (stop) return -1;
      }
      return -1;
    }
    for (let lim = Math.max(prCP[cp0], prEP[ep0], prOR[or0]); lim <= maxLen; lim++) {
      const r = dfs(cp0, ep0, or0, 0, lim, -1);
      if (r >= 0) return { moves: Array.from(seq.slice(0, r), m => MV[m]), nodes, ms: Date.now() - t0 };
      if (stop) return null;
    }
    return null;
  }
  // ---- meet in the middle: forward table of every state within FD moves of solved ----
  const OR = (or, m) => coM[Math.floor(or / 256) * W + m] * 256 + eoM[(or % 256) * W + m];
  const KEY = (cp, ep, or) => (cp * 362880 + ep) * 559872 + or;
  // forward table: open addressing on typed arrays (key = exact coordinate number, value = depth + 1)
  let FD = 0, HK = null, HV = null, HMASK = 0;
  const hslot = k => { const lo = k % 4294967296, hi = Math.floor(k / 4294967296); return (Math.imul(lo ^ Math.imul(hi, 0x9E3779B1), 0x85EBCA6B) >>> 0) & HMASK; };
  const FWget = k => { let i = hslot(k); for (;;) { const v = HV[i]; if (v === 0) return -1; if (HK[i] === k) return v - 1; i = (i + 1) & HMASK; } };
  const FWput = (k, d) => { let i = hslot(k); for (;;) { const v = HV[i]; if (v === 0) { HK[i] = k; HV[i] = d + 1; return true; } if (HK[i] === k) return false; i = (i + 1) & HMASK; } };
  function buildForward(depth) {
    FD = depth;
    const est = [1, 9, 41, 169, 681, 2729, 10921, 43689, 174761, 699049, 2796201, 11184809][depth] || 3e6;
    let cap = 1; while (cap < est * 1.5) cap *= 2;
    HK = new Float64Array(cap); HV = new Uint8Array(cap); HMASK = cap - 1;
    FWput(KEY(0, 0, 0), 0);
    // frontier in typed arrays (a plain array of 2.7M small arrays would need a few hundred MB)
    let fc = new Int32Array([0]), fe = new Int32Array([0]), fo = new Int32Array([0]), ff = new Int8Array([-1]), fn = 1, n = 1;
    for (let d = 1; d <= depth; d++) {
      const capN = fn * 8; const nc = new Int32Array(capN), ne = new Int32Array(capN), no = new Int32Array(capN), nf = new Int8Array(capN); let k = 0;
      for (let i = 0; i < fn; i++) { const cp = fc[i], ep = fe[i], or = fo[i], lf = ff[i];
        for (let m = 0; m < W; m++) {
          if (FACE[m] === lf) continue;
          const c2 = cpM[cp * W + m], e2 = epM[ep * W + m], o2 = OR(or, m);
          if (FWput(KEY(c2, e2, o2), d)) { n++; nc[k] = c2; ne[k] = e2; no[k] = o2; nf[k] = FACE[m]; k++; }
        } }
      fc = nc; fe = ne; fo = no; ff = nf; fn = k;
    }
    return n;
  }
  // from a table state, walk down to solved (each step finds a neighbour one closer)
  function descend(cp, ep, or, d) {
    const out = [];
    while (d > 0) {
      let found = false;
      for (let m = 0; m < W; m++) { const c2 = cpM[cp * W + m], e2 = epM[ep * W + m], o2 = OR(or, m);
        if (FWget(KEY(c2, e2, o2)) === d - 1) { out.push(m); cp = c2; ep = e2; or = o2; d--; found = true; break; } }
      if (!found) return null;
    }
    return out;
  }
  const INVM = MV.map((t, i) => MV.indexOf(t.endsWith("'") ? t.slice(0, -1) : t + "'"));
  // returns move tokens that take st to solved, or null
  function coordsOf(st) { const c = toCubie(st); if (!c) return null; return [permIdx(c.cp), permIdx(c.ep), coIdx(c.co) * 256 + eoIdx(c.eo)]; }
  // returns move tokens that take the state (or its coordinates) to solved, or null
  function solveMITM(st, opt) {
    opt = opt || {}; const maxLen = opt.maxLen || 30, ms = opt.ms || 500;
    if (!HK) buildForward(opt.fd || 9);
    const co = opt.coords || coordsOf(st); if (!co) return null;
    const [cp0, ep0, or0] = co;
    if (prOR[or0] === 255 || prEP[ep0] === 255 || prCP[cp0] === 255) return { unreachable: true };
    const t0 = Date.now(); let nodes = 0, stop = false, found = null;
    const seq = new Int8Array(64);
    function dfs(cp, ep, or, g, lim, lastF) {
      const v = FWget(KEY(cp, ep, or));
      if (v >= 0) { if (g + v <= lim) { found = { g, v, cp, ep, or }; return true; } }
      let h = Math.max(prCP[cp], prEP[ep], prOR[or], v < 0 ? FD + 1 : 0);
      if (prCE) { const x = prCE[cp * 256 + (or % 256)]; if (x > h) h = x; }
      if (g + h > lim) return false;
      if ((++nodes & 4095) === 0 && Date.now() - t0 > ms) { stop = true; return false; }
      for (let m = 0; m < W; m++) {
        if (FACE[m] === lastF) continue;
        seq[g] = m;
        if (dfs(cpM[cp * W + m], epM[ep * W + m], OR(or, m), g + 1, lim, FACE[m])) return true;
        if (stop) return false;
      }
      return false;
    }
    const lim0 = opt.exact !== undefined ? opt.exact : Math.max(prCP[cp0], prEP[ep0], prOR[or0]);
    for (let lim = lim0; lim <= (opt.exact !== undefined ? opt.exact : maxLen); lim++) {
      if (dfs(cp0, ep0, or0, 0, lim, -1)) {
        const back = Array.from(seq.slice(0, found.g));
        const fwd = descend(found.cp, found.ep, found.or, found.v); if (!fwd) return null;
        return { moves: back.concat(fwd).map(m => MV[m]), nodes, ms: Date.now() - t0 };
      }
      if (stop) return null;
    }
    return null;
  }
  function h2(st) { const c = toCubie(st); if (!c) return 255; let h = Math.max(prCP[permIdx(c.cp)], prEP[permIdx(c.ep)], prOR[coIdx(c.co) * 256 + eoIdx(c.eo)]); return h; }
  function h2c(co) { let h = Math.max(prCP[co[0]], prEP[co[1]], prOR[co[2]]); if (h < 255 && prCE) h = Math.max(h, prCE[co[0] * 256 + (co[2] % 256)]); return h; }
  const maxDepth = a => a.reduce((m, x) => x === 255 ? m : Math.max(m, x), 0);
  return { h2, h2c, coordsOf, solve, solveMITM, buildForward, toCubie, mult, MC, info: { cp: maxDepth(prCP), ep: maxDepth(prEP), or: maxDepth(prOR), orReach: prOR.filter(x => x !== 255).length } };
}
if (typeof module !== 'undefined') module.exports = makeRU;
