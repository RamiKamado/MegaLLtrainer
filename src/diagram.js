// Top-view Megaminx LL diagram generator (plan view with side stickers + permutation arrows).
// Exposes DIAG.geometry() -> { cells:[{pts, slot}], ucenter:{slot:[x,y]} } and DIAG.svg(state).
const DIAG = (M => {
  const { normals, names, V, dot, pos, N, thr } = M;
  const nU = normals[names.U];
  const ds = V.map(v => dot(v, nU)); const h = Math.max(...ds);
  let fv = V.filter((v, i) => Math.abs(ds[i] - h) < 1e-6);
  // 2D: x right, y up (front = -y at bottom). SVG y is flipped.
  const cx = fv.reduce((s, v) => s + v[0], 0) / 5, cy = fv.reduce((s, v) => s + v[1], 0) / 5;
  fv.sort((a, b) => Math.atan2(b[1] - cy, b[0] - cx) - Math.atan2(a[1] - cy, a[0] - cx)); // clockwise from above
  const R0 = Math.hypot(fv[0][0] - cx, fv[0][1] - cy);
  const SCALE = 34 / R0, OX = 50, OY = 50;
  const to2 = p => [OX + (p[0] - cx) * SCALE, OY - (p[1] - cy) * SCALE];
  const v2 = fv.map(to2);
  const C = [OX, OY];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = a => Math.hypot(a[0], a[1]);
  const unit = a => { const l = len(a); return [a[0] / l, a[1] / l]; };
  const inter = (p1, d1, p2, d2) => { // line p1+t d1 with p2+s d2
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den;
    return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
  };
  // cut lines parallel to each edge, at fraction CUT of apothem inward
  // centre pentagon apothem = (1 - CUT) x face apothem. 0.42 was the first version; 0.85 of that size:
  const CUT = 1 - 0.85 * (1 - 0.42);
  const cutLine = k => { const a = v2[k], b = v2[(k + 1) % 5]; const m = lerp(a, b, 0.5); return [lerp(m, C, CUT), sub(b, a)]; };
  const L = [0, 1, 2, 3, 4].map(cutLine);
  const I = [0, 1, 2, 3, 4].map(k => inter(L[(k + 4) % 5][0], L[(k + 4) % 5][1], L[k][0], L[k][1])); // inner vertex near v_k
  // the centre pentagon can be drawn smaller than the cut lines give, without narrowing the outer stickers
  const CENTER = (typeof DIAG_CENTER !== 'undefined') ? DIAG_CENTER : 1;
  const Ic = I.map(p => lerp(C, p, CENTER));
  const edgeDir = k => sub(v2[(k + 1) % 5], v2[k]);
  const aPt = k => inter(v2[k], edgeDir(k), L[(k + 4) % 5][0], L[(k + 4) % 5][1]); // on edge k near v_k
  const bPt = k => inter(v2[k], edgeDir(k), L[(k + 1) % 5][0], L[(k + 1) % 5][1]); // on edge k near v_{k+1}
  // slot matching
  const proj = i => to2(pos[i]);
  const nearestSlot = (pt, filter) => {
    let best = -1, bd = 1e9;
    for (let i = 0; i < N; i++) if (filter(i)) { const d = len(sub(proj(i), pt)); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const isU = i => M.home[i] === names.U;
  const inLayer = i => dot(pos[i], nU) > thr;
  const cells = [];
  const ucenter = {};
  const centroid = p => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
  const addU = pts => { const s = nearestSlot(centroid(pts), isU); cells.push({ pts, slot: s, top: true }); ucenter[s] = centroid(pts); return s; };
  addU(Ic.slice());
  const cornerSlot = [], edgeSlot = [];
  for (let k = 0; k < 5; k++) cornerSlot[k] = addU([v2[k], aPt(k), Ic[k], bPt((k + 4) % 5)]);
  for (let k = 0; k < 5; k++) edgeSlot[k] = addU([aPt(k), bPt(k), Ic[(k + 1) % 5], Ic[k]]);
  // side strips: 3D matching
  const T = 7.5, GAP = 0.8;
  const out = [];
  for (let k = 0; k < 5; k++) {
    const A = v2[k], B = v2[(k + 1) % 5];
    const radA = unit(sub(A, C)), radB = unit(sub(B, C));
    const m = 1 / Math.cos(Math.PI / 5);
    const A2 = [A[0] + radA[0] * T * m, A[1] + radA[1] * T * m], B2 = [B[0] + radB[0] * T * m, B[1] + radB[1] * T * m];
    const pa = aPt(k), pb = bPt(k);
    const ta = len(sub(pa, A)) / len(sub(B, A)), tb = len(sub(pb, A)) / len(sub(B, A));
    const off = p => p; // inner points
    const pa2 = lerp(A2, B2, ta), pb2 = lerp(A2, B2, tb);
    // push strip slightly outward for a gap
    const nrm = unit([-(B[1] - A[1]), B[0] - A[0]]);
    const o = (C[0] - A[0]) * nrm[0] + (C[1] - A[1]) * nrm[1] > 0 ? [-nrm[0], -nrm[1]] : nrm;
    const g = p => [p[0] + o[0] * GAP, p[1] + o[1] * GAP];
    const polys = [[A, pa, pa2, A2], [pa, pb, pb2, pa2], [pb, B, B2, pb2]].map(p => [g(p[0]), g(p[1]), p[2], p[3]]);
    // 3D: the side face across edge k
    const vA3 = fv[k], vB3 = fv[(k + 1) % 5];
    const shares = (f, v) => Math.abs(dot(v, normals[f]) - h) < 1e-6;
    let side = -1; for (let f = 0; f < 12; f++) if (f !== names.U && shares(f, vA3) && shares(f, vB3)) side = f;
    const cand = []; for (let i = 0; i < N; i++) if (M.home[i] === side && inLayer(i)) cand.push(i);
    const d3 = (i, p) => { const q = pos[i]; return Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); };
    const near3 = p => cand.slice().sort((x, y) => d3(x, p) - d3(y, p))[0];
    const mid = [(vA3[0] + vB3[0]) / 2, (vA3[1] + vB3[1]) / 2, (vA3[2] + vB3[2]) / 2];
    const slots = [near3(vA3), near3(mid), near3(vB3)];
    polys.forEach((p, j) => cells.push({ pts: p, slot: slots[j], top: false }));
    out.push({ side, cornerA: slots[0], edge: slots[1], cornerB: slots[2] });
  }
  // piece maps for arrows: corner k has side stickers out[k-1].cornerB and out[k].cornerA; edge k has out[k].edge
  const sideFace = out.map(o => o.side);
  function arrows(st) {
    const res = [];
    for (let k = 0; k < 5; k++) { // edge at position k -> home where side face == color
      const c = st[out[k].edge]; const dst = sideFace.indexOf(c);
      if (dst !== k) res.push({ type: 'e', from: edgeSlot[k], to: edgeSlot[dst] });
    }
    for (let k = 0; k < 5; k++) { // corner at v_k touches strips k-1 (end B) and k (end A)
      const c1 = st[out[(k + 4) % 5].cornerB], c2 = st[out[k].cornerA];
      let dst = -1; for (let j = 0; j < 5; j++) { const s1 = sideFace[(j + 4) % 5], s2 = sideFace[j]; if ((s1 === c1 && s2 === c2) || (s1 === c2 && s2 === c1)) dst = j; }
      if (dst !== k) res.push({ type: 'c', from: cornerSlot[k], to: cornerSlot[dst] });
    }
    return res;
  }
  // outer frame for the AUF quiz: one band per side face, outside the side stickers, in that face's colour.
  // gap / width are perpendicular distances beyond the outer edge of the side stickers.
  function ring(gap, width) {
    const m = 1 / Math.cos(Math.PI / 5), d1 = T + GAP + gap, d2 = d1 + width, bands = [];
    for (let k = 0; k < 5; k++) {
      const A = v2[k], B = v2[(k + 1) % 5], radA = unit(sub(A, C)), radB = unit(sub(B, C));
      const at = (P, r, d) => [P[0] + r[0] * d * m, P[1] + r[1] * d * m];
      bands.push({ pts: [at(A, radA, d1), at(B, radB, d1), at(B, radB, d2), at(A, radA, d2)], side: out[k].side });
    }
    return bands;
  }
  const f1 = x => Math.round(x * 100) / 100;
  const ptsStr = p => p.map(q => f1(q[0]) + ',' + f1(q[1])).join(' ');
  // compact geometry blob for embedding: polygons + slots
  const geometry = () => ({ cells: cells.map(c => ({ p: ptsStr(c.pts), s: c.slot, t: c.top ? 1 : 0 })), uc: Object.fromEntries(Object.entries(ucenter).map(([k, v]) => [k, [f1(v[0]), f1(v[1])]])), out, edgeSlot, cornerSlot });
  return { geometry, arrows, ring, cells, ucenter, edgeSlot, cornerSlot, sideFace, out };
})(typeof MINX !== 'undefined' ? MINX : require('./minx.js'));
if (typeof module !== 'undefined') module.exports = DIAG;
