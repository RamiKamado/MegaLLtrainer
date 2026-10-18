const L=require('../lib.js'); const M=L.M; M.setX('xR'); const makeRU=require('../../src/rusolve.js'); const makeLL=require('../../src/llsolve.js');
const FD=+process.argv[2], P1=+process.argv[3], MS=+process.argv[4], N=+process.argv[5];
const LL=makeLL(M,makeRU); LL.RU.buildForward(FD);
const P=require('../../data/generated/pll.json').cases, O=require('../../data/generated/oll.json');
const MAP={bR:'Br',dR:'Dfr',DR:'Dfr',BR:'Br',BL:'Bl'};
const conv=t=>t.replace(/\(([^()]*)\)\s*[x×*]\s*(\d)/g,(_,q,n)=>Array(+n).fill(q).join(' ')).replace(/[()]/g,' ').split(/\s+/).filter(Boolean).map(k=>{const m=/^([A-Za-z]+?)(\d*'?)$/.exec(k);return (MAP[m[1]]||m[1])+m[2];}).join(' ');
const U=['','U','U2',"U2'","U'"];
let seed=12345; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff;}; const pick=a=>a[Math.floor(rnd()*a.length)];
const lens=[],times=[]; let fail=0;
for(let k=0;k<N;k++){ const c=pick(P), o=pick(O); const ps=pick(c.scr);
  const seqs=U.map(u2=>(ps+' '+u2+' '+L.setupOf(conv(o[3][0][0]))).trim()); const INV={'':'','U':"U'",'U2':"U2'","U2'":'U2',"U'":'U'};
  const all=+(process.env.CONJ||0)?seqs.flatMap(q=>U.map(a=>(a+' '+q+' '+INV[a]).trim())):seqs; const sts=all.map(q=>M.apply(M.solved(),q));
  const r=LL.solveMulti(sts,{ms:MS,maxP1:P1,debug:true,looseMs:+(process.env.LOOSE||0)});
  if(!r||!r.moves){fail++; if(process.env.V) console.log('FAIL',o[0],c.name,JSON.stringify(r&&r.stats),r&&r.T); continue;}
  const fin=M.apply(sts[r.ti],r.moves.join(' ')); if(!Array.from(fin).every((x,i)=>x===M.home[i])) console.log('WRONG');
  if(r.stats.loose&&process.env.V) console.log('loose',o[0],c.name,r.moves.length,r.ms); lens.push(r.moves.length); times.push(r.ms); }
lens.sort((a,b)=>a-b); times.sort((a,b)=>a-b);
console.log(`multi FD=${FD} P1=${P1} ms=${MS}: ok ${lens.length}/${N}, len avg ${(lens.reduce((a,b)=>a+b,0)/lens.length).toFixed(1)} max ${lens[lens.length-1]}, ms med ${times[times.length>>1]} p90 ${times[Math.floor(times.length*.9)]} max ${times[times.length-1]}`);
