// OLL case data from the sheet: display algs (invalid ones dropped), orientation diagram from alg 1, pre-AUF for the others.
const path=require('path'); const ROOT=path.join(__dirname,'..');
const L=require('./lib.js'); const M=L.M; M.setX('xR'); const DG=require('../src/diagram.js'); const fs=require('fs');
const {parseNote}=require('./parse.js');
const notes=JSON.parse(fs.readFileSync(process.argv[2]||path.join(ROOT,'data/sheet/oll_notes.json')));
const MAP={bR:'Br',dR:'Dfr',DR:'Dfr'};
const ren=s=>s.split(' ').map(t=>{const m=/^([A-Za-z]+?)(\d*'?\d*)$/.exec(t);return m&&MAP[m[1]]?MAP[m[1]]+m[2]:t}).join(' ');
const disp=raw=>raw.replace(/ /g,' ').split('//')[0].trim().replace(/\bbR/g,'BR').replace(/\bdR/g,'DR').replace(/\s+/g,' ');
const UF=M.names.U;
const f2lOK=st=>{for(let i=0;i<M.N;i++) if(!L.LL.includes(i)&&st[i]!==M.home[i]) return false; return true;};
const oriented=st=>L.LL.every(i=>M.home[i]!==UF||st[i]===UF);
const cells=DG.cells; // geo order: top cells first (11) then sides (15)
const out=[], dropped=[];
const sorted=notes.slice().sort((a,b)=>a.set-b.set||a.col-b.col||a.row-b.row);
for(const o of sorted){
  const algs=parseNote(o.note).map(a=>({raw:a.raw, seq:ren((a.lead.join(' ')+' '+a.body).trim())}));
  const good=algs.filter(a=>{ try{ const st=M.apply(L.SOL,L.setupOf(a.seq)); return f2lOK(st)&&!oriented(st); }catch(e){ return false; } });
  algs.filter(a=>!good.includes(a)).forEach(a=>dropped.push(o.name+': '+disp(a.raw)));
  if(!good.length) throw new Error('no valid alg '+o.name);
  const X=M.apply(L.SOL,L.setupOf(good[0].seq));            // alg 1 orients this state with no AUF before
  const A=good.map(a=>{ const p=L.U.filter(u=>{ const t=L.reo(M.apply(M.apply(X,u),a.seq)); return f2lOK(t)&&oriented(t); });
    if(!p.length) throw new Error('alg does not orient diagram state '+o.name+' '+a.raw);
    return [disp(a.raw), p.includes('')?'':p[0]]; });
  const pat=cells.map(c=>X[c.slot]===UF?'1':'0').join('');
  out.push([o.name, o.set, o.title, A, pat]);
}
fs.writeFileSync(path.join(ROOT,'data/generated/oll.json'),JSON.stringify(out));
console.log('oll cases',out.length,'algs',out.reduce((s,c)=>s+c[3].length,0),'pre',out.reduce((s,c)=>s+c[3].filter(a=>a[1]).length,0));
console.log('dropped:\n'+dropped.join('\n'));
