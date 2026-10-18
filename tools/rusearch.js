// Shortest <R,U> sequences that set up a given PLL case (any pre/post AUF), by meet-in-the-middle.
// scramble = setup sequence S (so S^-1 is an R/U algorithm that solves the case).
// Only the sticker slots R and U can move are tracked; states are hashed to a 52-bit number
// (every hit is re-verified on the full model by the caller).
const L = require('./lib.js'); const M = L.M;
const MOVES = [];
for (const f of ['R', 'U']) for (const s of ['', '2', "2'", "'"]) MOVES.push({ f, t: f + s, n: { '': 1, '2': 2, "2'": 3, "'": 4 }[s] });
const FULL = MOVES.map(m => M.apply(Int16Array.from({ length: M.N }, (_, i) => i), m.t));
const SLOTS = []; for (let i = 0; i < M.N; i++) if (FULL.some(p => p[i] !== i)) SLOTS.push(i);
const K = SLOTS.length, idx = new Map(SLOTS.map((s, j) => [s, j]));
const PERM = FULL.map(p => Int16Array.from(SLOTS, s => idx.get(p[s])));
const INV = MOVES.map(m => MOVES.findIndex(x => x.f === m.f && (x.n + m.n) % 5 === 0));
const FACE = MOVES.map(m => m.f === 'R' ? 0 : 1);
const compact = full => Int8Array.from(SLOTS, s => full[s]);
function hash(st) {
  let a = 0x811c9dc5 | 0, b = 0x2545f491 | 0;
  for (let i = 0; i < K; i++) { a = Math.imul(a ^ st[i], 16777619); b = Math.imul(b ^ (st[i] + 31 * i), 2246822519); }
  return (a >>> 0) * 1048576 + ((b >>> 0) & 0xfffff);
}
function buildForward(depth) {
  const map = new Map(); // hash -> packed sequence (base-8 digits in a Number, up to 17 moves)
  const st0 = compact(L.SOL);
  map.set(hash(st0), 0);
  let frontier = [{ st: st0, code: 0, len: 0, lastF: -1 }];
  for (let d = 1; d <= depth; d++) {
    const nx = [];
    for (const { st, code, lastF } of frontier) for (let mi = 0; mi < 8; mi++) {
      if (FACE[mi] === lastF) continue;
      const p = PERM[mi], s2 = new Int8Array(K); for (let i = 0; i < K; i++) s2[i] = st[p[i]];
      const h = hash(s2);
      if (map.has(h)) continue;
      const c2 = code * 8 + (mi + 1) * 0 + mi; // base 8, read with known length
      const enc = c2 * 32 + d;                  // low 5 bits: length
      map.set(h, enc); nx.push({ st: s2, code: c2, lastF: FACE[mi] });
    }
    frontier = nx;
  }
  return map;
}
const decode = enc => { if (enc === 0) return []; let len = enc % 32, c = Math.floor(enc / 32); const out = [];
  for (let i = 0; i < len; i++) { out.unshift(c % 8); c = Math.floor(c / 8); } return out; };
function solve(fw, targetsFull, maxBack, want) {
  const found = new Map();
  const targets = targetsFull.map(compact);
  const q = new Int8Array(32);
  const bufs = Array.from({ length: 32 }, () => new Int8Array(K));
  for (let b = 0; b <= maxBack; b++) {
    for (const T of targets) {
      const rec = (st, depth, lastF) => {
        if (depth === b) {
          const enc = fw.get(hash(st));
          if (enc !== undefined) {
            const S = decode(enc).concat(Array.from(q.slice(0, b)).reverse().map(mi => INV[mi]));
            const s = reduce(S); if (!found.has(s)) found.set(s, s.split(' ').length);
          }
          return;
        }
        const nb = bufs[depth];
        for (let mi = 0; mi < 8; mi++) {
          if (FACE[mi] === lastF) continue;
          const p = PERM[mi]; for (let i = 0; i < K; i++) nb[i] = st[p[i]];
          q[depth] = mi;
          rec(nb, depth + 1, FACE[mi]);
        }
      };
      rec(T, 0, -1);
    }
    if (found.size >= want) break;
  }
  return [...found.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]);
}
function reduce(S) {
  const out = [];
  for (const mi of S) {
    const m = MOVES[mi];
    if (out.length && out[out.length - 1].f === m.f) { const n = (out[out.length - 1].n + m.n) % 5; out.pop(); if (n) out.push({ f: m.f, n }); }
    else out.push({ f: m.f, n: m.n });
  }
  return out.map(x => x.f + ['', '', '2', "2'", "'"][x.n]).join(' ');
}
module.exports = { buildForward, solve, K };
