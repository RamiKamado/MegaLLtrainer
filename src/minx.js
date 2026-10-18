// Megaminx sticker model built from dodecahedron geometry.
// 12 faces x 11 stickers (0 = center, 1..5 corners, 6..10 edges) = 132 stickers.
// A move is a permutation table over sticker slots; state[slot] = color (face index).
const MINX = (() => {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => mul(a, 1 / Math.sqrt(dot(a, a)));
  const rot = (p, n, ang) => { // Rodrigues
    const c = Math.cos(ang), s = Math.sin(ang);
    return add(add(mul(p, c), mul(cross(n, p), s)), mul(n, dot(n, p) * (1 - c)));
  };
  // dodecahedron face normals = icosahedron vertices
  let normals = [];
  for (const a of [1, -1]) for (const b of [1, -1]) {
    normals.push([0, a * PHI, b], [a * PHI, b, 0], [b, 0, a * PHI]);
  }
  normals = normals.map(norm);
  // orient: U = (0,1,PHI) -> +z
  const U0 = norm([0, PHI, 1]);
  const axis = norm(cross(U0, [0, 0, 1]));
  const ang0 = Math.acos(dot(U0, [0, 0, 1]));
  normals = normals.map(n => rot(n, axis, ang0));
  let SPIN = 0;
  const up = [0, 0, 1];
  // spin about z so that one upper-ring face points straight at the viewer (-y): the U-F edge is at the bottom
  {
    const r0 = normals.find(n => Math.abs(n[2] - 1 / Math.sqrt(5)) < 1e-6);
    const spin = -Math.PI / 2 - Math.atan2(r0[1], r0[0]);
    normals = normals.map(n => rot(n, [0, 0, 1], spin));
    SPIN = spin;
  }
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const iU = normals.findIndex(n => near(n[2], 1));
  const ring = normals.map((n, i) => i).filter(i => near(dot(normals[i], up), 1 / Math.sqrt(5)));
  // F = ring face with the most negative y (front = -y, viewer looks along +y; right = +x)
  ring.sort((a, b) => normals[a][1] - normals[b][1]);
  const iF = ring[0];
  const azi = i => Math.atan2(normals[i][1], normals[i][0]);
  // clockwise seen from above (from +z): decreasing azimuth. F -> L -> BL -> BR -> R
  const aF = azi(iF);
  const order = ring.slice().sort((a, b) => {
    const da = ((aF - azi(a)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const db = ((aF - azi(b)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return da - db;
  });
  const [F, L, BL, BR, R] = order;
  const opp = i => normals.findIndex(n => near(dot(n, normals[i]), -1));
  const D = opp(iU);
  const names = {};
  names.U = iU; names.F = F; names.L = L; names.BL = BL; names.BR = BR; names.R = R; names.D = D;
  // lower faces: opposite of upper ring faces
  names.dB = opp(F); names.dR = opp(L); names.dFR = opp(BL); names.dFL = opp(BR); names.dL = opp(R);
  // vertices
  const verts = [];
  for (const a of [1, -1]) for (const b of [1, -1]) for (const c of [1, -1]) verts.push([a, b, c]);
  for (const a of [1, -1]) for (const b of [1, -1]) {
    verts.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [b * PHI, 0, a / PHI]);
  }
  const V = verts.map(v => rot(rot(v, axis, ang0), [0, 0, 1], SPIN));
  // stickers
  const pos = []; // positions
  const home = []; // home face
  const K = 0.72;
  for (let f = 0; f < 12; f++) {
    const n = normals[f];
    const ds = V.map(v => dot(v, n));
    const h = Math.max(...ds);
    let fv = V.filter((v, i) => near(ds[i], h));
    const c = mul(n, h);
    // order vertices clockwise seen from outside
    const e1 = norm(sub(fv[0], c)), e2 = cross(n, e1);
    fv.sort((a, b) => {
      const ta = Math.atan2(dot(sub(a, c), e2), dot(sub(a, c), e1));
      const tb = Math.atan2(dot(sub(b, c), e2), dot(sub(b, c), e1));
      return tb - ta;
    });
    pos.push(c); home.push(f);
    for (const v of fv) { pos.push(add(c, mul(sub(v, c), K))); home.push(f); }
    for (let k = 0; k < 5; k++) {
      const m = mul(add(fv[k], fv[(k + 1) % 5]), 0.5);
      pos.push(add(c, mul(sub(m, c), K))); home.push(f);
    }
  }
  const N = pos.length;
  const findPos = p => {
    let best = -1, bd = 1e9;
    for (let i = 0; i < N; i++) { const d = dot(sub(pos[i], p), sub(pos[i], p)); if (d < bd) { bd = d; best = i; } }
    if (bd > 1e-6) throw new Error('no match');
    return best;
  };
  const hFace = dot(pos[1], normals[0]) / K; // not used
  // layer threshold: face plane height h, layer = stickers with p.n > thr
  const faceH = dot(pos[0], normals[0]);
  // compute distinct p.n values for face 0 to choose threshold giving 26 stickers
  const vals = pos.map(p => dot(p, normals[0])).sort((a, b) => b - a);
  const thr = (vals[25] + vals[26]) / 2;
  if (Math.abs(vals[25] - vals[26]) < 1e-3) throw new Error('bad threshold');
  // perm for rotating set S by angle about n: newState[dst] = state[src]
  const permFor = (n, ang, all) => {
    const p = new Int16Array(N);
    for (let i = 0; i < N; i++) {
      if (all || dot(pos[i], n) > thr) p[findPos(rot(pos[i], n, ang))] = i; else p[i] = i;
    }
    return p;
  };
  const T = -2 * Math.PI / 5; // clockwise seen from outside
  const base = {};
  const faceKey = {
    U: names.U, F: names.F, L: names.L, R: names.R, BL: names.BL, BR: names.BR, D: names.D,
    Br: names.BR, Bl: names.BL, Dfr: names.dFR, Dfl: names.dFL, DR: names.dR, DL: names.dL, DB: names.dB
  };
  for (const k in faceKey) base[k] = permFor(normals[faceKey[k]], T, false);
  // whole-puzzle rotations: y about U axis, x about R axis? (megaminx convention ambiguous)
  base.y = permFor(normals[names.U], T, true);
  base.xR = permFor(normals[names.R], T, true);
  base.zF = permFor(normals[names.F], T, true);
  const compose = (a, b) => { // apply a then b
    const r = new Int16Array(N); for (let i = 0; i < N; i++) r[i] = a[b[i]]; return r;
  };
  const ident = () => { const r = new Int16Array(N); for (let i = 0; i < N; i++) r[i] = i; return r; };
  const powCache = {};
  const movePerm = (face, k) => {
    k = ((k % 5) + 5) % 5;
    const key = face + k;
    if (powCache[key]) return powCache[key];
    let r = ident();
    for (let i = 0; i < k; i++) r = compose(r, base[face]);
    return (powCache[key] = r);
  };
  let xKey = 'xR';
  const parse = s => {
    const out = [];
    for (let t of s.replace(/[()\[\]]/g, ' ').trim().split(/\s+/)) {
      if (!t) continue;
      const m = /^([A-Za-z]+?)(\d*)('?)(\d*)$/.exec(t);
      if (!m) throw new Error('bad token ' + t);
      let f = m[1]; let n = parseInt(m[2] || m[4] || '1'); if (m[3]) n = -n;
      if (f === 'x') f = xKey;
      if (f === 'BR') f = 'Br';
      if (!base[f]) throw new Error('unknown face ' + t);
      out.push([f, n]);
    }
    return out;
  };
  const apply = (state, s) => {
    let st = state;
    for (const [f, n] of (typeof s === 'string' ? parse(s) : s)) {
      const p = movePerm(f, n);
      const r = new st.constructor(N); for (let i = 0; i < N; i++) r[i] = st[p[i]]; st = r;
    }
    return st;
  };
  const solved = () => Int8Array.from(home);
  const invert = s => s.replace(/[()\[\]]/g, ' ').trim().split(/\s+/).filter(Boolean).reverse().map(t => t.endsWith("'") ? t.slice(0, -1) : t + "'").join(' ');
  return { N, pos, home, names, normals, base, apply, solved, parse, invert, thr, setX: k => { xKey = k; }, dot, V, K };
})();
if (typeof module !== 'undefined') module.exports = MINX;
