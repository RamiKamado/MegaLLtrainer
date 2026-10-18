const path=require('path'); const ROOT=path.join(__dirname,'..');
const L=require('./lib.js'); L.M.setX('xR'); const R=require('./rusearch.js'); const {parseNote}=require('./parse.js');
const fs=require('fs'); const res=JSON.parse(fs.readFileSync(process.argv[2]||path.join(ROOT,'tmp/pll_check.json')));
const MAP={bR:'Br',dR:'Dfr',DR:'Dfr'};
const ren=s=>s.split(' ').map(t=>{const m=/^([A-Za-z]+?)(\d*'?\d*)$/.exec(t); return m&&MAP[m[1]]?MAP[m[1]]+m[2]:t;}).join(' ');
const names=process.argv[3].split(',');
const FD=+(process.argv[4]||9), BD=+(process.argv[5]||9);
let t0=Date.now(); const fw=R.buildForward(FD); console.error('forward',fw.size,'in',(Date.now()-t0)/1000,'s');
const out={};
for(const n of names){ const a=res[n].algs[0]; const setup=L.setupOf(ren((a.lead.join(' ')+' '+a.body).trim()));
  const targets=L.U.map(x=>L.M.apply(L.SOL,(x+' '+setup).trim()));
  t0=Date.now(); const sols=R.solve(fw,targets,BD,3);
  // independent check: each scramble sets up the same case
  const key=L.caseKeyOfSetup(setup); const ok=sols.every(s=>L.caseKeyOfSetup(s)===key);
  out[n]=sols.slice(0,3); console.log(n, ok?'ok':'MISMATCH', ((Date.now()-t0)/1000).toFixed(1)+'s', sols.slice(0,3).map(s=>s.split(' ').length).join('/'), sols[0]);
}
fs.writeFileSync(process.argv[6]||'ru_out.json',JSON.stringify(out));
