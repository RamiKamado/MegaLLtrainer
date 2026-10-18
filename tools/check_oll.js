// Verify OLL algorithms from the sheet: F2L intact, LL oriented after the alg, algs of a case agree, cases distinct.
const path=require('path'); const ROOT=path.join(__dirname,'..');
const L=require('./lib.js'); const M=L.M; M.setX('xR'); const {parseNote}=require('./parse.js'); const fs=require('fs');
const notes=JSON.parse(fs.readFileSync(process.argv[2]||path.join(ROOT,'data/sheet/oll_notes.json')));
const MAP=JSON.parse(process.argv[3]||'{"bR":"Br","dR":"Dfr","DR":"Dfr"}');
const ren=s=>s.split(' ').map(t=>{const m=/^([A-Za-z]+?)(\d*'?\d*)$/.exec(t);return m&&MAP[m[1]]?MAP[m[1]]+m[2]:t}).join(' ');
const UF=M.names.U;
const f2lOK=st=>{for(let i=0;i<M.N;i++) if(!L.LL.includes(i)&&st[i]!==M.home[i]) return false; return true;};
const pat=st=>L.LL.map(i=>st[i]===UF?1:0).join('');
const okey=setup=>{let b=null;for(const a of L.U)for(const c of L.U){const p=pat(M.apply(L.SOL,(a+' '+setup+' '+c).trim()));if(b===null||p<b)b=p;}return b;};
const res={}, bad=[], tokens=new Set(); let n=0;
for(const o of notes){
  const algs=parseNote(o.note); const keys=[];
  for(const a of algs){ n++; const seq=ren((a.lead.join(' ')+' '+a.body).trim()); seq.split(' ').forEach(t=>tokens.add(t.replace(/\d*'?\d*$/,'')));
    try{ const setup=L.setupOf(seq); const st=M.apply(L.SOL,setup);
      for(let f=0;f<12;f++) if(st[f*11]!==f) throw new Error('centers');
      if(!f2lOK(st)) throw new Error('F2L broken');
      if(pat(st)==='1'.repeat(L.LL.length)) throw new Error('already oriented (not an OLL)');
      keys.push(okey(setup));
    }catch(e){ bad.push([o.name,e.message,a.raw]); } }
  const u=[...new Set(keys)]; if(u.length>1) bad.push([o.name,'algs disagree']);
  res[o.name]={set:o.set,title:o.title,algs,key:u[0]};
}
const ks=Object.values(res).map(r=>r.key); const dup={}; Object.entries(res).forEach(([n,r])=>{(dup[r.key]=dup[r.key]||[]).push(n)});
console.log('cases',Object.keys(res).length,'algs',n,'bad',bad.length,'distinct',new Set(ks).size,'tokens',[...tokens].join(' '));
console.log('dups',Object.values(dup).filter(a=>a.length>1).map(a=>a.join('=')).join(' '));
bad.forEach(b=>console.log(b.join(' | ')));
fs.mkdirSync(path.join(ROOT,'tmp'),{recursive:true}); fs.writeFileSync(path.join(ROOT,'tmp/oll_check.json'),JSON.stringify(res));
