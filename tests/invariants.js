// Invariant tests against the built index.html (script body evaluated in Node with a fake DOM),
// following the same approach as the ZBLL tool: cut out <script>, eval, touch functions directly.
// usage: node tests/invariants.js ../out/index.html [questionsPerCase]
const fs = require('fs');
const file = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
const PER = +(process.argv[3] || 30);
const html = fs.readFileSync(file, 'utf8');
const body = html.split('<script>')[1].split('</script>')[0];

// ---- fake DOM ----
const mkEl = () => { const e = { style: {}, dataset: {}, children: [], classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  setAttribute() {}, appendChild(c) { this.children.push(c); return c; }, insertBefore() {}, remove() {}, addEventListener() {},
  querySelector() { return mkEl(); }, querySelectorAll() { return []; }, click() {}, value: '', textContent: '', innerHTML: '' }; return e; };
const els = {};
global.document = { getElementById: id => els[id] || (els[id] = mkEl()), createElement: () => mkEl(), querySelectorAll: () => [],
  addEventListener() {}, body: mkEl() };
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
global.window = { scrollTo() {}, prompt: () => null };
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() };
global.confirm = () => true; global.alert = () => {};
global.setTimeout = () => 0; global.clearTimeout = () => {};

const test = `
const fails=[]; const ok=(c,m)=>{ if(!c) fails.push(m); };
const eqSolved=t=>{ for(let i=0;i<MINX.N;i++) if(t[i]!==SOLVED[i]) return false; return true; };
const reo=reorient;
const solvesUpToAuf=(st,seq)=>{ const t=reo(MINX.apply(st,seq)); return AUF5.some(u=>eqSolved(MINX.apply(t,u))); };
ok(ROTS().length===60,'rotation group size');
ok(CASES.length===151,'PLL count '+CASES.length);
ok(OLLS.length===259,'OLL count '+OLLS.length);
ok(new Set(CASES.map(c=>c.n)).size===151 && new Set(OLLS.map(o=>o.n)).size===259,'names unique');
// ---- PLL ----
const owner=new Map(); let clash=0;
for(const c of CASES) for(const s of caseStates(c)){ if(owner.has(s)&&owner.get(s)!==c.id) clash++; owner.set(s,c.id); }
ok(clash===0,'PLL cases overlap under AUF: '+clash);
let algChecks=0;
for(const c of CASES) for(const s of c.scr){
  const st=MINX.apply(SOLVED,s);
  ok(f2lIntact(st),'scramble breaks F2L '+c.n);
  ok(caseStates(c).has(sigOf(st)),'scramble is another case '+c.n);
  ok(/^[RU2' ]+$/.test(s),'PLL scramble not R/U only '+c.n);
  for(const x of c.a){ algChecks++;
    ok(AUF5.some(u=>solvesUpToAuf(MINX.apply(st,u),algSeq((x.pre+' '+x.alg).trim()))),'alg fails '+c.n+' '+x.alg); }
}
// ---- OLL ----
const pat=st=>LLSLOTS.map(i=>st[i]===MINX.names.U?1:0).join('');
const ofs=new Map(); let osym=0, oclash=0;
for(const o of OLLS){
  const X=ollState(o);
  ok(f2lIntact(X) && !llOriented(X),'OLL state wrong '+o.n);
  // diagram pattern matches the state
  const dp=D.geo.cells.map((c,i)=>0); // pattern of the drawing vs state: compare count of U-colored cells
  ok(o.pat.split('').filter(x=>x==='1').length===USLOTS.filter(i=>X[i]===MINX.names.U).length
     + LLSLOTS.filter(i=>!USLOTS.includes(i)&&X[i]===MINX.names.U).length,'OLL diagram count '+o.n);
  // every listed alg orients the drawn state with no AUF (executed with its rotations)
  for(const a of o.a){ ok(orientPre(o,a.alg)===a.pre,'OLL alg pre '+o.n+' '+a.alg);
    const t=reo(MINX.apply(X,algSeq((a.pre+' '+a.alg).trim()))); ok(f2lIntact(t)&&llOriented(t),'OLL alg fails '+o.n+' '+a.alg);
    // derotated version gives the same state as executing with rotations then re-gripping
    const d=MINX.apply(X,algSeq(derotate(algSeq((a.pre+' '+a.alg).trim()))));
    ok(d.join()===t.join(),'derotate mismatch '+o.n+' '+a.alg); }
  // no rotational symmetry: the alg orients from exactly one AUF
  const n=AUF5.filter(u=>{ const t=MINX.apply(u?MINX.apply(X,u):X, algSeq(useSeq(o))); return f2lIntact(t)&&llOriented(t); }).length;
  if(n!==1) osym++;
  let best=null; for(const a of AUF5) for(const b of AUF5){ const p=pat(MINX.apply(MINX.apply(a?MINX.apply(SOLVED,a):SOLVED, MINX.invert(algSeq(useSeq(o)))),b)); if(best===null||p<best) best=p; }
  if(ofs.has(best)) oclash++; ofs.set(best,o.n);
}
ok(osym===0,'OLL cases with ambiguous AUF: '+osym);
ok(oclash===0,'OLL cases overlap under AUF: '+oclash);
// custom alg check
ok(orientPre(OLLS[0],'U '+OLLS[0].a[0].alg)!==null,'custom alg with leading U accepted');
ok(orientPre(OLLS[0],OLLS[40].a[0].alg)===null,'custom alg of another case rejected');
ok(orientPre(OLLS[0],'R Q')===null,'bad notation rejected');
// ---- questions ----
let qn=0, maxLen=0, lens=0, lensB=0, nB=0;
practice='pll';
for(const c of CASES) for(let k=0;k<${PER};k++){
  const q=makeQuestion(c); qn++;
  ok(verifyQuestion(q),'verify fails '+c.n+' '+q.s);
  const st=MINX.apply(SOLVED,algSeq(q.s));
  ok(AUF5.some(u=>solvesUpToAuf(MINX.apply(st,u),algSeq(c.a[0].alg))),'question not solved by alg0 '+c.n);
  const n=q.s.split(' ').length; maxLen=Math.max(maxLen,n); lens+=n;
}
// OLL -> PLL: every OLL with several PLLs; the solver executes the shown OLL alg *with its rotations*
practice='both'; osel=new Set(OLLS.map(o=>o.id));
for(const o of OLLS) for(let k=0;k<${PER};k++){
  const c=CASES[(o.id*7+k*13)%CASES.length];
  let q=null; for(let t=0;t<20&&(!q||q.o!==o);t++) q=makeQuestion(c);
  if(q.o!==o){ osel=new Set([o.id]); q=makeQuestion(c); osel=new Set(OLLS.map(x=>x.id)); }
  qn++; nB++; lensB+=q.s.split(' ').length;
  ok(verifyQuestion(q),'both verify fails '+o.n+' '+c.n);
  const st=MINX.apply(SOLVED,algSeq(q.s));
  const okU=AUF5.filter(u=>{ const t=reo(MINX.apply(u?MINX.apply(st,u):st, algSeq(useAlg(o).text))); return f2lIntact(t)&&llOriented(t); });
  ok(okU.length===1,'OLL AUF not unique '+o.n);
  const after=reo(MINX.apply(okU[0]?MINX.apply(st,okU[0]):st, algSeq(useAlg(o).text)));
  ok(caseStates(c).has(sigOf(after)),'after OLL not the selected PLL '+o.n+' -> '+c.n);
}
// a non-default alg and a custom alg also lead to the selected PLL
const o2=OLLS.find(o=>o.a.length>1); ollAlg[o2.n]=1; osel=new Set([o2.id]);
for(const c of CASES.slice(0,20)){ const q=makeQuestion(c); ok(verifyQuestion(q),'alt alg question '+o2.n);
  ok(q.oalg===o2.a[1].alg,'alt alg label'); }
ollAlg[o2.n]={t:'U '+o2.a[0].alg, pre:orientPre(o2,'U '+o2.a[0].alg)};
for(const c of CASES.slice(0,20)){ const q=makeQuestion(c); ok(verifyQuestion(q),'custom alg question '+o2.n); }
delete ollAlg[o2.n];
// single scrambles (the search that replaces the joined sequence): same case, shorter, R/U/F only,
// and the solver executing the shown OLL alg *with its rotations* gets the selected PLL
const SN=+(process.env.SINGLE||0); let sOk=0, sLen=0, sRaw=0, sMs=0, sFb=0, sFbLen=0;
practice='both'; osel=new Set(OLLS.map(o=>o.id));
for(let k=0;k<SN;k++){
  const OPOOL=process.env.ONEEDGE?OLLS.filter(x=>/^(1C|3[89]|4\d|5[0-3])/.test(x.n)):OLLS;
  const o=OPOOL[(k*53)%OPOOL.length], c=CASES[(k*29)%CASES.length]; if(k===0) var nEdge1=0; if(/^(1C|3[89]|4\d|5[0-3])/.test(o.n)) nEdge1++;
  const q=makeQuestion(true,{o,c}); const vars=U2VAR(q); const t=Date.now();
  let r=solveSync(vars.map(v=>algSeq(v.raw)),8000,5000); if(!r){ r=solveSync(vars.map(v=>algSeq(v.raw)),2000,1000,fallAlgs(o)); if(r){ sFb++; sFbLen+=r.moves.length; } } sMs+=Date.now()-t;
  if(!r){ fails.push('single not found '+o.n+' '+c.n); continue; }
  const q2={...vars[r.ti], s:reduce(MINX.invert(r.moves.join(' ')))};
  ok(verifyQuestion(q2),'single verify '+o.n+' '+c.n);
  ok(/^[RUF2' ]+$/.test(q2.s),'single uses only R U F '+q2.s);
  const st=MINX.apply(SOLVED,algSeq(q2.s));
  const okU=AUF5.filter(u=>{ const t=reo(MINX.apply(u?MINX.apply(st,u):st, algSeq(useAlg(o).text))); return f2lIntact(t)&&llOriented(t); });
  ok(okU.length===1 && caseStates(c).has(sigOf(reo(MINX.apply(okU[0]?MINX.apply(st,okU[0]):st, algSeq(useAlg(o).text))))),'single: shown OLL alg then selected PLL '+o.n+' '+c.n);
  sOk++; sLen+=q2.s.split(' ').length; sRaw+=vars[r.ti].raw.split(' ').length;
}
// OLL only
practice='oll';
for(const o of OLLS) for(let k=0;k<5;k++){ const q=makeQuestion(o); qn++; ok(verifyQuestion(q),'oll-only verify '+o.n); }
// wrong case rejected
practice='pll'; ok(!verifyQuestion({mode:'pll',c:CASES[0], s:CASES[1].scr[0]}),'verifier accepted a wrong PLL');
practice='both'; { const q=makeQuestion(CASES[0]); q.c=CASES[5]; ok(!verifyQuestion(q),'verifier accepted wrong PLL after OLL'); }
// queue modes
practice='pll'; sel=new Set(CASES.slice(0,12).map(c=>c.id));
mode='recap'; buildQueue(); const seenR=new Set(); let c2; while((c2=nextUnit())) seenR.add(c2.id);
ok(seenR.size===12,'recap covers all once: '+seenR.size);
mode='straight'; buildQueue(); const order=[]; for(let i=0;i<13;i++) order.push(nextUnit().id);
ok(order[12]===order[0] && order.slice(0,12).every((v,i)=>v===CASES[i].id),'straight order/loop');
practice='oll'; osel=new Set(OLLS.slice(0,7).map(o=>o.id)); mode='recap'; buildQueue(); const so=new Set(); let o3; while((o3=nextUnit())) so.add(o3.id);
ok(so.size===7,'recap OLL covers all once');
// stats per mode, slow, undo
stats=emptyStats();
const r1=recordTime(3000,{mode:'pll',c:CASES[0]}); const r2=recordTime(9000,{mode:'pll',c:CASES[0]});
ok(stats.byMode.pll[CASES[0].n].n===2 && Math.round(recent5(stats.byMode.pll[CASES[0].n]))===6000,'stats record');
recordTime(2000,{mode:'both',o:OLLS[0],c:CASES[1]}); recordTime(1000,{mode:'oll',o:OLLS[2]});
ok(stats.byMode.both[OLLS[0].n+'@'+CASES[1].n].n===1 && stats.byMode.oll[OLLS[2].n].n===1,'per-mode stats');
practice='pll'; slowSec=5; ok(isSlow(CASES[0]),'slow by r5'); ok(isSlow(CASES[2]),'no record => slow');
practice='both'; ok(!isSlow(CASES[1]),'both: combo record counts for PLL');
practice='oll'; ok(!isSlow(OLLS[2]),'oll slow by record');
stats.byMode.pll[CASES[0].n]=r2.before; ok(stats.byMode.pll[CASES[0].n].n===1,'undo restores');
// migration of the PLL-only format
const mg=normStats({cases:{'Q1A':{n:2,s:4000,b:1500,w:2500,r:[1500,2500]}}}); ok(mg.byMode.pll['Q1+'] && mg.byMode.pll['Q1+'].n===2,'old stats migrate');
// export/import round trip
presets=[{name:'p',keys:['A1+','Z3','bogus'],okeys:['1A','zz']}]; ollAlg={'2A':1};
const d=inspect(exportData()); ok(!d.err && d.presets[0].keys.length===2 && d.presets[0].okeys.length===1 && d.oalg['2A']===1 && d.stats,'export/import inspect');
// ---- AUF quiz ----
// every case, every listed alg, every answer: the shown start state + the alg (with its rotations, regripped)
// needs exactly that AUF; the start state is that PLL case; the 5 start states differ
let aufChecks=0;
for(const c of CASES){
  c.a.forEach((a,i)=>{
    if(i===0) delete pllAlg[c.n]; else pllAlg[c.n]=i;
    const seq=algSeq(usePll(c).text); const seen=new Set();
    for(const u of AUF_ORDER){ aufChecks++;
      const X=aufStart(seq,u); seen.add(X.join());
      ok(f2lIntact(X) && llOriented(X) && caseStates(c).has(sigOf(X)),'AUF start is not the case '+c.n+' alg'+i+' '+u);
      const t=reo(MINX.apply(X,seq));
      const need=AUF_ORDER.filter(v=>eqSolved(v?MINX.apply(t,v):t));
      ok(need.length===1 && need[0]===u,'AUF answer wrong '+c.n+' alg'+i+' u='+u+' got '+need.join('|'));
      ok(verifyAuf({c,u,alg:usePll(c),seq,X,ar:[]}),'verifyAuf rejects a correct question '+c.n+' '+u);
    }
    ok(seen.size===5,'AUF start states not distinct '+c.n+' alg'+i);
  });
  delete pllAlg[c.n];
}
// arrows describe the alg's own movement: the same for every answer
{ const c=CASES[0], seq=algSeq(usePll(c).text);
  ok(JSON.stringify(arrowsOf(aufStart(seq,'')))===JSON.stringify(makeAufQuestion(c).ar),'arrows depend on the answer'); }
// a question with a wrong answer key is rejected
{ const q=makeAufQuestion(CASES[3]); const bad={...q, u:AUF_ORDER[(AUF_ORDER.indexOf(q.u)+1)%5]}; ok(!verifyAuf(bad),'verifyAuf accepted a wrong answer'); }
// custom PLL algs: accepted with an AUF in front, another case's alg and bad notation are rejected
ok(pllPre(CASES[0],'U '+CASES[0].a[0].alg)!==null,'custom PLL alg with leading U accepted');
ok(pllPre(CASES[0],CASES[60].a[0].alg)===null,'custom PLL alg of another case rejected');
ok(pllPre(CASES[0],'R Q')===null,'bad PLL notation rejected');
{ const c=CASES[10], t="U2 "+c.a[0].alg; pllAlg[c.n]={t, pre:pllPre(c,t)};
  for(let k=0;k<20;k++){ const q=makeAufQuestion(c); ok(verifyAuf(q),'custom alg AUF question '+c.n); }
  delete pllAlg[c.n]; }
// quiz flow: recap over 8 cases, one wrong answer, undo restores the record
practice='auf'; sel=new Set(CASES.slice(0,8).map(c=>c.id)); stats=emptyStats(); setMode('recap'); startAuf();
let asked=0, guard=0; const askedIds=new Set();
while(aCur && guard++<50){ asked++; askedIds.add(aCur.c.id);
  const right=AUF_ORDER.indexOf(aCur.u); aufAnswer(asked===3?(right+1)%5:right); aufNext(); }
ok(asked===8 && askedIds.size===8,'AUF recap asks each case once: '+asked);
ok(aLog.length===8 && aLog.filter(x=>!x.ok).length===1,'AUF log');
const tot=Object.values(stats.byMode.auf).reduce((a,e)=>a+e.n,0), okc=Object.values(stats.byMode.auf).reduce((a,e)=>a+e.ok,0);
ok(tot===8 && okc===7,'AUF stats '+tot+' '+okc);
const wrongCase=aLog[2].c; slowSec=60;
ok(isSlow(wrongCase),'AUF slow: a miss in the last 5'); ok(!isSlow(aLog[0].c),'AUF slow: all right and fast');
ok(isSlow(CASES[100]),'AUF slow: no record');
document.getElementById('aundo').onclick();
ok(Object.values(stats.byMode.auf).reduce((a,e)=>a+e.n,0)===7,'AUF undo');
// stats normalisation and export / import of AUF records and PLL use-algs
const ns=normStats({byMode:{auf:{'Q1A':{n:3,ok:2,s:3000,r:[1,0,1],t:[900,1200,900],u:{'U':[2,1],'':[1,1]}},'bogus':{n:1,ok:1}}}});
ok(ns.byMode.auf['Q1+'] && ns.byMode.auf['Q1+'].ok===2 && !ns.byMode.auf.bogus,'AUF stats normalise');
pllAlg={'A1-':1}; if(!CASES[1].a[1]) pllAlg={};
const d2=inspect(exportData()); ok(!d2.err && d2.stats && Object.keys(d2.stats.byMode.auf).length>0,'AUF stats exported');
ok(JSON.stringify(d2.palg)===JSON.stringify(pllAlg),'PLL use-algs exported');
const before=JSON.stringify(stats.byMode.auf); applyImport(d2,{presets:false,oalg:true,stats:true,replace:false,settings:false});
const merged=Object.values(stats.byMode.auf).reduce((a,e)=>a+e.n,0); ok(merged===14,'AUF stats merge on import '+merged);
JSON.stringify({fails, aufChecks, single:SN?{n:sOk, oneEdge:typeof nEdge1==='undefined'?0:nEdge1, fallback:sFb, fallbackLen:sFb?(sFbLen/sFb).toFixed(1):null, avgLen:(sLen/sOk).toFixed(1), avgJoined:(sRaw/sOk).toFixed(1), avgMs:Math.round(sMs/SN)}:null, algChecks, qn, avgLen:(lens/(${PER}*151)).toFixed(1), maxLen, avgLenOllPll:(lensB/nB).toFixed(1)});
`;
const res = JSON.parse(eval(body + '\n;' + test));
console.log(JSON.stringify({ ...res, fails: res.fails.length }, null, 0));
if (res.fails.length) { console.log(res.fails.slice(0, 20).join('\n')); process.exit(1); }
