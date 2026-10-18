const path=require('path'); const ROOT=path.join(__dirname,'..');
const L=require('./lib.js'); const M=L.M; M.setX('xR'); const makeOLL=require('./ollsearch.js'); const fs=require('fs');
let t0=Date.now(); const O=makeOLL(M); console.log('build',((Date.now()-t0)/1000).toFixed(1)+'s',O.info);
// ケースの一覧だけ参照する: git clone --depth 1 https://github.com/mihlefeld/Alg-Trainers vendor/Alg-Trainers
const A=require(process.env.ALGTRAINERS||path.join(ROOT,'vendor/Alg-Trainers/Megaminx-OLL-Trainer/algs_info.json'));
const D=Object.values(A).filter(v=>v.algset==='D');
const UF=M.names.U;
const f2lOK=st=>{for(let i=0;i<M.N;i++) if(!L.LL.includes(i)&&st[i]!==M.home[i]) return false; return true;};
const oriented=st=>L.LL.every(i=>M.home[i]!==UF||st[i]===UF);
const only=process.argv[2]?process.argv[2].split(','):null; const out={};
for(const v of D){ if(only&&!only.includes(v.name)) continue;
  const starts=L.U.map(a=>M.apply(L.SOL,(a+' '+v.s).trim()));
  const t=Date.now(); const sols=O.search(starts,{extra:+(process.env.EXTRA||1),want:60,ms:+(process.env.MS||120000)});
  let bad=0; for(const s of sols){ const st=M.apply(starts[s.ti],s.moves.join(' ')); if(!(f2lOK(st)&&oriented(st))) bad++; }
  const lens=sols.map(s=>s.moves.length);
  console.log(v.name,'sols',sols.length,'len',Math.min(...lens),'-',Math.max(...lens),'bad',bad,((Date.now()-t)/1000).toFixed(1)+'s', sols[0]&&sols[0].moves.join(' '));
  out[v.name]={sols};
}
if(process.env.OUT) fs.writeFileSync(process.env.OUT,JSON.stringify(out));
