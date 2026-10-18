// The drawn diagram must be the same case as the scrambles, and every shown alg (with its shown pre-AUF only)
// must solve the drawn state up to the final AUF.
const M=require('../src/minx.js'); M.setX('xR'); const D=require('../data/generated/pll.json');
const algSeq=text=>text.replace(/\(([^()]*)\)\s*[x×*]\s*(\d)/g,(_,q,n)=>Array(+n).fill(q).join(' '))
  .replace(/[()]/g,' ').split(/\s+/).filter(Boolean).map(k=>k.replace(/^DR(?=\d|'|$)/,'Dfr').replace(/^BR(?=\d|'|$)/,'Br')).join(' ');
const SOL=M.solved(); const U=['','U','U2',"U2'","U'"];
const sideSlots=D.geometry.cells.filter(c=>!c.t).map(c=>c.s);
const nU=M.normals[M.names.U]; const LL=[]; for(let i=0;i<M.N;i++) if(M.dot(M.pos[i],nU)>M.thr) LL.push(i);
const sig=st=>LL.map(i=>st[i]).join();
const ROT=[];{const seen=new Set(),q=[''];const k=s=>Array.from(M.apply(SOL,s)).join();seen.add(k(''));ROT.push('');while(q.length){const s=q.shift();for(const g of['y','x']){const t=(s+' '+g).trim(),kk=k(t);if(!seen.has(kk)){seen.add(kk);ROT.push(t);q.push(t)}}}}
const reo=st=>ROT.map(r=>M.apply(st,r)).find(t=>{for(let f=0;f<12;f++)if(t[f*11]!==f)return false;return true});
const solved=t=>Array.from(t).every((c,i)=>c===M.home[i]);
let bad=[], n=0;
for(const c of D.cases){
  const X=Int8Array.from(SOL); const col=c.col.split(',').map(Number); sideSlots.forEach((s,i)=>X[s]=col[i]);
  c.algs.forEach(([a,pre],j)=>{ n++; if(!U.some(u=>solved(M.apply(reo(M.apply(X,algSeq((pre+' '+a).trim()))),u)))) bad.push(c.name+' alg'+j); });
  if(c.algs[0][1]) bad.push(c.name+' first alg needs pre-AUF');
  const set=new Set(); for(const a of U) for(const b of U) set.add(sig(M.apply(M.apply(M.apply(SOL,a),c.scr[0]),b)));
  if(!set.has(sig(X))) bad.push(c.name+' diagram is a different case');
}
console.log(bad.length?bad:`diagram tests ok (${D.cases.length} cases, ${n} algs)`);
