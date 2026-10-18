const L=require('../lib.js'); const M=L.M; M.setX('xR'); const makeRU=require('../../src/rusolve.js'); const makeLL=require('../../src/llsolve.js');
const LL=makeLL(M,makeRU); const tf=Date.now(); LL.RU.buildForward(+(process.env.FD||8)); console.error("fd build",Date.now()-tf);
const P=require('../../data/generated/pll.json').cases, O=require('../../data/generated/'+(process.argv[2]||'oll1.json'));
const U=['','U','U2',"U2'","U'"];
let seed=777; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff;}; const pick=a=>a[Math.floor(rnd()*a.length)];
const N=+process.argv[3], lens=[], times=[]; let fail=0;
for(let k=0;k<N;k++){ const o=pick(O), c=pick(P);
  const sts=U.map(u2=>M.apply(M.solved(),(pick(c.scr)+' '+u2+' '+M.invert(o[3][0][0])).trim()));
  const r=LL.solveMulti(sts,{ms:+process.argv[4],looseMs:+process.argv[5],maxP1:6});
  if(!r||!r.moves){fail++; continue;} lens.push(r.moves.length); times.push(r.ms); }
lens.sort((a,b)=>a-b); times.sort((a,b)=>a-b);
console.log(`${process.argv[2]} ok ${lens.length}/${N} len avg ${(lens.reduce((a,b)=>a+b,0)/lens.length).toFixed(1)} max ${lens[lens.length-1]} ms med ${times[times.length>>1]} p90 ${times[Math.floor(times.length*.9)]} max ${times[times.length-1]}`);
