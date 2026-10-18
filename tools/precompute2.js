// Build case data from James's sheet: display algs (sheet text), diagram from alg 1,
// scrambles = inverse of the sheet's R/U algs, or of searched R/U algs when the sheet has none.
const path=require('path'); const ROOT=path.join(__dirname,'..');
const L=require('./lib.js'); const M=L.M; M.setX('xR'); const DG=require('../src/diagram.js'); const fs=require('fs');
const {parseNote}=require('./parse.js');
const notes=JSON.parse(fs.readFileSync(process.argv[2]||path.join(ROOT,'data/sheet/pll_notes.json'))); const RU=JSON.parse(fs.readFileSync(process.argv[3]||path.join(ROOT,'data/search/pll_ru.json')));
const MAP={bR:'Br',dR:'Dfr',DR:'Dfr'};
const ren=s=>s.split(' ').map(t=>{const m=/^([A-Za-z]+?)(\d*'?\d*)$/.exec(t);return m&&MAP[m[1]]?MAP[m[1]]+m[2]:t}).join(' ');
const disp=raw=>raw.replace(/ /g,' ').split('//')[0].trim().replace(/\bbR/g,'BR').replace(/\bdR/g,'DR').replace(/\s+/g,' ');
const SOL=L.SOL, Up=L.U, eqS=t=>Array.from(t).every((c,i)=>c===M.home[i]);
const solvesFrom=(X,seq)=>Up.filter(u=>{const t=L.reo(M.apply(M.apply(X,u),seq));return Up.some(v=>eqS(M.apply(t,v)));});
const sideCells=DG.cells.filter(c=>!c.top);
const order=n=>{const m=/^([A-Z])(\d?)([+-]?)/.exec(n);return m[1].charCodeAt(0)*100+(+m[2]||0)*3+(m[3]==='-'?1:0);};
const out=[]; const log={sheetRU:0,searched:0};
for(const o of notes.filter(o=>o.name&&/^[A-Z]/.test(o.name)).sort((a,b)=>order(a.name)-order(b.name))){
  const algs=parseNote(o.note).map(a=>({raw:a.raw, seq:ren((a.lead.join(' ')+' '+a.body).trim()), body:a.body}));
  const key=L.caseKeyOfSetup(L.setupOf(algs[0].seq));
  // diagram state: alg 1 solves it with no AUF before; among the 5 final-AUF variants pick the one with fewest arrows
  const LBL=Int16Array.from({length:M.N},(_,i)=>i);
  let res=M.apply(LBL,algs[0].seq);
  res=L.ROT.map(r=>M.apply(res,r)).find(t=>{for(let f=0;f<12;f++) if(t[f*11]!==f*11) return false; return true;});
  let dst=null,best=99;
  for(const v of Up){ const Sv=M.apply(SOL,v), X=new Int8Array(M.N); for(let i=0;i<M.N;i++) X[res[i]]=Sv[i];
    const n=DG.arrows(X).length; if(n<best){best=n;dst=X;} }
  const A=algs.map(a=>{ const p=solvesFrom(dst,a.seq); if(!p.length) throw new Error('alg fails '+o.name+' '+a.raw);
    if(L.caseKeyOfSetup(L.setupOf(a.seq))!==key) throw new Error('alg is another case '+o.name);
    return [disp(a.raw), p.includes('')?'':p[0]]; });
  // scrambles
  let scr=algs.filter(a=>/^[RU0-9' ]+$/.test(a.body)).map(a=>M.invert(a.body));
  if(scr.length) log.sheetRU++; else { scr=(RU[o.name]||[]); log.searched++; }
  scr=scr.filter(s=>L.caseKeyOfSetup(s)===key && !L.pllProblem(M.apply(SOL,s)));
  if(!scr.length) throw new Error('no verified scramble '+o.name);
  out.push({name:o.name, group:o.name[0], algs:A, scr, col:sideCells.map(c=>dst[c.slot]).join(','), arrows:DG.arrows(dst).map(x=>[x.type,x.from,x.to])});
}
const keys=new Set(out.map(c=>L.caseKeyOfSetup(c.scr[0]))); if(keys.size!==out.length) throw new Error('duplicate cases');
fs.writeFileSync(path.join(ROOT,'data/generated/pll.json'),JSON.stringify({meta:{U:M.names.U,sides:DG.sideFace,names:M.names},geometry:DG.geometry(),cases:out}));
console.log('cases',out.length,log,'scr per case',out.reduce((s,c)=>s+c.scr.length,0)/out.length,'alg pre',out.reduce((s,c)=>s+c.algs.filter(a=>a[1]).length,0));
console.log(out.filter(c=>c.algs.some(a=>a[1])).map(c=>c.name+': '+c.algs.map(a=>a[1]?'('+a[1]+') '+a[0]:a[0]).join(' | ')).join('\n'));
