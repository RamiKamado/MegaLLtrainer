// One-edge OLL cases: names/groups from the reference list, algorithms from our own search (oll1_raw.json).
// Pick up to 3 algs per case (shortest; then fewer F turns; then fewer 144° turns), build diagram pattern and pre-AUFs.
const path=require('path'); const ROOT=path.join(__dirname,'..');
const L=require('./lib.js'); const M=L.M; M.setX('xR'); const DG=require('../src/diagram.js'); const fs=require('fs');
const RAW=JSON.parse(fs.readFileSync(process.argv[2]||path.join(ROOT,'data/search/oll1_raw.json')));
const UF=M.names.U;
const f2lOK=st=>{for(let i=0;i<M.N;i++) if(!L.LL.includes(i)&&st[i]!==M.home[i]) return false; return true;};
const oriented=st=>L.LL.every(i=>M.home[i]!==UF||st[i]===UF);
const score=m=>m.length*100+m.filter(t=>t[0]==='F').length*10+m.filter(t=>/2/.test(t)).length;
const out=[]; const sheetSets=JSON.parse(fs.readFileSync(path.join(ROOT,'data/generated/oll.json')));
const set1title=(sheetSets.find(o=>o[1]===1)||[])[2]||'EO';
for(const name of Object.keys(RAW)){ const v={name};
  const sols=RAW[v.name].sols.filter(s=>s.moves[0][0]!=='U' && s.moves[s.moves.length-1][0]!=='U');
  const uniq=new Map(); for(const s of sols){ const k=s.ti+'|'+s.moves.join(' '); if(!uniq.has(k)) uniq.set(k,s); }
  const ranked=[...uniq.values()].sort((a,b)=>score(a.moves)-score(b.moves));
  // drop algs that are just another alg with a different start AUF (same move string)
  const seen=new Set(), pickd=[]; for(const s of ranked){ const k=s.moves.join(' '); if(seen.has(k)) continue; seen.add(k); pickd.push(s); if(pickd.length>=3) break; }
  // diagram state: the state alg 1 solves completely. Orientation depends only on the alg, so this is the same
  // pattern as the case's own state, and alg 1 orients it with no AUF before.
  const X=M.apply(L.SOL,M.invert(pickd[0].moves.join(' ')));
  const algs=pickd.map(s=>{ const seq=s.moves.join(' ');
    const p=L.U.filter(u=>{ const t=M.apply(M.apply(X,u),seq); return f2lOK(t)&&oriented(t); });
    if(!p.length) throw new Error('alg does not orient '+v.name);
    return [seq, p.includes('')?'':p[0]]; });
  const pat=DG.cells.map(c=>X[c.slot]===UF?'1':'0').join('');
  const m=/^(\d+)/.exec(v.name); const set=+m[1];
  out.push([v.name, set, set===1?set1title:'エッジ1つ', algs, pat]);
}
fs.writeFileSync(path.join(ROOT,'data/generated/oll1.json'),JSON.stringify(out));
console.log('cases',out.length,'algs',out.reduce((s,c)=>s+c[3].length,0),'pre',out.reduce((s,c)=>s+c[3].filter(a=>a[1]).length,0));
console.log(out.slice(0,3).map(c=>c[0]+': '+c[3].map(a=>(a[1]?'('+a[1]+') ':'')+a[0]).join(' | ')).join('\n'));
const lens=out.flatMap(c=>c[3].map(a=>a[0].split(' ').length)); console.log('len min/avg/max',Math.min(...lens),(lens.reduce((a,b)=>a+b)/lens.length).toFixed(1),Math.max(...lens));
